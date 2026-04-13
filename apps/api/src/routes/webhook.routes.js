import { Router } from 'express'
import { bkashCallback } from '../controllers/payment.controller.js'

const router = Router()

// bKash redirects here after payment
router.get('/bkash/callback', bkashCallback)

export default router
