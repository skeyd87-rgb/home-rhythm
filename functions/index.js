const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { createHash } = require("node:crypto");
const webpush = require("web-push");
const {
  defaults,
  preferences,
  localClock,
  ready,
  buildDigest,
  validateSubscription,
} = require("./digest");
initializeApp();
const db = getFirestore();
const vapid = defineSecret("HOME_RHYTHM_WEB_PUSH");
const collection = db.collection("homeRhythmNotificationDevices");
const config = {
  region: "us-east1",
  secrets: [vapid],
  maxInstances: 2,
  memory: "256MiB",
};
function keys() {
  return JSON.parse(vapid.value());
}
function deviceId(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex");
}
async function membership(uid, expected) {
  const profile = await db.doc(`users/${uid}`).get();
  const householdId = profile.data()?.householdId;
  if (!householdId || (expected && expected !== householdId))
    throw new HttpsError(
      "failed-precondition",
      "Join your household before enabling notifications.",
    );
  const member = await db.doc(`households/${householdId}/members/${uid}`).get();
  if (!member.exists)
    throw new HttpsError(
      "permission-denied",
      "Your household membership needs attention.",
    );
  return householdId;
}
function send(subscription, payload) {
  const pair = keys();
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 3600,
    timeout: 15000,
    vapidDetails: {
      subject: "mailto:skeyd87@gmail.com",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
    },
  });
}
exports.homeRhythmNotifications = onCall(
  {
    ...config,
    cors: [
      "https://home-rhythm-skeyd87.web.app",
      "https://home-rhythm-skeyd87.firebaseapp.com",
      "https://skeyd87-rgb.github.io",
    ],
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in first.");
    const uid = request.auth.uid;
    const householdId = await membership(uid);
    const data = request.data || {};
    if (data.action === "config" && !data.subscription)
      return {
        publicKey: keys().publicKey,
        preferences: defaults,
        enabled: false,
      };
    let subscription, prefs;
    try {
      subscription = validateSubscription(data.subscription);
      prefs = preferences(data.preferences || {});
    } catch (error) {
      throw new HttpsError("invalid-argument", error.message);
    }
    const ref = collection.doc(deviceId(subscription.endpoint));
    const snapshot = await ref.get();
    const existing = snapshot.data();
    if (existing && existing.uid !== uid)
      throw new HttpsError(
        "permission-denied",
        "This browser is registered to another account. Turn off its notifications before switching accounts.",
      );
    if (data.action === "config")
      return {
        publicKey: keys().publicKey,
        preferences: existing?.preferences || defaults,
        enabled: Boolean(existing?.enabled),
        lastOutcome: existing?.lastOutcome || null,
      };
    if (data.action === "disable") {
      if (existing)
        await ref.update({
          enabled: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
      return { enabled: false };
    }
    if (data.action === "save") {
      await ref.set(
        {
          uid,
          householdId,
          subscription,
          preferences: prefs,
          enabled: true,
          updatedAt: FieldValue.serverTimestamp(),
          ...(existing ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      );
      return { enabled: true, preferences: prefs };
    }
    if (data.action === "test") {
      if (!existing?.enabled)
        throw new HttpsError(
          "failed-precondition",
          "Enable notifications first.",
        );
      await db.runTransaction(async (tx) => {
        const fresh = (await tx.get(ref)).data();
        if (Date.now() - (fresh.lastTestAt?.toMillis() || 0) < 60000)
          throw new HttpsError(
            "resource-exhausted",
            "Wait a minute before sending another test.",
          );
        tx.update(ref, { lastTestAt: FieldValue.serverTimestamp() });
      });
      try {
        await send(subscription, {
          title: "Home Rhythm is connected",
          body: "Your daily household update will arrive at your chosen time.",
          tag: "home-rhythm-test",
          url: "https://home-rhythm-skeyd87.web.app/#settings",
        });
      } catch (error) {
        if ([404, 410].includes(error.statusCode))
          await ref.update({ enabled: false });
        throw new HttpsError(
          "unavailable",
          "This device could not be reached. Turn notifications off, then enable them again.",
        );
      }
      return { sent: true };
    }
    throw new HttpsError("invalid-argument", "Unknown notification action.");
  },
);
exports.homeRhythmDailyDigest = onSchedule(
  {
    ...config,
    schedule: "every 15 minutes",
    timeZone: "UTC",
    retryCount: 0,
    timeoutSeconds: 300,
  },
  async () => {
    const now = new Date();
    const devices = await collection.where("enabled", "==", true).get();
    for (const item of devices.docs) {
      let record = item.data();
      try {
        if (!ready(record, now)) continue;
        await membership(record.uid, record.householdId);
        const claimed = await db.runTransaction(async (tx) => {
          const fresh = (await tx.get(item.ref)).data();
          if (!fresh || !ready(fresh, now)) return false;
          tx.update(item.ref, {
            lastAttemptDate: localClock(now, fresh.preferences.timeZone).date,
            lastOutcome: "attempting",
          });
          return fresh;
        });
        if (!claimed) continue;
        record = claimed;
        await membership(record.uid, record.householdId);
        const [tasks, members] = await Promise.all([
          db.collection(`households/${record.householdId}/chores`).get(),
          db.collection(`households/${record.householdId}/members`).get(),
        ]);
        const payload = buildDigest(
          tasks.docs.map((d) => d.data()),
          members.docs.map((d) => ({ id: d.id, ...d.data() })),
          record.uid,
          record.preferences,
          now,
        );
        if (!payload) {
          await item.ref.update({ lastOutcome: "quiet-day" });
          continue;
        }
        await send(record.subscription, payload);
        await item.ref.update({
          lastOutcome: "accepted",
          lastSentAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        const expired =
          [404, 410].includes(error.statusCode) ||
          ["permission-denied", "failed-precondition"].includes(error.code);
        await item.ref.update({
          lastOutcome: "unavailable",
          ...(expired ? { enabled: false } : {}),
        });
        console.warn("Home Rhythm digest not delivered", {
          device: item.id,
          code: error.statusCode || error.code || "unknown",
        });
      }
    }
  },
);
