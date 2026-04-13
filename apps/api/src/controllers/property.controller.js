import Property from '../models/Property.model.js'

export const list = async (req, res, next) => {
  try {
    const filter = { landlordId: req.user._id }
    if (req.query.occupied !== undefined) filter.isOccupied = req.query.occupied === 'true'
    const properties = await Property.find(filter)
      .populate('currentTenantId', 'name phone')
      .sort({ unitNumber: 1 })
    res.json({ success: true, data: properties })
  } catch (err) { next(err) }
}

export const create = async (req, res, next) => {
  try {
    const property = await Property.create({ ...req.body, landlordId: req.user._id })
    res.status(201).json({ success: true, message: 'ইউনিট তৈরি হয়েছে', data: property })
  } catch (err) { next(err) }
}

export const update = async (req, res, next) => {
  try {
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, landlordId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!property) return res.status(404).json({ success: false, message: 'ইউনিট পাওয়া যায়নি' })
    res.json({ success: true, message: 'ইউনিট আপডেট হয়েছে', data: property })
  } catch (err) { next(err) }
}

export const remove = async (req, res, next) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, landlordId: req.user._id })
    if (!property) return res.status(404).json({ success: false, message: 'ইউনিট পাওয়া যায়নি' })
    if (property.isOccupied) return res.status(400).json({ success: false, message: 'ভাড়াটে থাকলে ইউনিট মুছতে পারবেন না' })
    await property.deleteOne()
    res.json({ success: true, message: 'ইউনিট মুছে গেছে' })
  } catch (err) { next(err) }
}
