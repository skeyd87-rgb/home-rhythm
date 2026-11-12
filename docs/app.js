import { backend } from "./firebase-repository.js";
const appVersion = "1.2.1";
const versionLabel = document.querySelector(".app-version");
if (versionLabel) {
  versionLabel.textContent = `v${appVersion}`;
  versionLabel.setAttribute("aria-label", `App version ${appVersion}`);
}
import {
  loadNotifications,
  notificationSettings,
  saveNotifications,
  disableNotifications,
  testNotification,
  stopNotificationsOnSignOut,
} from "./notifications.js";
import { seedTasks, maintenanceSeedTasks } from "./seeds.js";
import {
  dateKey,
  parseDate,
  shift,
  normalize,
  complete,
  status,
  occurrences,
  roomNames,
  owners,
  recurrence,
  assignmentLabel,
  matchesPerson,
} from "./schedule.js";
import {
  setCalendarToken,
  calendarConnected,
  listCalendars,
  publishCalendar,
} from "./google-calendar.js";

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const storageKey = "home-rhythm-pages-v1";
let personView = "everyone";
function assignmentOptions(task) {
  const current =
    task.assignment === "rotating"
      ? "rotating"
      : task.assignedTo ||
        (task.owner === "Shared rhythm" ? "shared" : "unassigned");
  return [
    ["shared", "Shared · either of us"],
    ["unassigned", "Choose a person"],
    ...session.members.map((m) => [
      m.id,
      m.displayName || m.email || "Household member",
    ]),
    ...(session.members.length > 1 ? [["rotating", "Take turns"]] : []),
  ]
    .map(
      ([id, label]) =>
        '<option value="' +
        esc(id) +
        '" ' +
        (id === current ? "selected" : "") +
        ">" +
        esc(label) +
        "</option>",
    )
    .join("");
}
let activeStorage = storageKey;
let session = {
  status: "connecting",
  user: null,
  household: null,
  members: [],
  syncMessage: "Connecting",
};
let state = { tasks: [], customZones: [] },
  tab = "home",
  filter = "all",
  search = "",
  roomFilter = "",
  month = dateKey().slice(0, 7),
  selectedDay = dateKey(),
  busy = false,
  calendars = [],
  calendarId = "",
  toastTimer;
