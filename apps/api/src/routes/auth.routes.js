import { Router } from 'express'
import { login, logout, me, changePassword } from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate, loginSchema } from '../middlewares/validate.js'

const router = Router()

router.post('/login',           validate(loginSchema), login)
router.post('/logout',          authenticate, logout)
router.get('/me',               authenticate, me)
router.put('/change-password',  authenticate, changePassword)

export default router
