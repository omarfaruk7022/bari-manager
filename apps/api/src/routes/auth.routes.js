import { Router } from 'express'
import { login, logout, me, changePassword, forgotPassword, resetPassword, adminResetPassword, updateLanguage } from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/authenticate.js'

const router = Router()

router.post('/login',              login)
router.post('/logout',             authenticate, logout)
router.get('/me',                  authenticate, me)
router.put('/change-password',     authenticate, changePassword)
router.post('/forgot-password',    forgotPassword)
router.post('/reset-password',     resetPassword)
router.post('/admin-reset-password', authenticate, adminResetPassword)
router.put('/language',            authenticate, updateLanguage)

export default router
