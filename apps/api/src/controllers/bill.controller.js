import Bill from "../models/Bill.model.js";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import { sendBillReadyNotification } from "../services/notification.service.js";
import { getScopedLandlordId, isAdmin } from "../utils/access.js";
import { normalizeBDPhone } from "./tenant.controller.js";

export const list = async (req, res, next) => {
  try {
    const { month, tenantId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    const landlordId = getScopedLandlordId(req, { allowAllForAdmin: true });
    if (landlordId) filter.landlordId = landlordId;
    if (req.user.role === "tenant") {
      const tenant = await Tenant.findOne({
        $or: [
          { userId: req.user._id },
          {
            phone: normalizeBDPhone(req.user.phone),
            landlordId: req.user.landlordId,
          },
          { email: req.user.email, landlordId: req.user.landlordId },
        ].filter((item) => Object.values(item).every(Boolean)),
      });
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
      .populate("propertyId", "unitNumber floor")
      .populate("landlordId", "name phone email");
    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "বিল পাওয়া যায়নি" });

    if (req.user.role === "tenant") {
      const tenant = await Tenant.findOne({
        $or: [
          { userId: req.user._id },
          {
            phone: normalizeBDPhone(req.user.phone),
            landlordId: req.user.landlordId,
          },
          { email: req.user.email, landlordId: req.user.landlordId },
        ].filter((item) => Object.values(item).every(Boolean)),
      });
      if (
        !tenant ||
        String(bill.tenantId?._id || bill.tenantId) !== String(tenant._id)
      )
        return res
          .status(403)
          .json({ success: false, message: "এই বিল দেখার অনুমতি নেই" });
    }
    if (
      req.user.role === "landlord" &&
      String(bill.landlordId._id || bill.landlordId) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ success: false, message: "এই বিল দেখার অনুমতি নেই" });

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
    if (!isAdmin(req) && String(tenant.landlordId) !== String(req.user._id))
      return res
        .status(403)
        .json({ success: false, message: "এই কাজের অনুমতি নেই" });

    const existing = await Bill.findOne({ tenantId, month });
    if (existing)
      return res.status(409).json({
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
      return res.status(400).json({
        success: false,
        message: "আংশিক বা সম্পূর্ণ পরিশোধিত বিল মুছতে পারবেন না",
      });
    await bill.deleteOne();
    res.json({ success: true, message: "বিল মুছে গেছে" });
  } catch (err) {
    next(err);
  }
};

// Manual bulk generate — includes utility defaults per tenant
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
        .json({ success: false, message: "বাড়ীওয়ালা নির্বাচন করুন" });

    const LandlordProfile = (await import("../models/LandlordProfile.model.js"))
      .default;
    const profile = await LandlordProfile.findOne({ userId: landlordId });
    const dueDays = profile?.billDueDays || 10;
    const [yr, mo] = month.split("-").map(Number);
    const dueDate = new Date(
      yr,
      mo - 1,
      Math.min(new Date(yr, mo - 1, 1).getDate() + dueDays, 28),
    );

    const tenants = await Tenant.find({ landlordId, isActive: true })
      .populate("propertyId")
      .populate("userId");
    let created = 0,
      skipped = 0;

    for (const tenant of tenants) {
      const exists = await Bill.findOne({ tenantId: tenant._id, month });
      if (exists) {
        skipped++;
        continue;
      }

      const rentAmount =
        tenant.monthlyRent || tenant.propertyId?.monthlyRent || 0;
      const items = [{ type: "rent", amount: rentAmount }];

      const ud = tenant.utilityDefaults || {};
      if (ud.gasAmount > 0)
        items.push({ type: "gas", label: "গ্যাস বিল", amount: ud.gasAmount });
      if (ud.waterAmount > 0)
        items.push({
          type: "water",
          label: "পানির বিল",
          amount: ud.waterAmount,
        });
      if (ud.serviceCharge > 0)
        items.push({
          type: "maintenance",
          label: "সার্ভিস চার্জ",
          amount: ud.serviceCharge,
        });
      if (ud.garbageAmount > 0)
        items.push({
          type: "garbage",
          label: "ময়লার বিল",
          amount: ud.garbageAmount,
        });
      if (ud.electricityAmount > 0)
        items.push({
          type: "electricity",
          label: "বিদ্যুৎ বিল",
          amount: ud.electricityAmount,
        });

      const totalAmount = items.reduce((s, i) => s + i.amount, 0);
      const bill = await Bill.create({
        landlordId,
        tenantId: tenant._id,
        propertyId: tenant.propertyId._id,
        month,
        year,
        items,
        totalAmount,
        dueAmount: totalAmount,
        dueDate,
        isAutoGenerated: false,
      });

      if (tenant.userId) await sendBillReadyNotification(tenant, bill);
      created++;
    }

    res.json({
      success: true,
      message: `${created}টি বিল তৈরি হয়েছে, ${skipped}টি আগেই ছিল`,
      created,
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

// Generate invoice HTML for a paid/partial bill — returns HTML string
export const getInvoice = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : req.user.role === "landlord"
        ? { _id: req.params.id, landlordId: req.user._id }
        : { _id: req.params.id };

    const bill = await Bill.findOne(filter)
      .populate("tenantId", "name phone email nidNumber")
      .populate("propertyId", "unitNumber floor")
      .populate("landlordId", "name phone email");

    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "বিল পাওয়া যায়নি" });

    // Tenant access check
    if (req.user.role === "tenant") {
      const tenant = await Tenant.findOne({
        $or: [
          { userId: req.user._id },
          {
            phone: normalizeBDPhone(req.user.phone),
            landlordId: req.user.landlordId,
          },
          { email: req.user.email, landlordId: req.user.landlordId },
        ].filter((item) => Object.values(item).every(Boolean)),
      });
      if (!tenant || String(bill.tenantId?._id) !== String(tenant._id))
        return res.status(403).json({ success: false, message: "অনুমতি নেই" });
    }

    const escapeHtml = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const amount = (value = 0) => Number(value || 0).toLocaleString("bn-BD");
    const sumByType = (type) =>
      bill.items
        .filter((item) => item.type === type)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const customItems = bill.items.filter((item) => item.type === "custom");
    const garageAmount = customItems
      .filter((item) => /garage|গ্যারেজ|গাড়ি|গাড়ি/i.test(item.label || ""))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const otherAmount = [
      ...bill.items.filter((item) =>
        ["electricity", "internet"].includes(item.type),
      ),
      ...customItems.filter(
        (item) => !/garage|গ্যারেজ|গাড়ি|গাড়ি/i.test(item.label || ""),
      ),
    ].reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const rows = [
      ["০১", "বাড়ি ভাড়া", sumByType("rent")],
      ["০২", "পানি / গ্যাস", sumByType("water") + sumByType("gas")],
      ["০৩", "ময়লা", sumByType("garbage")],
      ["০৪", "সার্ভিস চার্জ", sumByType("maintenance")],
      ["০৫", "গ্যারেজ", garageAmount],
      ["০৬", "অন্যান্য", otherAmount],
    ];

    const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>বাড়ি ভাড়া রসিদ</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
      background: #f0f2f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2rem 1rem;
    }

    .receipt {
      width: 360px;
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    /* Header */
    .receipt-header {
      background: #1a1a2e;
      padding: 20px 20px 16px;
      text-align: center;
    }
    .receipt-header .icon {
      font-size: 24px;
      display: block;
      margin-bottom: 6px;
    }
    .receipt-header h1 {
      color: #ffffff;
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 4px;
      letter-spacing: 0.4px;
    }
    .receipt-header p {
      color: rgba(255,255,255,0.5);
      font-size: 11px;
    }

    /* Meta row */
    .receipt-meta {
      display: flex;
      border-bottom: 1px solid #f0f0f0;
    }
    .meta-cell {
      flex: 1;
      padding: 10px 14px;
      border-right: 1px solid #f0f0f0;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-label {
      font-size: 10px;
      color: #aaa;
      margin-bottom: 3px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 500;
      color: #222;
    }

    /* Dashed separator */
    .separator {
      border: none;
      border-top: 2px dashed #e8e8e8;
      margin: 0;
    }

    /* Items table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table thead tr {
      background: #f7f7f7;
    }
    .items-table th {
      font-size: 11px;
      font-weight: 500;
      color: #888;
      padding: 9px 14px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }
    .items-table th:last-child { text-align: right; }
    .items-table td {
      padding: 10px 14px;
      font-size: 13px;
      color: #333;
      border-bottom: 1px solid #f5f5f5;
    }
    .items-table td:first-child {
      color: #bbb;
      font-size: 11px;
      width: 30px;
    }
    .items-table td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .items-table tbody tr:hover td {
      background: #fafafa;
    }
    .items-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* Total row */
    .total-row {
      background: #1a1a2e !important;
    }
    .total-row td {
      color: #ffffff !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      padding: 13px 14px !important;
      border-bottom: none !important;
    }
    .total-row:hover td {
      background: #1a1a2e !important;
    }

    /* Status badge */
    .badge-row {
      padding: 10px 14px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }
    .badge {
      display: inline-block;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 11px;
      font-weight: 500;
      padding: 3px 12px;
      border-radius: 20px;
    }

    /* Footer / signatures */
    .receipt-footer {
      display: flex;
      padding: 16px 20px;
      background: #fafafa;
      border-top: 1px solid #f0f0f0;
      gap: 16px;
    }
    .sig-block {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      border-top: 1px dashed #bbb;
      margin-bottom: 6px;
      padding-top: 32px;
    }
    .sig-label {
      font-size: 11px;
      color: #888;
    }

    /* Print button */
    .print-btn {
      margin-top: 1.2rem;
      display: flex;
      justify-content: center;
    }
    .print-btn button {
      font-family: 'Noto Sans Bengali', Arial, sans-serif;
      font-size: 13px;
      padding: 9px 24px;
      background: #1a1a2e;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      letter-spacing: 0.3px;
      transition: opacity 0.15s;
    }
    .print-btn button:hover { opacity: 0.85; }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { background: #fff; padding: 0; }
      .print-btn { display: none; }
      .receipt {
        box-shadow: none;
        border: 1px solid #000;
        border-radius: 0;
        width: 360px;
      }
      .receipt-meta,
      .meta-cell,
      .separator,
      .items-table th,
      .items-table td,
      .badge-row,
      .receipt-footer,
      .sig-line {
        border-color: #000 !important;
      }
    }
  </style>
</head>
<body>

  <div class="receipt">

    <div class="receipt-header">
      <span class="icon">🏢</span>
      <h1>বাড়ি ভাড়া রসিদ</h1>
      <p>রসিদ নং: #${bill._id} &nbsp;|&nbsp; তারিখ: ${new Date(bill.createdAt).toLocaleDateString("bn-BD")}</p>
    </div>

    <div class="receipt-meta">
      <div class="meta-cell">
        <div class="meta-label">ভাড়াটিয়া</div>
        <div class="meta-value">${bill.tenantId?.name}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">ফ্ল্যাট নং</div>
        <div class="meta-value">${bill.propertyId?.unitNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">মাস</div>
        <div class="meta-value">${bill.month}</div>
      </div>
    </div>

    <hr class="separator"/>

    <table class="items-table">
      <thead>
        <tr>
          <th>নং</th>
          <th>বিবরণ</th>
          <th>টাকা (৳)</th>
        </tr>
      </thead>
     <tbody>
  <tr>
    <td>১</td>
    <td>বাড়ি ভাড়া</td>
    <td>${amount(sumByType("rent"))}</td>
  </tr>
  <tr>
    <td>২</td>
    <td>পানির বিল</td>
    <td>${amount(sumByType("water"))}</td>
  </tr>
  <tr>
    <td>৩</td>
    <td>গ্যাসের বিল</td>
    <td>${amount(sumByType("gas"))}</td>
  </tr>
  <tr>
    <td>৪</td>
    <td>বিদ্যুৎ বিল</td>
    <td>${amount(sumByType("electricity"))}</td>
  </tr>
  <tr>
    <td>৫</td>
    <td>সার্ভিস চার্জ</td>
    <td>${amount(sumByType("maintenance"))}</td>
  </tr>
  <tr class="total-row">
    <td colspan="2" style="text-align:right;">সর্বমোট পরিমাণ</td>
    <td>${amount(bill.totalAmount)}</td>
  </tr>
</tbody>
    </table>

    <div class="badge-row">
      <span class="badge">✓ পরিশোধিত</span>
    </div>

    <div class="receipt-footer">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">বাড়ির মালিক</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">ভাড়াটিয়া</div>
      </div>
    </div>

  </div>

 

</body>
</html>`;

    //  <div class="print-btn">
    //     <button onclick="window.print()">🖨️ রসিদ প্রিন্ট করুন</button>
    //   </div>

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
};
