import nodemailer from 'nodemailer'

// Created lazily so it always uses current env values
// (including those loaded from DB config after startup)
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.error('❌ Email config missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM in .env or admin config panel.')
    return null
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter()
  if (!transporter) return

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })
    console.log(`✅ Email sent to ${to} — MessageId: ${info.messageId}`)
  } catch (err) {
    console.error(`❌ Email send failed to ${to}:`, err.message)
    throw err // re-throw so callers can catch it
  }
}

export const sendCredentialsEmail = async ({ name, email, password }) => {
  await sendEmail({
    to: email,
    subject: 'BariManager - আপনার লগইন তথ্য',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#16a34a">BariManager-এ স্বাগতম!</h2>
        <p>প্রিয় <strong>${name}</strong>,</p>
        <p>আপনার অ্যাকাউন্ট তৈরি হয়েছে। নিচের তথ্য দিয়ে লগইন করুন:</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>ইমেইল:</strong> ${email}</p>
          <p style="margin:4px 0"><strong>পাসওয়ার্ড:</strong> ${password}</p>
        </div>
        <p style="color:#dc2626"><strong>প্রথম লগইনের পর পাসওয়ার্ড পরিবর্তন করুন।</strong></p>
        <a href="${process.env.FRONTEND_URL}/login"
           style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
          এখনই লগইন করুন
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">BariManager | বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
      </div>
    `,
  })
}

export const sendRejectionEmail = async ({ name, email, reason }) => {
  await sendEmail({
    to: email,
    subject: 'BariManager - আবেদন প্রত্যাখ্যান',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#dc2626">আবেদন প্রত্যাখ্যান</h2>
        <p>প্রিয় <strong>${name}</strong>,</p>
        <p>দুঃখিত, আপনার সাবস্ক্রিপশন আবেদন অনুমোদন করা সম্ভব হয়নি।</p>
        <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>কারণ:</strong> ${reason}</p>
        </div>
        <p>যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন।</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">BariManager | বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
      </div>
    `,
  })
}

export const sendBillEmail = async ({ name, email, month, totalAmount, dueDate, billId }) => {
  await sendEmail({
    to: email,
    subject: `BariManager - ${month} মাসের বিল`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#16a34a">${month} মাসের বিল</h2>
        <p>প্রিয় <strong>${name}</strong>,</p>
        <p>${month} মাসের বিল তৈরি হয়েছে।</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>মোট পরিমাণ:</strong> ৳${totalAmount}</p>
          <p style="margin:4px 0"><strong>শেষ তারিখ:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString('bn-BD') : 'নির্ধারিত হয়নি'}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/tenant/bills"
           style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
          বিল দেখুন ও পরিশোধ করুন
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">BariManager | বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
      </div>
    `,
  })
}

export const sendPaymentConfirmEmail = async ({ name, email, amount, month, trxId }) => {
  await sendEmail({
    to: email,
    subject: 'BariManager - পেমেন্ট নিশ্চিত',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#16a34a">পেমেন্ট সফল ✓</h2>
        <p>প্রিয় <strong>${name}</strong>,</p>
        <p>আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>পরিমাণ:</strong> ৳${amount}</p>
          <p style="margin:4px 0"><strong>মাস:</strong> ${month}</p>
          ${trxId ? `<p style="margin:4px 0"><strong>ট্রানজেকশন ID:</strong> ${trxId}</p>` : ''}
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">BariManager | বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
      </div>
    `,
  })
}