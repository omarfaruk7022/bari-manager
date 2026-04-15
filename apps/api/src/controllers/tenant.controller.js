import crypto from "crypto";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import User from "../models/User.model.js";
import { sendCredentialsEmail } from "../services/email.service.js";
import { isAdmin, withScopedFilter } from "../utils/access.js";

export const list = async (req, res, next) => {
  try {
    const { active, page = 1, limit = 20, search } = req.query;
    const filter = withScopedFilter(req, {}, { allowAllForAdmin: true });
    if (active !== undefined) filter.isActive = active === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const total = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .populate("propertyId", "unitNumber floor monthlyRent")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: tenants, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const tenant = await Tenant.findOne(filter)
      .populate("propertyId")
      .populate("userId", "email lastLoginAt")
      .populate("landlordId", "name email phone");
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const propertyFilter = isAdmin(req)
      ? { _id: req.body.propertyId }
      : { _id: req.body.propertyId, landlordId: req.user._id };
    const property = await Property.findOne(propertyFilter);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "ইউনিট পাওয়া যায়নি" });
    if (property.isOccupied)
      return res
        .status(400)
        .json({ success: false, message: "এই ইউনিটে ইতোমধ্যে ভাড়াটে আছে" });

    const landlordId = property.landlordId;
    const tenant = await Tenant.create({ ...req.body, landlordId });

    // If email provided — create tenant user account
    if (req.body.email) {
      const tempPassword = crypto.randomBytes(5).toString("hex");
      const tenantUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: tempPassword,
        role: "tenant",
        landlordId,
        mustChangePassword: true,
      });
      tenant.userId = tenantUser._id;
      await tenant.save();
      await sendCredentialsEmail({
        name: req.body.name,
        email: req.body.email,
        password: tempPassword,
      });
    }

    property.isOccupied = true;
    property.currentTenantId = tenant._id;
    await property.save();

    res
      .status(201)
      .json({ success: true, message: "ভাড়াটে যুক্ত হয়েছে", data: tenant });
  } catch (err) {
    next(err);
  }
};

// export const update = async (req, res, next) => {
//   try {
//     const filter = isAdmin(req)
//       ? { _id: req.params.id }
//       : { _id: req.params.id, landlordId: req.user._id }
//     const tenant = await Tenant.findOneAndUpdate(
//       filter,
//       req.body,
//       { new: true, runValidators: true }
//     )
//     if (!tenant) return res.status(404).json({ success: false, message: 'ভাড়াটে পাওয়া যায়নি' })
//     res.json({ success: true, message: 'তথ্য আপডেট হয়েছে', data: tenant })
//   } catch (err) { next(err) }
// }

export const update = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };

    let tenant = await Tenant.findOne(filter);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "ভাড়াটে পাওয়া যায়নি",
      });
    }

    // 🔥 STEP 1: email handle
    if (req.body.email && req.body.email.trim() !== "") {
      if (!tenant.userId) {
        console.log("Creating user...");

        const tempPassword = crypto.randomBytes(5).toString("hex");

        const tenantUser = await User.create({
          name: req.body.name || tenant.name,
          email: req.body.email,
          phone: req.body.phone || tenant.phone,
          password: tempPassword,
          role: "tenant",
          landlordId: tenant.landlordId,
          mustChangePassword: true,
        });

        tenant.userId = tenantUser._id;
        await tenant.save();

        await sendCredentialsEmail({
          name: tenant.name,
          email: req.body.email,
          password: tempPassword,
        });
      } else {
        console.log("Updating user...");

        await User.findByIdAndUpdate(tenant.userId, {
          email: req.body.email,
          name: req.body.name || tenant.name,
          phone: req.body.phone || tenant.phone,
        });
      }
    }

    // 🔥 STEP 2: update tenant data
    Object.assign(tenant, req.body);
    await tenant.save();

    res.json({
      success: true,
      message: "তথ্য আপডেট হয়েছে",
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id };
    const tenant = await Tenant.findOne(filter);
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "ভাড়াটে পাওয়া যায়নি" });

    tenant.isActive = false;
    tenant.moveOutDate = new Date();
    await tenant.save();

    if (tenant.userId) {
      await User.findByIdAndUpdate(tenant.userId, { isActive: false });
    }

    await Property.findByIdAndUpdate(tenant.propertyId, {
      isOccupied: false,
      currentTenantId: null,
    });

    res.json({ success: true, message: "ভাড়াটে সরানো হয়েছে" });
  } catch (err) {
    next(err);
  }
};