let storageError = "";
try {
  const raw = localStorage.getItem(storageKey);
  const stored = raw ? JSON.parse(raw) : { tasks: seedTasks, customZones: [] };
  if (!Array.isArray(stored.tasks))
    throw new Error("Saved chores need recovery.");
  state = {
    ...stored,
    tasks: stored.tasks.map(normalize),
    customZones: stored.customZones || [],
  };
  if (raw && !localStorage.getItem("home-rhythm-before-scheduling"))
    localStorage.setItem("home-rhythm-before-scheduling", raw);
} catch {
  storageError =
    "Your saved data could not be opened. Export or recover your browser data before making changes.";
}
function persist() {
  localStorage.setItem(activeStorage, JSON.stringify(state));
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 6500);
}
function canWrite() {
  if (storageError) throw new Error(storageError);
  if (
    ["connecting", "error"].includes(session.status) ||
    (session.user && session.status !== "synced")
  )
    throw new Error(
      "Wait for household sync, or finish household setup in Settings.",
    );
  if (session.status === "synced" && !navigator.onLine)
    throw new Error("Reconnect before changing shared chores.");
}
async function action(fn) {
  if (busy) return;
  busy = true;
  document.body.classList.add("busy");
  try {
    await fn();
  } catch (error) {
    toast(error.message || "This change needs another try.");
  } finally {
    busy = false;
    document.body.classList.remove("busy");
  }
}
async function saveTask(task, recordCompletion = false) {
  canWrite();
  task = (await backend.saveTask(task, { recordCompletion })) || task;
  const index = state.tasks.findIndex((t) => t.id === task.id);
  if (index < 0) state.tasks.push(task);
  else state.tasks[index] = task;
  persist();
  render();
}
const pretty = (date) =>
  date
    ? parseDate(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Choose a first date";
const sorted = (tasks) =>
  [...tasks].sort(
    (a, b) =>
      (a.nextDate || "9999").localeCompare(b.nextDate || "9999") ||
      a.title.localeCompare(b.title),
  );
const labels = {
  now: "Worth doing soon",
  upcoming: "Upcoming",
  wait: "Can wait",
  handled: "Handled today",
  unscheduled: "Needs a first date",
};
function button(text, actionName, value = "", cls = "") {
  return (
    '<button type="button" class="' +
    cls +
    '" data-action="' +
    actionName +
    '" data-value="' +
    esc(value) +
    '">' +
    text +
    "</button>"
  );
}
function options(values, current) {
  return values
    .map(
      (v) =>
        "<option " +
        (v === current ? "selected" : "") +
        ">" +
        esc(v) +
        "</option>",
    )
    .join("");
}
function taskCard(task) {
  const s = status(task),
    done = s === "handled";
  return (
    '<article class="task"><button class="check ' +
    (done ? "checked" : "") +
    '" data-action="complete" data-value="' +
    esc(task.id) +
    '" aria-label="Mark ' +
    esc(task.title) +
    ' handled" ' +
    (done ? "disabled" : "") +
    ">" +
    (done ? "✓" : "") +
    '</button><button class="task-main" data-action="edit" data-value="' +
    esc(task.id) +
    '"><strong>' +
    esc(task.title) +
    "</strong><span>" +
    esc(task.zone) +
    " <i>·</i> " +
    esc(assignmentLabel(task, session.members)) +
    " <i>·</i> " +
    task.minutes +
    ' min</span></button><div class="task-end"><span class="tag ' +
    s +
    '">' +
    (s === "handled" ? "Handled today" : esc(pretty(task.nextDate))) +
    "</span>" +
    button("Edit", "edit", task.id, "text-button") +
    "</div></article>"
  );
}
function taskList(
  tasks,
  empty = "A little breathing room. Nothing here right now.",
) {
  return tasks.length
    ? '<div class="task-list">' +
        sorted(tasks).map(taskCard).join("") +
        "</div>"
    : '<div class="empty"><span>◎</span><p>' + empty + "</p></div>";
}
function heading(kicker, title, copy, extra = "") {
  return (
    '<header class="page-heading"><div><p class="eyebrow">' +
    kicker +
    "</p><h1>" +
    title +
    '</h1><p class="subtitle">' +
    copy +
    "</p></div>" +
    extra +
    "</header>"
  );
}
function home() {
  const now = sorted(state.tasks.filter((t) => status(t) === "now"));
  const handled = state.tasks.filter((t) => status(t) === "handled").length;
  const unplanned = state.tasks.filter((t) => status(t) === "unscheduled");
  const week = state.tasks
    .flatMap((t) => t.history)
    .filter((e) => e.date >= shift(dateKey(), -6) && e.date <= dateKey());
  return (
    heading(
      parseDate(dateKey()).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      "A little care.<br>A calmer home.",
      "Your shared rhythm, one small thing at a time.",
      button("+ Add chore", "new", "", "primary"),
    ) +
    '<section class="pulse"><div><p class="eyebrow">HOUSE PULSE</p><h2>' +
    (now.length
      ? now.length + " things worth doing soon."
      : "Room to breathe.") +
    "</h2><p>" +
    (unplanned.length
      ? unplanned.length +
        " chores still need a first date. Start with what matters this week."
      : "The plan is in place. Everything else can wait.") +
    "</p>" +
    button(
      unplanned.length ? "Set your rhythm →" : "See your week →",
      unplanned.length ? "unscheduled" : "calendar",
      "",
      "light",
    ) +
    '</div><div class="pulse-art" aria-hidden="true"><div class="roof"></div><div class="house-shape"><span>⌑</span><span>⌑</span><div></div></div><div class="plant">✳</div></div></section>' +
    '<div class="stats"><div><strong>' +
    now.length +
    "</strong><span>Ready for attention</span></div><div><strong>" +
    handled +
    "</strong><span>Handled today</span></div><div><strong>" +
    week.length +
    "</strong><span>Handled this week</span></div></div>" +
    '<div class="section-heading"><h2>Your next small steps</h2>' +
    button("View all →", "tasks", "", "text-button") +
    "</div>" +
    taskList(now.slice(0, 3), "No scheduled chores need attention today.") +
    '<div class="section-heading"><h2>Coming into view</h2><span>Next 7 days</span></div>' +
    taskList(state.tasks.filter((t) => status(t) === "upcoming").slice(0, 3))
  );
}
function tasks() {
  return (
    heading(
      "THE SHARED LIST",
      "Make room for what matters.",
      "One household list. Both of you can see and handle every chore.",
      button("+ Add chore", "new", "", "primary"),
    ) +
    '<div class="filters" aria-label="Household assignment">' +
    [
      ["everyone", "Everyone"],
      ["mine", "Mine"],
      ["partner", "Partner"],
      ["shared", "Shared"],
    ]
      .map(([id, label]) =>
        button(label, "person", id, personView === id ? "selected" : ""),
      )
      .join("") +
    "</div>" +
    '<div class="toolbar"><label class="search"><span class="sr-only">Search chores</span><input id="search" placeholder="Search chores or notes" value="' +
    esc(search) +
    '"></label><label><span class="sr-only">Filter room</span><select id="room-filter"><option value="">Every room</option>' +
    options(roomNames(state.customZones), roomFilter) +
    "</select></label>" +
    button("Add maintenance set", "maintenance", "", "secondary") +
    "</div>" +
    '<div class="filters">' +
    [
      ["all", "All chores"],
      ["now", "Now"],
      ["upcoming", "Upcoming"],
      ["wait", "Can wait"],
      ["unscheduled", "Needs a date"],
      ["handled", "Handled"],
    ]
      .map(([id, label]) =>
        button(label, "filter", id, filter === id ? "selected" : ""),
      )
      .join("") +
    '</div><div id="task-results">' +
    filteredTasks() +
    "</div>"
  );
}
function filteredTasks() {
  return taskList(
    state.tasks.filter(
      (t) =>
        matchesPerson(t, personView, session.user?.uid, session.members) &&
        (filter === "all" || status(t) === filter) &&
        (!roomFilter || t.zone === roomFilter) &&
        (t.title + " " + t.notes).toLowerCase().includes(search.toLowerCase()),
    ),
    "No chores match this view.",
  );
}
function rooms() {
  return (
    heading(
      "A PLACE FOR EVERYTHING",
      "Care, room by room.",
      "Shape the spaces around your home.",
      button("+ Add room", "new-room", "", "primary"),
    ) +
    '<div class="room-grid">' +
    roomNames(state.customZones)
      .map((name, i) => {
        const tasks = state.tasks.filter((t) => t.zone === name),
          count = tasks.filter((t) => status(t) === "now").length;
        return (
          '<article class="room-card"><div class="room-icon tone-' +
          (i % 3) +
          '">⌂</div><h2>' +
          esc(name) +
          "</h2><p>" +
          tasks.length +
          " chores · " +
          (count ? count + " worth doing soon" : "a steady space") +
          '</p><div class="room-actions">' +
          button("View chores →", "room-tasks", name, "text-button") +
          button("Manage", "manage-room", name, "text-button") +
          "</div></article>"
        );
      })
      .join("") +
    "</div>"
  );
}
function rhythm() {
  const events = state.tasks
    .flatMap((t) => t.history.map((e) => ({ ...e, title: t.title })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const recent = events.filter(
    (e) => e.date >= shift(dateKey(), -6) && e.date <= dateKey(),
  );
  return (
    heading(
      "SMALL EFFORTS ADD UP",
      "Your shared rhythm.",
      "A picture of home care, without keeping score.",
    ) +
    '<section class="pulse"><div><p class="eyebrow">THE LAST SEVEN DAYS</p><h2>' +
    recent.length +
    " small acts of care.</h2><p>" +
    recent.reduce((sum, e) => sum + (e.minutes || 0), 0) +
    " estimated minutes given back to your home.</p></div></section>" +
    '<div class="section-heading"><h2>Looking ahead</h2></div><div class="room-grid">' +
    [...new Set(state.tasks.map((t) => assignmentLabel(t, session.members)))]
      .map((owner) => {
        const assigned = state.tasks.filter(
          (t) =>
            assignmentLabel(t, session.members) === owner &&
            t.nextDate &&
            t.nextDate <= shift(dateKey(), 7),
        );
        return (
          '<article class="room-card"><h3>' +
          esc(owner) +
          "</h3><p>" +
          assigned.length +
          " chores in the next window · " +
          assigned.reduce((s, t) => s + t.minutes, 0) +
          " min</p></article>"
        );
      })
      .join("") +
    '</div><div class="section-heading"><h2>Recent care</h2></div>' +
    (events.length
      ? '<div class="task-list">' +
        events
          .slice(0, 30)
          .map(
            (e) =>
              '<div class="history-row"><span class="checked">✓</span><div><strong>' +
              esc(e.title) +
              "</strong><p>" +
              esc(e.completedByName || e.owner) +
              " · " +
              pretty(e.date) +
              "</p></div></div>",
          )
          .join("") +
        "</div>"
      : '<div class="empty">Completion history will grow as you handle chores.</div>')
  );
}
function calendar() {
  const first = month + "-01",
    dt = parseDate(first),
    start = shift(first, -dt.getDay()),
    end = shift(start, 41);
  const entries = state.tasks.flatMap((t) =>
    occurrences(t, start, end).map((day) => ({ task: t, day })),
  );
  const dayTasks = entries
    .filter((e) => e.day === selectedDay)
    .map((e) => e.task);
  return (
    heading(
      "PLAN WITH A LITTLE SPACE",
      "The household calendar.",
      "Tap a day to see its rhythm. Edit a chore to move its next date.",
      button("+ Schedule chore", "new", selectedDay, "primary"),
    ) +
    '<div class="calendar-layout"><section class="calendar-card"><div class="month-nav">' +
    button("←", "month", -1, "icon-button") +
    "<h2>" +
    dt.toLocaleDateString(undefined, { month: "long", year: "numeric" }) +
    "</h2>" +
    button("→", "month", 1, "icon-button") +
    button("Today", "today", "", "text-button") +
    '</div><div class="calendar-grid">' +
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map((d) => '<span class="weekday">' + d + "</span>")
      .join("") +
    Array.from({ length: 42 }, (_, i) => {
      const day = shift(start, i),
        count = entries.filter((e) => e.day === day).length;
      return (
        '<button class="calendar-day ' +
        (day.slice(0, 7) !== month ? "outside " : "") +
        (day === selectedDay ? "chosen " : "") +
        (day === dateKey() ? "today" : "") +
        '" data-action="day" data-value="' +
        day +
        '" aria-label="' +
        day +
        ", " +
        count +
        ' chores"><span>' +
        parseDate(day).getDate() +
        "</span>" +
        (count
          ? "<small>" +
            count +
            '<span class="desktop-only"> chores</span></small>'
          : "") +
        "</button>"
      );
    }).join("") +
    '</div></section><aside class="day-panel"><p class="eyebrow">YOUR DAY</p><h2>' +
    pretty(selectedDay) +
    '</h2><p class="muted">Future repeats are suggested windows.</p>' +
    taskList(dayTasks, "A clear day. Leave some space, or schedule a chore.") +
    "</aside></div>" +
    '<section class="integration"><div><p class="eyebrow">GOOGLE CALENDAR</p><h2>Keep your plans together.</h2><p>Publish the next scheduled date for selected chores. Publish again after edits or completions to refresh Google. Home Rhythm remains the source of truth.</p><p class="muted">Only this app’s events in the chosen calendar are updated or removed. No background sync.</p></div><div class="integration-controls">' +
    button(
      calendarConnected() ? "Reconnect Google" : "Connect Google Calendar",
      "connect-calendar",
      "",
      "secondary",
    ) +
    (calendars.length
      ? '<label>Destination calendar<select id="calendar-target">' +
        calendars
          .map(
            (c) =>
              '<option value="' +
              esc(c.id) +
              '" ' +
              (c.id === calendarId ? "selected" : "") +
              ">" +
              esc(c.summary) +
              "</option>",
          )
          .join("") +
        "</select></label>" +
        button("Review & publish", "review-publish", "", "primary")
      : '<p class="muted">Sign in to your household, then connect to choose a calendar.</p>') +
    "</div></section>"
  );
}
function settings() {
  return (
    heading(
      "YOUR HOUSEHOLD",
      "At home, together.",
      "Create one household, then have your partner join it with the invite code. Both accounts see the same chores and rooms.",
    ) +
    '<section class="settings-card"><h2>' +
    esc(session.household?.name || "Your household") +
    "</h2><p>" +
    esc(session.syncMessage) +
    "</p>" +
    (!session.user
      ? button("Continue with Google", "sign-in", "", "primary")
      : "<p>Signed in as " +
        esc(session.user.email) +
        "</p>" +
        button("Sign out", "sign-out", "", "secondary")) +
    (session.user && !session.household
      ? '<form id="create-household"><label>Household name<input name="name" required maxlength="60" value="Our Home"></label><button class="primary">Create household</button></form><form id="join-household"><label>Invite code<input name="code" required maxlength="6"></label><button class="secondary">Join household</button></form>'
      : "") +
    (session.household
      ? '<form id="rename-household"><label>Household name<input name="name" required maxlength="60" value="' +
        esc(session.household.name) +
        '"></label><button class="secondary">Rename household</button></form><p>Invite your partner with code <strong>' +
        esc(session.household.inviteCode) +
        "</strong></p><p>" +
        session.members.map((m) => esc(m.displayName)).join(" · ") +
        "</p>"
      : "") +
    "</section>" +
    notificationSettings() +
    '<section class="settings-card"><h2>Your data</h2><p>Download a backup of your chores, rooms, and recorded history.</p>' +
    button("Export backup", "export", "", "secondary") +
    "</section>"
  );
}
function render() {
  const renderers = { home, tasks, house: rooms, rhythm, calendar, settings };
  $("#content").innerHTML = renderers[tab]();
  $("#sync-label").textContent = navigator.onLine
    ? session.syncMessage
    : "Offline";
  $("#household-label").textContent = session.household?.name || "Our home";
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === tab);
    b.setAttribute("aria-current", b.dataset.nav === tab ? "page" : "false");
  });
  $("#notice").textContent =
    storageError ||
    (session.status === "error"
      ? "Household sync needs attention. Reconnect before editing shared chores."
      : "");
  $("#notice").hidden = !$("#notice").textContent;
}
function navigate(next) {
  tab = ["home", "tasks", "house", "rhythm", "calendar", "settings"].includes(
    next,
  )
    ? next
    : "home";
  location.hash = tab;
  render();
}
function modal(title, html) {
  $("#dialog-title").textContent = title;
  $("#dialog-body").innerHTML = html;
  $("#dialog").showModal();
}
function editor(id = "", date = "") {
  const task =
    state.tasks.find((t) => t.id === id) ||
    normalize({
      id: crypto.randomUUID(),
      title: "",
      cadence: "weekly",
      zone: roomNames(state.customZones)[0],
      nextDate: date,
    });
  const existing = Boolean(id);
  modal(
    existing ? "A little adjustment" : "Add a little care",
    '<form id="task-form" data-id="' +
      esc(task.id) +
      '" data-revision="' +
      (task.revision || 0) +
      '"><label>Chore name<input name="title" required maxlength="120" value="' +
      esc(existing ? task.title : "") +
      '" placeholder="What needs a little care?"></label><div class="form-grid"><label>Room<select name="zone">' +
      options(
        [...new Set([...roomNames(state.customZones), task.zone])],
        task.zone,
      ) +
      '</select></label><label>Owner<select name="owner">' +
      assignmentOptions(task) +
      '</select></label><label>Next suggested date<input type="date" name="nextDate" value="' +
      esc(task.nextDate) +
      '"></label><label>Repeat<select name="cadence">' +
      options(
        [
          "once",
          "daily",
          "weekly",
          "monthly",
          "quarterly",
          "yearly",
          "custom",
          ...(![
            "once",
            "daily",
            "weekly",
            "monthly",
            "quarterly",
            "yearly",
            "custom",
          ].includes(task.cadence)
            ? [task.cadence]
            : []),
        ],
        task.cadence,
      ) +
      '</select></label></div><div class="form-grid" id="custom-repeat" ' +
      (task.cadence === "custom" ? "" : "hidden") +
      '><label>Repeat every<input name="interval" type="number" min="1" max="3650" value="' +
      task.interval +
      '"></label><label>Unit<select name="unit">' +
      options(["days", "months"], task.unit) +
      '</select></label></div><div class="form-grid"><label>Estimated minutes<input name="minutes" type="number" min="5" max="1440" step="5" value="' +
      task.minutes +
      '"></label><label>Energy<select name="energy">' +
      options(["Light", "Moderate", "More involved"], task.energy) +
      '</select></label></div><label>Notes / standard of done<textarea name="notes" rows="3" maxlength="4000" placeholder="Supplies, instructions, or what done looks like">' +
      esc(task.notes) +
      '</textarea></label><label class="checkbox"><input type="checkbox" name="calendarEnabled" ' +
      (task.calendarEnabled ? "checked" : "") +
      '> Include in Google Calendar publishing</label><p class="muted">Dates are flexible. Leaving the date empty keeps this chore in “Needs a date.”</p><div class="form-footer">' +
      (existing ? button("Remove chore", "remove", task.id, "danger") : "") +
      '<button class="primary">Save chore</button></div></form>' +
      (existing
        ? '<div class="detail-actions">' +
          button("Handled today", "complete", task.id, "secondary") +
          button("Snooze 1 day", "snooze", task.id, "secondary") +
          button("Skip this occurrence", "skip", task.id, "secondary") +
          '</div><p class="muted">' +
          (task.lastCompleted
            ? "Last handled " + pretty(task.lastCompleted)
            : "No recorded completion yet.") +
          "</p>"
        : ""),
  );
}
function manageRoom(name) {
  const count = state.tasks.filter((t) => t.zone === name).length;
  modal(
    "Manage " + name,
    '<form id="room-form" data-room="' +
      esc(name) +
      '"><label>Room name<input name="name" required maxlength="40" value="' +
      esc(name) +
      '"></label><button class="primary">Save room</button></form><hr><form id="remove-room" data-room="' +
      esc(name) +
      '"><p>Removing this room keeps its ' +
      count +
      ' chores. Choose where they belong.</p><label>Move chores to<select name="destination" required>' +
      options(
        roomNames(state.customZones).filter((n) => n !== name),
        "",
      ) +
      '</select></label><button class="danger" ' +
      (roomNames(state.customZones).length < 2 ? "disabled" : "") +
      ">Remove room</button></form>",
  );
}
async function changeRoom(oldName, newName, remove = false) {
  canWrite();
  const name = newName.trim();
  if (!name) throw new Error("Give this room a name.");
  if (
    !remove &&
    name !== oldName &&
    roomNames(state.customZones).some(
      (n) => n.toLowerCase() === name.toLowerCase(),
    )
  )
    throw new Error("That room already exists.");
  const overrides = state.customZones.filter(
    (r) => r.name !== oldName && r.name !== name,
  );
  if (oldName && oldName !== name)
    overrides.push({ id: crypto.randomUUID(), name: oldName, hidden: true });
  overrides.push({ id: crypto.randomUUID(), name, hidden: false });
  const moved = oldName
    ? state.tasks
        .filter((t) => t.zone === oldName)
        .map((t) => ({ ...t, zone: name }))
    : [];
  const savedMoves = await backend.saveRoomChanges(overrides, moved);
  state.customZones = overrides;
  state.tasks = state.tasks.map(
    (t) => (savedMoves || moved).find((m) => m.id === t.id) || t,
  );
  persist();
  $("#dialog").close();
  render();
  toast(remove ? "Room removed. Chores moved." : "Room saved.");
}
document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    navigate(nav.dataset.nav);
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action: kind, value } = target.dataset;
  const task = state.tasks.find((t) => t.id === value);
  if (kind === "person") {
    personView = value;
    render();
    return;
  }
  if (kind === "close") {
    $("#dialog").close();
    return;
  }
  if (kind === "new" || kind === "edit") {
    editor(kind === "edit" ? value : "", kind === "new" ? value : "");
    return;
  }
  if (kind === "filter") {
    filter = value;
    render();
    return;
  }
  if (["home", "tasks", "calendar"].includes(kind)) {
    navigate(kind);
    return;
  }
  if (kind === "unscheduled") {
    filter = "unscheduled";
    navigate("tasks");
    return;
  }
  if (kind === "room-tasks") {
    roomFilter = value;
    filter = "all";
    navigate("tasks");
    return;
  }
  if (kind === "new-room") {
    modal(
      "Make room",
      '<form id="room-form"><label>Room name<input name="name" required maxlength="40" placeholder="Office, porch, guest room…"></label><button class="primary">Add room</button></form>',
    );
    return;
  }
  if (kind === "manage-room") {
    manageRoom(value);
    return;
  }
  if (kind === "month") {
    month = shift(month + "-01", Number(value), "months").slice(0, 7);
    render();
    return;
  }
  if (kind === "today") {
    month = dateKey().slice(0, 7);
    selectedDay = dateKey();
    render();
    return;
  }
  if (kind === "day") {
    selectedDay = value;
    render();
    return;
  }
  if (kind === "remove") {
    modal(
      "Remove this chore?",
      "<p>" +
        esc(task.title) +
        ' and its in-app history will be removed. Re-publish to remove its Google event.</p><div class="form-footer">' +
        button("Keep chore", "close", "", "secondary") +
        button("Remove chore", "confirm-remove", value, "danger") +
        "</div>",
    );
    return;
  }
  if (kind === "review-publish") {
    const selected = state.tasks.filter((t) => t.calendarEnabled && t.nextDate);
    modal(
      "Publish to " +
        (calendars.find((c) => c.id === calendarId)?.summary ||
          "Google Calendar"),
      "<p>Update " +
        selected.length +
        " next-occurrence events. Previously published chores that are removed or deselected will be removed from this calendar.</p><ul>" +
        selected
          .map(
            (t) => "<li>" + esc(t.title) + " · " + pretty(t.nextDate) + "</li>",
          )
          .join("") +
        '</ul><p class="muted">Other calendar events stay as they are.</p>' +
        button("Publish now", "publish", "", "primary"),
    );
    return;
  }
  action(async () => {
    if (kind === "complete" && task) {
      if (status(task) === "handled") return;
      const handled = complete(task);
      handled.history[0].completedBy = session.user?.uid || "local";
      handled.history[0].completedByName =
        session.user?.displayName || "This device";
      if (task.assignment === "rotating")
        handled.rotationIndex = (task.rotationIndex || 0) + 1;
      await saveTask(handled, true);
      $("#dialog").close();
      toast("Handled. Your next window is ready.");
    } else if (kind === "snooze" && task) {
      await saveTask({
        ...task,
        nextDate: shift(
          task.nextDate && task.nextDate > dateKey()
            ? task.nextDate
            : dateKey(),
          1,
        ),
      });
      $("#dialog").close();
      toast("Moved one day forward.");
    } else if (kind === "skip" && task) {
      if (!task.nextDate)
        throw new Error("Choose a first date before skipping an occurrence.");
      const next =
        task.cadence === "once"
          ? ""
          : shift(task.nextDate, task.interval, task.unit, task.anchorDay);
      await saveTask({ ...task, nextDate: next });
      $("#dialog").close();
      toast("Schedule updated. No completion recorded.");
    } else if (kind === "confirm-remove") {
      canWrite();
      await backend.deleteTask(value);
      state.tasks = state.tasks.filter((t) => t.id !== value);
      persist();
      $("#dialog").close();
      render();
      toast("Chore removed.");
    } else if (kind === "maintenance") {
      canWrite();
      let count = 0;
      for (const candidate of maintenanceSeedTasks) {
        if (
          state.tasks.some(
            (t) =>
              t.id === candidate.id ||
              t.title.toLowerCase() === candidate.title.toLowerCase(),
          )
        )
          continue;
        await saveTask(normalize(candidate));
        count++;
      }
      toast(
        count +
          " maintenance chores added. Choose first dates to schedule them.",
      );
    } else if (kind === "sign-in") await backend.signIn();
    else if (kind === "sign-out") {
      await stopNotificationsOnSignOut();
      setCalendarToken("");
      calendars = [];
      await backend.signOut();
      state = localState();
      render();
    } else if (kind === "test-notification") {
      await testNotification();
      toast("Test sent. Check this device for a notification.");
    } else if (kind === "disable-notifications") {
      await disableNotifications();
      render();
      toast("Daily notifications are off on this device.");
    } else if (kind === "connect-calendar") {
      if (!session.household)
        throw new Error("Connect your household in Settings first.");
      setCalendarToken(await backend.authorizeCalendar());
      calendars = await listCalendars();
      calendarId = calendars[0]?.id || "";
      render();
      toast("Choose the calendar for your chores.");
    } else if (kind === "publish") {
      canWrite();
      const result = await publishCalendar(
        state.tasks,
        calendarId,
        session.household?.id,
        location.origin + location.pathname,
      );
      $("#dialog").close();
      toast(result.saved + " events updated; " + result.removed + " removed.");
    } else if (kind === "export") {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "home-rhythm-" + dateKey() + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
});
document.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    search = event.target.value;
    $("#task-results").innerHTML = filteredTasks();
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "room-filter") {
    roomFilter = event.target.value;
    $("#task-results").innerHTML = filteredTasks();
  }
  if (event.target.id === "calendar-target") calendarId = event.target.value;
  if (event.target.name === "cadence")
    $("#custom-repeat").hidden = event.target.value !== "custom";
});
document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target,
    data = new FormData(form),
    get = (name) => String(data.get(name) || "");
  action(async () => {
    if (form.id === "notification-form") {
      await saveNotifications(form);
      render();
      toast("Daily notification preferences saved for this device.");
    } else if (form.id === "task-form") {
      const original = state.tasks.find((t) => t.id === form.dataset.id) || {};
      const cadence = get("cadence"),
        [interval, unit] = recurrence(cadence),
        nextDate = get("nextDate");
      const title = get("title").trim();
      if (!title) throw new Error("Give your chore a name.");
      await saveTask(
        normalize({
          ...original,
          revision: Number(form.dataset.revision || 0),
          id: form.dataset.id,
          title,
          zone: get("zone"),
          owner:
            get("owner") === "shared"
              ? "Shared rhythm"
              : session.members.find((m) => m.id === get("owner"))
                  ?.displayName || "Choose a person",
          assignedTo: ["shared", "unassigned", "rotating"].includes(
            get("owner"),
          )
            ? get("owner") === "shared"
              ? "shared"
              : "unassigned"
            : get("owner"),
          assignment: get("owner") === "rotating" ? "rotating" : "fixed",
          cadence,
          nextDate,
          anchorDay: nextDate
            ? nextDate === original.nextDate && original.anchorDay
              ? original.anchorDay
              : parseDate(nextDate).getDate()
            : null,
          interval: cadence === "custom" ? Number(get("interval")) : interval,
          unit: cadence === "custom" ? get("unit") : unit,
          notes: get("notes"),
          minutes: Number(get("minutes")),
          energy: get("energy"),
          calendarEnabled: data.has("calendarEnabled"),
        }),
      );
      $("#dialog").close();
      toast("Chore saved.");
    } else if (form.id === "room-form")
      await changeRoom(form.dataset.room || "", get("name"));
    else if (form.id === "remove-room")
      await changeRoom(form.dataset.room, get("destination"), true);
    else if (form.id === "create-household") {
      await backend.createHousehold(
        get("name"),
        state.tasks,
        state.customZones,
      );
      toast("Household created.");
    } else if (form.id === "join-household") {
      await backend.joinHousehold(get("code"));
      toast("Household joined.");
    } else if (form.id === "rename-household") {
      await backend.renameHousehold(get("name"));
      toast("Household renamed.");
    }
  });
});
function localState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      tasks: (saved?.tasks || seedTasks).map(normalize),
      customZones: saved?.customZones || [],
    };
  } catch {
    return { tasks: [], customZones: [] };
  }
}
backend.onSession((next) => {
  const previousUser = session.user?.uid;
  session = next;
  void loadNotifications(next, () => {
    if (tab === "settings") render();
  });
  if (previousUser && previousUser !== next.user?.uid) {
    setCalendarToken("");
    calendars = [];
  }
  if (next.status === "local" || next.status === "unavailable") {
    activeStorage = storageKey;
    state = localState();
  }
  render();
});
backend.onData((remote) => {
  activeStorage = storageKey + "-household-" + remote.householdId;
  state = {
    tasks: remote.tasks.map(normalize),
    customZones: remote.customZones || [],
  };
  try {
    persist();
  } catch {
    toast("Browser storage is full. Shared data remains in your household.");
  }
  render();
});
window.addEventListener("hashchange", () => {
  tab = location.hash.slice(1);
  if (
    !["home", "tasks", "house", "rhythm", "calendar", "settings"].includes(tab)
  )
    tab = "home";
  render();
});
window.addEventListener("online", render);
window.addEventListener("offline", render);
setInterval(() => {
  if (!$("#dialog").open && !document.activeElement?.closest("form")) render();
}, 60000);
navigate(location.hash.slice(1) || "home");
backend.start();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./service-worker.js")
    .catch(() => toast("Offline shell will be available after reconnecting."));
