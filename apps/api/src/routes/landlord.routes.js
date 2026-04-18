import { Router } from 'express'
import * as T  from '../controllers/tenant.controller.js'
import * as B  from '../controllers/bill.controller.js'
import * as P  from '../controllers/property.controller.js'
import * as E  from '../controllers/expense.controller.js'
import * as R  from '../controllers/report.controller.js'
import * as N  from '../controllers/notification.controller.js'
import * as PM from '../controllers/payment.controller.js'
import { validate, tenantCreateSchema, billCreateSchema, propertyCreateSchema, expenseCreateSchema, cashPaymentSchema } from '../middlewares/validate.js'
import LandlordProfile from '../models/LandlordProfile.model.js'
import { getPlanConfig } from '../utils/plans.js'

const router = Router()

// Properties / Units
router.get('/properties',            P.list)
router.post('/properties',           validate(propertyCreateSchema), P.create)
router.put('/properties/:id',        validate(propertyCreateSchema), P.update)
router.delete('/properties/:id',     P.remove)

// Tenants
router.get('/tenants',               T.list)
router.post('/tenants',              validate(tenantCreateSchema), T.create)
router.get('/tenants/:id',           T.getOne)
router.put('/tenants/:id',           T.update)
router.delete('/tenants/:id',        T.remove)

// Bills
router.get('/bills',                 B.list)
router.post('/bills/bulk-generate',  B.bulkGenerate)
router.post('/bills',                validate(billCreateSchema), B.create)
router.get('/bills/:id/invoice',     B.getInvoice)
router.get('/bills/:id',             B.getOne)
router.put('/bills/:id',             B.update)
router.delete('/bills/:id',          B.remove)

// Expenses
router.get('/expenses',              E.list)
router.post('/expenses',             validate(expenseCreateSchema), E.create)
router.put('/expenses/:id',          E.update)
router.delete('/expenses/:id',       E.remove)
router.post('/expenses/:id/split',   E.splitToBills)

// Payments
router.get('/payments',              PM.list)
router.post('/payments/cash',        validate(cashPaymentSchema), PM.cashPayment)

// Reports
router.get('/reports/monthly',       R.monthly)
router.get('/reports/yearly',        R.yearly)

// Notices
router.post('/notices',              N.sendNotice)

// Profile & Bill Settings
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await LandlordProfile.findOne({ userId: req.user._id })
    res.json({ success: true, data: profile })
  } catch (err) { next(err) }
})

router.put('/bill-settings', async (req, res, next) => {
  try {
    const { billGenerationDay, billDueDays } = req.body
    const current = await LandlordProfile.findOne({ userId: req.user._id })
    if (!current) return res.status(404).json({ success: false, message: 'প্রোফাইল পাওয়া যায়নি' })
    const plan = await getPlanConfig(current.plan)
    if (!plan.autoBill) {
      return res.status(403).json({ success: false, message: 'Basic প্ল্যানে স্বয়ংক্রিয় বিল সেটিং নেই' })
    }
    const profile = await LandlordProfile.findOneAndUpdate(
      { userId: req.user._id },
      { billGenerationDay, billDueDays },
      { new: true }
    )
    if (!profile) return res.status(404).json({ success: false, message: 'প্রোফাইল পাওয়া যায়নি' })
    res.json({ success: true, message: 'বিল সেটিং আপডেট হয়েছে', data: profile })
  } catch (err) { next(err) }
})

export default router
