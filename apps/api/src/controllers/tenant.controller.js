import crypto from "crypto";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import User from "../models/User.model.js";
import { sendCredentialsEmail } from "../services/email.service.js";
import { sendCredentialsSMS } from "../services/sms.service.js";
import { isAdmin, withScopedFilter } from "../utils/access.js";

// Generate a readable 8-char password (no ambiguous chars)
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

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
// Send credentials via SMS (primary) and/or email
async function sendCredentials({ landlordId, name, phone, email, password }) {
  if (phone) {
    await sendCredentialsSMS({
      landlordId,
      name,
      phone,
      password,
      loginId: phone,
    });
  }
  if (email) {
    await sendCredentialsEmail({ name, email, password }).catch((err) =>
      console.error("Email send error (non-fatal):", err.message),
    );
  }
}

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
      .populate("userId", "email phone lastLoginAt")
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
    // 🔹 normalize phone first
    const normalizedPhone = normalizeBDPhone(req.body.phone);

    const propertyFilter = isAdmin(req)
      ? { _id: req.body.propertyId }
      : { _id: req.body.propertyId, landlordId: req.user._id };

    const property = await Property.findOne(propertyFilter);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "ইউনিট পাওয়া যায়নি",
      });
    }

    if (property.isOccupied) {
      return res.status(400).json({
        success: false,
        message: "এই ইউনিটে ইতোমধ্যে ভাড়াটে আছে",
      });
    }

    const landlordId = property.landlordId;

    // 🔹 create tenant with normalized phone
    const tenant = await Tenant.create({
      ...req.body,
      phone: normalizedPhone,
      landlordId,
    });

    // 🔹 Create user account if phone OR email provided
    if (normalizedPhone || req.body.email) {
      const tempPassword = generatePassword();

      // 🔹 check existing user by normalized phone
      const existingUser = normalizedPhone
        ? await User.findOne({ phone: normalizedPhone, role: "tenant" })
        : null;

      if (!existingUser) {
        const tenantUser = await User.create({
          name: req.body.name,
          email: req.body.email || undefined,
          phone: normalizedPhone,
          password: tempPassword,
          role: "tenant",
          landlordId,
          mustChangePassword: true,
        });

        tenant.userId = tenantUser._id;
        await tenant.save();

        // 🔹 send credentials (SMS বা Email)
        await sendCredentials({
          landlordId,
          name: req.body.name,
          phone: normalizedPhone,
          email: req.body.email,
          password: tempPassword,
        });
      } else {
        tenant.userId = existingUser._id;
        await tenant.save();
      }
    }

    // 🔹 update property status
    property.isOccupied = true;
    property.currentTenantId = tenant._id;
    await property.save();

    return res.status(201).json({
      success: true,
      message: "ভাড়াটে যুক্ত হয়েছে",
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
};

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

    // 🔹 normalize phone
    const normalizedPhone = normalizeBDPhone(req.body.phone);

    const { email, name } = req.body;
    const hasIdentifier =
      (email && email.trim()) || (normalizedPhone && normalizedPhone.trim());

    if (hasIdentifier) {
      if (!tenant.userId) {
        // 🔹 Create user
        const tempPassword = generatePassword();

        const tenantUser = await User.create({
          name: name || tenant.name,
          email: email || undefined,
          phone: normalizedPhone || tenant.phone,
          password: tempPassword,
          role: "tenant",
          landlordId: tenant.landlordId,
          mustChangePassword: true,
        });

        tenant.userId = tenantUser._id;
        await tenant.save();

        await sendCredentials({
          landlordId,
          name: tenant.name,
          phone: normalizedPhone || tenant.phone,
          email: email,
          password: tempPassword,
        });
      } else {
        // 🔹 Update existing user
        const updateFields = {};

        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (normalizedPhone) updateFields.phone = normalizedPhone;

        await User.findByIdAndUpdate(tenant.userId, updateFields);
      }
    }

    // 🔹 Update tenant (important: phone normalized)
    Object.assign(tenant, {
      ...req.body,
      phone: normalizedPhone || tenant.phone,
    });

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
