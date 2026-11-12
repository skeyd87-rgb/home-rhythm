const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { defaults, localClock } = require("../digest");
const records = new Map(),
  sent = [];
let sendError = null;
const ref = (path) => ({
  path,
  async get() {
    const data = records.get(path);
    return {
      exists: !!data,
      id: path.split("/").pop(),
      ref: this,
      data: () => data,
    };
  },
  async set(value, { merge } = {}) {
    records.set(path, merge ? { ...records.get(path), ...value } : value);
  },
  async update(value) {
    assert.ok(records.has(path));
    records.set(path, { ...records.get(path), ...value });
  },
});
const collection = (path) => ({
  doc: (id) => ref(path + "/" + id),
  async get() {
    return {
      docs: [...records.keys()]
        .filter(
          (k) =>
            k.startsWith(path + "/") &&
            k.split("/").length === path.split("/").length + 1,
        )
        .map((k) => ({
          id: k.split("/").pop(),
          ref: ref(k),
          data: () => records.get(k),
        })),
    };
  },
  where() {
    return {
      get: async () => ({
        docs: (await this.get()).docs.filter((d) => d.data().enabled),
      }),
    };
  },
});
const db = {
  doc: ref,
  collection,
  runTransaction: async (fn) =>
    fn({ get: (r) => r.get(), update: (r, d) => r.update(d) }),
};
class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const mocks = {
  "firebase-admin/app": { initializeApp() {} },
  "firebase-admin/firestore": {
    getFirestore: () => db,
    FieldValue: { serverTimestamp: () => ({ toMillis: () => Date.now() }) },
  },
  "firebase-functions/v2/https": { onCall: (_c, f) => f, HttpsError },
  "firebase-functions/v2/scheduler": { onSchedule: (_c, f) => f },
  "firebase-functions/params": {
    defineSecret: () => ({
      value: () =>
        JSON.stringify({ publicKey: "public", privateKey: "private" }),
    }),
  },
  "web-push": {
    sendNotification: async (sub, payload) => {
      if (sendError) throw sendError;
      sent.push({ sub, payload: JSON.parse(payload) });
    },
  },
};
const original = Module._load;
Module._load = function (name, ...args) {
  return mocks[name] || original.call(this, name, ...args);
};
const {
  homeRhythmNotifications: call,
  homeRhythmDailyDigest: run,
} = require("../index");
Module._load = original;
const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test",
  keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
};
const uid = "steven";
function setup() {
  records.clear();
  sent.length = 0;
  sendError = null;
  records.set("users/" + uid, { householdId: "home" });
  records.set("households/home/members/" + uid, { displayName: "Steven" });
  records.set("households/home/members/brittany", { displayName: "Brittany" });
}
const request = (action, extra = {}) => ({
  auth: { uid },
  data: { action, subscription: sub, ...extra },
});
test("callable rejects signed-out callers and users outside a household", async () => {
  setup();
  await assert.rejects(() => call({ data: { action: "config" } }), {
    code: "unauthenticated",
  });
  records.delete("households/home/members/" + uid);
  await assert.rejects(() => call(request("save")), {
    code: "permission-denied",
  });
});
test("preferences persist per device and config never exposes private signing key", async () => {
  setup();
  await call(
    request("save", {
      preferences: { ...defaults, time: "09:30", details: false },
    }),
  );
  const config = await call(request("config"));
  assert.equal(config.enabled, true);
  assert.equal(config.preferences.time, "09:30");
  assert.equal(config.preferences.details, false);
  assert.equal(config.publicKey, "public");
  assert.equal(JSON.stringify(config).includes("private"), false);
  await call(request("disable"));
  assert.equal((await call(request("config"))).enabled, false);
});
test("a second household member cannot read or modify another device registration", async () => {
  setup();
  await call(request("save"));
  records.set("users/brittany", { householdId: "home" });
  await assert.rejects(
    () => call({ ...request("config"), auth: { uid: "brittany" } }),
    { code: "permission-denied" },
  );
  await assert.rejects(
    () => call({ ...request("disable"), auth: { uid: "brittany" } }),
    { code: "permission-denied" },
  );
});
test("test notifications require enabled registration and are rate limited", async () => {
  setup();
  await assert.rejects(() => call(request("test")), {
    code: "failed-precondition",
  });
  await call(request("save"));
  await call(request("test"));
  assert.equal(sent.length, 1);
  await assert.rejects(() => call(request("test")), {
    code: "resource-exhausted",
  });
});
async function scheduled(skipQuiet = true) {
  setup();
  const clock = localClock(new Date(), "UTC");
  const time =
    String(Math.floor(clock.minutes / 60)).padStart(2, "0") +
    ":" +
    (clock.minutes % 60 < 30 ? "00" : "30");
  await call(
    request("save", {
      preferences: { ...defaults, time, timeZone: "UTC", skipQuiet },
    }),
  );
  return clock;
}
test("scheduler claims one daily attempt even across repeated invocations", async () => {
  const clock = await scheduled();
  records.set("households/home/chores/laundry", {
    title: "Laundry",
    assignedTo: uid,
    nextDate: clock.date,
    history: [],
  });
  await run();
  await run();
  assert.equal(sent.length, 1);
  assert.match(sent[0].payload.body, /Laundry/);
});
test("quiet days send nothing and obsolete household memberships disable delivery", async () => {
  await scheduled();
  await run();
  assert.equal(sent.length, 0);
  await scheduled(false);
  records.set("users/" + uid, { householdId: "different" });
  await run();
  assert.equal(sent.length, 0);
  assert.equal(
    (await collection("homeRhythmNotificationDevices").get()).docs[0].data()
      .enabled,
    false,
  );
});
test("expired subscriptions are disabled without repeat delivery attempts", async () => {
  await scheduled(false);
  sendError = { statusCode: 410 };
  await run();
  await run();
  assert.equal(
    (await collection("homeRhythmNotificationDevices").get()).docs[0].data()
      .enabled,
    false,
  );
});
