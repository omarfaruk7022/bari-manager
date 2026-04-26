import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Property from "../models/Property.model.js";
import Notification from "../models/Notification.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import { sendCredentialsEmail } from "../services/email.service.js";
import {
  sendOtpSMS,
  sendPasswordResetSMS,
  sendCredentialsSMS,
} from "../services/sms.service.js";
import { getPlanConfig, hasSmsQuota } from "../utils/plans.js";

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, landlordId: user.landlordId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

const REDIRECT = {
  admin: "/admin/dashboard",
  landlord: "/landlord/dashboard",
  tenant: "/tenant/dashboard",
};

export function normalizeBDPhone(phone) {
  if (!phone) return phone;

  // remove সব non-digit
  let cleaned = phone.replace(/\D/g, "");

  // যদি already 880 দিয়ে শুরু হয়
  if (cleaned.startsWith("880")) {
    return cleaned;
  }

  // যদি 0 দিয়ে শুরু হয় (01...)
  if (cleaned.startsWith("0")) {
    return "88" + cleaned;
  }

  // যদি 1 দিয়ে শুরু হয় (1888...)
  if (cleaned.startsWith("1")) {
    return "880" + cleaned;
  }

  return cleaned;
}

async function resolvePropertyScopedUser({
  identifier,
  propertyName,
  unitNumber,
  select = "+password",
}) {
  const cleaned = (identifier || "").replace(/\D/g, "");
  const possiblePhones = [
    cleaned,
    cleaned.replace(/^880/, "0"),
    "880" + cleaned.replace(/^0/, ""),
  ];

  const users = await User.find({
    $or: [
      { email: String(identifier || "").toLowerCase() },
      { phone: { $in: possiblePhones } },
    ],
  }).select(select);

  if (!users.length) return { user: null };

  const tenantUsers = users.filter((user) => user.role === "tenant");
  const primaryUsers = users.filter((user) => user.role !== "tenant");

  if (primaryUsers.length) {
    return { user: primaryUsers[0] };
  }

  if (tenantUsers.length === 1 && !propertyName && !unitNumber) {
    return { user: tenantUsers[0] };
  }

  if (!propertyName && !unitNumber) {
    return {
      user: null,
      error: "একই মোবাইল/ইমেইলে একাধিক টেন্যান্ট আছে। প্রপার্টির নাম ও ইউনিট নম্বর দিন।",
      statusCode: 409,
    };
  }

  const propertyFilter = {};
  if (propertyName) propertyFilter.propertyName = new RegExp(`^${String(propertyName).trim()}$`, "i");
  if (unitNumber) propertyFilter.unitNumber = new RegExp(`^${String(unitNumber).trim()}$`, "i");

  const matchingProperties = await Property.find(propertyFilter).select("_id");
  const propertyIds = new Set(matchingProperties.map((property) => String(property._id)));
  const matchedTenant = tenantUsers.find(
    (user) => user.propertyId && propertyIds.has(String(user.propertyId)),
  );

  if (!matchedTenant) {
    return {
      user: null,
      error: "এই প্রপার্টি/ইউনিটের জন্য টেন্যান্ট অ্যাকাউন্ট পাওয়া যায়নি",
      statusCode: 404,
    };
  }

  return { user: matchedTenant };
}

