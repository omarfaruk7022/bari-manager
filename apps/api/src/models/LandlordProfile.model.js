import mongoose from 'mongoose'

const landlordProfileSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  propertyName:    { type: String, required: true, trim: true },
  propertyAddress: { type: String, trim: true },
  phone:           { type: String },
  totalUnits:      { type: Number, default: 0 },
  subscriptionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  logo:            { type: String },
}, { timestamps: true })

export default mongoose.model('LandlordProfile', landlordProfileSchema)
