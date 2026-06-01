import { onSchedule } from "firebase-functions/v2/scheduler";
import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Admin SDK once at the top level
admin.initializeApp();

// ==========================================================
// FUNCTION 1: Scheduled Payment Dues (Daily at 2:14 AM Ghana Time)
// ==========================================================
export const checkPaymentDuesGhana = onSchedule({
  schedule: "15 17 * * *", 
  timeZone: "Africa/Accra",
  memory: "256MiB",
}, async () => {
  const db = admin.database();
  
  // Force date to match Ghana's calendar day
  const todayStr = new Date().toLocaleDateString('en-CA', { 
    timeZone: "Africa/Accra" 
  });

  logger.info(`🚀 [Schedule] Starting check for date: ${todayStr}`);

  try {
    const purchasesRef = db.ref("purchases");
    const snapshot = await purchasesRef.once("value");

    if (!snapshot.exists()) return;

    const allPurchases = snapshot.val();
    let notificationCount = 0;

    for (const userId in allPurchases) {
      const userPurchases = allPurchases[userId];

      for (const purchaseId in userPurchases) {
        const schedule = userPurchases[purchaseId].paymentSchedule;
        if (!schedule) continue;

        for (const paymentKey in schedule) {
          const payment = schedule[paymentKey];
          if (!payment.dueDate) continue;

          const paymentDateOnly = payment.dueDate.split("T")[0];

          if (paymentDateOnly === todayStr && payment.isPaid === false) {
            
            const tokenSnap = await db.ref(`users/${userId}/fcmToken`).once("value");
            const userToken = tokenSnap.val();

            if (userToken) {
              const productName = userPurchases[purchaseId].productName || purchaseId;
              const title = "Payment Due Today! 💳";
              const body = `Your installment for ${productName} of amount ${payment.amount} is due today.`;

              try {
                await admin.messaging().send({
                  token: userToken,
                  notification: { title, body },
                  android: {
                    priority: "high",
                    notification: {
                      channelId: "high_importance_channel_v2",
                      clickAction: "FLUTTER_NOTIFICATION_CLICK",
                    },
                  },
                });

                // Save to history
                await db.ref(`notifications/${userId}`).push().set({
                  title,
                  body,
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                  isRead: false,
                });

                notificationCount++;
              } catch (e) {
                logger.error(`Failed to send to ${userId}`, e);
              }
            }
          }
        }
      }
    }
    logger.info(`🏁 [Schedule] Finished. Sent ${notificationCount} notifications.`);
  } catch (error) {
    logger.error("❌ [Schedule] Error:", error);
  }
});

// ==========================================================
// FUNCTION 2: Welcome Notification (Triggered on Token Write)
// ==========================================================
export const sendWelcomeNotification = onValueWritten(
  {
    ref: "users/{userId}/fcmToken",
    region: "us-central1", 
  },
  async (event) => {
    const userId = event.params.userId;
    const newToken = event.data.after.val();
    const oldToken = event.data.before.val();

    // Stop if token was deleted (logout)
    if (!newToken) return;

    // Optional: Stop if token is identical to avoid duplicates
    // if (newToken === oldToken) return;

    const db = admin.database();

    try {
      const nameSnap = await db.ref(`users/${userId}/name`).once("value");
      const userName = nameSnap.val() || "User";

      // Detect if this is a new signup (no old token) or a login (old token existed)
      const isFirstLogin = !oldToken;

      const title = isFirstLogin ? "Welcome to BNPL! 🎉" : "Welcome Back! 👋";
      const body = isFirstLogin
        ? `Hi ${userName}, thanks for joining us!`
        : `Hi ${userName}, great to see you again.`;

      await admin.messaging().send({
        token: newToken,
        notification: { title, body },
        android: {
          priority: "high",
          notification: {
            channelId: "high_importance_channel_v2",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      });

      // Save to history
      await db.ref(`notifications/${userId}`).push().set({
        title,
        body,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        isRead: false,
        type: "welcome",
      });

      logger.info(`✅ [Welcome] Notification sent to ${userName}`);
    } catch (error) {
      logger.error(`❌ [Welcome] Error:`, error);
    }
  }
);