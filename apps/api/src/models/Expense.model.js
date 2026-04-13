import mongoose from 'mongoose'

const splitDetailSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  amount:   { type: Number, required: true },
}, { _id: false })

const expenseSchema = new mongoose.Schema({
  landlordId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true },
  amount:       { type: Number, required: true },
  category:     { type: String, enum: ['utilities', 'salary', 'maintenance', 'repair', 'cleaning', 'security', 'other'], default: 'other' },
  month:        { type: String },   // "2025-01"
  date:         { type: Date, default: Date.now },
  splitMethod:  { type: String, enum: ['equal', 'manual', 'per_unit', 'none'], default: 'none' },
  splitDetails: [splitDetailSchema],
  isSplitBilled:{ type: Boolean, default: false },
  receiptNote:  { type: String },
}, { timestamps: true })

expenseSchema.index({ landlordId: 1, month: 1 })

export default mongoose.model('Expense', expenseSchema)
