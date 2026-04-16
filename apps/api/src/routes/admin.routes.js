import { Router } from "express";
import {
  list,
  approve,
  reject,
} from "../controllers/subscription.controller.js";
import { adminStats } from "../controllers/notification.controller.js";
import {
  listLandlords,
  updateLandlord,
  toggleLandlord,
  deleteLandlord,
  extendLandlordSms,
  listTenants,
  updateTenant,
  toggleTenant,
  deleteTenant,
} from "../controllers/admin.controller.js";
import {
  getConfigs,
  updateConfig,
  bulkUpdateConfigs,
  deleteConfig,
  systemStats,
  resetUserPassword,
  updateLandlordBillSettings,
} from "../controllers/superadmin.controller.js";

const router = Router();

// Subscriptions
router.get("/subscriptions", list);
router.put("/subscriptions/:id/approve", approve);
router.put("/subscriptions/:id/reject", reject);

// Dashboard stats
router.get("/stats", adminStats);

// All landlords
router.get("/landlords", listLandlords);
router.put("/landlords/:id", updateLandlord);
router.put("/landlords/:id/toggle", toggleLandlord);
router.delete("/landlords/:id", deleteLandlord);
router.post("/landlords/:id/extend-sms", extendLandlordSms);

// All tenants
router.get("/tenants", listTenants);
router.put("/tenants/:id", updateTenant);
router.put("/tenants/:id/toggle", toggleTenant);
router.delete("/tenants/:id", deleteTenant);

// System config (env management)
router.get("/config", getConfigs);
router.put("/config", updateConfig);
router.put("/config/bulk", bulkUpdateConfigs);
router.delete("/config/:key", deleteConfig);

// Super admin extras
router.get("/system-stats", systemStats);
router.post("/reset-password", resetUserPassword);
router.put("/landlord-bill-settings", updateLandlordBillSettings);

export default router;
