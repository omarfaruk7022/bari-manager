import mongoose from "mongoose";

const communityChatMemberSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    role: {
      type: String,
      enum: ["landlord", "tenant"],
      required: true,
    },
    muteUntil: { type: Date, default: null },
    banUntil: { type: Date, default: null },
    isBannedForever: { type: Boolean, default: false },
    bannedReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

communityChatMemberSchema.index({ landlordId: 1, userId: 1 }, { unique: true });
communityChatMemberSchema.index({ landlordId: 1, role: 1 });

export default mongoose.model("CommunityChatMember", communityChatMemberSchema);
