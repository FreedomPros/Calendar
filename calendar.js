// Modern calendar: Multi-day events centered, only one participants count, no repeat team/state text, address on click.

const START_DATE = new Date(2025, 6, 26); // July is 6
const END_DATE = new Date(2025, 8, 19);   // September is 8

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseEventDates(event) {
  // Accepts "July 17, 18, 19" or "July 17 - 19"
  const months = {
    "June": 5, "July": 6, "August": 7, "Aug": 7, "September": 8, "Sep": 8
  };
  const dateStr = event.date.trim();
  // "July 17, 18, 19"
  const multiDayComma = dateStr.match(/([A-Za-z]+)\s+(\d+),\s*(\d+),\s*(\d+)/);
  if (multiDayComma) {
    const m = months[multiDayComma[1]];
    return {
      from: new Date(2025, m, parseInt(multiDayComma[2], 10)),
      to: new Date(2025, m, parseInt(multiDayComma[4], 10)),
      days: [
        new Date(2025, m, parseInt(multiDayComma[2], 10)),
        new Date(2025, m, parseInt(multiDayComma[3], 10)),
        new Date(2025, m, parseInt(multiDayComma[4], 10))
      ]
    };
  }
  // "July 17 - 19"
  const range = dateStr.match(/([A-Za-z]+)\s+(\d+)\s*-\s*([A-Za-z]+)?\s*(\d+)/);
  if (range) {
    const m1 = months[range[1]];
    const d1 = parseInt(range[2], 10);
    const m2 = range[3] ? months[range[3]] : m1;
    const d2 = parseInt(range[4], 10);
    let days = [];
    let curr = new Date(2025, m1, d1);
    const end = new Date(2025, m2, d2);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return { from: new Date(2025, m1, d1), to: end, days };
  }
  // "July 17"
  const single = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
  if (single) {
    const m = months[single[1]];
    const d = parseInt(single[2], 10);
    return { from: new Date(2025, m, d), to: new Date(2025, m, d), days: [new Date(2025, m, d)] };
  }
  return null;
}

function eventDaysMap(events) {
  // Map ISO date string => [event, ...]
  const map = {};
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    parsed.days.forEach(day => {
      const key = day.toISOString().slice(0,10);
      if (!map[key]) map[key] = [];
      map[key].push({ event, parsed });
    });
  });
  return map;
}

// For multi-day events, only show the label centered across the spanned cells
function getEventSpans(events) {
  // For each event, store { key: start-ISO, span: n, event }
  let spans = {};
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    const startKey = parsed.from.toISOString().slice(0,10);
    spans[startKey] = { event, parsed, span: parsed.days.length };
  });
  return spans;
}

function dateInRange(date) {
  return date >= START_DATE && date <= END_DATE;
}

