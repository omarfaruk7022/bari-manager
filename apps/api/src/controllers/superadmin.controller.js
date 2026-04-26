import SystemConfig from "../models/SystemConfig.model.js";
import User from "../models/User.model.js";
import Tenant from "../models/Tenant.model.js";
import Bill from "../models/Bill.model.js";
import Payment from "../models/Payment.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import Subscription from "../models/Subscription.model.js";
import SystemExpense from "../models/SystemExpense.model.js";
import { getPlanCatalog, savePlanCatalog } from "../utils/plans.js";

const normalizeSubscriptionPrice = (subscription, plans = {}) => {
  const storedApprovedTotalPrice = subscription?.approvedTotalPrice;
  const approvedTotalPrice =
    storedApprovedTotalPrice === null || storedApprovedTotalPrice === undefined
      ? NaN
      : Number(storedApprovedTotalPrice);
  if (Number.isFinite(approvedTotalPrice) && approvedTotalPrice >= 0) {
    return approvedTotalPrice;
  }

  if (subscription?.approvalCategory === "personal") return 0;

  const directPrice = Number(subscription?.requestedPlanPrice);
  const approvalMonths = Number(subscription?.approvalMonths);
  const months = Number.isInteger(approvalMonths) && approvalMonths > 0 ? approvalMonths : 1;
  if (Number.isFinite(directPrice) && directPrice > 0) return directPrice * months;

  const planKey = subscription?.requestedPlan || "basic";
  const fallbackPrice = Number(plans?.[planKey]?.price ?? plans?.basic?.price ?? 0);
  return Number.isFinite(fallbackPrice) ? fallbackPrice * months : 0;
};

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
  {
    key: "TELEGRAM_BOT_TOKEN",
    category: "other",
    label: "Telegram Bot Token",
    isSecret: true,
  },
  {
    key: "TELEGRAM_CHAT_ID",
    category: "other",
    label: "Telegram Chat ID",
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
    const plans = await getPlanCatalog();
    const [
      totalLandlords,
      totalTenants,
      totalBills,
      totalPayments,
      recentUsers,
      totalSystemExpenses,
      approvedSubscriptions,
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
      SystemExpense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Subscription.find({ status: "approved" })
        .select("requestedPlan requestedPlanPrice approvalCategory approvalMonths approvedTotalPrice")
        .lean(),
    ]);

    const totalExpense = totalSystemExpenses[0]?.total || 0;
    const totalSubscriptionRevenue = approvedSubscriptions.reduce(
      (sum, item) => sum + normalizeSubscriptionPrice(item, plans),
      0,
    );

    res.json({
      success: true,
      data: {
        totalLandlords,
        totalTenants,
        totalBills,
        totalRevenue: totalPayments[0]?.total || 0,
        totalSubscriptionRevenue,
        totalExpense,
        totalProfit: totalSubscriptionRevenue - totalExpense,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const listSystemExpenses = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.category) filter.category = req.query.category;

    const expenses = await SystemExpense.find(filter).sort({ date: -1, createdAt: -1 }).limit(200);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
};

export const createSystemExpense = async (req, res, next) => {
  try {
    const expense = await SystemExpense.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "সিস্টেম খরচ যুক্ত হয়েছে", data: expense });
  } catch (err) {
    next(err);
  }
};

export const updateSystemExpense = async (req, res, next) => {
  try {
    const expense = await SystemExpense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: "সিস্টেম খরচ পাওয়া যায়নি" });
    }
    res.json({ success: true, message: "সিস্টেম খরচ আপডেট হয়েছে", data: expense });
  } catch (err) {
    next(err);
  }
};

export const removeSystemExpense = async (req, res, next) => {
  try {
    const expense = await SystemExpense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "সিস্টেম খরচ পাওয়া যায়নি" });
    }
    res.json({ success: true, message: "সিস্টেম খরচ মুছে গেছে" });
  } catch (err) {
    next(err);
  }
};

