"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminStorage = exports.adminDb = exports.adminAuth = exports.adminApp = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const adminApp = (0, app_1.getApps)().length > 0
    ? (0, app_1.getApp)()
    : (0, app_1.initializeApp)();
exports.adminApp = adminApp;
const adminAuth = (0, auth_1.getAuth)(adminApp);
exports.adminAuth = adminAuth;
const adminDb = (0, firestore_1.getFirestore)(adminApp);
exports.adminDb = adminDb;
const adminStorage = (0, storage_1.getStorage)(adminApp);
exports.adminStorage = adminStorage;
//# sourceMappingURL=firebase-admin.js.map