import CommunityChatMember from "../models/CommunityChatMember.model.js";
import CommunityChatMessage from "../models/CommunityChatMessage.model.js";
import Tenant from "../models/Tenant.model.js";
import { normalizeBDPhone } from "./tenant.controller.js";

const getCommunityLandlordId = (req) => {
  if (req.user.role === "tenant") return req.user.landlordId || null;
  if (req.user.role === "landlord") return req.user._id;
  return req.query.landlordId || req.body.landlordId || null;
};

const getModerationState = (member) => {
  const now = new Date();
  const isMuted = Boolean(member?.muteUntil && member.muteUntil > now);
  const isBanned = Boolean(member?.isBannedForever || (member?.banUntil && member.banUntil > now));

  return {
    isMuted,
    muteUntil: member?.muteUntil || null,
    isBanned,
    banUntil: member?.banUntil || null,
    isBannedForever: Boolean(member?.isBannedForever),
    bannedReason: member?.bannedReason || "",
  };
};

const resolveTenantMembership = async (req, landlordId) => {
  const tenant = await Tenant.findOne({
    landlordId,
    $or: [
      { userId: req.user._id },
      {
        phone: normalizeBDPhone(req.user.phone),
        landlordId,
      },
      { email: req.user.email, landlordId },
    ].filter((item) => Object.values(item).every(Boolean)),
  });

  if (!tenant) return null;

  const member = await CommunityChatMember.findOneAndUpdate(
    { landlordId, userId: req.user._id },
    {
      landlordId,
      userId: req.user._id,
      tenantId: tenant._id,
      role: "tenant",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return { tenant, member };
};

const serializeMessage = (message) => ({
  _id: message._id,
  body: message.body,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  authorRole: message.authorRole,
  author: {
    _id: message.authorId?._id || message.authorId,
    name: message.authorId?.name || "অজানা",
    role: message.authorId?.role || message.authorRole,
  },
  replyTo: message.replyTo
    ? {
        _id: message.replyTo._id,
        body: message.replyTo.body,
        createdAt: message.replyTo.createdAt,
        author: {
          _id: message.replyTo.authorId?._id || message.replyTo.authorId,
          name: message.replyTo.authorId?.name || "অজানা",
          role: message.replyTo.authorId?.role || message.replyTo.authorRole,
        },
      }
    : null,
});

export const getCommunityState = async (req, res, next) => {
  try {
    const landlordId = getCommunityLandlordId(req);
    if (!landlordId) {
      return res.status(400).json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });
    }

    let currentMember = null;
    if (req.user.role === "tenant") {
      const membership = await resolveTenantMembership(req, landlordId);
      if (!membership?.member) {
        return res.status(403).json({ success: false, message: "এই কমিউনিটি চ্যাটে আপনার প্রবেশাধিকার নেই" });
      }
      currentMember = membership.member;
    } else if (req.user.role === "landlord") {
      currentMember = await CommunityChatMember.findOneAndUpdate(
        { landlordId, userId: req.user._id },
        { landlordId, userId: req.user._id, role: "landlord" },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }

    const messages = await CommunityChatMessage.find({ landlordId })
      .populate("authorId", "name role")
      .populate({
        path: "replyTo",
        populate: { path: "authorId", select: "name role" },
      })
      .sort({ createdAt: 1 })
      .limit(300);

    const response = {
      success: true,
      data: {
        landlordId,
        currentUserRole: req.user.role,
        moderation: getModerationState(currentMember),
        messages: messages.map(serializeMessage),
      },
    };

    if (req.user.role === "landlord" || req.user.role === "admin") {
      const members = await CommunityChatMember.find({ landlordId, role: "tenant" })
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
    const landlordId = getCommunityLandlordId(req);
    const { body, replyTo } = req.body;

    if (!landlordId) {
      return res.status(400).json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "বার্তা লিখুন" });
    }

    let tenantId = null;
    let moderation = {};
    if (req.user.role === "tenant") {
      const membership = await resolveTenantMembership(req, landlordId);
      if (!membership?.member) {
        return res.status(403).json({ success: false, message: "এই কমিউনিটি চ্যাটে আপনার প্রবেশাধিকার নেই" });
      }
      tenantId = membership.tenant?._id || null;
      moderation = getModerationState(membership.member);
      if (moderation.isBanned) {
        return res.status(403).json({ success: false, message: "আপনি এই কমিউনিটি চ্যাটে ব্যান আছেন" });
      }
      if (moderation.isMuted) {
        return res.status(403).json({ success: false, message: "আপনি বর্তমানে মিউট আছেন" });
      }
    }

    let replyMessage = null;
    if (replyTo) {
      replyMessage = await CommunityChatMessage.findOne({ _id: replyTo, landlordId });
      if (!replyMessage) {
        return res.status(404).json({ success: false, message: "যে বার্তায় রিপ্লাই দিচ্ছেন তা পাওয়া যায়নি" });
      }
    }

    const message = await CommunityChatMessage.create({
      landlordId,
      authorId: req.user._id,
      tenantId,
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

    return res.status(201).json({
      success: true,
      message: "বার্তা পাঠানো হয়েছে",
      data: serializeMessage(populated),
    });
  } catch (err) {
    next(err);
  }
};

export const updateCommunityMemberModeration = async (req, res, next) => {
  try {
    const landlordId = getCommunityLandlordId(req);
    if (!landlordId || (req.user.role !== "landlord" && req.user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "এই কাজের অনুমতি নেই" });
    }

    const member = await CommunityChatMember.findOne({
      _id: req.params.memberId,
      landlordId,
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