function renderCalendar(events) {
  // Determine which months to show
  let months = [];
  let year = START_DATE.getFullYear(), month = START_DATE.getMonth();
  while (year < END_DATE.getFullYear() || (year === END_DATE.getFullYear() && month <= END_DATE.getMonth())) {
    months.push({ year, month });
    if (month === 11) { year++; month = 0; } else { month++; }
  }

  // Build events/day maps
  const dayEventMap = eventDaysMap(events);
  const eventSpans = getEventSpans(events);

  const all = document.getElementById("all-calendars");
  all.innerHTML = "";

  months.forEach(({ year, month }) => {
    // Section Title
    const monthSection = document.createElement('div');
    monthSection.className = 'month-section';
    const title = document.createElement('div');
    title.className = 'month-title';
    title.innerText = `${MONTH_NAMES[month]} ${year}`;
    title.style.fontSize = "1.4em";
    title.style.color = "#ef3b22";
    title.style.fontWeight = "800";
    title.style.textAlign = "center";
    title.style.letterSpacing = "0.04em";
    title.style.margin = "30px 0 10px 0";
    monthSection.appendChild(title);

    // Table
    const table = document.createElement("table");
    table.className = "calendar";

    // Header row
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

    let d = new Date(year, month, 1);
    for (let i=0; i<d.getDay(); i++) {
      const td = document.createElement("td");
      td.className = "calendar-day empty";
      tr.appendChild(td);
    }

    while (d.getMonth() === month) {
      const iso = d.toISOString().slice(0,10);
      const td = document.createElement("td");
      td.className = "calendar-day";

      if (!dateInRange(d)) {
        td.className += " empty";
        tr.appendChild(td);
        d.setDate(d.getDate() + 1);
        if (tr.children.length === 7) { tbody.appendChild(tr); tr = document.createElement("tr"); }
        continue;
      }

      td.innerHTML = `<span class="calendar-day-number">${d.getDate()}</span>`;

      // Only show event block in the FIRST cell of a multi-day span
      let eventBlocks = [];
      let renderedEventIds = new Set();

      // If this day is the start of a multi-day event, render the block and reserve future cells
      if (eventSpans[iso]) {
        const { event, parsed, span } = eventSpans[iso];
        // Check if this event fits in this row
        let colIdx = tr.children.length;
        let maxSpan = Math.min(span, 7 - colIdx);

        // Only render if not already rendered in a previous row (for multi-week events)
        let showBlock = true;
        // For events crossing weeks, must check if this start cell is within its full days
        if (colIdx !== 0 && parsed.days.length > (7-colIdx)) {
          // Only render in first column of new week for multi-week event
          showBlock = false;
        }
        if (showBlock) {
          renderedEventIds.add(event.name);
          const block = document.createElement("div");
          block.className = "event-block";
          block.style.gridColumn = `span ${maxSpan}`;
          block.style.textAlign = "center";
          block.style.justifyContent = "center";
          block.style.alignItems = "center";
          block.style.display = "flex";
          block.style.flexDirection = "column";
          block.innerHTML =
            `<span class="event-state">${event.state ? event.state.toUpperCase() : ""}</span>
             <span class="event-teams">${event.contacts.map(c=>c.team).join(', ')}${event.participants ? ` (${event.participants})` : ""}</span>`;
          block.onclick = (e) => {
            e.stopPropagation();
            showAddressPopup(event);
          };
          block.style.position = "absolute";
          block.style.top = "0";
          block.style.left = "0";
          block.style.right = "0";
          block.style.height = "90%";
          block.style.margin = "auto";
          td.appendChild(block);
        }
      }

      // If this is a continuation cell of a multi-day event, highlight but don't repeat text
      let isInMultiEvent = false;
      Object.values(eventSpans).forEach(({ event, parsed }) => {
        if (parsed.days.slice(1).some(day => day.toISOString().slice(0,10) === iso)) {
          isInMultiEvent = true;
        }
      });
      if (isInMultiEvent) {
        td.className += " highlight";
      }

      // If single-day event, or multiple events start on this day
      if (dayEventMap[iso]) {
        dayEventMap[iso].forEach(({ event, parsed }) => {
          // Only render if this is the first day of this event (already handled above for multi-day)
          if (parsed.days.length === 1 && !renderedEventIds.has(event.name)) {
            const block = document.createElement("div");
            block.className = "event-block";
            block.style.textAlign = "center";
            block.innerHTML =
              `<span class="event-state">${event.state ? event.state.toUpperCase() : ""}</span>
               <span class="event-teams">${event.contacts.map(c=>c.team).join(', ')}${event.participants ? ` (${event.participants})` : ""}</span>`;
            block.onclick = (e) => {
              e.stopPropagation();
              showAddressPopup(event);
            };
            td.appendChild(block);
          }
        });
        td.className += " highlight";
      }

      tr.appendChild(td);

      d.setDate(d.getDate() + 1);
      if (tr.children.length === 7) {
        tbody.appendChild(tr); tr = document.createElement("tr");
      }
    }
    while (tr.children.length < 7) {
      const td = document.createElement("td");
      td.className = "calendar-day empty";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
    table.appendChild(tbody);

    monthSection.appendChild(table);
    all.appendChild(monthSection);
  });
}

// Address popup (only address)
function showAddressPopup(event) {
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
      padding: 36px 32px 26px 32px;
      border-radius: 11px;
      min-width: 320px;
      max-width: 95vw;
      box-shadow: 0 3px 24px #3339;
      position:relative;
      text-align:left;
      ">
      <button id="close-popup" style="
        position: absolute; top: 8px; right: 12px; background: transparent; border: none; font-size: 1.7em; color: #333; cursor:pointer;">×</button>
      <div style="font-weight:800;font-size:1.12em;color:#ef3b22;text-transform:uppercase;margin-bottom:8px;">${event.name}</div>
      <div style="font-weight:700;margin-bottom:12px;">
        ${event.address ? event.address : '<em>No address provided</em>'}
      </div>
    </div>
  `;
  document.body.appendChild(div);

  document.getElementById('close-popup').onclick = () => div.remove();
  div.onclick = (e) => { if (e.target === div) div.remove(); };
}

document.addEventListener("DOMContentLoaded", function () {
  renderCalendar(window.addresses);
});
