import Notification from '../models/Notification.model.js'
import User from '../models/User.model.js'
import Tenant from '../models/Tenant.model.js'
import { sendEmail } from '../services/email.service.js'

export const list = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
    const unread = notifications.filter((n) => !n.isRead).length
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

    const notifications = users.map((user) => ({
      landlordId: req.user._id,
      userId: user._id,
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

    res.json({ success: true, message: `${users.length}জনকে নোটিশ পাঠানো হয়েছে` })
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
