import { Router } from 'express'
import * as T  from '../controllers/tenant.controller.js'
import * as B  from '../controllers/bill.controller.js'
import * as P  from '../controllers/property.controller.js'
import * as E  from '../controllers/expense.controller.js'
import * as R  from '../controllers/report.controller.js'
import * as N  from '../controllers/notification.controller.js'
import * as PM from '../controllers/payment.controller.js'
import { validate, tenantCreateSchema, billCreateSchema, propertyCreateSchema, expenseCreateSchema, cashPaymentSchema } from '../middlewares/validate.js'

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
router.post('/bills',                validate(billCreateSchema), B.create)
router.get('/bills/:id',             B.getOne)
router.put('/bills/:id',             B.update)
router.delete('/bills/:id',          B.remove)
router.post('/bills/bulk-generate',  B.bulkGenerate)

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

export default router
