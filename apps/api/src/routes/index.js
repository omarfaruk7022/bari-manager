import authRoutes          from './auth.routes.js'
import adminRoutes         from './admin.routes.js'
import communityRoutes     from './community.routes.js'
import landlordRoutes      from './landlord.routes.js'
import tenantRoutes        from './tenant.routes.js'
import toLetRoutes         from './tolet.routes.js'
import publicRoutes        from './public.routes.js'
import webhookRoutes       from './webhook.routes.js'
import notificationRoutes  from './notification.routes.js'
import { authenticate }    from '../middlewares/authenticate.js'
import { authorize }       from '../middlewares/authenticate.js'

export const mountRoutes = (app) => {
  app.use('/api/auth',           authRoutes)
  app.use('/api/public',         publicRoutes)
  app.use('/api/admin',          authenticate, authorize('admin'),    adminRoutes)
  app.use('/api/landlord',       authenticate, authorize('landlord', 'admin'), landlordRoutes)
  app.use('/api/tenant',         authenticate, authorize('tenant'),   tenantRoutes)
  app.use('/api/community-chat', authenticate, authorize('tenant', 'landlord', 'admin'), communityRoutes)
  app.use('/api/to-let',         authenticate, authorize('tenant', 'landlord', 'admin'), toLetRoutes)
  app.use('/api/notifications',  authenticate, notificationRoutes)
  app.use('/api/webhooks',       webhookRoutes)
}
