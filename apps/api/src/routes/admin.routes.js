import { Router } from 'express'
import { list, approve, reject } from '../controllers/subscription.controller.js'
import { adminStats }            from '../controllers/notification.controller.js'
import User                      from '../models/User.model.js'

const router = Router()

// Subscriptions
router.get('/subscriptions',             list)
router.put('/subscriptions/:id/approve', approve)
router.put('/subscriptions/:id/reject',  reject)

// Dashboard stats
router.get('/stats', adminStats)

// All landlords
router.get('/landlords', async (req, res, next) => {
  try {
    const landlords = await User.find({ role: 'landlord' }).sort({ createdAt: -1 })
    res.json({ success: true, data: landlords })
  } catch (err) { next(err) }
})

// Toggle landlord active status
router.put('/landlords/:id/toggle', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'landlord' })
    if (!user) return res.status(404).json({ success: false, message: 'ল্যান্ডলর্ড পাওয়া যায়নি' })
    user.isActive = !user.isActive
    await user.save()
    res.json({ success: true, message: user.isActive ? 'সক্রিয় করা হয়েছে' : 'নিষ্ক্রিয় করা হয়েছে' })
  } catch (err) { next(err) }
})

export default router
