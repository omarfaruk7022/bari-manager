import User from "../models/User.model.js";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import Bill from "../models/Bill.model.js";
import Expense from "../models/Expense.model.js";
import Payment from "../models/Payment.model.js";
import Notification from "../models/Notification.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import Subscription from "../models/Subscription.model.js";
import { getPlanConfig } from "../utils/plans.js";
import { sendBillReadyNotification } from "../services/notification.service.js";

export const listLandlords = async (req, res, next) => {
  try {
    const landlords = await User.find({ role: "landlord" })
      .sort({ createdAt: -1 })
      .lean();

    const landlordIds = landlords.map((landlord) => landlord._id);
    const tenantCounts = await Tenant.aggregate([
      { $match: { landlordId: { $in: landlordIds }, isActive: true } },
      { $group: { _id: "$landlordId", total: { $sum: 1 } } },
    ]);
    const propertyCounts = await Property.aggregate([
      { $match: { landlordId: { $in: landlordIds } } },
      { $group: { _id: "$landlordId", total: { $sum: 1 } } },
    ]);

    const profileMap = new Map(
      (await LandlordProfile.find({ userId: { $in: landlordIds } }).lean()).map(
        (profile) => [String(profile.userId), profile],
      ),
    );
    const tenantCountMap = new Map(
      tenantCounts.map((item) => [String(item._id), item.total]),
    );
    const propertyCountMap = new Map(
      propertyCounts.map((item) => [String(item._id), item.total]),
    );

    const data = landlords.map((landlord) => ({
      ...landlord,
      activeTenants: tenantCountMap.get(String(landlord._id)) || 0,
      unitCount: propertyCountMap.get(String(landlord._id)) || 0,
      profile: profileMap.get(String(landlord._id)) || null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateLandlord = async (req, res, next) => {
  try {
    const plan = req.body.plan ? await getPlanConfig(req.body.plan) : null;
    const profileUpdate = {
      propertyName: req.body.propertyName,
      propertyAddress: req.body.propertyAddress,
      phone: req.body.phone,
      totalUnits: req.body.totalUnits,
    };

    if (req.body.plan) {
      profileUpdate.plan = req.body.plan;
      profileUpdate.smsLimit = req.body.smsLimit ?? plan.smsLimit;
      profileUpdate.flatLimit = req.body.flatLimit ?? plan.flatLimit;
      profileUpdate.reportMonths = req.body.reportMonths ?? plan.reportMonths;
      profileUpdate.limitBreachNotified = false;
    } else {
      if (req.body.smsLimit !== undefined) profileUpdate.smsLimit = req.body.smsLimit;
      if (req.body.flatLimit !== undefined) profileUpdate.flatLimit = req.body.flatLimit;
      if (req.body.reportMonths !== undefined) profileUpdate.reportMonths = req.body.reportMonths;
    }

    const landlord = await User.findOneAndUpdate(
      { _id: req.params.id, role: "landlord" },
      {
        $set: {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
        },
      },
      { new: true, runValidators: true },
    );

    if (!landlord)
      return res
        .status(404)
        .json({ success: false, message: "বাড়ীওয়ালা পাওয়া যায়নি" });

    const profile = await LandlordProfile.findOneAndUpdate(
      { userId: landlord._id },
      {
        $set: profileUpdate,
      },
      { new: true },
    );

    if (profile?.subscriptionId && req.body.plan) {
      const approvalMonths =
        profile.approvalCategory === "personal" ? 1 : Number(profile.approvalMonths || 1);
      await Subscription.findByIdAndUpdate(profile.subscriptionId, {
        requestedPlan: req.body.plan,
        requestedPlanPrice: plan.price,
        approvedTotalPrice: profile.approvalCategory === "personal" ? 0 : Number(plan.price || 0) * approvalMonths,
      });
    }

    res.json({
      success: true,
      message: "বাড়ীওয়ালা আপডেট হয়েছে",
      data: landlord,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleLandlord = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: "landlord" });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "বাড়ীওয়ালা পাওয়া যায়নি" });

    user.isActive = !user.isActive;
    await user.save();

    await User.updateMany(
      { landlordId: user._id, role: "tenant" },
      { isActive: user.isActive },
    );
    await Tenant.updateMany(
      { landlordId: user._id },
      { isActive: user.isActive },
    );

    res.json({
      success: true,
      message: user.isActive ? "সক্রিয় করা হয়েছে" : "নিষ্ক্রিয় করা হয়েছে",
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLandlord = async (req, res, next) => {
  try {
    const landlord = await User.findOne({
      _id: req.params.id,
      role: "landlord",
    });
    if (!landlord)
      return res
        .status(404)
        .json({ success: false, message: "বাড়ীওয়ালা পাওয়া যায়নি" });

    const tenants = await Tenant.find({ landlordId: landlord._id }).select(
      "_id userId propertyId",
    );
    const tenantIds = tenants.map((tenant) => tenant._id);
    const tenantUserIds = tenants
      .map((tenant) => tenant.userId)
      .filter(Boolean);

    await Promise.all([
      Property.updateMany(
        { landlordId: landlord._id, currentTenantId: { $in: tenantIds } },
        { isOccupied: false, currentTenantId: null },
      ),
      Bill.deleteMany({ landlordId: landlord._id }),
      Expense.deleteMany({ landlordId: landlord._id }),
      Payment.deleteMany({ landlordId: landlord._id }),
      Notification.deleteMany({
        $or: [
          { landlordId: landlord._id },
          { userId: { $in: [landlord._id, ...tenantUserIds] } },
        ],
      }),
      Property.deleteMany({ landlordId: landlord._id }),
      Tenant.deleteMany({ landlordId: landlord._id }),
      User.deleteMany({ _id: { $in: tenantUserIds } }),
      LandlordProfile.deleteOne({ userId: landlord._id }),
      landlord.deleteOne(),
    ]);

    res.json({
      success: true,
      message: "বাড়ীওয়ালা এবং সংশ্লিষ্ট তথ্য মুছে ফেলা হয়েছে",
    });
  } catch (err) {
    next(err);
  }
};

export const listTenants = async (req, res, next) => {
  try {
    const { active, search, landlordId } = req.query;
    const filter = {};

    if (landlordId) filter.landlordId = landlordId;
    if (active !== undefined) filter.isActive = active === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const tenants = await Tenant.find(filter)
      .populate("propertyId", "unitNumber floor monthlyRent")
      .populate("userId", "email isActive")
      .populate("landlordId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tenants });
  } catch (err) {
    next(err);
  }
};

export const getTenant = async (req, res, next) => {
  try {
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);
    const tenant = await Tenant.findById(req.params.id)
      .populate("propertyId", "unitNumber floor type monthlyRent")
      .populate("userId", "name email phone isActive lastLoginAt createdAt")
      .populate("landlordId", "name email phone")
      .lean();

    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    const [billStats, payments] = await Promise.all([
      Bill.aggregate([
        { $match: { tenantId: tenant._id } },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalDue: { $sum: "$dueAmount" },
            bills: { $sum: 1 },
          },
        },
      ]),
      Payment.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    const selectedMonthBill = await Bill.findOne({
      tenantId: tenant._id,
      month: selectedMonth,
    })
      .select("_id month totalAmount paidAmount dueAmount status dueDate")
      .lean();

    res.json({
      success: true,
      data: {
        ...tenant,
        selectedMonth,
        selectedMonthBill,
        billSummary: billStats[0] || { totalBilled: 0, totalPaid: 0, totalDue: 0, bills: 0 },
        recentPayments: payments,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const generateTenantBill = async (req, res, next) => {
  try {
    const { month = new Date().toISOString().slice(0, 7), year } = req.body;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "সঠিক মাস দিন (যেমন: 2026-04)" });
    }

    const tenant = await Tenant.findById(req.params.id)
      .populate("propertyId")
      .populate("userId");
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    const existing = await Bill.findOne({ tenantId: tenant._id, month });
    if (existing)
      return res.status(409).json({
        success: false,
        message: `${month} মাসের বিল ইতোমধ্যে তৈরি আছে`,
        data: existing,
      });

    const profile = await LandlordProfile.findOne({ userId: tenant.landlordId });
    const dueDays = profile?.billDueDays || 10;
    const [yr, mo] = month.split("-").map(Number);
    const dueDate = new Date(yr, mo - 1, Math.min(1 + dueDays, 28));

    const rentAmount = tenant.monthlyRent || tenant.propertyId?.monthlyRent || 0;
    const items = [{ type: "rent", amount: rentAmount }];
    const ud = tenant.utilityDefaults || {};
    if (ud.gasAmount > 0) items.push({ type: "gas", label: "গ্যাস বিল", amount: ud.gasAmount });
    if (ud.waterAmount > 0) items.push({ type: "water", label: "পানির বিল", amount: ud.waterAmount });
    if (ud.serviceCharge > 0) items.push({ type: "maintenance", label: "সার্ভিস চার্জ", amount: ud.serviceCharge });
    if (ud.garbageAmount > 0) items.push({ type: "garbage", label: "ময়লার বিল", amount: ud.garbageAmount });
    if (ud.electricityAmount > 0) items.push({ type: "electricity", label: "বিদ্যুৎ বিল", amount: ud.electricityAmount });

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const bill = await Bill.create({
      landlordId: tenant.landlordId,
      tenantId: tenant._id,
      propertyId: tenant.propertyId._id,
      month,
      year: Number(year || yr),
      items,
      totalAmount,
      dueAmount: totalAmount,
      dueDate,
      isAutoGenerated: false,
    });

    if (tenant.userId) await sendBillReadyNotification(tenant, bill);

    res.status(201).json({
      success: true,
      message: `${month} মাসের বিল তৈরি হয়েছে`,
      data: bill,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    const previousPropertyId = tenant.propertyId
      ? String(tenant.propertyId)
      : null;

    if (
      req.body.propertyId &&
      String(req.body.propertyId) !== previousPropertyId
    ) {
      const nextProperty = await Property.findById(req.body.propertyId);
      if (!nextProperty)
        return res
          .status(404)
          .json({ success: false, message: "ইউনিট পাওয়া যায়নি" });
      if (nextProperty.isOccupied)
        return res
          .status(400)
          .json({ success: false, message: "এই ইউনিটে ইতোমধ্যে ভাড়াটে আছে" });

      if (previousPropertyId) {
        await Property.findByIdAndUpdate(previousPropertyId, {
          isOccupied: false,
          currentTenantId: null,
        });
      }
      nextProperty.isOccupied = true;
      nextProperty.currentTenantId = tenant._id;
      await nextProperty.save();
      tenant.landlordId = nextProperty.landlordId;
    }

    Object.assign(tenant, {
      name: req.body.name ?? tenant.name,
      phone: req.body.phone ?? tenant.phone,
      email: req.body.email ?? tenant.email,
      nidNumber: req.body.nidNumber ?? tenant.nidNumber,
      moveInDate: req.body.moveInDate ?? tenant.moveInDate,
      moveOutDate: req.body.moveOutDate ?? tenant.moveOutDate,
      propertyId: req.body.propertyId ?? tenant.propertyId,
      monthlyRent: req.body.monthlyRent ?? tenant.monthlyRent,
      advanceAmount: req.body.advanceAmount ?? tenant.advanceAmount,
      emergencyContact: req.body.emergencyContact ?? tenant.emergencyContact,
      notes: req.body.notes ?? tenant.notes,
    });
    if (typeof req.body.isActive === "boolean")
      tenant.isActive = req.body.isActive;

    await tenant.save();

    if (tenant.userId) {
      await User.findByIdAndUpdate(tenant.userId, {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        isActive: tenant.isActive,
        landlordId: tenant.landlordId,
      });
    }

    res.json({ success: true, message: "ভাড়াটে আপডেট হয়েছে", data: tenant });
  } catch (err) {
    next(err);
  }
};

export const toggleTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    tenant.isActive = !tenant.isActive;
    if (!tenant.isActive) tenant.moveOutDate = new Date();
    await tenant.save();

    if (tenant.userId) {
      await User.findByIdAndUpdate(tenant.userId, {
        isActive: tenant.isActive,
      });
    }

    if (!tenant.isActive) {
      await Property.findByIdAndUpdate(tenant.propertyId, {
        isOccupied: false,
        currentTenantId: null,
      });
    } else {
      await Property.findByIdAndUpdate(tenant.propertyId, {
        isOccupied: true,
        currentTenantId: tenant._id,
      });
    }

    res.json({
      success: true,
      message: tenant.isActive
        ? "ভাড়াটে সক্রিয় করা হয়েছে"
        : "ভাড়াটে নিষ্ক্রিয় করা হয়েছে",
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate(
      "userId",
      "_id",
    );
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    await Promise.all([
      Property.findByIdAndUpdate(tenant.propertyId, {
        isOccupied: false,
        currentTenantId: null,
      }),
      Bill.deleteMany({ tenantId: tenant._id }),
      Payment.deleteMany({ tenantId: tenant._id }),
      Notification.deleteMany({
        $or: [
          { userId: tenant.userId?._id || null },
          { landlordId: tenant.landlordId, relatedBillId: { $in: [] } },
        ],
      }),
      tenant.userId
        ? User.findByIdAndDelete(tenant.userId._id)
        : Promise.resolve(),
      tenant.deleteOne(),
    ]);

    res.json({ success: true, message: "ভাড়াটে মুছে ফেলা হয়েছে" });
  } catch (err) {
    next(err);
  }
};

export const extendLandlordSms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addLimit } = req.body;

    if (!addLimit || isNaN(addLimit) || Number(addLimit) <= 0) {
      return res.status(400).json({ success: false, message: "সঠিক SMS লিমিট প্রদান করুন" });
    }

    const profile = await LandlordProfile.findOne({ userId: id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "বাড়ীওয়ালার প্রোফাইল পাওয়া যায়নি" });
    }

    profile.smsLimit += Number(addLimit);
    profile.limitBreachNotified = false;
    await profile.save();

    res.json({
      success: true,
      message: "SMS লিমিট সফলভাবে বাড়ানো হয়েছে",
      data: profile
    });
  } catch (err) {
    next(err);
  }
};