// ─── Login (email or phone) ──────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, phone, password, propertyName, unitNumber } = req.body;
    const identifier = email || normalizeBDPhone(phone);
    if (!identifier || !password)
      return res.status(400).json({ success: false, message: "লগইন তথ্য দিন" });

    const { user, error, statusCode } = await resolvePropertyScopedUser({
      identifier,
      propertyName,
      unitNumber,
      select: "+password",
    });

    if (error) {
      return res.status(statusCode || 400).json({ success: false, message: error });
    }

    if (!user || !(await user.comparePassword(password)))
      return res
        .status(401)
        .json({ success: false, message: "মোবাইল/ইমেইল বা পাসওয়ার্ড ভুল" });

    if (!user.isActive)
      return res.status(403).json({
        success: false,
        message: "অ্যাকাউন্ট নিষ্ক্রিয়। অ্যাডমিনের সাথে যোগাযোগ করুন।",
      });

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);

    res.json({
      success: true,
      token,
      redirect: REDIRECT[user.role],
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: normalizeBDPhone(user.phone),
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        language: user.language || "bn",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res) => {
  let profile = null;
  if (req.user.role === "landlord") {
    profile = await LandlordProfile.findOne({ userId: req.user._id }).select(
      "plan",
    );
  } else if (req.user.role === "tenant" && req.user.landlordId) {
    profile = await LandlordProfile.findOne({
      userId: req.user.landlordId,
    }).select("plan");
  }

  const plan = profile?.plan ? await getPlanConfig(profile.plan) : null;
  const [adsEnabledRaw, adsClientRaw, adsSlotRaw, adsLayoutRaw] =
    await Promise.all([
      SystemConfig.getDecrypted("GOOGLE_ADS_ENABLED"),
      SystemConfig.getDecrypted("GOOGLE_ADS_CLIENT_ID"),
      SystemConfig.getDecrypted("GOOGLE_ADS_SLOT_ID"),
      SystemConfig.getDecrypted("GOOGLE_ADS_LAYOUT"),
    ]);
  const adsEnabled =
    String(adsEnabledRaw ?? process.env.GOOGLE_ADS_ENABLED ?? "")
      .toLowerCase()
      .trim() === "true";
  const adsClient = adsClientRaw ?? process.env.GOOGLE_ADS_CLIENT_ID ?? "";
  const adsSlot = adsSlotRaw ?? process.env.GOOGLE_ADS_SLOT_ID ?? "";
  const adsLayout =
    adsLayoutRaw ?? process.env.GOOGLE_ADS_LAYOUT ?? "default";

  const unread = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });
  res.json({
    success: true,
    user: req.user,
    unreadNotifications: unread,
    planKey: profile?.plan || null,
    planFeatures: plan,
    googleAds: {
      enabled: adsEnabled,
      allowedByPlan: Boolean(plan?.googleAds),
      active: adsEnabled && Boolean(plan?.googleAds) && Boolean(adsClient) && Boolean(adsSlot),
      clientId: adsClient,
      slotId: adsSlot,
      layout: adsLayout,
    },
  });
};

