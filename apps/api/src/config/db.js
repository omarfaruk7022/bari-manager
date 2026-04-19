import mongoose from "mongoose";

let connectionPromise = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Create apps/api/.env from apps/api/.env.example and set MONGODB_URI.",
    );
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(uri)
    .then((mongooseInstance) => {
      console.log("✅ MongoDB connected");
      return mongooseInstance.connection;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};
