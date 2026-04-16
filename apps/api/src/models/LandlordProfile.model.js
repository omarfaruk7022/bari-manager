import mongoose from 'mongoose'

const landlordProfileSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  propertyName:     { type: String, required: true, trim: true },
  propertyAddress:  { type: String, trim: true },
  phone:            { type: String },
  totalUnits:       { type: Number, default: 0 },
  subscriptionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  logo:             { type: String },
  // Auto bill generation config
  billGenerationDay: { type: Number, default: 1, min: 1, max: 28 }, // day of month
  billDueDays:      { type: Number, default: 10 }, // due N days after generation
  // SMS Limits Support
  smsLimit:         { type: Number, default: 50 },
  smsUsed:          { type: Number, default: 0 },
  limitBreachNotified: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('LandlordProfile', landlordProfileSchema)
