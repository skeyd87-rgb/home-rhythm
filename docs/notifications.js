import { backend } from "./firebase-repository.js";
let account = "",
  ready = false,
  publicKey = "",
  enabled = false,
  error = "",
  preferences = {
    time: "08:00",
    timeZone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    mine: true,
    shared: true,
    partner: true,
    skipQuiet: true,
    details: true,
  };
const supported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function registration() {
  return navigator.serviceWorker.ready;
}
async function subscription() {
  return supported()
    ? (await registration()).pushManager.getSubscription()
    : null;
}
export async function loadNotifications(session, onChange) {
  const next = session.status === "synced" ? session.user?.uid : "";
  if (next === account) return;
  account = next;
  ready = false;
  enabled = false;
  error = "";
  publicKey = "";
  if (!account || !supported()) {
    onChange();
    return;
  }
  try {
    const sub = await subscription();
    const result = await backend.notifications("config", {
      ...(sub ? { subscription: sub.toJSON() } : {}),
    });
    if (account !== next) return;
    publicKey = result.publicKey;
    enabled = result.enabled;
    preferences = {
      ...result.preferences,
      timeZone: result.enabled
        ? result.preferences.timeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "America/New_York",
    };
    ready = true;
  } catch (e) {
    if (account !== next) return;
    error = e.message;
  }
  onChange();
}
export function notificationSettings() {
  const iphone = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const unavailable =
    iphone && !standalone
      ? "On iPhone, add Home Rhythm to your Home Screen, open it from there, then enable notifications."
      : !supported()
        ? "This browser does not support push notifications. Use a supported browser or install Home Rhythm on your phone."
        : "";
  const blocked = supported() && Notification.permission === "denied";
  const times = Array.from(
    { length: 48 },
    (_, i) =>
      String(Math.floor(i / 2)).padStart(2, "0") + ":" + (i % 2 ? "30" : "00"),
  );
  const toggle = (key, label) =>
    '<label class="checkbox"><input type="checkbox" name="' +
    key +
    '" ' +
    (preferences[key] ? "checked" : "") +
    ">" +
    label +
    "</label>";
  return (
    '<section class="settings-card" id="notification-settings"><p class="eyebrow">A GENTLE DAILY CHECK-IN</p><h2>Daily household notification</h2><p>One update on this device, even when the app is closed. Each of you chooses your own time and what to include.</p><p class="muted">' +
    (enabled ? "Enabled on this device." : "Off on this device.") +
    "</p>" +
    (unavailable ? "<p>" + unavailable + "</p>" : "") +
    (!account
      ? "<p>Sign in and join your shared household to enable notifications.</p>"
      : "") +
    (blocked
      ? "<p>Notifications are blocked in your browser settings. Allow them there, then reload this page.</p>"
      : "") +
    (error ? '<p role="alert">' + esc(error) + "</p>" : "") +
    '<form id="notification-form"><div class="form-grid"><label>Daily delivery time<select name="time">' +
    times
      .map(
        (t) =>
          "<option " +
          (t === preferences.time ? "selected" : "") +
          ">" +
          t +
          "</option>",
      )
      .join("") +
    '</select></label><label>Time zone<input name="timeZone" required maxlength="80" value="' +
    esc(preferences.timeZone) +
    '"></label></div>' +
    toggle("mine", "My scheduled chores") +
    toggle("shared", "Shared priorities") +
    toggle("partner", "What my partner handled since yesterday") +
    toggle("skipQuiet", "Skip days with nothing to report") +
    toggle(
      "details",
      "Show chore names in notifications (including on the lock screen)",
    ) +
    '<p class="muted">Delivery is usually within 15 minutes of your chosen time. Device settings and connectivity can delay it.</p><button class="primary" type="submit" ' +
    (!ready || unavailable || blocked ? "disabled" : "") +
    ">" +
    (enabled ? "Save notification preferences" : "Enable daily notification") +
    "</button></form>" +
    (enabled
      ? '<div class="detail-actions"><button class="secondary" data-action="test-notification">Send test notification</button><button class="secondary" data-action="disable-notifications">Turn off on this device</button></div>'
      : "") +
    "</section>"
  );
}
export async function saveNotifications(form) {
  if (!ready || !publicKey)
    throw new Error("Notification settings are still connecting.");
  const data = new FormData(form);
  const proposed = {
    time: String(data.get("time")),
    timeZone: String(data.get("timeZone")).trim(),
  };
  for (const key of ["mine", "shared", "partner", "skipQuiet", "details"])
    proposed[key] = data.has(key);
  if (!proposed.mine && !proposed.shared && !proposed.partner)
    throw new Error("Choose at least one notification category.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: proposed.timeZone }).format();
  } catch {
    throw new Error("Use a time zone such as America/New_York.");
  }
  // Permission request must remain inside the direct user gesture for iOS.
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Notifications were not enabled. You can try again from Settings.",
    );
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (sub && !enabled) {
    // Replace a browser subscription that the server has retired.
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    const text = publicKey.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(text + "=".repeat((4 - (text.length % 4)) % 4)),
      (c) => c.charCodeAt(0),
    );
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    });
  }
  const result = await backend.notifications("save", {
    subscription: sub.toJSON(),
    preferences: proposed,
  });
  preferences = result.preferences;
  enabled = true;
  error = "";
}
export async function disableNotifications() {
  const sub = await subscription();
  if (sub) {
    await backend.notifications("disable", { subscription: sub.toJSON() });
    await sub.unsubscribe();
  }
  enabled = false;
}
export async function testNotification() {
  const sub = await subscription();
  if (!sub) throw new Error("Enable notifications first.");
  await backend.notifications("test", { subscription: sub.toJSON() });
}
export async function stopNotificationsOnSignOut() {
  if (account && supported() && (await subscription()))
    await disableNotifications();
}
