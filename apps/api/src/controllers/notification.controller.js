import Notification from '../models/Notification.model.js'
import User from '../models/User.model.js'
import Tenant from '../models/Tenant.model.js'
import { sendEmail } from '../services/email.service.js'
import { sendTrackedSMS } from '../services/sms.service.js'
import { hasSmsQuota } from '../utils/plans.js'

export const list = async (req, res, next) => {
  try {
    const { scope = 'inbox' } = req.query
    let filter = req.user.role === 'admin' ? {} : { userId: req.user._id }

    if (req.user.role === 'landlord' && scope === 'sent') {
      filter = {
        landlordId: req.user._id,
        type: 'notice',
        $or: [
          { senderRole: 'landlord' },
          { senderRole: { $exists: false }, userId: { $ne: req.user._id } },
        ],
      }
    }

    const notifications = await Notification.find(filter)
      .populate('userId', 'name role phone email')
      .populate('landlordId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(50)
    const unread = scope === 'sent' ? 0 : notifications.filter((n) => !n.isRead).length
    res.json({ success: true, data: notifications, unread })
  } catch (err) { next(err) }
}

export const markRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    )
    res.json({ success: true, message: 'সব নোটিফিকেশন পড়া হয়েছে' })
  } catch (err) { next(err) }
}

// Landlord sends notice to one or all tenants
export const sendNotice = async (req, res, next) => {
  try {
    const { title, body, tenantId, channel = 'in_app' } = req.body
    if (!title || !body) return res.status(400).json({ success: false, message: 'শিরোনাম ও বার্তা দিন' })

    let users = []

    if (tenantId) {
      const tenant = await Tenant.findOne({ _id: tenantId, landlordId: req.user._id }).populate('userId')
      if (tenant?.userId) users = [tenant.userId]
    } else {
      const tenants = await Tenant.find({ landlordId: req.user._id, isActive: true }).populate('userId')
      users = tenants.map((t) => t.userId).filter(Boolean)
    }

    if (channel === 'sms') {
      const smsUsers = users.filter((user) => user.phone)
      const quota = await hasSmsQuota(req.user._id, smsUsers.length)
      if (!quota.allowed) {
        return res.status(403).json({ success: false, message: quota.message })
      }
    }

    const notifications = users.map((user) => ({
      landlordId: req.user._id,
      userId: user._id,
      senderRole: 'landlord',
      title,
      body,
      type: 'notice',
      channel,
    }))

    await Notification.insertMany(notifications)

    // Email channel
    if (channel === 'email') {
      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: title,
          html: `<p>${body}</p>`,
        })
      }
    }

    if (channel === 'sms') {
      for (const user of users) {
        if (!user.phone) continue
        const sms = await sendTrackedSMS(req.user._id, user.phone, `BariManager: ${title}\n${body}`)
        if (!sms.success) {
          return res.status(403).json({ success: false, message: sms.reason === 'sms_limit_reached' ? 'SMS লিমিট শেষ' : 'SMS পাঠানো যায়নি' })
        }
      }
    }

    res.json({ success: true, message: `${users.length}জনকে নোটিশ পাঠানো হয়েছে` })
  } catch (err) { next(err) }
}

// Admin sends notification to one or all landlords
export const sendLandlordNotice = async (req, res, next) => {
  try {
    const { title, body, landlordId, channel = 'in_app' } = req.body
    if (!title || !body) return res.status(400).json({ success: false, message: 'শিরোনাম ও বার্তা দিন' })

    const filter = { role: 'landlord', isActive: true }
    if (landlordId) filter._id = landlordId
    const landlords = await User.find(filter)

    await Notification.insertMany(landlords.map((user) => ({
      landlordId: user._id,
      userId: user._id,
      senderRole: 'admin',
      title,
      body,
      type: 'notice',
      channel,
    })))

    if (channel === 'sms') {
      for (const landlord of landlords) {
        if (landlord.phone) await sendTrackedSMS(null, landlord.phone, `BariManager: ${title}\n${body}`)
      }
    }

    if (channel === 'email') {
      for (const landlord of landlords) {
        if (landlord.email) await sendEmail({ to: landlord.email, subject: title, html: `<p>${body}</p>` })
      }
    }

    res.json({ success: true, message: `${landlords.length}জন বাড়ীওয়ালাকে নোটিফিকেশন পাঠানো হয়েছে` })
  } catch (err) { next(err) }
}

// Admin dashboard stats
export const adminStats = async (req, res, next) => {
  try {
    const [landlords, pendingSubs, tenants] = await Promise.all([
      User.countDocuments({ role: 'landlord', isActive: true }),
      (await import('../models/Subscription.model.js')).default.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'tenant', isActive: true }),
    ])
    res.json({ success: true, data: { landlords, pendingSubs, tenants } })
  } catch (err) { next(err) }
}
