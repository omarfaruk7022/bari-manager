// Run: node scripts/createAdmin.js
// Creates the first super admin account

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve("apps/api/.env"),
});

await mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://omarfaruk7022_db_user:4qAHwXmwUmNUkrWm@cluster0.p2w7eao.mongodb.net/?appName=Cluster0",
);

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    role: String,
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const email = "admin@barimanager.com";
const password = "Admin@1234";
const name = "Super Admin";

const existing = await User.findOne({ email });
if (existing) {
  console.log("⚠️  Admin already exists:", email);
  process.exit(0);
}

const hashed = await bcrypt.hash(password, 10);
await User.create({ name, email, password: hashed, role: "admin" });

console.log("✅ Admin created successfully!");
console.log("   Email:   ", email);
console.log("   Password:", password);
console.log("   ⚠️  Change this password after first login!");

await mongoose.disconnect();
process.exit(0);
