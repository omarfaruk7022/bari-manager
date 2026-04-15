import Payment from '../models/Payment.model.js'
import Bill from '../models/Bill.model.js'
import Tenant from '../models/Tenant.model.js'
import { getBkashToken, createBkashPayment, executeBkashPayment } from '../services/bkash.service.js'
import { sendPaymentReceivedNotification } from '../services/notification.service.js'
import { isAdmin, withScopedFilter } from '../utils/access.js'

// Helper — update bill after payment
const updateBillAfterPayment = async (billId, paidNow) => {
  const bill = await Bill.findById(billId)
  bill.paidAmount += paidNow
  bill.dueAmount = bill.totalAmount - bill.paidAmount
  if (bill.dueAmount <= 0) {
    bill.dueAmount = 0
    bill.status = 'paid'
  } else {
    bill.status = 'partial'
  }
  await bill.save()
  return bill
}

export const list = async (req, res, next) => {
  try {
    const filter = withScopedFilter(req, {}, { allowAllForAdmin: true })
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ userId: req.user._id })
      if (tenant) filter.tenantId = tenant._id
    }
    if (req.query.billId) filter.billId = req.query.billId
    if (req.query.status) filter.status = req.query.status

    const payments = await Payment.find(filter)
      .populate('tenantId', 'name phone')
      .populate('billId', 'month totalAmount')
      .sort({ createdAt: -1 })
      .limit(100)

    res.json({ success: true, data: payments })
  } catch (err) { next(err) }
}

// Cash payment — landlord marks as paid
export const cashPayment = async (req, res, next) => {
  try {
    const { billId, amount, receiptNote } = req.body

    const billFilter = isAdmin(req)
      ? { _id: billId }
      : { _id: billId, landlordId: req.user._id }
    const bill = await Bill.findOne(billFilter)
    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })
    if (bill.status === 'paid') return res.status(400).json({ success: false, message: 'বিল ইতোমধ্যে পরিশোধিত' })
    if (amount > bill.dueAmount) return res.status(400).json({ success: false, message: `বকেয়ার চেয়ে বেশি দেওয়া যাবে না। বকেয়া: ৳${bill.dueAmount}` })

    const payment = await Payment.create({
      landlordId: bill.landlordId,
      tenantId: bill.tenantId,
      billId,
      amount,
      method: 'cash',
      status: 'success',
      collectedBy: req.user._id,
      receiptNote,
      paidAt: new Date(),
    })

    const updatedBill = await updateBillAfterPayment(billId, amount)
    const tenant = await Tenant.findById(bill.tenantId).populate('userId')
    if (tenant?.userId) await sendPaymentReceivedNotification(tenant, amount, updatedBill)

    res.json({ success: true, message: 'নগদ পেমেন্ট রেকর্ড হয়েছে', data: payment })
  } catch (err) { next(err) }
}

// bKash — initiate payment (tenant calls this)
export const initBkash = async (req, res, next) => {
  try {
    const { billId, amount } = req.body
    const tenant = await Tenant.findOne({ userId: req.user._id })
    if (!tenant) return res.status(404).json({ success: false, message: 'ভাড়াটে পাওয়া যায়নি' })

    const bill = await Bill.findOne({ _id: billId, tenantId: tenant._id })
    if (!bill) return res.status(404).json({ success: false, message: 'বিল পাওয়া যায়নি' })

    const token = await getBkashToken()
    const result = await createBkashPayment({ amount, billId, token: token.id_token })

    if (!result.bkashURL) return res.status(500).json({ success: false, message: 'bKash পেমেন্ট শুরু করতে সমস্যা হয়েছে' })

    // Save pending payment record
    await Payment.create({
      landlordId: bill.landlordId,
      tenantId: tenant._id,
      billId,
      amount,
      method: 'bkash',
      status: 'pending',
      bkashPaymentId: result.paymentID,
    })

    res.json({ success: true, bkashURL: result.bkashURL, paymentID: result.paymentID })
  } catch (err) { next(err) }
}

// bKash callback — called by bKash after payment
export const bkashCallback = async (req, res, next) => {
  try {
    const { paymentID, status } = req.query

    if (status !== 'success') {
      await Payment.findOneAndUpdate({ bkashPaymentId: paymentID }, { status: 'failed' })
      return res.redirect(`${process.env.FRONTEND_URL}/tenant/payments?status=failed`)
    }

    const token = await getBkashToken()
    const result = await executeBkashPayment({ paymentId: paymentID, token: token.id_token })

    if (result.statusCode !== '0000') {
      await Payment.findOneAndUpdate({ bkashPaymentId: paymentID }, { status: 'failed' })
      return res.redirect(`${process.env.FRONTEND_URL}/tenant/payments?status=failed`)
    }

    const payment = await Payment.findOneAndUpdate(
      { bkashPaymentId: paymentID },
      { status: 'success', bkashTxId: result.trxID, bkashExecuteTime: new Date(), paidAt: new Date() },
      { new: true }
    )

    if (payment) {
      await updateBillAfterPayment(payment.billId, payment.amount)
      const tenant = await Tenant.findById(payment.tenantId).populate('userId')
      if (tenant?.userId) {
        const bill = await Bill.findById(payment.billId)
        await sendPaymentReceivedNotification(tenant, payment.amount, bill)
      }
    }

    res.redirect(`${process.env.FRONTEND_URL}/tenant/payments?status=success`)
  } catch (err) { next(err) }
}
