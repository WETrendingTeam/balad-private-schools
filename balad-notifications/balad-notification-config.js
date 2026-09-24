/* BALAD NOTIFICATIONS — CONFIGURATION
 *
 * This file is intentionally separate from the existing BALAD Firebase files.
 * Create a NEW Firebase project for BALAD notifications and paste that Web App
 * config below. Do NOT paste the WETrending/ProjectB Firebase config here.
 */

window.BALAD_NOTIFICATION_CONFIG = {
  firebaseConfig: {
    apiKey: "PASTE_BALAD_FIREBASE_API_KEY",
    authDomain: "PASTE_BALAD_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_BALAD_PROJECT_ID",
    storageBucket: "PASTE_BALAD_STORAGE_BUCKET",
    messagingSenderId: "PASTE_BALAD_MESSAGING_SENDER_ID",
    appId: "PASTE_BALAD_APP_ID"
  },

  // Firebase Console > Project settings > Cloud Messaging > Web Push certificates
  vapidKey: "PASTE_BALAD_PUBLIC_VAPID_KEY"
};
