import { eventBody } from "./schedule.js";
let token = "";
export function setCalendarToken(value) {
  token = value;
}
export function calendarConnected() {
  return Boolean(token);
}
async function request(path, method = "GET", body) {
  if (!token)
    throw new Error("Connect Google Calendar to publish your chores.");
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/" + path,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (response.status === 401) {
    token = "";
    throw new Error(
      "Calendar connection expired. Connect again, then publish.",
    );
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const error = new Error(
      detail.error?.message || "Google Calendar could not save this change.",
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
export async function listCalendars() {
  let items = [],
    page = "";
  do {
    const data = await request(
      "users/me/calendarList?minAccessRole=writer&maxResults=250" +
        (page ? "&pageToken=" + encodeURIComponent(page) : ""),
    );
    items.push(...(data.items || []));
    page = data.nextPageToken;
  } while (page);
  return items;
}
async function digest(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function publishCalendar(tasks, calendarId, householdId, origin) {
  if (!calendarId || !householdId)
    throw new Error("Choose a calendar and connect a household first.");
  const scope = await digest(householdId);
  const path = "calendars/" + encodeURIComponent(calendarId) + "/events";
  const selected = tasks.filter((t) => t.calendarEnabled && t.nextDate);
  let existing = [],
    page = "";
  do {
    const data = await request(
      path +
        "?maxResults=2500&privateExtendedProperty=" +
        encodeURIComponent("rhythmHousehold=" + scope) +
        (page ? "&pageToken=" + encodeURIComponent(page) : ""),
    );
    existing.push(...(data.items || []));
    page = data.nextPageToken;
  } while (page);
  const keep = new Set();
  let saved = 0,
    removed = 0;
  for (const task of selected) {
    const id = "hr" + (await digest(scope + ":" + task.id));
    const body = eventBody(task, origin);
    body.extendedProperties.private.rhythmHousehold = scope;
    const previous = existing.find((e) => e.id === id);
    if (previous) await request(path + "/" + id, "PATCH", body);
    else {
      try {
        await request(path, "POST", { ...body, id });
      } catch (error) {
        if (error.status !== 409) throw error;
        await request(path + "/" + id, "PATCH", body);
      }
    }
    keep.add(id);
    saved++;
  }
  for (const event of existing) {
    if (!keep.has(event.id)) {
      await request(path + "/" + event.id, "DELETE");
      removed++;
    }
  }
  return { saved, removed };
}
