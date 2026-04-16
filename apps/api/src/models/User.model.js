import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "landlord", "tenant"],
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    // OTP-based password reset (SMS preferred in BD)
    resetOtp: { type: String, select: false },
    resetOtpExpiry: { type: Date, select: false },
    // Language preference
    language: { type: String, enum: ["bn", "en"], default: "bn" },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Support login by email or phone number
userSchema.statics.findByLogin = function (identifier) {
  const cleaned = (identifier || "").replace(/\D/g, "");

  const possiblePhones = [
    cleaned,
    cleaned.replace(/^880/, "0"),
    "880" + cleaned.replace(/^0/, ""),
  ];

  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: { $in: possiblePhones } },
    ],
  }).select("+password");
};

export default mongoose.model("User", userSchema);
