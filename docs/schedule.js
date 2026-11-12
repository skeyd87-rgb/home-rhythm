export const baseRooms = [
  "Kitchen",
  "Bathrooms",
  "Cats",
  "Laundry",
  "Upstairs",
  "Downstairs",
  "Garage",
  "Yard",
  "Utility",
  "Exterior",
];
export const owners = [
  "Shared rhythm",
  "Usually you",
  "Usually partner",
  "Rotating",
];
export function assignee(task, members = []) {
  if (task.assignment === "rotating") {
    const people = [...members].sort((a, b) => a.id.localeCompare(b.id));
    return people.length
      ? people[(task.rotationIndex || 0) % people.length].id
      : "unassigned";
  }
  return (
    task.assignedTo ||
    (task.owner === "Shared rhythm" ? "shared" : "unassigned")
  );
}
export function assignmentLabel(task, members = []) {
  const id = assignee(task, members);
  if (id === "shared") return "Shared · either of us";
  if (id === "unassigned") return "Choose a person";
  const person = members.find((m) => m.id === id);
  return (
    (person?.displayName || task.owner || "Household member") +
    (task.assignment === "rotating" ? " · rotating" : "")
  );
}
export function matchesPerson(task, view, userId, members = []) {
  const id = assignee(task, members);
  return (
    view === "everyone" ||
    (view === "mine" && Boolean(userId) && id === userId) ||
    (view === "partner" &&
      Boolean(userId) &&
      !["shared", "unassigned", userId].includes(id)) ||
    (view === "shared" && id === "shared")
  );
}
export const dateKey = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
export const parseDate = (value) => new Date(value + "T12:00:00");
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dateKey(parseDate(value)) === value
  );
}
export function shift(value, amount, unit = "days", anchorDay) {
  const date = parseDate(value);
  if (unit === "months") {
    const day = anchorDay || date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
    date.setDate(
      Math.min(
        day,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    );
  } else date.setDate(date.getDate() + amount);
  return dateKey(date);
}
export function recurrence(cadence) {
  return (
    {
      daily: [1, "days"],
      weekly: [7, "days"],
      monthly: [1, "months"],
      quarterly: [3, "months"],
      yearly: [12, "months"],
      "every 1-3 months": [1, "months"],
      "every 3-6 months": [3, "months"],
      "every 6 months": [6, "months"],
      "spring / fall": [6, "months"],
      "every 2-3 years": [24, "months"],
      "every 3-5 years": [36, "months"],
      "every 5 years": [60, "months"],
    }[cadence] || [7, "days"]
  );
}
export function normalize(task) {
  const [interval, unit] = recurrence(task.cadence);
  return {
    ...task,
    title: String(task.title || "Untitled chore"),
    zone: task.zone || "Utility",
    owner: task.owner || "Shared rhythm",
    interval: Math.max(1, Number(task.interval) || interval),
    unit:
      task.unit === "months" ? "months" : task.unit === "days" ? "days" : unit,
    nextDate: validDate(task.nextDate) ? task.nextDate : "",
    notes: task.notes || "",
    minutes: Math.max(5, Number(task.minutes) || 15),
    energy: task.energy || "Light",
    history: Array.isArray(task.history) ? task.history : [],
    calendarEnabled: Boolean(task.calendarEnabled),
  };
}
export function status(task, today = dateKey()) {
  if (task.history.some((e) => e.date === today)) return "handled";
  if (!task.nextDate)
    return task.cadence === "once" && task.history.length
      ? "handled"
      : "unscheduled";
  if (task.nextDate <= today) return "now";
  return task.nextDate <= shift(today, 7) ? "upcoming" : "wait";
}
export function complete(task, today = dateKey()) {
  let nextDate = "";
  if (task.cadence !== "once") {
    const anchor = task.nextDate || today;
    const anchorDay = task.anchorDay || parseDate(anchor).getDate();
    nextDate = shift(anchor, task.interval, task.unit, anchorDay);
    let guard = 0;
    while (nextDate <= today && guard++ < 10000)
      nextDate = shift(nextDate, task.interval, task.unit, anchorDay);
  }
  return {
    ...task,
    nextDate,
    lastCompleted: today,
    history: [
      {
        id: crypto.randomUUID(),
        date: today,
        owner: task.owner,
        minutes: task.minutes,
      },
      ...task.history,
    ].slice(0, 500),
    rotation: task.owner === "Rotating" ? !task.rotation : task.rotation,
  };
}
export function occurrences(task, start, end) {
  if (!task.nextDate) return [];
  const result = [];
  let day = task.nextDate;
  let guard = 0;
  const anchor = task.anchorDay || parseDate(day).getDate();
  while (day <= end && guard++ < 10000) {
    if (day >= start) result.push(day);
    if (task.cadence === "once") break;
    day = shift(day, task.interval, task.unit, anchor);
  }
  return result;
}
export function roomNames(customZones = []) {
  const names = new Set(baseRooms);
  customZones.forEach((r) =>
    r.hidden ? names.delete(r.name) : names.add(r.name),
  );
  return [...names].sort();
}
export function eventBody(task, origin) {
  return {
    summary: task.title,
    status: "confirmed",
    description: [
      task.notes,
      "Room: " + task.zone,
      "Owner: " + task.owner,
      "Managed by Home Rhythm. Change the chore in the app, then publish again.",
      origin + "#tasks",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { date: task.nextDate },
    end: { date: shift(task.nextDate, 1) },
    transparency: "transparent",
    extendedProperties: { private: { homeRhythm: "true", choreId: task.id } },
    reminders: { useDefault: false },
  };
}
