import SystemConfig from "../models/SystemConfig.model.js";
import User from "../models/User.model.js";
import Tenant from "../models/Tenant.model.js";
import Bill from "../models/Bill.model.js";
import Payment from "../models/Payment.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import { getPlanCatalog, savePlanCatalog } from "../utils/plans.js";

// Default config schema (what keys exist and their metadata)
const CONFIG_SCHEMA = [
  // SMTP
  {
    key: "SMTP_HOST",
    category: "smtp",
    label: "SMTP সার্ভার",
    isSecret: false,
  },
  { key: "SMTP_PORT", category: "smtp", label: "SMTP পোর্ট", isSecret: false },
  { key: "SMTP_USER", category: "smtp", label: "SMTP ইউজার", isSecret: false },
  {
    key: "SMTP_PASS",
    category: "smtp",
    label: "SMTP পাসওয়ার্ড",
    isSecret: true,
  },
  {
    key: "SMTP_FROM",
    category: "smtp",
    label: "প্রেরক ইমেইল",
    isSecret: false,
  },
  // SMS
  {
    key: "SMS_PROVIDER",
    category: "sms",
    label: "SMS প্রোভাইডার (ssl_wireless/twilio/bdbulksms/custom)",
    isSecret: false,
  },
  { key: "SMS_API_KEY", category: "sms", label: "SMS API কী", isSecret: true },
  {
    key: "SMS_AUTH_TOKEN",
    category: "sms",
    label: "SMS Auth Token",
    isSecret: true,
  },
  {
    key: "SMS_SENDER_ID",
    category: "sms",
    label: "SMS Sender ID",
    isSecret: false,
  },
  {
    key: "SMS_GATEWAY_URL",
    category: "sms",
    label: "Custom SMS Gateway URL",
    isSecret: false,
  },
  // Payment
  {
    key: "BKASH_APP_KEY",
    category: "payment",
    label: "bKash App Key",
    isSecret: true,
  },
  {
    key: "BKASH_APP_SECRET",
    category: "payment",
    label: "bKash App Secret",
    isSecret: true,
  },
  {
    key: "BKASH_USERNAME",
    category: "payment",
    label: "bKash Username",
    isSecret: true,
  },
  {
    key: "BKASH_PASSWORD",
    category: "payment",
    label: "bKash Password",
    isSecret: true,
  },
  // App
  {
    key: "FRONTEND_URL",
    category: "app",
    label: "Frontend URL",
    isSecret: false,
  },
  { key: "API_URL", category: "app", label: "API URL", isSecret: false },
  // Google Ads
  {
    key: "GOOGLE_ADS_ENABLED",
    category: "ads",
    label: "Google Ads চালু (true/false)",
    isSecret: false,
  },
  {
    key: "GOOGLE_ADS_CLIENT_ID",
    category: "ads",
    label: "Google Ads Client ID (ca-pub-...)",
    isSecret: false,
  },
  {
    key: "GOOGLE_ADS_SLOT_ID",
    category: "ads",
    label: "Google Ads Slot ID",
    isSecret: false,
  },
  {
    key: "GOOGLE_ADS_LAYOUT",
    category: "ads",
    label: "Google Ads Layout (default/in-article/in-feed)",
    isSecret: false,
  },
  // Security
  {
    key: "JWT_SECRET",
    category: "security",
    label: "JWT Secret",
    isSecret: true,
  },
  {
    key: "JWT_EXPIRES_IN",
    category: "security",
    label: "JWT Expiry",
    isSecret: false,
  },
];

