// calendar.js: Renders all months stacked, each day shows its own number (no merged cells).
// Clicking an event name or highlighted cell shows the event address in a popup.
// Team names show participant count. Event title banner spans all days, but no cell merging.
// Assumes window.addresses is loaded and each contact may have participants.

const MONTHS_TO_SHOW = [
  { year: 2025, monthIdx: 5 }, // June 2025
  { year: 2025, monthIdx: 6 }, // July 2025
  { year: 2025, monthIdx: 7 }, // August 2025
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Parse event date ranges into { from, to }
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

// Map YYYY-MM-DD string to array of events (for each day)
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

// Returns true if this is the first day of this event (to print banner)
function isEventStart(date, event) {
  const parsed = parseEventDates(event);
  return parsed && date.getTime() === parsed.from.getTime();
}

// Returns true if this is part of the event range
function isEventDay(date, event) {
  const parsed = parseEventDates(event);
  return parsed && date >= parsed.from && date <= parsed.to;
}

// Renders a single month's calendar as a table
function renderCalendar(year, month, events) {
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

  // For each day cell
  while (date.getMonth() === month) {
    const key = date.toISOString().slice(0, 10);
    const eventsToday = eventMap[key] || [];
    const td = document.createElement("td");
    td.className = "calendar-day";
    td.innerHTML = `<span class="calendar-day-number">${date.getDate()}</span>`;

    if (eventsToday.length > 0) {
      td.classList.add("highlight");

      // For all events on this day, check if it's the start, and print the banner (state+team+participants)
      eventsToday.forEach(event => {
        // Only render the banner on the first day of the event
        const parsed = parseEventDates(event);
        if (isEventStart(date, event)) {
          // CSS: .event-banner stretches visually across days; we use a unique class and data attribute
          const from = new Date(parsed.from);
          const to = new Date(parsed.to);
          const colCount = Math.round((to - from) / (1000*60*60*24)) + 1;

          // Construct teams + participants
          let teams = event.contacts
            .map(c =>
              c.team +
              (c.participants ? ` (${c.participants})` : '')
            ).join(', ');

          // Banner spans the event range (use data attributes for JS/CSS to visually connect)
          td.innerHTML += `
            <div class="event-banner"
              data-event-name="${event.name.replace(/"/g,'&quot;')}"
              data-event-range="${colCount}"
              data-event-from="${from.toISOString().slice(0,10)}"
              data-event-to="${to.toISOString().slice(0,10)}"
              tabindex="0"
              title="Click for address"
              style="cursor:pointer;">
              <span class="calendar-state">${event.state}</span>
              <span class="calendar-teams">${teams}</span>
            </div>
          `;
          // Click to show address
          td.querySelector('.event-banner').addEventListener('click', e => {
            e.stopPropagation();
            showAddressPopup(event, from, to);
          });
        }
      });

      // For all event days (including non-start days), clicking the box also shows address
      td.addEventListener('click', e => {
        // If clicked on banner, banner handler will run
        if (!e.target.classList.contains('event-banner')) {
          // Just show first event if multiple
          const event = eventsToday[0];
          const parsed = parseEventDates(event);
          showAddressPopup(event, parsed.from, parsed.to);
        }
      });
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
  // Remove existing if present
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

// Render all months stacked
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("all-calendars");
  // Clear if re-rendering
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