export const subscriptionIncomeReport = async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const plans = await getPlanCatalog();

    const approvedSubs = await Subscription.find({
      status: "approved",
      reviewedAt: { $gte: start, $lt: end },
    }).lean();

    const monthlyBreakdown = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      const monthSubscriptions = approvedSubs.filter((subscription) => {
        const stamp = subscription.reviewedAt || subscription.createdAt;
        return stamp && stamp.toISOString().slice(0, 7) === key;
      });
      const revenue = monthSubscriptions.reduce(
        (sum, subscription) => sum + normalizeSubscriptionPrice(subscription, plans),
        0,
      );

      return {
        month: key,
        revenue,
        profit: revenue,
        subscriptions: monthSubscriptions.length,
      };
    });

    const totalRevenue = monthlyBreakdown.reduce((sum, item) => sum + item.revenue, 0);

    res.json({
      success: true,
      data: {
        year,
        totalRevenue,
        totalProfit: totalRevenue,
        totalSubscriptions: approvedSubs.length,
        monthlyBreakdown,
        note: "সাবস্ক্রিপশন-সংক্রান্ত খরচ আলাদা করে ট্র্যাক করা হচ্ছে না, তাই profit বর্তমানে revenue-এর সমান দেখানো হচ্ছে।",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const systemFinanceReport = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = Number(req.query.year || currentYear);
    const month = req.query.month || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const plans = await getPlanCatalog();

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const [allApprovedSubs, allExpenseAgg, monthApprovedSubs, monthExpenseAgg, yearApprovedSubs] =
      await Promise.all([
        Subscription.find({ status: "approved" })
          .select("requestedPlan requestedPlanPrice approvalCategory approvalMonths approvedTotalPrice reviewedAt createdAt")
          .lean(),
        SystemExpense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
        Subscription.find({
          status: "approved",
          reviewedAt: { $gte: monthStart, $lt: monthEnd },
        })
          .select("requestedPlan requestedPlanPrice approvalCategory approvalMonths approvedTotalPrice reviewedAt createdAt")
          .lean(),
        SystemExpense.aggregate([
          {
            $match: {
              date: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Subscription.find({
          status: "approved",
          reviewedAt: { $gte: yearStart, $lt: yearEnd },
        })
          .select("requestedPlan requestedPlanPrice approvalCategory approvalMonths approvedTotalPrice reviewedAt createdAt")
          .lean(),
      ]);

    const yearExpenses = await SystemExpense.find({
      date: { $gte: yearStart, $lt: yearEnd },
    })
      .select("amount date")
      .lean();

    const monthlyBreakdown = Array.from({ length: 12 }, (_, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
      const revenue = yearApprovedSubs
        .filter((item) => (item.reviewedAt || item.createdAt)?.toISOString().slice(0, 7) === monthKey)
        .reduce((sum, item) => sum + normalizeSubscriptionPrice(item, plans), 0);
      const expenses = yearExpenses
        .filter((item) => item.date?.toISOString().slice(0, 7) === monthKey)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        month: monthKey,
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });

    const totalRevenue = allApprovedSubs.reduce(
      (sum, item) => sum + normalizeSubscriptionPrice(item, plans),
      0,
    );
    const totalExpenses = allExpenseAgg[0]?.total || 0;
    const monthlyRevenue = monthApprovedSubs.reduce(
      (sum, item) => sum + normalizeSubscriptionPrice(item, plans),
      0,
    );
    const monthlyExpenses = monthExpenseAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        month,
        year,
        lifetime: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
        },
        monthly: {
          revenue: monthlyRevenue,
          expenses: monthlyExpenses,
          profit: monthlyRevenue - monthlyExpenses,
          approvedSubscriptions: monthApprovedSubs.length || 0,
          expenseEntries: monthExpenseAgg[0]?.count || 0,
        },
        yearly: {
          revenue: monthlyBreakdown.reduce((sum, item) => sum + item.revenue, 0),
          expenses: monthlyBreakdown.reduce((sum, item) => sum + item.expenses, 0),
          profit: monthlyBreakdown.reduce((sum, item) => sum + item.profit, 0),
        },
        monthlyBreakdown,
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
      if (!plan.name || Number(plan.price) < 0 || Number(plan.smsLimit) < 0 || Number(plan.propertyLimit) < 1 || Number(plan.flatLimit) < 1 || Number(plan.reportMonths) < 1) {
        return res.status(422).json({
          success: false,
          message: `${plan.name || key} প্ল্যানে নাম, মূল্য, SMS, প্রপার্টি, ফ্ল্যাট ও রিপোর্ট সীমা সঠিক দিন`,
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
            propertyLimit: plan.propertyLimit,
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
