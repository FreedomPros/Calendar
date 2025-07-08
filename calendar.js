// Simple Team Calendar for FreedomPros
// Requires: addresses.js

// ----- CONFIG -----
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ----- HELPERS -----
function parseDateString(str) {
  // Accepts "July 22", "July 22 - 23", "July 22-23", "July 22 - July 24"
  let [start, end] = str.split("-").map(s => s.trim());
  let startParts = start.split(" ");
  let startMonth = startParts[0];
  let startDay = parseInt(startParts[1]);
  let year = new Date().getFullYear();

  let endMonth, endDay;
  if (end) {
    let endParts = end.split(" ");
    if (endParts.length === 1) {
      endMonth = startMonth;
      endDay = parseInt(endParts[0]);
    } else {
      endMonth = endParts[0];
      endDay = parseInt(endParts[1]);
    }
  }
  return {
    start: new Date(`${startMonth} ${startDay}, ${year}`),
    end: end ? new Date(`${endMonth || startMonth} ${endDay}, ${year}`) : new Date(`${startMonth} ${startDay}, ${year}`)
  };
}

function getMonthYearSet(addresses) {
  // Returns array of {year, month} that have events
  const set = new Set();
  addresses.forEach(item => {
    const { start, end } = parseDateString(item.date);
    for (
      let dt = new Date(start.getTime());
      dt <= end;
      dt.setDate(dt.getDate() + 1)
    ) {
      set.add(`${dt.getFullYear()}-${dt.getMonth()}`);
    }
  });
  return Array.from(set).map(x => {
    const [year, month] = x.split("-").map(Number);
    return { year, month };
  }).sort((a, b) => (a.year - b.year) || (a.month - b.month));
}

function pad(num) {
  return num < 10 ? "0" + num : num;
}

// ----- CALENDAR LOGIC -----
function renderCalendar(year, month, events) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  let html = `<table class="calendar-table"><thead><tr>`;
  for (const day of ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]) {
    html += `<th>${day}</th>`;
  }
  html += `</tr></thead><tbody><tr>`;

  let dayOfWeek = firstDay.getDay();
  for (let i = 0; i < dayOfWeek; i++) html += `<td></td>`;

  for (let date = 1; date <= lastDay.getDate(); date++) {
    const thisDay = new Date(year, month, date);
    const dateStr = `${year}-${pad(month + 1)}-${pad(date)}`;
    const eventsOnThisDay = events.filter(e =>
      thisDay >= e.start && thisDay <= e.end
    );

    let cellClass = "";
    if (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === date
    ) cellClass = "today";

    if (eventsOnThisDay.length) {
      cellClass += " event-day";
      html += `<td class="${cellClass.trim()}">`;
      // List all teams on this day
      for (const ev of eventsOnThisDay) {
        html += `<div class="event-box" tabindex="0"
          data-event='${encodeURIComponent(JSON.stringify(ev))}'>
          <span class="event-state">${ev.state}</span>
          <span class="event-team">${ev.teams.join(", ")}</span>
        </div>`;
      }
      html += `</td>`;
    } else {
      html += `<td class="${cellClass.trim()}">${date}</td>`;
    }
    if ((dayOfWeek + date) % 7 === 0) html += `</tr><tr>`;
  }
  html += `</tr></tbody></table>`;
  document.getElementById("calendar").innerHTML = html;

  // Add event listeners for event-box
  document.querySelectorAll('.event-box').forEach(box => {
    box.onclick = showEventModal;
    box.onkeypress = function(e) { if (e.key === "Enter") showEventModal.call(this, e); };
  });
}

function showEventModal(e) {
  let event = JSON.parse(decodeURIComponent(this.getAttribute('data-event')));
  document.getElementById("modal-title").textContent = event.teams.join(", ");
  let html = `
    <p><strong>State:</strong> ${event.state}</p>
    <p><strong>Office Address:</strong> ${event.address}</p>
    <p><strong>Date:</strong> ${event.dateDisplay}</p>
    <div><strong>POCs:</strong>
      <ul>
        ${event.contacts.map(group =>
          group.people.map(
            p => `<li>${p.name}${p.phone ? ` (${p.phone})` : ""}</li>`
          ).join("")
        ).join("")}
      </ul>
    </div>
  `;
  document.getElementById("modal-details").innerHTML = html;
  document.getElementById("event-modal").style.display = "block";
}

function hideEventModal() {
  document.getElementById("event-modal").style.display = "none";
}

// ----- NAVIGATION -----
function renderCalendarNav(monthYearArr, currentIdx) {
  let nav = '';
  if (currentIdx > 0)
    nav += `<button id="cal-prev">Previous</button>`;
  nav += `<span><b>${monthNames[monthYearArr[currentIdx].month]} ${monthYearArr[currentIdx].year}</b></span>`;
  if (currentIdx < monthYearArr.length - 1)
    nav += `<button id="cal-next">Next</button>`;
  document.getElementById("calendar-nav").innerHTML = nav;
  if (currentIdx > 0)
    document.getElementById("cal-prev").onclick = () => showMonth(monthYearArr, currentIdx - 1);
  if (currentIdx < monthYearArr.length - 1)
    document.getElementById("cal-next").onclick = () => showMonth(monthYearArr, currentIdx + 1);
}

// ----- DATA PREP -----
function buildEventObjects(addresses) {
  return addresses.flatMap(item => {
    const { start, end } = parseDateString(item.date);
    let stateMatch = item.address.match(/, ([A-Z]{2,})[ ,]/);
    let state = stateMatch ? stateMatch[1] : "";
    let teams = [];
    if (item.contacts) teams = item.contacts.map(group => group.team);
    return [{
      ...item,
      start,
      end,
      state,
      teams,
      dateDisplay: item.date
    }];
  });
}

// ----- MAIN -----
let monthYearArr = getMonthYearSet(window.addresses);
let events = buildEventObjects(window.addresses);
let currentMonthIdx = 0;

function showMonth(monthYearArr, idx) {
  currentMonthIdx = idx;
  renderCalendarNav(monthYearArr, currentMonthIdx);
  const { year, month } = monthYearArr[currentMonthIdx];
  renderCalendar(year, month, events);
}

// Modal close
document.addEventListener("DOMContentLoaded", function() {
  showMonth(monthYearArr, 0);
  document.getElementById("close-modal").onclick = hideEventModal;
  window.onclick = function(event) {
    if (event.target === document.getElementById("event-modal"))
      hideEventModal();
  };
});
