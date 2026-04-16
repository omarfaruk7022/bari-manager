import Bill from '../models/Bill.model.js'
import Tenant from '../models/Tenant.model.js'
import Property from '../models/Property.model.js'
import Payment from '../models/Payment.model.js'
import { sendBillReadyNotification } from '../services/notification.service.js'
import { getScopedLandlordId, isAdmin } from '../utils/access.js'

export const list = async (req, res, next) => {
  try {
    const { month, tenantId, status, page = 1, limit = 20 } = req.query
    const filter = {}
    const landlordId = getScopedLandlordId(req, { allowAllForAdmin: true })
    if (landlordId) filter.landlordId = landlordId
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ userId: req.user._id })
      if (!tenant) return res.json({ success: true, data: [], total: 0 })
      filter.tenantId = tenant._id
    }
    if (month) filter.month = month
    if (tenantId) filter.tenantId = tenantId
    if (status) filter.status = status

    const total = await Bill.countDocuments(filter)
    const bills = await Bill.find(filter)
      .populate('tenantId', 'name phone')
      .populate('propertyId', 'unitNumber floor')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    res.json({ success: true, data: bills, total, page: Number(page) })
  } catch (err) { next(err) }
}

export const getOne = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('tenantId', 'name phone email')
      .populate('propertyId', 'unitNumber floor')
      .populate('landlordId', 'name phone email')
    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })

    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ userId: req.user._id })
      if (!tenant || String(bill.tenantId?._id || bill.tenantId) !== String(tenant._id))
        return res.status(403).json({ success: false, message: 'এই বিল দেখার অনুমতি নেই' })
    }
    if (req.user.role === 'landlord' && String(bill.landlordId._id || bill.landlordId) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'এই বিল দেখার অনুমতি নেই' })

    res.json({ success: true, data: bill })
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const { tenantId, propertyId, month, year, items, dueDate, notes } = req.body

    const tenant = await Tenant.findById(tenantId)
    const property = await Property.findById(propertyId)
    if (!tenant || !property)
      return res.status(404).json({ success: false, message: 'ভাড়াটে বা ইউনিট পাওয়া যায়নি' })
    if (!isAdmin(req) && String(tenant.landlordId) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'এই কাজের অনুমতি নেই' })

    const existing = await Bill.findOne({ tenantId, month })
    if (existing)
      return res.status(409).json({ success: false, message: `${month} মাসের বিল ইতোমধ্যে তৈরি আছে` })

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0)
    const bill = await Bill.create({
      landlordId: tenant.landlordId,
      tenantId, propertyId, month, year,
      items, totalAmount, dueAmount: totalAmount, dueDate, notes,
    })

    const populatedTenant = await Tenant.findById(tenantId).populate('userId')
    if (populatedTenant?.userId) await sendBillReadyNotification(populatedTenant, bill)

    res.status(201).json({ success: true, message: 'বিল তৈরি হয়েছে', data: bill })
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const filter = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, landlordId: req.user._id }
    const bill = await Bill.findOneAndUpdate(filter, req.body, { new: true, runValidators: true })
    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })
    res.json({ success: true, message: 'বিল আপডেট হয়েছে', data: bill })
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, landlordId: req.user._id }
    const bill = await Bill.findOne(filter)
    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })
    if (bill.paidAmount > 0)
      return res.status(400).json({ success: false, message: 'আংশিক বা সম্পূর্ণ পরিশোধিত বিল মুছতে পারবেন না' })
    await bill.deleteOne()
    res.json({ success: true, message: 'বিল মুছে গেছে' })
  } catch (err) { next(err) }
}