// ─── Change Password ─────────────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!(await user.comparePassword(currentPassword)))
      return res
        .status(401)
        .json({ success: false, message: "বর্তমান পাসওয়ার্ড ভুল" });

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: user.phone
        ? "পাসওয়ার্ড পরিবর্তন হয়েছে এবং মোবাইলে SMS পাঠানো হয়েছে"
        : "পাসওয়ার্ড পরিবর্তন হয়েছে",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Forgot Password (SMS OTP, fallback to email) ───────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { phone, email, propertyName, unitNumber } = req.body;
    const identifier = phone || email;
    const requestedVia = phone ? "sms" : "email";
    if (!identifier)
      return res
        .status(400)
        .json({ success: false, message: "মোবাইল নম্বর বা ইমেইল দিন" });

    const { user, error, statusCode } = await resolvePropertyScopedUser({
      identifier,
      propertyName,
      unitNumber,
    });
    if (error) {
      return res.status(statusCode || 400).json({ success: false, message: error });
    }
    if (!user)
      return res.status(404).json({
        success: false,
        message: "এই তথ্যে কোনো অ্যাকাউন্ট পাওয়া যায়নি",
      });

    if (user.role === "tenant" && (user.forgotPasswordUsedCount || 0) >= 3) {
      return res.status(403).json({
        success: false,
        message:
          "ভাড়াটে অ্যাকাউন্টে সর্বোচ্চ ৩ বার পাসওয়ার্ড রিসেট করা যাবে। আরও দরকার হলে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।",
      });
    }

    if (requestedVia === "sms" && user.role === "tenant" && user.phone && user.landlordId) {
      const quota = await hasSmsQuota(user.landlordId, 1);
      if (!quota.allowed)
        return res.status(403).json({
          success: false,
          message: "বাড়ীওয়ালার SMS লিমিট শেষ। অ্যাডমিনের সাথে যোগাযোগ করুন।",
        });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.resetOtp = otp;
    user.resetOtpExpiry = expiry;
    await user.save({ validateBeforeSave: false });

    let sent = false;

    if (requestedVia === "sms") {
      if (!user.phone) {
        return res.status(400).json({
          success: false,
          message: "এই অ্যাকাউন্টে মোবাইল নম্বর নেই",
        });
      }
      const smsResult = await sendOtpSMS({
        landlordId: user.role === "tenant" ? user.landlordId : undefined,
        phone: normalizeBDPhone(user.phone),
        otp,
      });
      sent = smsResult?.success;
    } else {
      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: "এই অ্যাকাউন্টে ইমেইল নেই",
        });
      }
      try {
        const { sendEmail } = await import("../services/email.service.js");
        await sendEmail({
          to: user.email,
          subject: "BariManager - পাসওয়ার্ড রিসেট OTP",
          html: `<p>আপনার OTP: <strong>${otp}</strong>। ৫ মিনিটের মধ্যে ব্যবহার করুন।</p>`,
        });
        sent = true;
      } catch {
        sent = false;
      }
    }

    if (!sent) {
      console.error(`❌ Could not send OTP via ${requestedVia}`);
      return res.status(500).json({
        success: false,
        message: requestedVia === "sms" ? "OTP SMS পাঠানো যায়নি" : "OTP ইমেইল পাঠানো যায়নি",
      });
    }

    if (user.role === "tenant") {
      user.forgotPasswordUsedCount = (user.forgotPasswordUsedCount || 0) + 1;
      await user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: "OTP পাঠানো হয়েছে",
      via: requestedVia,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verify OTP & Reset Password ─────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { phone, email, propertyName, unitNumber, otp, newPassword } = req.body;
    if (!otp || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "OTP এবং নতুন পাসওয়ার্ড দিন" });

    const identifier = normalizeBDPhone(phone) || email;
    const { user, error, statusCode } = await resolvePropertyScopedUser({
      identifier,
      propertyName,
      unitNumber,
      select: "+resetOtp +resetOtpExpiry",
    });
    if (error) {
      return res.status(statusCode || 400).json({ success: false, message: error });
    }
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "অ্যাকাউন্ট পাওয়া যায়নি" });

    if (!user.resetOtp || user.resetOtp !== otp)
      return res.status(400).json({ success: false, message: "OTP সঠিক নয়" });

    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date())
      return res
        .status(400)
        .json({ success: false, message: "OTP মেয়াদ শেষ। আবার চেষ্টা করুন।" });

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: "পাসওয়ার্ড পরিবর্তন হয়েছে। লগইন করুন।",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: reset any user's password ────────────────────────────────────────
export const adminResetPassword = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "এই কাজের অনুমতি নেই" });
    }

    const { userId, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি" });

    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    // Notify via SMS/email
    if (user.phone) {
      await sendPasswordResetSMS({
        landlordId: user.role === "tenant" ? user.landlordId : undefined,
        name: user.name,
        phone: normalizeBDPhone(user.phone),
        newPassword,
      });
    }

    res.json({ success: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে" });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.json({ success: true, message: "লগআউট সফল" });
};

export const updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!["bn", "en"].includes(language))
      return res
        .status(400)
        .json({ success: false, message: "ভাষা bn অথবা en হতে হবে" });
    await User.findByIdAndUpdate(req.user._id, { language });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
