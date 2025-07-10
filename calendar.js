const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseEventDates(event) {
  const months = {
    "June": 5, "July": 6, "August": 7, "Aug": 7, "September": 8, "Sep": 8
  };
  const dateStr = event.date.trim();
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
  const single = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
  if (single) {
    const m = months[single[1]];
    const d = parseInt(single[2], 10);
    return { from: new Date(2025, m, d), to: new Date(2025, m, d), days: [new Date(2025, m, d)] };
  }
  return null;
}

function eventDaysMap(events) {
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

function getEventSpans(events) {
  let spans = {};
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    const startKey = parsed.from.toISOString().slice(0,10);
    spans[startKey] = { event, parsed, span: parsed.days.length };
  });
  return spans;
}

function getCalendarRange(events) {
  let min = null, max = null;
  events.forEach(event => {
    const parsed = parseEventDates(event);
    if (!parsed) return;
    if (!min || parsed.from < min) min = parsed.from;
    if (!max || parsed.to > max) max = parsed.to;
  });
  min = new Date(min.getFullYear(), min.getMonth(), 1);
  max = new Date(max.getFullYear(), max.getMonth() + 1, 0);
  return { min, max };
}

// Show only the first two team names and add "..." if more, with no trailing comma or <br>
function formatTeamNames(event) {
  let teamNames = event.contacts.map(c => c.team);
  if (teamNames.length > 2) {
    return teamNames.slice(0,2).join('<br>') + '<br>...';
  }
  return teamNames.join('<br>');
}
function formatTeamNamesDesktop(event) {
  let teamNames = event.contacts.map(c => c.team);
  if (teamNames.length > 2) {
    let names = teamNames.slice(0,2).join(', ');
    return names + '...';
  }
  return teamNames.join(', ');
}

// Add FLORIDA TBD events for Sep 25, 26, 29, 30
function injectFloridaTBD(events) {
  const dates = ['2025-09-25', '2025-09-26', '2025-09-29', '2025-09-30'];
  dates.forEach(dateStr => {
    // Only add if not already present
    if (!events.some(e => {
      const parsed = parseEventDates(e);
      return parsed && parsed.days.some(day => day.toISOString().slice(0,10) === dateStr);
    })) {
      events.push({
        name: "FLORIDA TBD",
        state: "Florida",
        participants: "",
        address: "",
        coords: [27.9944, -81.7603], // Approximate Florida center
        contacts: [{ team: "TBD", people: [] }],
        date: "September " + Number(dateStr.split('-')[2])
      });
    }
  });
}

function renderCalendar(events) {
  // Inject the FLORIDA TBD events if not present
  injectFloridaTBD(events);

  const { min, max } = getCalendarRange(events);
  let months = [];
  let year = min.getFullYear(), month = min.getMonth();
  while (year < max.getFullYear() || (year === max.getFullYear() && month <= max.getMonth())) {
    months.push({ year, month });
    if (month === 11) { year++; month = 0; } else { month++; }
  }

  const dayEventMap = eventDaysMap(events);
  const eventSpans = getEventSpans(events);

  const all = document.getElementById("all-calendars");
  all.innerHTML = "";

  months.forEach(({ year, month }) => {
    const monthSection = document.createElement('div');
    monthSection.className = 'month-section';
    const title = document.createElement('div');
    title.className = 'month-title centered-title';
    title.innerText = `${MONTH_NAMES[month]} ${year}`; // Show month + year (e.g., September 2025)
    monthSection.appendChild(title);

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
      td.innerHTML = `<span class="calendar-day-number">${d.getDate()}</span>`;
      td.style.position = "relative";

      // Check if this cell should start a multi-day event block
      if (eventSpans[iso]) {
        const { event, parsed, span } = eventSpans[iso];
        let colIdx = tr.children.length;
        let maxSpan = Math.min(span, 7 - colIdx);

        let isMobile = window.innerWidth <= 700;
        let teamsHTML = isMobile ? formatTeamNames(event) : formatTeamNamesDesktop(event);

        const block = document.createElement("div");
        block.className = "event-block";
        block.style.gridColumn = `span ${maxSpan}`;
        block.style.textAlign = "center";
        block.style.justifyContent = "center";
        block.style.alignItems = "center";
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.position = "absolute";
        block.style.top = "0";
        block.style.left = "0";
        block.style.right = "0";
        block.style.height = "100%";
        block.style.width = `calc(${maxSpan*100}% + ${(maxSpan-1)*1}px)`;
        block.innerHTML =
          `<span class="event-state">${event.state ? event.state.toUpperCase() : ""}</span>
           <span class="event-teams">${teamsHTML}</span>
           <span class="event-participants">(${event.participants})</span>`;
        block.onclick = (e) => {
          e.stopPropagation();
          showAddressPopup(event);
        };

        td.appendChild(block);
      }

      // If this cell is part of a multi-day event (but not starting), highlight (but don't show block)
      let isInMultiEvent = false;
      Object.values(eventSpans).forEach(({ event, parsed }) => {
        if (parsed.days.slice(1).some(day => day.toISOString().slice(0,10) === iso)) {
          isInMultiEvent = true;
        }
      });
      if (isInMultiEvent) {
        td.className += " highlight";
      }

      // If a single-day event starts here and not part of multi-day
      if (dayEventMap[iso]) {
        dayEventMap[iso].forEach(({ event, parsed }) => {
          if (parsed.days.length === 1) {
            let isMobile = window.innerWidth <= 700;
            let teamsHTML = isMobile ? formatTeamNames(event) : formatTeamNamesDesktop(event);

            const block = document.createElement("div");
            block.className = "event-block";
            block.style.textAlign = "center";
            block.innerHTML =
              `<span class="event-state">${event.state ? event.state.toUpperCase() : ""}</span>
               <span class="event-teams">${teamsHTML}</span>
               <span class="event-participants">(${event.participants})</span>`;
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
  // Center the <h1> and remove 2025 from the title
  const h1 = document.querySelector("h1");
  if (h1) {
    h1.classList.add("centered-title");
    h1.textContent = "Taylor McCarthy Summer Training";
  }
  renderCalendar(window.addresses);
});
