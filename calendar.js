// Improved calendar.js: Lined up boxes, each event day highlighted, event banner spans across, no merging, click shows address

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
    "Aug": 7,
    "September": 8, "Sep": 8
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

// Map each event day (YYYY-MM-DD) to associated events
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

// Returns an array of all event ranges for the given month/year
function getEventRangesForMonth(events, year, month) {
  const ranges = [];
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    let from = parsed.from, to = parsed.to;
    // Only for this month
    if (from.getFullYear() === year && from.getMonth() === month ||
        to.getFullYear() === year && to.getMonth() === month ||
        (from < new Date(year, month+1, 1) && to >= new Date(year, month, 1))
      ) {
      // Clamp start/end to this month
      const rangeStart = new Date(Math.max(from, new Date(year, month, 1)));
      const rangeEnd = new Date(Math.min(to, new Date(year, month+1, 0)));
      ranges.push({event, start: rangeStart, end: rangeEnd});
    }
  });
  return ranges;
}

// Render a single month's calendar as a table
function renderCalendar(year, month, events) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const eventMap = getEventsByDay(events);
  const eventRanges = getEventRangesForMonth(events, year, month);

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

  // For each week row
  while (date.getMonth() === month) {
    let weekDay = date.getDay();

    // For each day cell
    const key = date.toISOString().slice(0, 10);
    const eventsToday = eventMap[key] || [];
    const td = document.createElement("td");
    td.className = "calendar-day";
    td.innerHTML = `<span class="calendar-day-number">${date.getDate()}</span>`;

    // Highlight if any event
    if (eventsToday.length > 0) {
      td.classList.add("highlight");
      td.style.position = "relative";
    }

    // If this is the FIRST day of an event range (for this event this month), render banner spanning the days
    eventRanges.forEach(({event, start, end}) => {
      const bannerStart = start.getTime();
      const bannerEnd = end.getTime();
      if (date.getTime() === bannerStart) {
        // Span width: number of days in this row, up to event end
        let span = 1;
        let temp = new Date(date);
        let colOffset = temp.getDay();
        while (
          temp < end &&
          temp.getMonth() === month &&
          span + colOffset <= 7 // don't cross week
        ) {
          temp.setDate(temp.getDate() + 1);
          span++;
        }
        // Banner div overlays the row, but each cell is separate
        const banner = document.createElement('div');
        banner.className = 'event-banner';
        banner.style.gridColumn = `span ${span}`;
        banner.style.width = `calc(${span}00% + ${(span-1)*1}px)`;
        banner.style.left = "0";
        banner.style.pointerEvents = "auto";
        banner.tabIndex = 0;
        banner.title = "Click for address";

        // Team(s) and participants
        let teams = event.contacts
          .map(c => c.team + (c.participants ? ` (${c.participants})` : ''))
          .join(', ');

        banner.innerHTML = `
          <span class="calendar-state">${event.state}</span>
          <span class="calendar-teams">${teams}</span>
        `;
        banner.onclick = e => { e.stopPropagation(); showAddressPopup(event, start, end); };
        td.appendChild(banner);
      }
    });

    if (eventsToday.length > 0) {
      // Clicking any highlighted box also shows event info (first event)
      td.onclick = () => {
        const event = eventsToday[0];
        const parsed = parseEventDates(event);
        showAddressPopup(event, parsed.from, parsed.to);
      };
    }

    tr.appendChild(td);

    // Move to next day
    date.setDate(date.getDate() + 1);

    // End of week or last day
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

// Show address modal/popup
function showAddressPopup(event, from, to) {
  let old = document.getElementById('address-popup');
  if (old) old.remove();

  const div = document.createElement('div');
  div.id = 'address-popup';
  div.style.position = 'fixed';
  div.style.left = '0';
  div.style.top = '0';
  div.style.width = '100vw';
  div.style.height = '100vh';
  div.style.background = 'rgba(0,0,0,0.13)';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.zIndex = '1000';

  div.innerHTML = `
    <div style="
      background: #fff;
      padding: 36px 22px 26px 28px;
      border-radius: 11px;
      min-width: 290px;
      max-width: 95vw;
      box-shadow: 0 3px 24px #3339;
      position:relative;
      ">
      <button id="close-popup" style="
        position: absolute; top: 8px; right: 12px; background: transparent; border: none; font-size: 1.7em; color: #333; cursor:pointer;">×</button>
      <h2 style="margin:0 0 8px 0; font-size:1.25em; color:#23446e;">${event.name}</h2>
      <div style="margin-bottom:2px;"><b>Date:</b> ${from.toLocaleDateString()} - ${to.toLocaleDateString()}</div>
      <div style="margin-bottom:2px;"><b>State:</b> ${event.state}</div>
      <div style="margin-bottom:2px;"><b>Address:</b> ${event.address || '<i>No address provided</i>'}</div>
      <div style="margin-bottom:0.5em;"><b>Teams:</b>
        <ul style="margin:0; padding-left:1em;">${
          event.contacts.map(c =>
            `<li>${c.team}${c.participants ? ` (${c.participants})` : ""}${
              (c.people && c.people.length) ?
                ` — <small>${c.people.map(p=>`${p.name}${p.phone?` (${p.phone})`:''}`).join('; ')}</small>` : ''
            }</li>`
          ).join('')
        }</ul>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  document.getElementById('close-popup').onclick = () => div.remove();
  div.onclick = (e) => { if (e.target === div) div.remove(); };
}

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("all-calendars");
  container.innerHTML = '';
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
