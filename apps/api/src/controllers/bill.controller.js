import Bill from "../models/Bill.model.js";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import { sendBillReadyNotification } from "../services/notification.service.js";
import { getScopedLandlordId, isAdmin } from "../utils/access.js";

export const list = async (req, res, next) => {
  try {
    const { month, tenantId, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    const landlordId = getScopedLandlordId(req, { allowAllForAdmin: true });
    if (landlordId) filter.landlordId = landlordId;
    if (req.user.role === "tenant") {
      const tenant = await Tenant.findOne({ userId: req.user._id });
      if (!tenant) return res.json({ success: true, data: [], total: 0 });
      filter.tenantId = tenant._id;
    }
    if (month) filter.month = month;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;

    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .populate("tenantId", "name phone")
      .populate("propertyId", "unitNumber floor")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: bills, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("tenantId", "name phone email")
      .populate("propertyId", "unitNumber floor");
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "বিল পাওয়া যায়নি" });
    if (req.user.role === "tenant") {
      const tenant = await Tenant.findOne({ userId: req.user._id });
      if (
        !tenant ||
        String(bill.tenantId?._id || bill.tenantId) !== String(tenant._id)
      ) {
        return res
          .status(403)
          .json({ success: false, message: "এই বিল দেখার অনুমতি নেই" });
      }
    }
    if (
      req.user.role === "landlord" &&
      String(bill.landlordId) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "এই বিল দেখার অনুমতি নেই" });
    }
    res.json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { tenantId, propertyId, month, year, items, dueDate, notes } =
      req.body;

    const tenant = await Tenant.findById(tenantId);
    const property = await Property.findById(propertyId);
    if (!tenant || !property)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে বা ইউনিট পাওয়া যায়নি" });
    if (!isAdmin(req) && String(tenant.landlordId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ success: false, message: "এই কাজের অনুমতি নেই" });
    }

    const existing = await Bill.findOne({ tenantId, month });
    if (existing)
      return res
        .status(409)
        .json({
          success: false,
          message: `${month} মাসের বিল ইতোমধ্যে তৈরি আছে`,
        });

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const bill = await Bill.create({
      landlordId: tenant.landlordId,
      tenantId,
      propertyId,
      month,
      year,
      items,
      totalAmount,
      dueAmount: totalAmount,
      dueDate,
      notes,
    });

    const populatedTenant = await Tenant.findById(tenantId).populate("userId");
    if (populatedTenant?.userId)
      await sendBillReadyNotification(populatedTenant, bill);

    res
      .status(201)
      .json({ success: true, message: "বিল তৈরি হয়েছে", data: bill });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const bill = await Bill.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "বিল পাওয়া যায়নি" });
    res.json({ success: true, message: "বিল আপডেট হয়েছে", data: bill });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const bill = await Bill.findOne(filter);
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "বিল পাওয়া যায়নি" });
    if (bill.paidAmount > 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "আংশিক বা সম্পূর্ণ পরিশোধিত বিল মুছতে পারবেন না",
        });
    await bill.deleteOne();
    res.json({ success: true, message: "বিল মুছে গেছে" });
  } catch (err) {
    next(err);
  }
};

// Bulk generate bills for all active tenants for a given month
export const bulkGenerate = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year)
      return res
        .status(400)
        .json({ success: false, message: "মাস এবং বছর দিন" });

    const landlordId = getScopedLandlordId(req);
    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const tenants = await Tenant.find({ landlordId, isActive: true }).populate(
      "propertyId",
    );

    let created = 0,
      skipped = 0;
    for (const tenant of tenants) {
      const exists = await Bill.findOne({ tenantId: tenant._id, month });
      if (exists) {
        skipped++;
        continue;
      }

      const amount = tenant.monthlyRent || tenant.propertyId?.monthlyRent || 0;
      await Bill.create({
        landlordId,
        tenantId: tenant._id,
        propertyId: tenant.propertyId._id,
        month,
        year,
        items: [{ type: "rent", amount }],
        totalAmount: amount,
        dueAmount: amount,
        isAutoGenerated: true,
        dueDate: new Date(year, Number(month.split("-")[1]) - 1, 10),
      });
      created++;
    }

    res.json({
      success: true,
      message: `${created}টি বিল তৈরি হয়েছে, ${skipped}টি আগেই ছিল`,
    });
  } catch (err) {
    next(err);
  }
};
