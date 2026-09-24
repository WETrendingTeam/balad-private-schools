import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

const config = window.BALAD_NOTIFICATION_CONFIG;
const statusEl = document.getElementById("notificationStatus");
const tokenBox = document.getElementById("tokenBox");
const enableBtn = document.getElementById("enableNotifications");

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function isConfigured() {
  const f = config?.firebaseConfig || {};
  return Boolean(
    f.apiKey &&
    f.projectId &&
    f.messagingSenderId &&
    f.appId &&
    config?.vapidKey &&
    !String(f.apiKey).startsWith("PASTE_") &&
    !String(config.vapidKey).startsWith("PASTE_")
  );
}

async function enableNotifications() {
  if (!window.isSecureContext) {
    setStatus("BALAD notifications require HTTPS. Deploy the site over HTTPS first.", "error");
    return;
  }

  if (!isConfigured()) {
    setStatus("BALAD notifications are not configured yet. Complete the Firebase setup first.", "error");
    return;
  }

  if (!(await isSupported())) {
    setStatus("This browser does not support web push notifications.", "error");
    return;
  }

  if (!("Notification" in window)) {
    setStatus("Notifications are not available in this browser.", "error");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setStatus("Notification permission was not granted. You can enable it later in your browser settings.", "error");
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );

    const app = initializeApp(config.firebaseConfig, "BALADNotifications");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      setStatus("BALAD could not create a notification registration. Please try again.", "error");
      return;
    }

    localStorage.setItem("baladNotificationEnabled", "true");
    localStorage.setItem("baladNotificationToken", token);

    tokenBox.value = token;
    tokenBox.hidden = false;
    setStatus("Notifications are enabled on this device.", "success");
    enableBtn.textContent = "Notifications Enabled";
    enableBtn.disabled = true;
  } catch (error) {
    console.error("BALAD notification setup error:", error);
    setStatus(`Could not enable notifications: ${error.message || error}`, "error");
  }
}

async function start() {
  if (!isConfigured()) {
    setStatus("Setup required: this page is ready, but the separate BALAD Firebase notification project has not been connected yet.", "info");
  }

  enableBtn.addEventListener("click", enableNotifications);

  if ("serviceWorker" in navigator && isConfigured()) {
    try {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    } catch (error) {
      console.warn("BALAD service worker registration failed:", error);
    }
  }

  if (isConfigured()) {
    try {
      const app = initializeApp(config.firebaseConfig, "BALADNotifications");
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const title = payload?.notification?.title || "BALAD Private Schools";
        const body = payload?.notification?.body || "You have a new BALAD notification.";
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icons/balad-logo-192.png" });
        }
      });
    } catch (error) {
      console.warn("BALAD foreground messaging could not start:", error);
    }
  }
}

start();
