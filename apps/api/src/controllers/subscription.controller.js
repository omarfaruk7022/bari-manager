import crypto from "crypto";
import Subscription from "../models/Subscription.model.js";
import User from "../models/User.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import {
  sendCredentialsEmail,
  sendRejectionEmail,
} from "../services/email.service.js";
import {
  sendCredentialsSMS,
  sendRejectionSMS,
} from "../services/sms.service.js";
import { sendTelegramLandlordRequestAlert } from "../services/telegram.service.js";
import { DEFAULT_PLAN, getPlanCatalog, getPlanConfig } from "../utils/plans.js";

export const plans = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getPlanCatalog() });
  } catch (err) {
    next(err);
  }
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
// Public — anyone can apply for a subscription
export const apply = async (req, res, next) => {
  try {
    const normalizedPhone = normalizeBDPhone(req.body.phone);
    const email = req.body.email?.trim();

    let existing;

    if (email) {
      existing = await Subscription.findOne({
        email,
        status: { $in: ["pending", "approved"] },
      });
    } else {
      existing = await Subscription.findOne({
        phone: normalizedPhone,
        status: { $in: ["pending", "approved"] },
      });
    }

    if (existing)
      return res.status(409).json({
        success: false,
        message: "এই তথ্য দিয়ে ইতোমধ্যে আবেদন করা হয়েছে",
      });

    const selectedPlan = await getPlanConfig(req.body.requestedPlan);
    const sub = await Subscription.create({
      ...req.body,
      email: email || undefined, // clean
      phone: normalizedPhone,
      requestedPlan: req.body.requestedPlan || DEFAULT_PLAN,
      requestedPlanPrice: selectedPlan.price,
    });

    res.status(201).json({
      success: true,
      message: "আবেদন সফল। অ্যাডমিন শীঘ্রই যোগাযোগ করবেন।",
      data: sub,
    });

    sendTelegramLandlordRequestAlert(sub).catch((err) =>
      console.error("Telegram alert error (non-fatal):", err.message),
    );
  } catch (err) {
    next(err);
  }
};

// Admin — list all subscription requests
export const list = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const total = await Subscription.countDocuments(filter);
    const subs = await Subscription.find(filter)
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: subs, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
};

// Admin — approve a subscription & auto-create landlord account
export const approve = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "আবেদন পাওয়া যায়নি" });
    if (sub.status !== "pending")
      return res.status(400).json({
        success: false,
        message: "এই আবেদন ইতোমধ্যে প্রক্রিয়া করা হয়েছে",
      });

    const email = sub.email?.trim();
    const phone = normalizeBDPhone(sub.phone);

    let existingUser;

    if (email) {
      existingUser = await User.findOne({ email });
    } else {
      existingUser = await User.findOne({ phone });
    }
    if (existingUser)
      return res.status(409).json({
        success: false,
        message: "এই তথ্য দিয়ে ইতোমধ্যে অ্যাকাউন্ট আছে",
      });

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) tempPassword += chars[bytes[i] % chars.length];

    const userPayload = {
      name: sub.applicantName,
      phone,
      password: tempPassword,
      role: "landlord",
      mustChangePassword: true,
    };

    if (email) {
      userPayload.email = email;
    }

    const user = await User.create(userPayload);

    const planKey = req.body.requestedPlan || sub.requestedPlan || DEFAULT_PLAN;
    const selectedPlan = await getPlanConfig(planKey);
    sub.requestedPlan = planKey;
    sub.requestedPlanPrice = selectedPlan.price;

    await LandlordProfile.create({
      userId: user._id,
      propertyName: sub.propertyName || sub.applicantName + "-এর বাড়ি",
      propertyAddress: sub.propertyAddress || "",
      phone: normalizeBDPhone(sub.phone),
      totalUnits: sub.totalUnits || 0,
      subscriptionId: sub._id,
      plan: planKey,
      smsLimit: selectedPlan.smsLimit,
      flatLimit: selectedPlan.flatLimit,
      reportMonths: selectedPlan.reportMonths,
    });

    sub.status = "approved";
    sub.landlordUserId = user._id;
    sub.reviewedBy = req.user._id;
    sub.reviewedAt = new Date();
    await sub.save();

    if (sub.email) {
      await sendCredentialsEmail({
        name: sub.applicantName,
        email: sub.email,
        password: tempPassword,
      });
    }

    await sendCredentialsSMS({
      name: sub.applicantName,
      phone: normalizeBDPhone(sub.phone),
      password: tempPassword,
      loginId: sub.phone,
    }).catch((err) =>
      console.error("SMS send error (non-fatal):", err.message),
    );

    res.json({
      success: true,
      message: "অনুমোদিত হয়েছে। লগইন তথ্য পাঠানো হয়েছে।",
    });
  } catch (err) {
    next(err);
  }
};

// Admin — reject a subscription
export const reject = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "আবেদন পাওয়া যায়নি" });
    if (sub.status !== "pending")
      return res.status(400).json({
        success: false,
        message: "এই আবেদন ইতোমধ্যে প্রক্রিয়া করা হয়েছে",
      });

    sub.status = "rejected";
    sub.rejectionReason = req.body.reason || "কারণ উল্লেখ করা হয়নি";
    sub.reviewedBy = req.user._id;
    sub.reviewedAt = new Date();
    await sub.save();

    await sendRejectionEmail({
      name: sub.applicantName,
      email: sub.email,
      reason: sub.rejectionReason,
    });

    await sendRejectionSMS({
      name: sub.applicantName,
      phone: normalizeBDPhone(sub.phone),
      reason: sub.rejectionReason,
    }).catch((err) =>
      console.error("SMS send error (non-fatal):", err.message),
    );

    res.json({ success: true, message: "আবেদন প্রত্যাখ্যান করা হয়েছে" });
  } catch (err) {
    next(err);
  }
};
