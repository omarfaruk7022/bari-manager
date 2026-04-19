import mongoose from "mongoose";

const toLetReactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "love", "care"],
      default: "like",
    },
  },
  { _id: true, timestamps: true },
);

const toLetCommentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 800 },
  },
  { _id: true, timestamps: true },
);

const toLetPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["admin", "tenant"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    rentAmount: { type: Number, required: true, min: 0 },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    phone: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: { type: String, trim: true, default: "" },
    reactions: [toLetReactionSchema],
    comments: [toLetCommentSchema],
  },
  { timestamps: true },
);

toLetPostSchema.index({ status: 1, createdAt: -1 });
toLetPostSchema.index({ authorId: 1, createdAt: -1 });

export default mongoose.model("ToLetPost", toLetPostSchema);
