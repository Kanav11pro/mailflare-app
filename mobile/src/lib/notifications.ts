import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { api } from "../api/client";

// Detect if running inside Expo Go client (where Android remote push notifications throw on module load in SDK 53+)
const isExpoGoAndroid =
  Platform.OS === "android" &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo");

let _notificationsModule: typeof import("expo-notifications") | null = null;

function getNotificationsModule(): typeof import("expo-notifications") | null {
  if (isExpoGoAndroid) {
    return null;
  }
  if (!_notificationsModule) {
    try {
      _notificationsModule = require("expo-notifications");
      if (_notificationsModule) {
        _notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    } catch (e) {
      console.warn("[Notifications] Failed to initialize notifications module:", e);
      _notificationsModule = null;
    }
  }
  return _notificationsModule;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGoAndroid) {
    console.log(
      "[Push Notifications] Skipped in Expo Go Android (SDK 53+). Remote notifications are supported in Development / Production builds."
    );
    return null;
  }

  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default Emails",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3b82f6",
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permissions not granted");
      return null;
    }

    // Register Interactive Notification Categories for Lock-screen Quick Actions
    await Notifications.setNotificationCategoryAsync("EMAIL_RECEIVED", [
      {
        identifier: "ACTION_REPLY",
        buttonTitle: "Quick Reply",
        textInput: {
          submitButtonTitle: "Send",
          placeholder: "Type a quick reply...",
        },
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: "ACTION_READ",
        buttonTitle: "Mark Read",
        options: {
          opensAppToForeground: false,
          isDestructive: false,
        },
      },
      {
        identifier: "ACTION_TRASH",
        buttonTitle: "Trash",
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);

    // Setup interactive notification response listener
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionIdentifier = response.actionIdentifier;
      const data = (response.notification.request.content.data || {}) as Record<string, any>;
      const messageId = data.messageId ? String(data.messageId) : "";

      if (!messageId) return;

      try {
        if (actionIdentifier === "ACTION_READ") {
          await api.markRead(messageId, true);
        } else if (actionIdentifier === "ACTION_TRASH") {
          await api.bulkAction("trash", [messageId]);
        } else if (actionIdentifier === "ACTION_REPLY") {
          const userText = (response as any).userText;
          const fromAddr = data.fromAddr ? String(data.fromAddr) : "";
          const mailboxId = data.mailboxId ? String(data.mailboxId) : undefined;

          if (userText && fromAddr) {
            let targetMailboxId = mailboxId;
            if (!targetMailboxId) {
              const mbs = await api.getMailboxes().catch(() => []);
              targetMailboxId = mbs[0]?.id;
            }

            if (targetMailboxId) {
              await api.sendMessage({
                from: data.toAddr ? String(data.toAddr) : "support@mail.studyholic.xyz",
                to: fromAddr,
                subject: `Re: ${response.notification.request.content.title || "Reply"}`,
                text: String(userText),
                mailboxId: targetMailboxId,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[Push Actions] Failed to handle interactive action:", actionIdentifier, err);
      }
    });

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;

    if (token) {
      await api.registerPushToken(
        token,
        Platform.OS === "ios" ? "ios" : "android",
        `${Platform.OS} device`
      );
      return token;
    }
  } catch (error) {
    console.warn("Could not register for push notifications:", error);
  }
  return null;
}

export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    if (token) {
      await api.unregisterPushToken(token);
    }
  } catch (error) {
    console.warn("Could not unregister push token:", error);
  }
}

