/* BALAD PRIVATE SCHOOLS — Firebase Configuration */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getMessaging,
  isSupported
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLU7CdFlCrLxGzRo0Z0PQOQ-6Y91ccj-M",
  authDomain: "projectb-wetrending-space.firebaseapp.com",
  projectId: "projectb-wetrending-space",
  storageBucket: "projectb-wetrending-space.firebasestorage.app",
  messagingSenderId: "106348539335",
  appId: "1:106348539335:web:50ec676ce6d424a82c3de2"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let messaging = null;

async function getBaladMessaging() {
  try {
    if (!(await isSupported())) {
      return null;
    }

    if (!messaging) {
      messaging = getMessaging(app);
    }

    return messaging;
  } catch (error) {
    console.error("BALAD Firebase Messaging error:", error);
    return null;
  }
}

export {
  app,
  auth,
  db,
  getBaladMessaging
};

console.log("BALAD Firebase connected successfully.");

