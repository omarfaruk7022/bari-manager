import SystemConfig from "../models/SystemConfig.model.js";

const getTelegramConfig = async () => {
  const [tokenFromDb, chatIdFromDb] = await Promise.all([
    SystemConfig.getDecrypted("TELEGRAM_BOT_TOKEN"),
    SystemConfig.getDecrypted("TELEGRAM_CHAT_ID"),
  ]);

  console.log(tokenFromDb, chatIdFromDb, "tokenFromDb, chatIdFromDb")

  return {
    token: tokenFromDb || process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: chatIdFromDb || process.env.TELEGRAM_CHAT_ID || "",
  };
};

export const sendTelegramMessage = async (text) => {
  const { token, chatId } = await getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`telegram_send_failed: ${details}`);
  }

  return { success: true };
};

export const sendTelegramLandlordRequestAlert = async (subscription) => {
  const text = [
    "নতুন landlord subscription request এসেছে",
    `নাম: ${subscription.applicantName || "N/A"}`,
    `ফোন: ${subscription.phone || "N/A"}`,
    `ইমেইল: ${subscription.email || "N/A"}`,
    `প্ল্যান: ${subscription.requestedPlan || "basic"}`,
    `মেয়াদ: ${subscription.requestedMonths || 1} মাস`,
    `বাড়ি: ${subscription.propertyName || "N/A"}`,
  ].join("\n");

  return sendTelegramMessage(text);
};
