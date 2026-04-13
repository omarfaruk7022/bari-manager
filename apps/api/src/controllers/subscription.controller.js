import crypto from 'crypto'
import Subscription from '../models/Subscription.model.js'
import User from '../models/User.model.js'
import LandlordProfile from '../models/LandlordProfile.model.js'
import { sendCredentialsEmail, sendRejectionEmail } from '../services/email.service.js'

// Public — anyone can apply for a subscription
export const apply = async (req, res, next) => {
  try {
    const existing = await Subscription.findOne({ email: req.body.email, status: { $in: ['pending', 'approved'] } })
    if (existing)
      return res.status(409).json({ success: false, message: 'এই ইমেইলে ইতোমধ্যে আবেদন করা হয়েছে' })

    const sub = await Subscription.create(req.body)
    res.status(201).json({ success: true, message: 'আবেদন সফল। অ্যাডমিন শীঘ্রই যোগাযোগ করবেন।', data: sub })
  } catch (err) {
    next(err)
  }
}

// Admin — list all subscription requests
export const list = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const filter = status ? { status } : {}
    const total = await Subscription.countDocuments(filter)
    const subs = await Subscription.find(filter)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
    res.json({ success: true, data: subs, total, page: Number(page) })
  } catch (err) {
    next(err)
  }
}

// Admin — approve a subscription & auto-create landlord account
export const approve = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id)
    if (!sub) return res.status(404).json({ success: false, message: 'আবেদন পাওয়া যায়নি' })
    if (sub.status !== 'pending')
      return res.status(400).json({ success: false, message: 'এই আবেদন ইতোমধ্যে প্রক্রিয়া করা হয়েছে' })

    const existingUser = await User.findOne({ email: sub.email })
    if (existingUser)
      return res.status(409).json({ success: false, message: 'এই ইমেইলে ইতোমধ্যে অ্যাকাউন্ট আছে' })

    const tempPassword = crypto.randomBytes(5).toString('hex')

    const user = await User.create({
      name: sub.applicantName,
      email: sub.email,
      phone: sub.phone,
      password: tempPassword,
      role: 'landlord',
      mustChangePassword: true,
    })

    await LandlordProfile.create({
      userId: user._id,
      propertyName: sub.propertyName || sub.applicantName + '-এর বাড়ি',
      propertyAddress: sub.propertyAddress || '',
      phone: sub.phone,
      totalUnits: sub.totalUnits || 0,
      subscriptionId: sub._id,
    })

    sub.status = 'approved'
    sub.landlordUserId = user._id
    sub.reviewedBy = req.user._id
    sub.reviewedAt = new Date()
    await sub.save()

    await sendCredentialsEmail({
      name: sub.applicantName,
      email: sub.email,
      password: tempPassword,
    })

    res.json({ success: true, message: 'অনুমোদিত হয়েছে। ইমেইলে লগইন তথ্য পাঠানো হয়েছে।' })
  } catch (err) {
    next(err)
  }
}

// Admin — reject a subscription
export const reject = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id)
    if (!sub) return res.status(404).json({ success: false, message: 'আবেদন পাওয়া যায়নি' })
    if (sub.status !== 'pending')
      return res.status(400).json({ success: false, message: 'এই আবেদন ইতোমধ্যে প্রক্রিয়া করা হয়েছে' })

    sub.status = 'rejected'
    sub.rejectionReason = req.body.reason || 'কারণ উল্লেখ করা হয়নি'
    sub.reviewedBy = req.user._id
    sub.reviewedAt = new Date()
    await sub.save()

    await sendRejectionEmail({ name: sub.applicantName, email: sub.email, reason: sub.rejectionReason })

    res.json({ success: true, message: 'আবেদন প্রত্যাখ্যান করা হয়েছে' })
  } catch (err) {
    next(err)
  }
}
