import cron from 'node-cron'
import Bill from '../models/Bill.model.js'
import Tenant from '../models/Tenant.model.js'
import { sendPaymentDueReminder } from '../services/notification.service.js'

// Runs every day at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log('⏰ Running payment reminder job...')

  try {
    const today    = new Date()
    const overdue  = new Date(today)
    overdue.setDate(overdue.getDate() - 1)

    // Bills that are unpaid or partial and due date has passed
    const bills = await Bill.find({
      status:  { $in: ['unpaid', 'partial'] },
      dueDate: { $lte: today },
    })

    let sent = 0
    for (const bill of bills) {
      const tenant = await Tenant.findById(bill.tenantId).populate('userId')
      if (!tenant || !tenant.isActive) continue
      await sendPaymentDueReminder(tenant, bill)
      sent++
    }

    console.log(`✅ Reminders sent: ${sent}`)
  } catch (err) {
    console.error('❌ Reminder job failed:', err.message)
  }
})
