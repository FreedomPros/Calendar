// Calendar rendering logic with event highlights, multi-day merges, and state names above teams.
// Assumes a <table id="calendar"></table> in your HTML and window.addresses loaded.

function parseEventDates(event) {
  // Supports date formats like "June 26 - 27" or "July 3 - 4"
  const months = {
    "June": 5,
    "July": 6,
    "August": 7,
    "Sept": 8,
    "September": 8
  };
  const dateStr = event.date;
  const rangeMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)\s*-\s*([A-Za-z]+)?\s*(\d+)/);
  if (rangeMatch) {
    const m1 = rangeMatch[1];
    const d1 = parseInt(rangeMatch[2], 10);
    const m2 = rangeMatch[3] || m1;
    const d2 = parseInt(rangeMatch[4], 10);
    const from = new Date(2025, months[m1], d1);
    const to = new Date(2025, months[m2], d2);
    return { from, to };
  }
  const singleMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
  if (singleMatch) {
    const m = singleMatch[1];
    const d = parseInt(singleMatch[2], 10);
    const from = new Date(2025, months[m], d);
    return { from, to: from };
  }
  return null;
}

function getEventsByDay(events) {
  // Map YYYY-MM-DD string to event data
  const map = {};
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    let curr = new Date(parsed.from);
    while (curr <= parsed.to) {
      const key = curr.toISOString().slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(event);
      curr.setDate(curr.getDate() + 1);
    }
  });
  return map;
}

function renderCalendar(year, month, events) {
  // month: 0-indexed (June = 5)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const eventMap = getEventsByDay(events);

  const table = document.getElementById("calendar");
  table.innerHTML = "";

  // Header
  const thead = document.createElement("thead");
  const hdr = document.createElement("tr");
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
    const th = document.createElement("th");
    th.innerText = d;
    hdr.appendChild(th);
  });
  thead.appendChild(hdr);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  let tr = document.createElement("tr");

  let date = new Date(year, month, 1);
  for (let i = 0; i < date.getDay(); i++) {
    const td = document.createElement("td");
    td.className = "calendar-day empty";
    tr.appendChild(td);
  }

  while (date.getMonth() === month) {
    const key = date.toISOString().slice(0, 10);
    const eventsToday = eventMap[key] || [];
    let renderEvent = null;
    let spanDays = 1;

    // Multi-day event merge logic
    if (eventsToday.length > 0) {
      // Only support rendering the first event per cell for merges
      const event = eventsToday[0];
      const parsed = parseEventDates(event);
      // Only merge if this is the first day or not a continuation
      if (
        date.getTime() === parsed.from.getTime() &&
        parsed.to > parsed.from
      ) {
        // Calculate how many days this event should span within this week
        let span = 1;
        let temp = new Date(date);
        while (
          temp < parsed.to &&
          temp.getMonth() === month &&
          span + date.getDay() <= 7 // stay within week
        ) {
          temp.setDate(temp.getDate() + 1);
          span++;
        }
        spanDays = span;
        renderEvent = event;
      } else if (parsed.from < date && date <= parsed.to) {
        // This day is part of a merge, skip rendering (will be covered by colspan)
        date.setDate(date.getDate() + 1);
        if (date.getDay() === 0) {
          tbody.appendChild(tr);
          tr = document.createElement("tr");
        }
        continue;
      } else {
        renderEvent = event;
      }
    }

    // Build cell
    const td = document.createElement("td");
    td.className = "calendar-day";
    td.innerHTML = `<span class="calendar-day-number">${date.getDate()}</span>`;

    if (renderEvent) {
      td.classList.add("highlight");
      if (spanDays > 1) {
        td.colSpan = spanDays;
        td.classList.add("event-merged");
      }
      td.innerHTML += `
        <div class="calendar-state">${renderEvent.state || ""}</div>
        <div class="calendar-teams">${renderEvent.contacts.map(c => c.team).join(', ')}</div>
      `;
    }

    tr.appendChild(td);

    // Move to next day/cell
    date.setDate(date.getDate() + 1);

    // End of week or last day
    if (tr.children.length === 7 || date.getMonth() !== month) {
      // Fill out row if at month end
      while (tr.children.length < 7) {
        const td = document.createElement("td");
        td.className = "calendar-day empty";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      tr = document.createElement("tr");
    }
  }

  table.appendChild(tbody);
}

// Example usage: render June 2025 on page load
document.addEventListener("DOMContentLoaded", function () {
  renderCalendar(2025, 5, window.addresses); // June 2025
  // Optionally, add controls to change month/year if needed
});
