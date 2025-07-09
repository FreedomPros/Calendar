// ... your other calendar.js code ...

function renderCalendar(events) {
  // ... existing setup code ...

  months.forEach(({ year, month }) => {
    // ... existing monthSection and table code ...

    while (d.getMonth() === month) {
      // ... existing code ...

      // Check if this cell should start a multi-day event block
      if (eventSpans[iso]) {
        const { event, parsed, span } = eventSpans[iso];
        let colIdx = tr.children.length;
        let maxSpan = Math.min(span, 7 - colIdx);

        // ---- MOBILE-FRIENDLY TEAM NAMES ----
        let isMobile = window.innerWidth <= 700;
        let teamNames = event.contacts.map(c => c.team);
        let teamsHTML = isMobile ? teamNames.join('<br>') : teamNames.join(', ');

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

      // ... rest of your renderCalendar code ...
    }

    // ... rest of your renderCalendar code ...
  });
}

// ... rest of your calendar.js code ...
