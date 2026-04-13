import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'
import Notification from '../models/Notification.model.js'

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, landlordId: user.landlordId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

const REDIRECT = {
  admin:    '/admin/dashboard',
  landlord: '/landlord/dashboard',
  tenant:   '/tenant/dashboard',
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল' })

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'অ্যাকাউন্ট নিষ্ক্রিয়। অ্যাডমিনের সাথে যোগাযোগ করুন।' })

    user.lastLoginAt = new Date()
    await user.save({ validateBeforeSave: false })

    const token = signToken(user)

    res.json({
      success: true,
      token,
      redirect: REDIRECT[user.role],
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    })
  } catch (err) {
    next(err)
  }
}

export const me = async (req, res) => {
  const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false })
  res.json({ success: true, user: req.user, unreadNotifications: unread })
}

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')

    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'বর্তমান পাসওয়ার্ড ভুল' })

    user.password = newPassword
    user.mustChangePassword = false
    await user.save()

    res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন হয়েছে' })
  } catch (err) {
    next(err)
  }
}

export const logout = (req, res) => {
  res.json({ success: true, message: 'লগআউট সফল' })
}
