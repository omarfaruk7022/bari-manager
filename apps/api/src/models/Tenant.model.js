import mongoose from 'mongoose'

const tenantSchema = new mongoose.Schema({
  landlordId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  propertyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  name:         { type: String, required: true, trim: true },
  phone:        { type: String, required: true, trim: true },
  email:        { type: String, lowercase: true, trim: true },
  nidNumber:    { type: String, trim: true },
  moveInDate:   { type: Date, required: true },
  moveOutDate:  { type: Date, default: null },
  isActive:     { type: Boolean, default: true },
  monthlyRent:  { type: Number, required: true },
  advanceAmount:{ type: Number, default: 0 },
  emergencyContact: {
    name:  { type: String },
    phone: { type: String },
  },
  notes: { type: String },
}, { timestamps: true })

tenantSchema.index({ landlordId: 1, isActive: 1 })

export default mongoose.model('Tenant', tenantSchema)
