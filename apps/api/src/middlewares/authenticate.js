import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

export const authenticate = async (req, res, next) => {
  try {
    // Accept token from Authorization header OR ?token= query param (for invoice URLs)
    const authHeader = req.headers.authorization
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)
      || req.query.token

    if (!token)
      return res.status(401).json({ success: false, message: 'টোকেন প্রয়োজন' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'অ্যাকাউন্ট পাওয়া যায়নি বা নিষ্ক্রিয়' })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'অবৈধ বা মেয়াদোত্তীর্ণ টোকেন' })
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'এই কাজের অনুমতি নেই' })
  next()
}
