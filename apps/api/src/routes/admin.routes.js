import { Router } from "express";
import {
  list,
  approve,
  reject,
} from "../controllers/subscription.controller.js";
import { adminStats, sendLandlordNotice } from "../controllers/notification.controller.js";
import {
  listLandlords,
  updateLandlord,
  toggleLandlord,
  deleteLandlord,
  extendLandlordSms,
  listTenants,
  getTenant,
  generateTenantBill,
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
  listSystemExpenses,
  createSystemExpense,
  updateSystemExpense,
  removeSystemExpense,
  subscriptionIncomeReport,
  systemFinanceReport,
  resetUserPassword,
  updateLandlordBillSettings,
  getPlans,
  updatePlans,
} from "../controllers/superadmin.controller.js";

const router = Router();

// Subscriptions
router.get("/subscriptions", list);
router.put("/subscriptions/:id/approve", approve);
router.put("/subscriptions/:id/reject", reject);

// Dashboard stats
router.get("/stats", adminStats);
router.post("/notices/landlords", sendLandlordNotice);

// All landlords
router.get("/landlords", listLandlords);
router.put("/landlords/:id", updateLandlord);
router.put("/landlords/:id/toggle", toggleLandlord);
router.delete("/landlords/:id", deleteLandlord);
router.post("/landlords/:id/extend-sms", extendLandlordSms);

// All tenants
router.get("/tenants", listTenants);
router.post("/tenants/:id/generate-bill", generateTenantBill);
router.get("/tenants/:id", getTenant);
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
router.get("/system-expenses", listSystemExpenses);
router.post("/system-expenses", createSystemExpense);
router.put("/system-expenses/:id", updateSystemExpense);
router.delete("/system-expenses/:id", removeSystemExpense);
router.get("/reports/subscription-income", subscriptionIncomeReport);
router.get("/reports/system-finance", systemFinanceReport);
router.get("/plans", getPlans);
router.put("/plans", updatePlans);
router.post("/reset-password", resetUserPassword);
router.put("/landlord-bill-settings", updateLandlordBillSettings);

export default router;
