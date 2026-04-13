import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema({
  landlordId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unitNumber:       { type: String, required: true, trim: true },
  floor:            { type: String, trim: true },
  type:             { type: String, enum: ['flat', 'room', 'shop', 'office'], default: 'flat' },
  monthlyRent:      { type: Number, required: true },
  isOccupied:       { type: Boolean, default: false },
  currentTenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  description:      { type: String },
}, { timestamps: true })

propertySchema.index({ landlordId: 1 })

export default mongoose.model('Property', propertySchema)
