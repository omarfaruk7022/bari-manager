import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true, trim: true },
    email: { type: String, required: false, lowercase: true, trim: true },
    phone: { type: String, required: true },
    propertyName: { type: String, trim: true },
    propertyAddress: { type: String, trim: true },
    totalUnits: { type: Number, default: 1 },
    requestedPlan: {
      type: String,
      enum: ["basic", "standard", "premium", "enterprise"],
      default: "basic",
    },
    requestedMonths: { type: Number, default: 1, min: 1 },
    requestedPlanPrice: { type: Number, default: 499 },
    approvalCategory: {
      type: String,
      enum: ["personal", "commercial"],
      default: "commercial",
    },
    approvalMonths: { type: Number, default: 1, min: 1 },
    approvedTotalPrice: { type: Number, default: null, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    landlordUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionSchema);
