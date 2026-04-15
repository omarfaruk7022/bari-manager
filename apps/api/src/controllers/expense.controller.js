import Expense from '../models/Expense.model.js'
import Tenant from '../models/Tenant.model.js'
import Bill from '../models/Bill.model.js'
import { getScopedLandlordId, isAdmin, withScopedFilter } from '../utils/access.js'

export const list = async (req, res, next) => {
  try {
    const filter = withScopedFilter(req, {}, { allowAllForAdmin: true })
    if (req.query.month) filter.month = req.query.month
    if (req.query.category) filter.category = req.query.category

    const expenses = await Expense.find(filter).sort({ date: -1 }).limit(100)
    res.json({ success: true, data: expenses })
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const landlordId = getScopedLandlordId(req)
    if (!landlordId) return res.status(400).json({ success: false, message: 'ল্যান্ডলর্ড নির্বাচন করুন' })
    const expense = await Expense.create({ ...req.body, landlordId })
    res.status(201).json({ success: true, message: 'খরচ যুক্ত হয়েছে', data: expense })
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id }
    const expense = await Expense.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    )
    if (!expense) return res.status(404).json({ success: false, message: 'খরচ পাওয়া যায়নি' })
    res.json({ success: true, message: 'খরচ আপডেট হয়েছে', data: expense })
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id }
    const expense = await Expense.findOneAndDelete(filter)
    if (!expense) return res.status(404).json({ success: false, message: 'খরচ পাওয়া যায়নি' })
    res.json({ success: true, message: 'খরচ মুছে গেছে' })
  } catch (err) { next(err) }
}

// Add a shared expense split to tenant bills
export const splitToBills = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id }
    const expense = await Expense.findOne(filter)
    if (!expense) return res.status(404).json({ success: false, message: 'খরচ পাওয়া যায়নি' })
    if (!expense.month) return res.status(400).json({ success: false, message: 'মাস উল্লেখ নেই' })

    let splits = []

    if (expense.splitMethod === 'equal') {
      const tenants = await Tenant.find({ landlordId: expense.landlordId, isActive: true })
      const perTenant = Math.round(expense.amount / tenants.length)
      splits = tenants.map((t) => ({ tenantId: t._id, amount: perTenant }))
    } else if (expense.splitMethod === 'manual') {
      splits = expense.splitDetails
    }

    for (const split of splits) {
      const bill = await Bill.findOne({ tenantId: split.tenantId, month: expense.month })
      if (bill) {
        bill.items.push({ type: 'custom', label: expense.title, amount: split.amount })
        bill.totalAmount += split.amount
        bill.dueAmount += split.amount
        await bill.save()
      }
    }

    expense.isSplitBilled = true
    await expense.save()

    res.json({ success: true, message: `${splits.length}টি বিলে যুক্ত হয়েছে` })
  } catch (err) { next(err) }
}
