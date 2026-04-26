import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Tenant from "../models/Tenant.model.js";
import Property from "../models/Property.model.js";
import Bill from "../models/Bill.model.js";
import Expense from "../models/Expense.model.js";
import Payment from "../models/Payment.model.js";
import Notification from "../models/Notification.model.js";
import LandlordProfile from "../models/LandlordProfile.model.js";
import Subscription from "../models/Subscription.model.js";
import SystemConfig from "../models/SystemConfig.model.js";
import SystemExpense from "../models/SystemExpense.model.js";
import ToLetPost from "../models/ToLetPost.model.js";
import CommunityChatMember from "../models/CommunityChatMember.model.js";
import CommunityChatMessage from "../models/CommunityChatMessage.model.js";

AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

const rootPath = "/adminjs";

const resources = [
  User,
  Tenant,
  Property,
  Bill,
  Expense,
  Payment,
  Notification,
  LandlordProfile,
  Subscription,
  SystemConfig,
  SystemExpense,
  ToLetPost,
  CommunityChatMember,
  CommunityChatMessage,
].map((resource) => ({ resource }));

let adminRouterPromise = null;

const admin = new AdminJS({
  rootPath,
  loginPath: `${rootPath}/login`,
  logoutPath: `${rootPath}/logout`,
  refreshTokenPath: `${rootPath}/refresh-token`,
  resources,
  branding: {
    companyName: "BariManager Control Panel",
    softwareBrothers: false,
  },
  locale: {
    language: "en",
  },
});

async function authenticateAdmin(email, password) {
  const adminUser = await User.findOne({
    email: email?.toLowerCase(),
    role: "admin",
    isActive: true,
  }).select("+password");

  if (!adminUser) return null;

  const isValid = await adminUser.comparePassword(password);
  if (!isValid) return null;

  return {
    _id: String(adminUser._id),
    email: adminUser.email,
    role: adminUser.role,
    title: adminUser.name,
  };
}

async function buildAdminRouter() {
  return AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: authenticateAdmin,
      cookieName: process.env.ADMINJS_COOKIE_NAME || "bm_adminjs",
      cookiePassword:
        process.env.ADMINJS_COOKIE_SECRET ||
        process.env.JWT_SECRET ||
        "change-this-adminjs-secret",
    },
    null,
    {
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        dbName: mongoose.connection.name,
        collectionName: "adminjs_sessions",
      }),
      resave: false,
      saveUninitialized: false,
      secret:
        process.env.ADMINJS_SESSION_SECRET ||
        process.env.ADMINJS_COOKIE_SECRET ||
        process.env.JWT_SECRET ||
        "change-this-session-secret",
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8,
      },
      name: process.env.ADMINJS_SESSION_NAME || "bm_adminjs.sid",
    },
  );
}

export async function mountAdminJs(app) {
  if (!adminRouterPromise) {
    adminRouterPromise = buildAdminRouter();
  }

  const router = await adminRouterPromise;
  app.use(admin.options.rootPath, router);
}

export { admin, rootPath as adminRootPath };
