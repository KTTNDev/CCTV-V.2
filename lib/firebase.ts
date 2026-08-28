import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";
import {
  type AppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey:
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env
      .NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env
      .NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env
      .NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env
      .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env
      .NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:
    process.env
      .NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const useFirebaseEmulators =
  process.env
    .NEXT_PUBLIC_USE_FIREBASE_EMULATORS ===
  "true";

declare global {
  var __rawaiFirebaseEmulatorsConnected:
    | boolean
    | undefined;

  var __rawaiFirebaseAppCheck:
    | AppCheck
    | undefined;
}

if (
  typeof window !== "undefined" &&
  useFirebaseEmulators &&
  !globalThis
    .__rawaiFirebaseEmulatorsConnected
) {
  connectAuthEmulator(
    auth,
    "http://127.0.0.1:9099",
    {
      disableWarnings: true,
    },
  );

  connectFirestoreEmulator(
    db,
    "127.0.0.1",
    8080,
  );

  connectStorageEmulator(
    storage,
    "127.0.0.1",
    9199,
  );

  globalThis
    .__rawaiFirebaseEmulatorsConnected =
    true;
}

const appCheckSiteKey =
  process.env
    .NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;

let appCheck: AppCheck | null =
  globalThis.__rawaiFirebaseAppCheck ??
  null;

if (
  typeof window !== "undefined" &&
  !useFirebaseEmulators &&
  appCheckSiteKey &&
  !appCheck
) {
  appCheck = initializeAppCheck(app, {
    provider:
      new ReCaptchaV3Provider(
        appCheckSiteKey,
      ),
    isTokenAutoRefreshEnabled: true,
  });

  globalThis.__rawaiFirebaseAppCheck =
    appCheck;
}

export {
  app,
  appCheck,
  auth,
  db,
  storage,
  useFirebaseEmulators,
};