import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  applicantName:   { type: String, required: true, trim: true },
  email:           { type: String, required: true, lowercase: true, trim: true },
  phone:           { type: String, required: true },
  propertyName:    { type: String, trim: true },
  propertyAddress: { type: String, trim: true },
  totalUnits:      { type: Number, default: 1 },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:      { type: Date },
  landlordUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

export default mongoose.model('Subscription', subscriptionSchema)
