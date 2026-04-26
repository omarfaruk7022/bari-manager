import mongoose from 'mongoose'

const landlordProfileSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  propertyName:     { type: String, required: true, trim: true },
  propertyAddress:  { type: String, trim: true },
  phone:            { type: String },
  totalUnits:       { type: Number, default: 0 },
  subscriptionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  plan:             { type: String, enum: ['basic', 'standard', 'premium', 'enterprise'], default: 'basic' },
  approvalCategory: { type: String, enum: ['personal', 'commercial'], default: 'commercial' },
  approvalMonths:   { type: Number, default: 1, min: 1 },
  propertyLimit:    { type: Number, default: 1 },
  flatLimit:        { type: Number, default: 5 },
  reportMonths:     { type: Number, default: 1 },
  logo:             { type: String },
  // Auto bill generation config
  billGenerationDay: { type: Number, default: 1, min: 1, max: 28 }, // day of month
  billDueDays:      { type: Number, default: 10 }, // due N days after generation
  autoBillPropertyName: { type: String, trim: true, default: "" }, // blank means all properties
  // SMS Limits Support
  smsLimit:         { type: Number, default: 20 },
  smsUsed:          { type: Number, default: 0 },
  limitBreachNotified: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('LandlordProfile', landlordProfileSchema)