// Manual bulk generate — includes utility defaults per tenant
export const bulkGenerate = async (req, res, next) => {
  try {
    const { month, year } = req.body
    if (!month || !year) return res.status(400).json({ success: false, message: 'মাস এবং বছর দিন' })

    const landlordId = getScopedLandlordId(req)
    if (!landlordId) return res.status(400).json({ success: false, message: 'বাড়ীওয়ালা নির্বাচন করুন' })

    const LandlordProfile = (await import('../models/LandlordProfile.model.js')).default
    const profile = await LandlordProfile.findOne({ userId: landlordId })
    const dueDays = profile?.billDueDays || 10
    const [yr, mo] = month.split('-').map(Number)
    const dueDate = new Date(yr, mo - 1, Math.min(new Date(yr, mo - 1, 1).getDate() + dueDays, 28))

    const tenants = await Tenant.find({ landlordId, isActive: true }).populate('propertyId').populate('userId')
    let created = 0, skipped = 0

    for (const tenant of tenants) {
      const exists = await Bill.findOne({ tenantId: tenant._id, month })
      if (exists) { skipped++; continue }

      const rentAmount = tenant.monthlyRent || tenant.propertyId?.monthlyRent || 0
      const items = [{ type: 'rent', amount: rentAmount }]

      const ud = tenant.utilityDefaults || {}
      if (ud.gasAmount > 0)          items.push({ type: 'gas',         label: 'গ্যাস বিল',     amount: ud.gasAmount })
      if (ud.waterAmount > 0)        items.push({ type: 'water',       label: 'পানির বিল',     amount: ud.waterAmount })
      if (ud.serviceCharge > 0)      items.push({ type: 'maintenance', label: 'সার্ভিস চার্জ', amount: ud.serviceCharge })
      if (ud.garbageAmount > 0)      items.push({ type: 'garbage',     label: 'ময়লার বিল',     amount: ud.garbageAmount })
      if (ud.electricityAmount > 0)  items.push({ type: 'electricity', label: 'বিদ্যুৎ বিল',   amount: ud.electricityAmount })

      const totalAmount = items.reduce((s, i) => s + i.amount, 0)
      const bill = await Bill.create({
        landlordId, tenantId: tenant._id,
        propertyId: tenant.propertyId._id,
        month, year, items, totalAmount,
        dueAmount: totalAmount, dueDate, isAutoGenerated: false,
      })

      if (tenant.userId) await sendBillReadyNotification(tenant, bill)
      created++
    }

    res.json({ success: true, message: `${created}টি বিল তৈরি হয়েছে, ${skipped}টি আগেই ছিল`, created, skipped })
  } catch (err) { next(err) }
}

