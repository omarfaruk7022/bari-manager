import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  landlordId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole:    { type: String, enum: ['admin', 'landlord', 'system'], default: 'system' },
  title:         { type: String, required: true },
  body:          { type: String, required: true },
  type:          { type: String, enum: ['bill_ready', 'payment_due', 'payment_received', 'notice', 'system', 'subscription'], default: 'system' },
  channel:       { type: String, enum: ['in_app', 'email', 'sms'], default: 'in_app' },
  isRead:        { type: Boolean, default: false },
  relatedBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  readAt:        { type: Date },
}, { timestamps: true })

notificationSchema.index({ userId: 1, isRead: 1 })

export default mongoose.model('Notification', notificationSchema)
