const defaults = {
  time: "08:00",
  timeZone: "America/New_York",
  mine: true,
  shared: true,
  partner: true,
  skipQuiet: true,
  details: true,
};
function preferences(value = {}) {
  const result = { ...defaults, ...value };
  if (!/^([01]\d|2[0-3]):(00|30)$/.test(result.time))
    throw new Error("Choose a half-hour delivery time.");
  if (typeof result.timeZone !== "string" || result.timeZone.length > 80)
    throw new Error("Choose a valid time zone.");
  new Intl.DateTimeFormat("en-US", { timeZone: result.timeZone }).format();
  for (const key of ["mine", "shared", "partner", "skipQuiet", "details"])
    if (typeof result[key] !== "boolean")
      throw new Error("Invalid notification preference.");
  if (!result.mine && !result.shared && !result.partner)
    throw new Error("Choose at least one notification category.");
  return Object.fromEntries(Object.keys(defaults).map((k) => [k, result[k]]));
}
function localClock(now, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}
function ready(record, now) {
  const clock = localClock(now, record.preferences.timeZone);
  const [h, m] = record.preferences.time.split(":").map(Number),
    elapsed = clock.minutes - h * 60 - m;
  return (
    record.enabled &&
    record.lastAttemptDate !== clock.date &&
    elapsed >= 0 &&
    elapsed < 30
  );
}
function assigned(task, members) {
  if (task.assignment === "rotating") {
    const ids = members.map((m) => m.id).sort((a, b) => a.localeCompare(b));
    return ids.length
      ? ids[(task.rotationIndex || 0) % ids.length]
      : "unassigned";
  }
  return (
    task.assignedTo ||
    (task.owner === "Shared rhythm" ? "shared" : "unassigned")
  );
}
function buildDigest(tasks, members, uid, prefs, now = new Date()) {
  const today = localClock(now, prefs.timeZone).date;
  const previous = new Date(today + "T12:00:00Z");
  previous.setUTCDate(previous.getUTCDate() - 1);
  const yesterday = previous.toISOString().slice(0, 10);
  const due = tasks
    .filter(
      (t) =>
        t.nextDate &&
        t.nextDate <= today &&
        !(t.history || []).some((h) => h.date === today),
    )
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const mine = prefs.mine
    ? due.filter((t) => assigned(t, members) === uid)
    : [];
  const shared = prefs.shared
    ? due.filter((t) => assigned(t, members) === "shared")
    : [];
  const memberIds = new Set(members.map((m) => m.id));
  const partner = prefs.partner
    ? tasks.filter((t) =>
        (t.history || []).some(
          (e) =>
            e.completedBy !== uid &&
            memberIds.has(e.completedBy) &&
            e.date >= yesterday &&
            e.date <= today,
        ),
      )
    : [];
  const count = mine.length + shared.length + partner.length;
  if (!count && prefs.skipQuiet) return null;
  const parts = [];
  if (mine.length)
    parts.push(
      `${mine.length} for you: ${mine
        .slice(0, 2)
        .map((t) => t.title)
        .join(", ")}`,
    );
  if (shared.length)
    parts.push(
      `${shared.length} shared: ${shared
        .slice(0, 2)
        .map((t) => t.title)
        .join(", ")}`,
    );
  if (partner.length)
    parts.push(
      `Your partner handled ${partner.length} since yesterday: ${partner
        .slice(0, 1)
        .map((t) => t.title)
        .join("")}`,
    );
  const body = prefs.details
    ? parts.join(". ") || "A quiet day. Your household has room to breathe."
    : "Your daily household update is ready. Open Home Rhythm to see it.";
  return {
    title: "Your daily home rhythm",
    body: body.length > 280 ? body.slice(0, 277) + "…" : body,
    tag: "home-rhythm-daily",
    url: "https://home-rhythm-skeyd87.web.app/#tasks",
  };
}
function validateSubscription(value) {
  if (
    !value ||
    typeof value.endpoint !== "string" ||
    value.endpoint.length > 4096
  )
    throw new Error("Invalid push subscription.");
  const url = new URL(value.endpoint);
  const allowed =
    url.hostname === "fcm.googleapis.com" ||
    url.hostname === "updates.push.services.mozilla.com" ||
    url.hostname.endsWith(".push.services.mozilla.com") ||
    url.hostname === "web.push.apple.com" ||
    url.hostname.endsWith(".notify.windows.com");
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !allowed
  )
    throw new Error("Unsupported push provider.");
  if (
    !/^[A-Za-z0-9_-]{80,100}$/.test(value.keys?.p256dh) ||
    !/^[A-Za-z0-9_-]{20,30}$/.test(value.keys?.auth)
  )
    throw new Error("Invalid push keys.");
  return {
    endpoint: value.endpoint,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
  };
}
module.exports = {
  defaults,
  preferences,
  localClock,
  ready,
  buildDigest,
  validateSubscription,
};
