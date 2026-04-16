import Notification from '../models/Notification.model.js'
import { sendBillEmail, sendPaymentConfirmEmail } from './email.service.js'
import { sendBillSMS, sendPaymentConfirmSMS, sendPaymentReminderSMS } from './sms.service.js'

export const createNotification = async ({ userId, landlordId, title, body, type, channel = 'in_app', relatedBillId }) => {
  try {
    await Notification.create({ userId, landlordId, title, body, type, channel, relatedBillId })
  } catch (err) {
    console.error('Notification create error:', err.message)
  }
}

export const sendBillReadyNotification = async (tenant, bill) => {
  if (!tenant?.userId) return

  await createNotification({
    userId:        tenant.userId._id || tenant.userId,
    landlordId:    tenant.landlordId,
    title:         `${bill.month} মাসের বিল তৈরি হয়েছে`,
    body:          `মোট বিল: ৳${bill.totalAmount}। শেষ তারিখ: ${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('bn-BD') : 'নির্ধারিত হয়নি'}`,
    type:          'bill_ready',
    relatedBillId: bill._id,
  })

  // SMS primary (BD users prefer SMS)
  if (tenant.phone) {
    await sendBillSMS({ name: tenant.name, phone: tenant.phone, month: bill.month, totalAmount: bill.totalAmount, dueDate: bill.dueDate })
  }
  // Email fallback
  if (tenant.email) {
    await sendBillEmail({ name: tenant.name, email: tenant.email, month: bill.month, totalAmount: bill.totalAmount, dueDate: bill.dueDate, billId: bill._id })
      .catch(err => console.error('Bill email error (non-fatal):', err.message))
  }
}

export const sendPaymentReceivedNotification = async (tenant, amount, bill) => {
  if (!tenant?.userId) return

  await createNotification({
    userId:        tenant.userId._id || tenant.userId,
    landlordId:    tenant.landlordId,
    title:         'পেমেন্ট সফল',
    body:          `৳${amount} পেমেন্ট পেয়েছি। ${bill.status === 'paid' ? 'বিল সম্পূর্ণ পরিশোধ হয়েছে।' : `বকেয়া: ৳${bill.dueAmount}`}`,
    type:          'payment_received',
    relatedBillId: bill._id,
  })

  if (tenant.phone) {
    await sendPaymentConfirmSMS({ name: tenant.name, phone: tenant.phone, amount, month: bill.month })
  }
  if (tenant.email) {
    await sendPaymentConfirmEmail({ name: tenant.name, email: tenant.email, amount, month: bill.month })
      .catch(err => console.error('Payment email error (non-fatal):', err.message))
  }
}

export const sendPaymentDueReminder = async (tenant, bill) => {
  if (!tenant?.userId) return

  await createNotification({
    userId:        tenant.userId._id || tenant.userId,
    landlordId:    tenant.landlordId,
    title:         'বিল পরিশোধের অনুরোধ',
    body:          `${bill.month} মাসের বকেয়া ৳${bill.dueAmount}। দয়া করে শীঘ্রই পরিশোধ করুন।`,
    type:          'payment_due',
    relatedBillId: bill._id,
  })

  if (tenant.phone) {
    await sendPaymentReminderSMS({ name: tenant.name, phone: tenant.phone, month: bill.month, dueAmount: bill.dueAmount })
  }
}
