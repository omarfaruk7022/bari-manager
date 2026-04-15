import { Router } from 'express'
import { list, approve, reject } from '../controllers/subscription.controller.js'
import { adminStats }            from '../controllers/notification.controller.js'
import {
  listLandlords,
  updateLandlord,
  toggleLandlord,
  deleteLandlord,
  listTenants,
  updateTenant,
  toggleTenant,
  deleteTenant,
} from '../controllers/admin.controller.js'

const router = Router()

// Subscriptions
router.get('/subscriptions',             list)
router.put('/subscriptions/:id/approve', approve)
router.put('/subscriptions/:id/reject',  reject)

// Dashboard stats
router.get('/stats', adminStats)

// All landlords
router.get('/landlords', listLandlords)
router.put('/landlords/:id', updateLandlord)
router.put('/landlords/:id/toggle', toggleLandlord)
router.delete('/landlords/:id', deleteLandlord)

// All tenants
router.get('/tenants', listTenants)
router.put('/tenants/:id', updateTenant)
router.put('/tenants/:id/toggle', toggleTenant)
router.delete('/tenants/:id', deleteTenant)

export default router
