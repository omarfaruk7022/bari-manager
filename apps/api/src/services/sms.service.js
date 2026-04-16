/**
 * SMS Service — Bangladesh focused
 * Supports: SSL Wireless (popular BD gateway), Twilio, or generic HTTP gateway
 * BD people prefer SMS over email, so this is primary notification channel.
 */

const isSmsConfigured = () => {
  return !!(
    process.env.SMS_PROVIDER &&
    process.env.SMS_API_KEY &&
    process.env.SMS_SENDER_ID
  );
};

/**
 * Send SMS via configured provider
 * @param {string} to - Phone number (BD format: 01XXXXXXXXX or +8801XXXXXXXXX)
 * @param {string} message - Message text (Unicode supported for Bangla)
 */
export const sendSMS = async (to, message) => {
  if (!isSmsConfigured()) {
    console.error(
      "❌ SMS config missing. Set SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID in .env",
    );
    return { success: false, reason: "sms_not_configured" };
  }


  // Normalize BD phone number
  // let phone = to.replace(/\s+/g, "").replace(/^0/, "880").replace(/^\+/, "");
  let phone = to;

  try {
    const provider = process.env.SMS_PROVIDER.toLowerCase();

    if (provider === "ssl_wireless") {
      return await sendViaSslWireless(phone, message);
    } else if (provider === "twilio") {
      return await sendViaTwilio(phone, message);
    } else if (provider === "bulksmsbd" || provider === "bulksms") {
      return await sendViaBdBulkSms(phone, message);
    } else if (provider === "custom") {
      return await sendViaCustomGateway(phone, message);
    } else {
      console.error(
        `❌ Unknown SMS_PROVIDER: ${process.env.SMS_PROVIDER}. Valid: ssl_wireless, twilio, bdbulksms, custom`,
      );
      return { success: false, reason: "unknown_provider" };
    }
  } catch (err) {
    console.error("❌ SMS send error:", err.message);
    return { success: false, reason: err.message };
  }
};

// ─── SSL Wireless (popular in BD) ────────────────────────────────────────────
async function sendViaSslWireless(phone, message) {
  const url = "https://sms.sslwireless.com/pushapi/dynamic/server.php";
  const params = new URLSearchParams({
    api_token: process.env.SMS_API_KEY,
    sid: process.env.SMS_SENDER_ID,
    msisdn: phone,
    sms: message,
    csms_id: Date.now().toString(),
  });
  const res = await fetch(`${url}?${params}`);
  const text = await res.text();
  console.log(`📱 SSL Wireless SMS to ${phone}: ${text}`);
  return { success: res.ok, raw: text };
}

// ─── Twilio ───────────────────────────────────────────────────────────────────
async function sendViaTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_API_KEY;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN;
  const from = process.env.SMS_SENDER_ID;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: `+${phone}`,
    From: from,
    Body: message,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  console.log(`📱 Twilio SMS to ${phone}: ${data.status}`);
  return { success: res.ok, sid: data.sid };
}

// ─── BD Bulk SMS ──────────────────────────────────────────────────────────────

async function sendViaBdBulkSms(phone, message) {
  const baseUrl = "http://bulksmsbd.net/api/smsapi";

  const params = new URLSearchParams({
    api_key: process.env.SMS_API_KEY,
    type: "text",
    number: phone, // 88017XXXXXXXX
    senderid: process.env.SMS_SENDER_ID,
    message: message,
  });

  const res = await fetch(`${baseUrl}?${params}`);
  const text = await res.text();

  console.log("SMS Response:", text);

  return { success: res.ok, raw: text };
}
// async function sendViaBdBulkSms(phone, message) {
//   console.log("phone in last func", phone, message);

//   return;
//   const url = "http://bulksmsbd.net/api/smsapi";

//   const body = new URLSearchParams({
//     api_key: process.env.SMS_API_KEY,
//     type: "text",
//     number: phone,
//     senderid: process.env.SMS_SENDER_ID,
//     message: message,
//   });

//   const res = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body,
//   });

//   const text = await res.text();
//   console.log("res in last func", text);

//   return { success: res.ok, raw: text };
// }

// ─── Custom HTTP Gateway ──────────────────────────────────────────────────────
async function sendViaCustomGateway(phone, message) {
  const url = process.env.SMS_GATEWAY_URL;
  if (!url) {
    console.error("❌ SMS_GATEWAY_URL not set for custom provider");
    return { success: false, reason: "no_gateway_url" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SMS_API_KEY}`,
    },
    body: JSON.stringify({
      to: phone,
      message,
      sender_id: process.env.SMS_SENDER_ID,
    }),
  });
  const data = await res.json();
  console.log(`📱 Custom SMS to ${phone}:`, data);
  return { success: res.ok, data };
}

// ─── Pre-built SMS templates ──────────────────────────────────────────────────
const APP_URL = process.env.FRONTEND_URL;

export const sendCredentialsSMS = async ({
  name,
  phone,
  password,
  loginId,
}) => {
  const msg = `BariManager: প্রিয় ${name}, আপনার লগইন তথ্য:\nমোবাইল: ${loginId || phone}\nপাসওয়ার্ড: ${password}\nলগইন: ${APP_URL}\nপ্রথম লগইনে পাসওয়ার্ড পরিবর্তন করুন। `;
  return sendSMS(phone, msg);
};

export const sendRejectionSMS = async ({ name, phone, reason }) => {
  const msg = `BariManager: প্রিয় ${name}, আপনার আবেদন প্রত্যাখ্যান করা হয়েছে।\nকারণ: ${reason}\nবিস্তারিত জানতে যোগাযোগ করুন: 01601702285`;
  return sendSMS(phone, msg);
};

export const sendBillSMS = async ({
  name,
  phone,
  month,
  totalAmount,
  dueDate,
}) => {
  const due = dueDate
    ? new Date(dueDate).toLocaleDateString("bn-BD")
    : "শীঘ্রই";

  const msg = `BariManager: ${name}, ${month} মাসের বিল ৳${totalAmount}। শেষ তারিখ: ${due}। বিস্তারিত: ${APP_URL}/tenant/bills`;
  return sendSMS(phone, msg);
};

export const sendPaymentConfirmSMS = async ({
  name,
  phone,
  amount,
  month,
  trxId,
}) => {
  const msg = `BariManager: ${name}, ${month} মাসের ৳${amount} পেমেন্ট সফল।${trxId ? ` Trx: ${trxId}` : ""} বিস্তারিত: ${APP_URL}/tenant/payments`;
  return sendSMS(phone, msg);
};

export const sendOtpSMS = async ({ phone, otp }) => {
  const msg = `BariManager OTP: ${otp}। পাসওয়ার্ড রিসেটের জন্য এই কোড ব্যবহার করুন। (${APP_URL}) ৫ মিনিটে মেয়াদ শেষ।`;
  return sendSMS(phone, msg);
};

export const sendPasswordResetSMS = async ({ name, phone, newPassword }) => {
  const msg = `BariManager: ${name}, আপনার নতুন পাসওয়ার্ড: ${newPassword}। লগইন: ${APP_URL} লগইনের পর পরিবর্তন করুন।`;
  return sendSMS(phone, msg);
};

export const sendPaymentReminderSMS = async ({
  name,
  phone,
  month,
  dueAmount,
}) => {
  const msg = `BariManager: ${name}, ${month} মাসের ৳${dueAmount} বকেয়া। বিস্তারিত: ${APP_URL}/tenant/bills`;
  return sendSMS(phone, msg);
};