// Generate invoice HTML for a paid/partial bill — returns HTML string
export const getInvoice = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : req.user.role === 'landlord'
        ? { _id: req.params.id, landlordId: req.user._id }
        : { _id: req.params.id }

    const bill = await Bill.findOne(filter)
      .populate('tenantId', 'name phone email nidNumber')
      .populate('propertyId', 'unitNumber floor')
      .populate('landlordId', 'name phone email')

    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })

    // Tenant access check
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ userId: req.user._id })
      if (!tenant || String(bill.tenantId?._id) !== String(tenant._id))
        return res.status(403).json({ success: false, message: 'অনুমতি নেই' })
    }

    const payments = await Payment.find({ billId: bill._id, status: 'success' }).sort({ paidAt: 1 })

    const ITEM_LABELS = {
      rent: 'ভাড়া', electricity: 'বিদ্যুৎ বিল', gas: 'গ্যাস বিল',
      water: 'পানির বিল', garbage: 'ময়লার বিল', internet: 'ইন্টারনেট',
      maintenance: 'সার্ভিস চার্জ', custom: 'অন্যান্য',
    }

    const itemRows = bill.items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${item.label || ITEM_LABELS[item.type] || item.type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">৳${item.amount.toLocaleString('bn-BD')}</td>
      </tr>`).join('')

    const paymentRows = payments.length
      ? payments.map(p => `
        <tr>
          <td style="padding:6px 12px;font-size:13px">${new Date(p.paidAt).toLocaleDateString('bn-BD')}</td>
          <td style="padding:6px 12px;font-size:13px">${p.method === 'bkash' ? 'bKash' : p.method === 'cash' ? 'নগদ' : 'ব্যাংক'}</td>
          <td style="padding:6px 12px;font-size:13px;text-align:right">৳${p.amount.toLocaleString('bn-BD')}</td>
        </tr>`).join('')
      : '<tr><td colspan="3" style="padding:8px 12px;text-align:center;color:#999">কোনো পেমেন্ট নেই</td></tr>'

    const statusLabel = { paid: 'পরিশোধিত', partial: 'আংশিক পরিশোধিত', unpaid: 'অপরিশোধিত' }[bill.status] || bill.status
    const statusColor = { paid: '#16a34a', partial: '#d97706', unpaid: '#dc2626' }[bill.status] || '#666'

    const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ইনভয়েস — ${bill.month}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f5f5f5; color: #333; }
  .page { max-width: 640px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #16a34a; color: #fff; padding: 24px; }
  .header h1 { font-size: 24px; margin-bottom: 4px; }
  .header p { opacity: .8; font-size: 14px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; background: #fff; }
  .section { padding: 20px 24px; border-bottom: 1px solid #f0f0f0; }
  .label { font-size: 12px; color: #888; margin-bottom: 2px; }
  .value { font-size: 15px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f9f9f9; padding: 10px 12px; text-align: left; font-size: 13px; color: #666; font-weight: 600; }
  .total-row td { padding: 12px; font-weight: 700; font-size: 16px; border-top: 2px solid #e5e5e5; }
  .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #aaa; background: #fafafa; }
  @media print { body{background:#fff} .page{margin:0;box-shadow:none;border-radius:0} }
  @media (max-width:480px) { .section { padding: 16px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1>BariManager</h1>
        <p>ভাড়া রসিদ / Invoice</p>
      </div>
      <span class="badge" style="color:${statusColor}">${statusLabel}</span>
    </div>
  </div>

  <div class="section">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div class="label">ভাড়াটে</div>
        <div class="value">${bill.tenantId?.name || '—'}</div>
        <div style="font-size:13px;color:#666;margin-top:2px">${bill.tenantId?.phone || ''}</div>
      </div>
      <div>
        <div class="label">ইউনিট</div>
        <div class="value">${bill.propertyId?.unitNumber || '—'}</div>
        ${bill.propertyId?.floor ? `<div style="font-size:13px;color:#666">${bill.propertyId.floor} তলা</div>` : ''}
      </div>
      <div>
        <div class="label">মাস</div>
        <div class="value">${bill.month}</div>
      </div>
      <div>
        <div class="label">শেষ তারিখ</div>
        <div class="value">${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('bn-BD') : '—'}</div>
      </div>
    </div>
  </div>

  <div class="section" style="padding:0">
    <table>
      <thead><tr>
        <th>বিলের ধরন</th>
        <th style="text-align:right">পরিমাণ</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td>মোট</td>
          <td style="text-align:right">৳${bill.totalAmount.toLocaleString('bn-BD')}</td>
        </tr>
        ${bill.paidAmount > 0 ? `<tr><td style="padding:6px 12px;color:#16a34a">পরিশোধিত</td><td style="padding:6px 12px;text-align:right;color:#16a34a">৳${bill.paidAmount.toLocaleString('bn-BD')}</td></tr>` : ''}
        ${bill.dueAmount > 0 ? `<tr><td style="padding:6px 12px;color:#dc2626;font-weight:700">বকেয়া</td><td style="padding:6px 12px;text-align:right;color:#dc2626;font-weight:700">৳${bill.dueAmount.toLocaleString('bn-BD')}</td></tr>` : ''}
      </tfoot>
    </table>
  </div>

  ${payments.length > 0 ? `
  <div class="section" style="padding:0">
    <div style="padding:12px 24px;background:#f9fafb;font-size:13px;font-weight:600;color:#444">পেমেন্ট ইতিহাস</div>
    <table>
      <thead><tr>
        <th>তারিখ</th><th>মাধ্যম</th><th style="text-align:right">পরিমাণ</th>
      </tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    তৈরি: ${new Date().toLocaleDateString('bn-BD')} | BariManager — বাড়ি ভাড়া ব্যবস্থাপনা
    <br><button onclick="window.print()" style="margin-top:8px;padding:6px 20px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">প্রিন্ট করুন</button>
  </div>
</div>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) { next(err) }
}
