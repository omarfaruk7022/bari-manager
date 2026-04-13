import { Router } from 'express'
import { apply } from '../controllers/subscription.controller.js'
import { validate, subscriptionApplySchema } from '../middlewares/validate.js'

const router = Router()

router.post('/subscribe', validate(subscriptionApplySchema), apply)

export default router
