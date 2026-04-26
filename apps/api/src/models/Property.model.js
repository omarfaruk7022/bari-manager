import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema({
  landlordId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isUnit:           { type: Boolean, default: true },
  propertyName:     { type: String, required: true, trim: true },
  propertyAddress:  { type: String, trim: true },
  unitNumber:       { type: String, required() { return this.isUnit !== false }, trim: true },
  floor:            { type: String, trim: true },
  type:             { type: String, enum: ['flat', 'room', 'shop', 'office'], default: 'flat' },
  monthlyRent:      { type: Number, required() { return this.isUnit !== false } },
  isOccupied:       { type: Boolean, default: false },
  currentTenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  description:      { type: String },
}, { timestamps: true })

propertySchema.index({ landlordId: 1 })
propertySchema.index({ landlordId: 1, propertyName: 1 })
propertySchema.index({ landlordId: 1, propertyName: 1, unitNumber: 1 })

export default mongoose.model('Property', propertySchema)
