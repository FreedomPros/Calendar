// ... rest of your code remains unchanged ...

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

  while (date.getMonth() === month) {
    const key = date.toISOString().slice(0, 10);
    const eventsToday = eventMap[key] || [];
    const td = document.createElement("td");
    td.className = "calendar-day";
    td.innerHTML = `<span class="calendar-day-number">${date.getDate()}</span>`;

    if (eventsToday.length > 0) {
      td.classList.add("highlight");
      td.style.position = "relative";
      // For each event, render label inside this cell (below day number)
      eventsToday.forEach(event => {
        // Teams/participants
        let teams = event.contacts
          .map(c => c.team + (c.participants ? ` (${c.participants})` : ''))
          .join(', ');
        const label = document.createElement('div');
        label.className = 'event-label';
        label.innerHTML = `
          <span class="calendar-state">${event.state}</span>
          <span class="calendar-teams">${teams}</span>
        `;
        label.onclick = e => { e.stopPropagation(); const parsed = parseEventDates(event); showAddressPopup(event, parsed.from, parsed.to); };
        td.appendChild(label);
      });
      td.onclick = () => {
        const event = eventsToday[0];
        const parsed = parseEventDates(event);
        showAddressPopup(event, parsed.from, parsed.to);
      };
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
