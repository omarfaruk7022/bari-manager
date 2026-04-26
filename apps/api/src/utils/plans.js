import Bill from "../models/Bill.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import Property from "../models/Property.model.js";
import SystemConfig from "../models/SystemConfig.model.js";

export const DEFAULT_PLAN_CONFIG = {
  basic: {
    name: "Basic",
    price: 499,
    smsLimit: 20,
    propertyLimit: 1,
    flatLimit: 5,
    reportMonths: 1,
    autoBill: false,
    googleAds: false,
    communityChat: false,
    features: ["৫ ফ্ল্যাট", "২০ SMS", "১ মাস রিপোর্ট"],
  },
  standard: {
    name: "Standard",
    price: 999,
    smsLimit: 100,
    propertyLimit: 3,
    flatLimit: 20,
    reportMonths: 6,
    autoBill: true,
    googleAds: false,
    communityChat: true,
    features: ["২০ ফ্ল্যাট", "১০০ SMS", "৬ মাস রিপোর্ট", "অটো বিল", "কমিউনিটি চ্যাট"],
  },
  premium: {
    name: "Premium",
    price: 1999,
    smsLimit: 300,
    propertyLimit: 10,
    flatLimit: 75,
    reportMonths: 12,
    autoBill: true,
    googleAds: false,
    communityChat: true,
    features: ["৭৫ ফ্ল্যাট", "৩০০ SMS", "১২ মাস রিপোর্ট", "অটো বিল", "কমিউনিটি চ্যাট"],
  },
  enterprise: {
    name: "Enterprise",
    price: 4999,
    smsLimit: 1000,
    propertyLimit: 30,
    flatLimit: 300,
    reportMonths: 36,
    autoBill: true,
    googleAds: false,
    communityChat: true,
    features: ["৩০০ ফ্ল্যাট", "১০০০ SMS", "৩৬ মাস রিপোর্ট", "অটো বিল", "কমিউনিটি চ্যাট"],
  },
};

export const DEFAULT_PLAN = "basic";
export const PLAN_CONFIG_KEY = "SUBSCRIPTION_PLANS";

export const normalizePlanCatalog = (catalog = {}) => {
  const normalized = {};
  for (const [key, defaults] of Object.entries(DEFAULT_PLAN_CONFIG)) {
    const incoming = catalog[key] || {};
    normalized[key] = {
      ...defaults,
      ...incoming,
      price: Number(incoming.price ?? defaults.price),
      smsLimit: Number(incoming.smsLimit ?? defaults.smsLimit),
      propertyLimit: Number(incoming.propertyLimit ?? defaults.propertyLimit),
      flatLimit: Number(incoming.flatLimit ?? defaults.flatLimit),
      reportMonths: Number(incoming.reportMonths ?? defaults.reportMonths),
      autoBill: Boolean(incoming.autoBill ?? defaults.autoBill),
      googleAds: Boolean(incoming.googleAds ?? defaults.googleAds),
      communityChat: Boolean(incoming.communityChat ?? defaults.communityChat),
      features: Array.isArray(incoming.features)
        ? incoming.features
        : defaults.features,
    };
  }
  return normalized;
};

export const getPlanCatalog = async () => {
  const raw = await SystemConfig.getDecrypted(PLAN_CONFIG_KEY);
  if (!raw) return normalizePlanCatalog(DEFAULT_PLAN_CONFIG);

  try {
    return normalizePlanCatalog(JSON.parse(raw));
  } catch {
    return normalizePlanCatalog(DEFAULT_PLAN_CONFIG);
  }
};

export const savePlanCatalog = async (catalog, updatedBy) => {
  const normalized = normalizePlanCatalog(catalog);
  await SystemConfig.setConfig(PLAN_CONFIG_KEY, JSON.stringify(normalized), {
    category: "app",
    label: "Subscription Plans",
    isSecret: false,
    updatedBy,
  });
  return normalized;
};

export const getPlanConfig = async (plan) => {
  const catalog = await getPlanCatalog();
  return catalog[plan] || catalog[DEFAULT_PLAN];
};

export const getLandlordProfileWithPlan = async (landlordId) => {
  const profile = await LandlordProfile.findOne({ userId: landlordId });
  const catalog = await getPlanCatalog();
  return {
    profile,
    planKey: profile?.plan || DEFAULT_PLAN,
    plan: catalog[profile?.plan] || catalog[DEFAULT_PLAN],
  };
};

export const ensureFlatLimit = async (landlordId) => {
  const { profile, plan } = await getLandlordProfileWithPlan(landlordId);
  const current = await Property.countDocuments({ landlordId, isUnit: { $ne: false } });
  const limit = profile?.flatLimit || plan.flatLimit;

  if (current >= limit) {
    return {
      allowed: false,
      message: `${plan.name} প্ল্যানে সর্বোচ্চ ${limit}টি ফ্ল্যাট/ইউনিট রাখা যাবে`,
    };
  }

  return { allowed: true, limit, current };
};

export const ensurePropertyLimit = async (landlordId, propertyName) => {
  const { profile, plan } = await getLandlordProfileWithPlan(landlordId);
  const limit = profile?.propertyLimit || plan.propertyLimit || 1;
  const normalizedName = String(propertyName || "").trim();

  if (!normalizedName) {
    return { allowed: false, message: "প্রপার্টি/বিল্ডিংয়ের নাম দিন" };
  }

  const currentNames = await Property.distinct("propertyName", { landlordId });
  const current = currentNames.filter(Boolean).length;
  const alreadyExists = currentNames.some(
    (name) => String(name || "").trim().toLowerCase() === normalizedName.toLowerCase(),
  );

  if (!alreadyExists && current >= limit) {
    return {
      allowed: false,
      message: `${plan.name} প্ল্যানে সর্বোচ্চ ${limit}টি প্রপার্টি/বিল্ডিং রাখা যাবে`,
    };
  }

  return { allowed: true, limit, current, alreadyExists };
};

export const ensureReportMonthAccess = async (landlordId, month) => {
  const { profile, plan } = await getLandlordProfileWithPlan(landlordId);
  const months = profile?.reportMonths || plan.reportMonths;
  const latestBill = await Bill.findOne({ landlordId }).sort({ month: -1 }).select("month");
  const latestMonth = latestBill?.month || new Date().toISOString().slice(0, 7);
  const latest = new Date(`${latestMonth}-01`);
  const requested = new Date(`${month}-01`);
  const earliest = new Date(latest);
  earliest.setMonth(earliest.getMonth() - months + 1);

  if (requested < earliest) {
    return {
      allowed: false,
      message: `${plan.name} প্ল্যানে সর্বশেষ ${months} মাসের রিপোর্ট দেখা যাবে`,
      months,
    };
  }

  return { allowed: true, months };
};

export const hasSmsQuota = async (landlordId, count = 1) => {
  const { profile } = await getLandlordProfileWithPlan(landlordId);
  if (!profile) return { allowed: true, remaining: count };

  const remaining = Math.max(0, (profile.smsLimit || 0) - (profile.smsUsed || 0));
  return {
    allowed: remaining >= count,
    remaining,
    message: `SMS লিমিট শেষ। বাকি আছে ${remaining}, প্রয়োজন ${count}`,
  };
};
