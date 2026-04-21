import mongoose from "mongoose";

const systemExpenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["operations", "salary", "marketing", "software", "office", "other"],
      default: "other",
    },
    month: { type: String },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

systemExpenseSchema.index({ month: 1, date: -1 });

export default mongoose.model("SystemExpense", systemExpenseSchema);
