import { Router } from 'express'
import * as B  from '../controllers/bill.controller.js'
import * as PM from '../controllers/payment.controller.js'

const router = Router()

router.get('/bills',                 B.list)
router.get('/bills/:id/invoice',     B.getInvoice)
router.get('/bills/:id',             B.getOne)
router.get('/payments',              PM.list)
router.post('/payments/bkash/init',  PM.initBkash)

export default router
