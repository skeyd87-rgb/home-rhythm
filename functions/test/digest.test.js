const test = require("node:test");
const assert = require("node:assert/strict");
const {
  defaults,
  preferences,
  localClock,
  ready,
  buildDigest,
  validateSubscription,
} = require("../digest");
const now = new Date("2026-11-12T13:00:00Z");
const members = [{ id: "steven" }, { id: "brittany" }];
const task = (title, assignedTo, nextDate = "2026-11-12", history = []) => ({
  title,
  assignedTo,
  nextDate,
  history,
});
test("delivery respects local time, daily claim, and enabled state", () => {
  const record = { enabled: true, preferences: defaults };
  assert.equal(ready(record, now), true);
  assert.equal(ready(record, new Date("2026-11-12T12:59:00Z")), false);
  assert.equal(ready(record, new Date("2026-11-12T13:29:00Z")), true);
  assert.equal(ready(record, new Date("2026-11-12T13:30:00Z")), false);
  assert.equal(ready({ ...record, lastAttemptDate: "2026-11-12" }, now), false);
  assert.equal(ready({ ...record, enabled: false }, now), false);
});
test("local dates and daylight-saving changes follow recipient time zone", () => {
  assert.deepEqual(
    localClock(new Date("2026-11-12T04:30:00Z"), "America/New_York"),
    { date: "2026-11-11", minutes: 1410 },
  );
  assert.equal(
    localClock(new Date("2026-07-12T12:00:00Z"), "America/New_York").minutes,
    480,
  );
  assert.equal(localClock(now, "America/New_York").minutes, 480);
});
test("each spouse sees own tasks, shared tasks, and partner completions", () => {
  const chores = [
    task("Laundry", "steven"),
    task("Garden", "brittany"),
    task("Kitchen", "shared"),
    task("Future", "steven", "2026-11-20"),
    task("Cats", "brittany", "2026-11-13", [
      { date: "2026-11-11", completedBy: "brittany" },
    ]),
  ];
  const steven = buildDigest(chores, members, "steven", defaults, now).body;
  assert.match(steven, /1 for you: Laundry/);
  assert.match(steven, /1 shared: Kitchen/);
  assert.match(steven, /partner handled 1 since yesterday: Cats/);
  assert.doesNotMatch(steven, /Garden|Future/);
  const brittany = buildDigest(chores, members, "brittany", defaults, now).body;
  assert.match(brittany, /1 for you: Garden/);
  assert.doesNotMatch(brittany, /Laundry|partner handled/);
});
test("handled today is excluded and unrelated or old completions stay private", () => {
  const chores = [
    task("Done", "steven", "2026-11-12", [
      { date: "2026-11-12", completedBy: "steven" },
    ]),
    task("Stranger", "shared", "2026-11-15", [
      { date: "2026-11-11", completedBy: "outside" },
    ]),
    task("Old", "brittany", "2026-11-15", [
      { date: "2026-11-09", completedBy: "brittany" },
    ]),
  ];
  assert.equal(buildDigest(chores, members, "steven", defaults, now), null);
});
test("rotation matches app ordering and only includes current assignee", () => {
  const chores = [
    { ...task("Rotating chore", ""), assignment: "rotating", rotationIndex: 1 },
  ];
  assert.match(
    buildDigest(chores, members, "steven", defaults, now).body,
    /Rotating chore/,
  );
  assert.equal(buildDigest(chores, members, "brittany", defaults, now), null);
});
test("categories and quiet-day preference are independent", () => {
  assert.equal(
    buildDigest(
      [task("Laundry", "steven")],
      members,
      "steven",
      { ...defaults, mine: false },
      now,
    ),
    null,
  );
  assert.match(
    buildDigest([], members, "steven", { ...defaults, skipQuiet: false }, now)
      .body,
    /quiet day/,
  );
});
test("lock-screen privacy hides titles and detail payload stays bounded", () => {
  const chores = [task("Private task", "steven")];
  assert.doesNotMatch(
    buildDigest(chores, members, "steven", { ...defaults, details: false }, now)
      .body,
    /Private task/,
  );
  assert.ok(
    buildDigest(
      [task("x".repeat(1000), "steven")],
      members,
      "steven",
      defaults,
      now,
    ).body.length <= 280,
  );
});
test("preferences reject invalid time, timezone, types, and empty categories", () => {
  assert.throws(() => preferences({ time: "25:00" }));
  assert.throws(() => preferences({ time: "08:15" }));
  assert.throws(() => preferences({ timeZone: "invalid" }));
  assert.throws(() => preferences({ mine: "true" }));
  assert.throws(() =>
    preferences({ mine: false, shared: false, partner: false }),
  );
  assert.deepEqual(preferences({ unknown: "ignored" }), defaults);
});
test("push endpoints accept browser providers and reject internal or spoofed URLs", () => {
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/example",
    keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
  };
  assert.deepEqual(validateSubscription(sub), sub);
  for (const endpoint of [
    "http://fcm.googleapis.com/x",
    "https://127.0.0.1/x",
    "https://fcm.googleapis.com.evil.test/x",
    "https://user@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8080/x",
  ]) {
    assert.throws(() => validateSubscription({ ...sub, endpoint }));
  }
  assert.throws(() =>
    validateSubscription({ ...sub, keys: { auth: "bad", p256dh: "bad" } }),
  );
});
test("service worker displays push and opens only the local app", async () => {
  const fs = require("node:fs"),
    vm = require("node:vm");
  const handlers = {};
  let shown,
    opened,
    closed = false;
  const scope = {
    self: {
      location: new URL("https://example.test/home-rhythm/service-worker.js"),
      addEventListener: (name, fn) => (handlers[name] = fn),
      registration: {
        showNotification: async (title, options) => {
          shown = { title, ...options };
        },
      },
    },
    URL,
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => {
        opened = url;
      },
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      require("node:path").join(__dirname, "../../docs/service-worker.js"),
      "utf8",
    ),
    scope,
  );
  let pending;
  handlers.push({
    data: {
      json: () => ({
        title: "Home Rhythm",
        body: "Laundry",
        url: "https://evil.test",
      }),
    },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.equal(shown.body, "Laundry");
  assert.equal(shown.data.url, "https://example.test/home-rhythm/#tasks");
  handlers.notificationclick({
    notification: { close: () => (closed = true) },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.equal(closed, true);
  assert.equal(opened, "https://example.test/home-rhythm/#tasks");
});
