import test from "node:test";
import assert from "node:assert/strict";
import { assignee, assignmentLabel, matchesPerson } from "../docs/schedule.js";
test("both household members see consistent ownership and reciprocal views", () => {
  const members = [
    { id: "steven", displayName: "Steven" },
    { id: "brittany", displayName: "Brittany" },
  ];
  const task = { assignedTo: "steven", owner: "Steven" };
  assert.equal(assignmentLabel(task, members), "Steven");
  assert.equal(matchesPerson(task, "mine", "steven", members), true);
  assert.equal(matchesPerson(task, "partner", "brittany", members), true);
  assert.equal(matchesPerson(task, "mine", "brittany", members), false);
  assert.equal(
    matchesPerson({ assignedTo: "shared" }, "shared", "steven", members),
    true,
  );
  assert.equal(
    matchesPerson({ assignedTo: "shared" }, "shared", "brittany", members),
    true,
  );
  assert.equal(assignee({ owner: "Usually you" }, members), "unassigned");
  assert.notEqual(
    assignee({ assignment: "rotating", rotationIndex: 0 }, members),
    assignee({ assignment: "rotating", rotationIndex: 1 }, members),
  );
});
import {
  normalize,
  shift,
  complete,
  occurrences,
  status,
  roomNames,
  eventBody,
} from "../docs/schedule.js";
test("monthly recurrence keeps the original month-end anchor through February", () => {
  const task = normalize({
    id: "a",
    title: "Filter",
    cadence: "monthly",
    nextDate: "2026-01-31",
    anchorDay: 31,
  });
  assert.deepEqual(occurrences(task, "2026-01-01", "2026-04-30"), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
  ]);
  assert.equal(complete(task, "2026-02-28").nextDate, "2026-03-31");
});
test("leap year and daylight savings calendar arithmetic", () => {
  assert.equal(shift("2028-01-31", 1, "months"), "2028-02-29");
  assert.equal(shift("2026-03-08", 1), "2026-03-09");
});
test("completion advances past today and records real history", () => {
  const task = normalize({
    id: "b",
    cadence: "weekly",
    nextDate: "2026-10-01",
  });
  const next = complete(task, "2026-11-11");
  assert.equal(next.nextDate, "2026-11-12");
  assert.equal(next.history.length, 1);
  assert.equal(status(next, "2026-11-11"), "handled");
  assert.equal(status(next, "2026-11-12"), "now");
});
test("legacy chores are preserved without fabricated dates or completions", () => {
  const task = normalize({
    id: "legacy",
    handled: true,
    cadence: "monthly",
    notes: "Keep me",
  });
  assert.equal(task.nextDate, "");
  assert.equal(task.history.length, 0);
  assert.equal(task.notes, "Keep me");
  assert.equal(status(task), "unscheduled");
});
test("one-time completion has no next date", () => {
  const next = complete(
    normalize({ cadence: "once", nextDate: "2026-11-11" }),
    "2026-11-11",
  );
  assert.equal(next.nextDate, "");
  assert.equal(status(next, "2026-11-12"), "handled");
});
test("rooms can hide default spaces and add new spaces", () => {
  const rooms = roomNames([
    { name: "Kitchen", hidden: true },
    { name: "Office" },
  ]);
  assert.ok(!rooms.includes("Kitchen"));
  assert.ok(rooms.includes("Office"));
});
test("Google payload uses an exclusive end date and no notifications", () => {
  const payload = eventBody(
    normalize({ id: "event", title: "Test", nextDate: "2026-12-31" }),
    "https://example.com/",
  );
  assert.deepEqual(payload.end, { date: "2027-01-01" });
  assert.equal(payload.reminders.useDefault, false);
});
test("publishing is repeatable, updates own events, removes deselected only", async () => {
  const { setCalendarToken, publishCalendar } =
    await import("../docs/google-calendar.js");
  const realFetch = globalThis.fetch;
  const events = new Map();
  let calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url),
      id = u.pathname.split("/").at(-1),
      method = opts.method;
    calls.push(method);
    if (method === "GET") return Response.json({ items: [...events.values()] });
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (method === "POST") events.set(body.id, body);
    if (method === "PATCH") events.set(id, { ...events.get(id), ...body });
    if (method === "DELETE") {
      events.delete(id);
      return new Response(null, { status: 204 });
    }
    return Response.json(body);
  };
  try {
    setCalendarToken("test");
    const t = normalize({
      id: "abc",
      title: "Chore",
      nextDate: "2026-11-12",
      calendarEnabled: true,
    });
    await publishCalendar([t], "calendar", "house", "https://example.com/");
    await publishCalendar(
      [{ ...t, title: "Renamed" }],
      "calendar",
      "house",
      "https://example.com/",
    );
    assert.equal(events.size, 1);
    assert.equal([...events.values()][0].summary, "Renamed");
    assert.equal(calls.filter((c) => c === "POST").length, 1);
    await publishCalendar([], "calendar", "house", "https://example.com/");
    assert.equal(events.size, 0);
  } finally {
    globalThis.fetch = realFetch;
    setCalendarToken("");
  }
});
