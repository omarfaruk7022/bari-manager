import Property from "../models/Property.model.js";
import { withScopedFilter, isAdmin } from "../utils/access.js";
import { ensureFlatLimit, ensurePropertyLimit } from "../utils/plans.js";

export const list = async (req, res, next) => {
  try {
    const filter = withScopedFilter(req, {}, { allowAllForAdmin: true });
    if (isAdmin(req) && req.query.landlordId) filter.landlordId = req.query.landlordId;
    if (req.query.unitsOnly === "true") filter.isUnit = { $ne: false };
    if (req.query.occupied !== undefined)
      filter.isOccupied = req.query.occupied === "true";
    const properties = await Property.find(filter)
      .populate("currentTenantId", "name phone")
      .sort({ propertyName: 1, unitNumber: 1 });
    res.json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const landlordId = isAdmin(req) ? req.body.landlordId : req.user._id;
    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const propertyLimit = await ensurePropertyLimit(landlordId, req.body.propertyName);
    if (!propertyLimit.allowed)
      return res.status(403).json({ success: false, message: propertyLimit.message });

    const existing = await Property.findOne({
      landlordId,
      isUnit: false,
      propertyName: req.body.propertyName,
    });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "এই প্রপার্টি আগে থেকেই আছে" });

    const property = await Property.create({
      propertyName: req.body.propertyName,
      propertyAddress: req.body.propertyAddress,
      description: req.body.description,
      landlordId,
      isUnit: false,
    });
    res
      .status(201)
      .json({ success: true, message: "প্রপার্টি তৈরি হয়েছে", data: property });
  } catch (err) {
    next(err);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id, isUnit: false }
      : { _id: req.params.id, landlordId: req.user._id, isUnit: false };
    const landlordId = isAdmin(req) ? req.body.landlordId : req.user._id;
    if (req.body.propertyName && landlordId) {
      const propertyLimit = await ensurePropertyLimit(landlordId, req.body.propertyName);
      if (!propertyLimit.allowed)
        return res.status(403).json({ success: false, message: propertyLimit.message });
    }

    const property = await Property.findOneAndUpdate(
      filter,
      {
        propertyName: req.body.propertyName,
        propertyAddress: req.body.propertyAddress,
        description: req.body.description,
        ...(isAdmin(req) && req.body.landlordId ? { landlordId: req.body.landlordId } : {}),
      },
      { new: true, runValidators: true },
    );
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "প্রপার্টি পাওয়া যায়নি" });
    res.json({ success: true, message: "প্রপার্টি আপডেট হয়েছে", data: property });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const landlordId = isAdmin(req) ? req.body.landlordId : req.user._id;
    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const limit = await ensureFlatLimit(landlordId);
    if (!limit.allowed)
      return res.status(403).json({ success: false, message: limit.message });

    const propertyLimit = await ensurePropertyLimit(landlordId, req.body.propertyName);
    if (!propertyLimit.allowed)
      return res.status(403).json({ success: false, message: propertyLimit.message });

    const property = await Property.create({ ...req.body, landlordId, isUnit: true });
    res
      .status(201)
      .json({ success: true, message: "ইউনিট তৈরি হয়েছে", data: property });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const landlordId = isAdmin(req) ? req.body.landlordId : req.user._id;
    if (req.body.propertyName && landlordId) {
      const propertyLimit = await ensurePropertyLimit(landlordId, req.body.propertyName);
      if (!propertyLimit.allowed)
        return res.status(403).json({ success: false, message: propertyLimit.message });
    }

    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const property = await Property.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    });
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "ইউনিট পাওয়া যায়নি" });
    res.json({ success: true, message: "ইউনিট আপডেট হয়েছে", data: property });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const property = await Property.findOne(filter);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "ইউনিট পাওয়া যায়নি" });
    if (property.isOccupied)
      return res
        .status(400)
        .json({
          success: false,
          message: "ভাড়াটে থাকলে ইউনিট মুছতে পারবেন না",
        });
    await property.deleteOne();
    res.json({ success: true, message: "ইউনিট মুছে গেছে" });
  } catch (err) {
    next(err);
  }
};