export const getConfigs = async (req, res, next) => {
  try {
    const dbConfigs = await SystemConfig.find({});
    const dbMap = {};
    for (const c of dbConfigs) {
      dbMap[c.key] = {
        value: c.decryptedValue(),
        category: c.category,
        label: c.label,
        isSecret: c.isSecret,
        updatedAt: c.updatedAt,
      };
    }

    // Merge schema with DB values (fallback to process.env)
    const result = CONFIG_SCHEMA.map((schema) => ({
      key: schema.key,
      category: schema.category,
      label: schema.label,
      isSecret: schema.isSecret,
      value: dbMap[schema.key]?.value ?? (process.env[schema.key] || ""),
      inDb: !!dbMap[schema.key],
      updatedAt: dbMap[schema.key]?.updatedAt || null,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateConfig = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key)
      return res.status(400).json({ success: false, message: "key দিন" });

    const schema = CONFIG_SCHEMA.find((s) => s.key === key);
    const meta = schema || { category: "other", label: key, isSecret: false };

    await SystemConfig.setConfig(key, value, {
      category: meta.category,
      label: meta.label,
      isSecret: meta.isSecret,
      updatedBy: req.user._id,
    });

    // Also update process.env so it takes effect immediately (without restart)
    process.env[key] = value;

    res.json({ success: true, message: "কনফিগ আপডেট হয়েছে" });
  } catch (err) {
    next(err);
  }
};

export const bulkUpdateConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body; // [{ key, value }]
    if (!Array.isArray(configs))
      return res
        .status(400)
        .json({ success: false, message: "configs array দিন" });

    for (const { key, value } of configs) {
      if (!key) continue;
      const schema = CONFIG_SCHEMA.find((s) => s.key === key);
      const meta = schema || { category: "other", label: key, isSecret: false };
      await SystemConfig.setConfig(key, value || "", {
        ...meta,
        updatedBy: req.user._id,
      });
      if (value) process.env[key] = value;
    }

    res.json({ success: true, message: "সব কনফিগ আপডেট হয়েছে" });
  } catch (err) {
    next(err);
  }
};

export const deleteConfig = async (req, res, next) => {
  try {
    await SystemConfig.deleteOne({ key: req.params.key });
    res.json({ success: true, message: "কনফিগ মুছে গেছে" });
  } catch (err) {
    next(err);
  }
};

// Full system stats for super admin
export const systemStats = async (req, res, next) => {
  try {
    const [
      totalLandlords,
      totalTenants,
      totalBills,
      totalPayments,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ role: "landlord" }),
      Tenant.countDocuments({ isActive: true }),
      Bill.countDocuments({}),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email phone role createdAt isActive"),
    ]);

    res.json({
      success: true,
      data: {
        totalLandlords,
        totalTenants,
        totalBills,
        totalRevenue: totalPayments[0]?.total || 0,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Super admin can reset any user's password
export const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি" });

    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({ success: true, message: "পাসওয়ার্ড রিসেট হয়েছে" });
  } catch (err) {
    next(err);
  }
};

// Update landlord's bill settings
export const updateLandlordBillSettings = async (req, res, next) => {
  try {
    const { landlordId, billGenerationDay, billDueDays } = req.body;
    const profile = await LandlordProfile.findOneAndUpdate(
      { userId: landlordId },
      { billGenerationDay, billDueDays },
      { new: true },
    );
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "প্রোফাইল পাওয়া যায়নি" });
    res.json({
      success: true,
      message: "বিল সেটিং আপডেট হয়েছে",
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getPlanCatalog() });
  } catch (err) {
    next(err);
  }
};

export const updatePlans = async (req, res, next) => {
  try {
    const { plans } = req.body;
    if (!plans || typeof plans !== "object") {
      return res.status(400).json({ success: false, message: "plans object দিন" });
    }

    for (const [key, plan] of Object.entries(plans)) {
      if (!plan || typeof plan !== "object") {
        return res.status(422).json({ success: false, message: `${key} প্ল্যান সঠিক নয়` });
      }
      if (!plan.name || Number(plan.price) < 0 || Number(plan.smsLimit) < 0 || Number(plan.flatLimit) < 1 || Number(plan.reportMonths) < 1) {
        return res.status(422).json({
          success: false,
          message: `${plan.name || key} প্ল্যানে নাম, মূল্য, SMS, ফ্ল্যাট ও রিপোর্ট সীমা সঠিক দিন`,
        });
      }
    }

    const saved = await savePlanCatalog(plans, req.user._id);
    await Promise.all(
      Object.entries(saved).map(([planKey, plan]) =>
        LandlordProfile.updateMany(
          { plan: planKey },
          {
            smsLimit: plan.smsLimit,
            flatLimit: plan.flatLimit,
            reportMonths: plan.reportMonths,
            limitBreachNotified: false,
          },
        ),
      ),
    );
    res.json({ success: true, message: "প্ল্যান আপডেট হয়েছে", data: saved });
  } catch (err) {
    next(err);
  }
};
