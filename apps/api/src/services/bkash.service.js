// bKash Tokenized Checkout Integration
// Docs: https://developer.bka.sh/docs/tokenized-checkout-process

const BASE = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'

let cachedToken = null
let tokenExpiry  = null

export const getBkashToken = async () => {
  // Reuse token if still valid (expires in ~1h, refresh at 55 min)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'username':      process.env.BKASH_USERNAME,
      'password':      process.env.BKASH_PASSWORD,
    },
    body: JSON.stringify({
      app_key:    process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  })

  const data = await res.json()
  if (!data.id_token) throw new Error('bKash token grant failed: ' + JSON.stringify(data))

  cachedToken = data
  tokenExpiry  = Date.now() + 55 * 60 * 1000   // 55 minutes
  return data
}

export const createBkashPayment = async ({ amount, billId, token }) => {
  const res = await fetch(`${BASE}/tokenized/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'authorization': token,
      'x-app-key':     process.env.BKASH_APP_KEY,
    },
    body: JSON.stringify({
      mode:                  '0011',
      payerReference:        billId.toString(),
      callbackURL:           `${process.env.API_URL}/api/webhooks/bkash/callback`,
      amount:                amount.toString(),
      currency:              'BDT',
      intent:                'sale',
      merchantInvoiceNumber: billId.toString(),
    }),
  })
  return res.json()
}

export const executeBkashPayment = async ({ paymentId, token }) => {
  const res = await fetch(`${BASE}/tokenized/checkout/execute`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'authorization': token,
      'x-app-key':     process.env.BKASH_APP_KEY,
    },
    body: JSON.stringify({ paymentID: paymentId }),
  })
  return res.json()
}

export const queryBkashPayment = async ({ paymentId, token }) => {
  const res = await fetch(`${BASE}/tokenized/checkout/payment/query/${paymentId}`, {
    method:  'GET',
    headers: {
      'authorization': token,
      'x-app-key':     process.env.BKASH_APP_KEY,
    },
  })
  return res.json()
}

export const refundBkashPayment = async ({ paymentId, trxId, amount, token }) => {
  const res = await fetch(`${BASE}/tokenized/checkout/payment/refund`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'authorization': token,
      'x-app-key':     process.env.BKASH_APP_KEY,
    },
    body: JSON.stringify({ paymentID: paymentId, trxID: trxId, amount: amount.toString(), currency: 'BDT', reason: 'Refund' }),
  })
  return res.json()
}
