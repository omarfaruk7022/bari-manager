import { Router } from 'express'
import { list, markRead } from '../controllers/notification.controller.js'

const router = Router()

router.get('/',          list)
router.put('/mark-read', markRead)

export default router
