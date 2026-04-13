import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  landlordId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  billId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
  amount:          { type: Number, required: true },
  method:          { type: String, enum: ['bkash', 'cash', 'bank_transfer'], required: true },
  status:          { type: String, enum: ['pending', 'success', 'failed', 'cancelled'], default: 'pending' },
  // bKash fields
  bkashPaymentId:  { type: String },
  bkashTxId:       { type: String },
  bkashExecuteTime:{ type: Date },
  // Cash fields
  collectedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiptNote:     { type: String },
  paidAt:          { type: Date },
}, { timestamps: true })

paymentSchema.index({ landlordId: 1, status: 1 })
paymentSchema.index({ billId: 1 })

export default mongoose.model('Payment', paymentSchema)
