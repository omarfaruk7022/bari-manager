import Property from '../models/Property.model.js'
import { withScopedFilter, isAdmin } from '../utils/access.js'

export const list = async (req, res, next) => {
  try {
    const filter = withScopedFilter(req, {}, { allowAllForAdmin: true })
    if (req.query.occupied !== undefined) filter.isOccupied = req.query.occupied === 'true'
    const properties = await Property.find(filter)
      .populate('currentTenantId', 'name phone')
      .sort({ unitNumber: 1 })
    res.json({ success: true, data: properties })
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const landlordId = isAdmin(req) ? req.body.landlordId : req.user._id
    if (!landlordId) return res.status(400).json({ success: false, message: 'ল্যান্ডলর্ড নির্বাচন করুন' })
    const property = await Property.create({ ...req.body, landlordId })
    res.status(201).json({ success: true, message: 'ইউনিট তৈরি হয়েছে', data: property })
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id }
    const property = await Property.findOneAndUpdate(
      filter,
      req.body,
      { new: true, runValidators: true }
    )
    if (!property) return res.status(404).json({ success: false, message: 'ইউনিট পাওয়া যায়নি' })
    res.json({ success: true, message: 'ইউনিট আপডেট হয়েছে', data: property })
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, landlordId: req.user._id }
    const property = await Property.findOne(filter)
    if (!property) return res.status(404).json({ success: false, message: 'ইউনিট পাওয়া যায়নি' })
    if (property.isOccupied) return res.status(400).json({ success: false, message: 'ভাড়াটে থাকলে ইউনিট মুছতে পারবেন না' })
    await property.deleteOne()
    res.json({ success: true, message: 'ইউনিট মুছে গেছে' })
  } catch (err) { next(err) }
}
