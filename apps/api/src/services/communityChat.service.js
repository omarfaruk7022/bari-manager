import jwt from "jsonwebtoken";
import CommunityChatMember from "../models/CommunityChatMember.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import CommunityChatMessage from "../models/CommunityChatMessage.model.js";
import Tenant from "../models/Tenant.model.js";
import User from "../models/User.model.js";
import { getPlanConfig } from "../utils/plans.js";

const normalizeBDPhone = (phone) => {
  if (!phone) return phone;

  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("0")) return "88" + cleaned;
  if (cleaned.startsWith("1")) return "880" + cleaned;
  return cleaned;
};

export const communityRoom = (landlordId) => `community:${String(landlordId)}`;

export const getCommunityLandlordIdFromActor = ({ role, userId, landlordId }) => {
  if (role === "tenant") return landlordId || null;
  if (role === "landlord") return userId || null;
  return landlordId || null;
};

export const getCommunityLandlordIdFromRequest = (req) =>
  getCommunityLandlordIdFromActor({
    role: req.user.role,
    userId: req.user._id,
    landlordId: req.query.landlordId || req.body.landlordId || req.user.landlordId || null,
  });

export const getModerationState = (member) => {
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

export const ensureCommunityChatEnabled = async (landlordId, role) => {
  if (!landlordId || role === "admin") return null;

  const profile = await LandlordProfile.findOne({ userId: landlordId }).select("plan");
  const plan = await getPlanConfig(profile?.plan);

  if (!plan?.communityChat) {
    return "এই প্ল্যানে কমিউনিটি চ্যাট সক্রিয় নেই";
  }

  return null;
};

export const resolveTenantMembership = async (user, landlordId) => {
  const tenant = await Tenant.findOne({
    landlordId,
    $or: [
      { userId: user._id },
      {
        phone: normalizeBDPhone(user.phone),
        landlordId,
      },
      { email: user.email, landlordId },
    ].filter((item) => Object.values(item).every(Boolean)),
  });

  if (!tenant) return null;

  const member = await CommunityChatMember.findOneAndUpdate(
    { landlordId, userId: user._id },
    {
      landlordId,
      userId: user._id,
      tenantId: tenant._id,
      role: "tenant",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return { tenant, member };
};

export const ensureCommunityAccess = async ({ user, landlordId }) => {
  if (!landlordId) {
    return { ok: false, status: 400, message: "বাড়ীওয়ালা নির্বাচন করুন" };
  }

  const featureError = await ensureCommunityChatEnabled(landlordId, user.role);
  if (featureError) {
    return { ok: false, status: 403, message: featureError };
  }

  if (user.role === "tenant") {
    const membership = await resolveTenantMembership(user, landlordId);
    if (!membership?.member) {
      return {
        ok: false,
        status: 403,
        message: "এই কমিউনিটি চ্যাটে আপনার প্রবেশাধিকার নেই",
      };
    }

    return {
      ok: true,
      landlordId,
      currentMember: membership.member,
      tenantId: membership.tenant?._id || null,
      moderation: getModerationState(membership.member),
    };
  }

  if (user.role === "landlord") {
    const currentMember = await CommunityChatMember.findOneAndUpdate(
      { landlordId, userId: user._id },
      { landlordId, userId: user._id, role: "landlord" },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return {
      ok: true,
      landlordId,
      currentMember,
      tenantId: null,
      moderation: getModerationState(currentMember),
    };
  }

  return {
    ok: true,
    landlordId,
    currentMember: null,
    tenantId: null,
    moderation: getModerationState(null),
  };
};

export const serializeMessage = (message) => ({
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

export const fetchRecentCommunityMessages = async (landlordId, limit = 100) => {
  const messages = await CommunityChatMessage.find({ landlordId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate("authorId", "name role")
    .populate({
      path: "replyTo",
      populate: { path: "authorId", select: "name role" },
    })
    .lean();

  return messages.reverse().map(serializeMessage);
};

export const fetchCommunityGroupInfo = async (landlordId) => {
  const [profile, landlord] = await Promise.all([
    LandlordProfile.findOne({ userId: landlordId }).select("propertyName propertyAddress plan").lean(),
    User.findById(landlordId).select("name phone").lean(),
  ]);

  return {
    landlordId,
    landlordName: landlord?.name || "অজানা বাড়ীওয়ালা",
    propertyName: profile?.propertyName || "কমিউনিটি গ্রুপ",
    propertyAddress: profile?.propertyAddress || "",
    phone: landlord?.phone || "",
    planKey: profile?.plan || "basic",
  };
};

export const authenticateSocketUser = async (token) => {
  if (!token) {
    const error = new Error("টোকেন প্রয়োজন");
    error.data = { status: 401 };
    throw error;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user || !user.isActive) {
    const error = new Error("অ্যাকাউন্ট পাওয়া যায়নি বা নিষ্ক্রিয়");
    error.data = { status: 401 };
    throw error;
  }

  return user;
};
