// calendar.js: Shows all months (June, July, August) stacked with events

const MONTHS_TO_SHOW = [
  { year: 2025, monthIdx: 5 }, // June 2025
  { year: 2025, monthIdx: 6 }, // July 2025
  { year: 2025, monthIdx: 7 }, // August 2025
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseEventDates(event) {
  const months = {
    "June": 5,
    "July": 6,
    "August": 7,
    "Sept": 8, "September": 8
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

  const table = document.createElement("table");
  table.className = "calendar";

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
      const event = eventsToday[0];
      const parsed = parseEventDates(event);
      if (
        date.getTime() === parsed.from.getTime() &&
        parsed.to > parsed.from
      ) {
        let span = 1;
        let temp = new Date(date);
        while (
          temp < parsed.to &&
          temp.getMonth() === month &&
          span + date.getDay() <= 7
        ) {
          temp.setDate(temp.getDate() + 1);
          span++;
        }
        spanDays = span;
        renderEvent = event;
      } else if (parsed.from < date && date <= parsed.to) {
        // Skip cell for event merge
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

    date.setDate(date.getDate() + 1);

    if (tr.children.length === 7 || date.getMonth() !== month) {
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
  return table;
}

// Render all months stacked
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("all-calendars");
  MONTHS_TO_SHOW.forEach(({ year, monthIdx }) => {
    const monthSection = document.createElement('div');
    monthSection.className = 'month-section';
    const title = document.createElement('div');
    title.className = 'month-title';
    title.innerText = `${MONTH_NAMES[monthIdx]} ${year}`;
    monthSection.appendChild(title);
    monthSection.appendChild(renderCalendar(year, monthIdx, window.addresses));
    container.appendChild(monthSection);
  });
});
