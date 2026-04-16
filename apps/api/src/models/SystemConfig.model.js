import mongoose from "mongoose";
import crypto from "crypto";

const ENCRYPTION_KEY = () => {
  const k =
    process.env.CONFIG_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "default_key_change_in_prod";
  return crypto.createHash("sha256").update(k).digest();
};
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  try {
    const [ivHex, encHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      ENCRYPTION_KEY(),
      iv,
    );
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return text; // return as-is if not encrypted
  }
}

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }, // always stored encrypted
    category: {
      type: String,
      enum: ["smtp", "sms", "payment", "app", "security", "other"],
      default: "other",
    },
    label: { type: String },
    isSecret: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Encrypt on save
configSchema.pre("save", function (next) {
  if (this.isModified("value") && this.isSecret) {
    this.value = encrypt(this.value);
  }
  next();
});

configSchema.methods.decryptedValue = function () {
  if (this.isSecret) return decrypt(this.value);
  return this.value;
};

configSchema.statics.getDecrypted = async function (key) {
  const doc = await this.findOne({ key });
  if (!doc) return null;
  return doc.decryptedValue();
};

configSchema.statics.setConfig = async function (key, value, opts = {}) {
  const { category = "other", label = "", isSecret = false, updatedBy } = opts;
  const toStore = isSecret ? encrypt(value) : value;
  return this.findOneAndUpdate(
    { key },
    { key, value: toStore, category, label, isSecret, updatedBy },
    { upsert: true, new: true },
  );
};

// Get all configs as key->value map (decrypted)
configSchema.statics.getAllAsEnv = async function () {
  const configs = await this.find({});
  const map = {};
  for (const c of configs) {
    map[c.key] = c.decryptedValue();
  }
  return map;
};

export default mongoose.model("SystemConfig", configSchema);
