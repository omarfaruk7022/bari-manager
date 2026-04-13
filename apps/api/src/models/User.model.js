import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, select: false },
  role:         { type: String, enum: ['admin', 'landlord', 'tenant'], required: true },
  landlordId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  phone:        { type: String, trim: true },
  isActive:     { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  lastLoginAt:  { type: Date },
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('User', userSchema)
