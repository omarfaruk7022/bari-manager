import CommunityChatMember from "../models/CommunityChatMember.model.js";
import CommunityChatMessage from "../models/CommunityChatMessage.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import { getPlanConfig } from "../utils/plans.js";
import { getIO } from "../socket/index.js";
import {
  communityRoom,
  ensureCommunityAccess,
  fetchCommunityGroupInfo,
  fetchRecentCommunityMessages,
  getCommunityLandlordIdFromRequest,
  getModerationState,
  serializeMessage,
} from "../services/communityChat.service.js";

const emitToRoomIfAvailable = (room, event, payload) => {
  const io = getIO();
  if (!io) {
    console.warn(`⚠️ Socket.IO is not initialized; skipped ${event} for room ${room}`);
    return;
  }

  io.to(room).emit(event, payload);
};

export const listCommunityGroups = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "এই কাজের অনুমতি নেই" });
    }

    const [profiles, messageStats, memberStats] = await Promise.all([
      LandlordProfile.find({})
        .populate("userId", "name phone")
        .sort({ updatedAt: -1 }),
      CommunityChatMessage.aggregate([
        {
          $group: {
            _id: "$landlordId",
            messageCount: { $sum: 1 },
            lastMessageAt: { $max: "$createdAt" },
          },
        },
      ]),
      CommunityChatMember.aggregate([
        { $match: { role: "tenant" } },
        {
          $group: {
            _id: "$landlordId",
            memberCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const messageMap = new Map(messageStats.map((item) => [String(item._id), item]));
    const memberMap = new Map(memberStats.map((item) => [String(item._id), item]));

    const groups = await Promise.all(
      profiles.map(async (profile) => {
        const landlordId = String(profile.userId?._id || profile.userId);
        const plan = await getPlanConfig(profile.plan);
        const messageInfo = messageMap.get(landlordId);
        const memberInfo = memberMap.get(landlordId);

        return {
          landlordId,
          landlordName: profile.userId?.name || "অজানা বাড়ীওয়ালা",
          propertyName: profile.propertyName || "কমিউনিটি গ্রুপ",
          propertyAddress: profile.propertyAddress || "",
          phone: profile.userId?.phone || profile.phone || "",
          planKey: profile.plan || "basic",
          communityChatEnabled: Boolean(plan?.communityChat),
          memberCount: memberInfo?.memberCount || 0,
          messageCount: messageInfo?.messageCount || 0,
          lastMessageAt: messageInfo?.lastMessageAt || null,
        };
      }),
    );

    return res.json({
      success: true,
      data: groups.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      }),
    });
  } catch (err) {
    next(err);
  }
};

export const getCommunityState = async (req, res, next) => {
  try {
    const landlordId = getCommunityLandlordIdFromRequest(req);
    const access = await ensureCommunityAccess({ user: req.user, landlordId });
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const messages = await fetchRecentCommunityMessages(access.landlordId, 100);

    const response = {
      success: true,
      data: {
        landlordId: access.landlordId,
        currentUserRole: req.user.role,
        groupInfo: await fetchCommunityGroupInfo(access.landlordId),
        moderation: access.moderation,
        messages,
      },
    };

    if (req.user.role === "landlord" || req.user.role === "admin") {
      const members = await CommunityChatMember.find({ landlordId: access.landlordId, role: "tenant" })
        .populate("userId", "name phone email")
        .populate("tenantId", "propertyId name isActive");

      response.data.members = members.map((member) => ({
        _id: member._id,
        role: member.role,
        moderation: getModerationState(member),
        bannedReason: member.bannedReason || "",
        user: member.userId
          ? {
              _id: member.userId._id,
              name: member.userId.name,
              phone: member.userId.phone,
              email: member.userId.email,
            }
          : null,
        tenant: member.tenantId
          ? {
              _id: member.tenantId._id,
              name: member.tenantId.name,
              propertyId: member.tenantId.propertyId,
              isActive: member.tenantId.isActive,
            }
          : null,
      }));
    }

    return res.json(response);
  } catch (err) {
    next(err);
  }
};

export const postCommunityMessage = async (req, res, next) => {
  try {
    const landlordId = getCommunityLandlordIdFromRequest(req);
    const { body, replyTo } = req.body;
    const access = await ensureCommunityAccess({ user: req.user, landlordId });
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "বার্তা লিখুন" });
    }

    if (access.moderation?.isBanned) {
      return res.status(403).json({ success: false, message: "আপনি এই কমিউনিটি চ্যাটে ব্যান আছেন" });
    }
    if (access.moderation?.isMuted) {
      return res.status(403).json({ success: false, message: "আপনি বর্তমানে মিউট আছেন" });
    }

    let replyMessage = null;
    if (replyTo) {
      replyMessage = await CommunityChatMessage.findOne({ _id: replyTo, landlordId: access.landlordId });
      if (!replyMessage) {
        return res.status(404).json({ success: false, message: "যে বার্তায় রিপ্লাই দিচ্ছেন তা পাওয়া যায়নি" });
      }
    }

    const message = await CommunityChatMessage.create({
      landlordId: access.landlordId,
      authorId: req.user._id,
      tenantId: access.tenantId,
      authorRole: req.user.role,
      body: body.trim(),
      replyTo: replyMessage?._id || null,
    });

    const populated = await CommunityChatMessage.findById(message._id)
      .populate("authorId", "name role")
      .populate({
        path: "replyTo",
        populate: { path: "authorId", select: "name role" },
      });
    const serialized = serializeMessage(populated);
    emitToRoomIfAvailable(communityRoom(access.landlordId), "community:message", {
      landlordId: String(access.landlordId),
      message: serialized,
    });

    return res.status(201).json({
      success: true,
      message: "বার্তা পাঠানো হয়েছে",
      data: serialized,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCommunityMemberModeration = async (req, res, next) => {
  try {
    const landlordId = getCommunityLandlordIdFromRequest(req);
    if (!landlordId || (req.user.role !== "landlord" && req.user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "এই কাজের অনুমতি নেই" });
    }
    const access = await ensureCommunityAccess({ user: req.user, landlordId });
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const member = await CommunityChatMember.findOne({
      _id: req.params.memberId,
      landlordId: access.landlordId,
      role: "tenant",
    });
    if (!member) {
      return res.status(404).json({ success: false, message: "সদস্য পাওয়া যায়নি" });
    }

    const { action, durationDays, forever, reason } = req.body;
    const now = new Date();
    const days = Math.max(1, Number(durationDays) || 1);
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    if (action === "mute") {
      member.muteUntil = until;
    } else if (action === "unmute") {
      member.muteUntil = null;
    } else if (action === "ban") {
      member.banUntil = forever ? null : until;
      member.isBannedForever = Boolean(forever);
      member.bannedReason = reason?.trim() || "";
    } else if (action === "unban") {
      member.banUntil = null;
      member.isBannedForever = false;
      member.bannedReason = "";
    } else {
      return res.status(400).json({ success: false, message: "সঠিক action দিন" });
    }

    await member.save();
    emitToRoomIfAvailable(communityRoom(access.landlordId), "community:member-moderated", {
      landlordId: String(access.landlordId),
      memberId: String(member._id),
      moderation: getModerationState(member),
      bannedReason: member.bannedReason || "",
      userId: String(member.userId),
    });

    return res.json({
      success: true,
      message: "কমিউনিটি সদস্য আপডেট হয়েছে",
      data: {
        _id: member._id,
        moderation: getModerationState(member),
        bannedReason: member.bannedReason || "",
      },
    });
  } catch (err) {
    next(err);
  }
};
