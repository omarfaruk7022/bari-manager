import mongoose from "mongoose";

const communityChatMessageSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    authorRole: {
      type: String,
      enum: ["landlord", "tenant", "admin"],
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 1500 },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityChatMessage",
      default: null,
    },
  },
  { timestamps: true },
);

communityChatMessageSchema.index({ landlordId: 1, createdAt: 1 });

export default mongoose.model("CommunityChatMessage", communityChatMessageSchema);
