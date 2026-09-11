import {
  addMatchDay,
  deleteMatchDay,
  listMatchDays,
  listMatchResponses,
  listPlayers,
  listVenues,
  setMatchResponse,
  updateMatchDay
} from "../data.js";
import { escapeHtml, formatDate } from "../utils.js";
import { closeModal, openModal } from "../modal.js";

function toStamp(date, time) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1, hour || 0, minute || 0);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function calendarStamp(stamp) {
  return `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}T${pad(stamp.getHours())}${pad(stamp.getMinutes())}00`;
}

function calendarLink(match) {
  const start = toStamp(match.date, match.startTime);
  const end = toStamp(match.date, match.endTime || match.startTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: match.title || "Match day",
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    location: match.venueAddress || match.venueName || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function matchFormHtml(match = {}, venues = []) {
  return `
    <div class="modal-header">
      <h2>${match.id ? "Edit Match Day" : "Create Match Day"}</h2>
      <button class="icon-button" id="match-modal-close" type="button" aria-label="Close">✕</button>
    </div>
    <form id="match-form">
      <input type="hidden" name="id" value="${escapeHtml(match.id || "")}" />
      <div class="form-grid">
        <label class="form-field form-field-wide">
          <span>Match Day Name</span>
          <input type="text" name="title" value="${escapeHtml(match.title || "")}" placeholder="Weekly Match" required />
        </label>
        <label class="form-field">
          <span>Match Day Date</span>
          <input type="date" name="date" value="${escapeHtml(match.date || "")}" required />
        </label>
        <label class="form-field">
          <span>Start time</span>
          <input type="time" name="startTime" value="${escapeHtml(match.startTime || "18:00")}" required />
        </label>
        <label class="form-field">
          <span>End time</span>
          <input type="time" name="endTime" value="${escapeHtml(match.endTime || "19:30")}" />
        </label>
        <label class="form-field form-field-wide">
          <span>Venue</span>
          <select name="venueId">
            <option value="">Please select a venue</option>
            ${venues.map((venue) => `<option value="${escapeHtml(venue.id)}" ${match.venueId === venue.id ? "selected" : ""}>${escapeHtml(venue.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <p class="auth-error" id="match-form-error" role="alert" hidden></p>
      <div class="auth-actions modal-actions">
        <button class="btn btn-secondary" id="match-form-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" type="submit">${match.id ? "Save changes" : "Create"}</button>
      </div>
    </form>
  `;
}

function resultFormHtml(match, players) {
  const options = (selectedId, placeholder) => `<option value="">${placeholder}</option>${players.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("")}`;
  const scorerRow = (scorerId = "") => `<div class="result-entry-row"><select name="scorerId">${options(scorerId, "Select scorer")}</select><button class="icon-button" data-remove-scorer type="button" aria-label="Remove scorer">✕</button></div>`;
  const cardRow = (card = {}) => `<div class="result-entry-row"><select name="cardPlayerId">${options(card.playerId || "", "Select player")}</select><select name="cardType"><option value="yellow" ${card.type !== "red" ? "selected" : ""}>Yellow card</option><option value="red" ${card.type === "red" ? "selected" : ""}>Red card</option></select><button class="icon-button" data-remove-card type="button" aria-label="Remove card">✕</button></div>`;
  return `<div class="modal-header"><h2>Match Result</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="match-result-form"><div class="form-grid"><label class="form-field form-field-wide"><span>${escapeHtml(match.title || "Match day")}</span><input value="${escapeHtml(formatDate(match.date))}" disabled /></label><label class="form-field"><span>Status</span><select name="status"><option value="Upcoming" ${match.status === "Upcoming" ? "selected" : ""}>Upcoming</option><option value="Completed" ${match.status === "Completed" ? "selected" : ""}>Completed</option><option value="Cancelled" ${match.status === "Cancelled" ? "selected" : ""}>Cancelled</option></select></label><label class="form-field form-field-wide"><span>Result</span><input type="text" name="result" value="${escapeHtml(match.result || "")}" placeholder="e.g. SDFC 3 - 2 Opponent" /></label></div><fieldset class="selection-fieldset"><legend>Scorers</legend><div id="scorer-rows">${(match.scorers || []).map((scorer) => scorerRow(scorer.playerId)).join("")}</div><button class="btn btn-secondary btn-small" id="add-scorer" type="button">+ Add Scorer</button></fieldset><fieldset class="selection-fieldset"><legend>Cards</legend><div id="card-rows">${(match.cards || []).map(cardRow).join("")}</div><button class="btn btn-secondary btn-small" id="add-card" type="button">+ Add Card</button></fieldset><p class="auth-error" id="match-result-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Result</button></div></form>`;
}

function matchCard(match, { totalPlayers, responses, uid, canManage, canDelete }) {
  const inCount = responses.filter((item) => item.response === "in").length;
  const outCount = responses.filter((item) => item.response === "out").length;
  const pendingCount = Math.max(totalPlayers - inCount - outCount, 0);
  const mine = responses.find((item) => item.id === uid);
  const isPast = toStamp(match.date, match.endTime || match.startTime).getTime() < Date.now();
  const statusLabel = match.status || (isPast ? "Completed" : "Upcoming");

  return `
    <article class="matchday-card" data-id="${escapeHtml(match.id)}">
      <div class="match-card-main">
        <h2>${escapeHtml(match.title || "Match day")} <span class="badge badge-${statusLabel === "Completed" ? "active" : statusLabel === "Cancelled" ? "inactive" : "moderator"}">${escapeHtml(statusLabel)}</span></h2>
        <p class="match-meta">◷ ${formatDate(match.date)}, ${escapeHtml(match.startTime || "—")}${match.endTime ? ` – ${escapeHtml(match.endTime)}` : ""} &nbsp; · &nbsp; ◉ ${escapeHtml(match.venueName || "Venue TBC")}</p>
        ${match.result ? `<p class="match-result"><strong>Result:</strong> ${escapeHtml(match.result)}</p>` : ""}
        <div class="match-counts">
          <div><strong>${totalPlayers}</strong><span>Total</span></div>
          <div><strong>${inCount}</strong><span>Confirmed</span></div>
          <div><strong>${pendingCount}</strong><span>Pending</span></div>
          <div><strong>${outCount}</strong><span>Not joining</span></div>
        </div>
      </div>
      <div class="match-actions">
        <span class="stat-label">Are you participating?</span>
        <div class="rsvp-actions">
          <button class="btn btn-small ${mine?.response === "in" ? "btn-primary" : "btn-secondary"}" data-rsvp="in" type="button">✓ Yes, I'm in</button>
          <button class="btn btn-small ${mine?.response === "out" ? "btn-danger" : "btn-secondary"}" data-rsvp="out" type="button">✕ Can't make it</button>
        </div>
        <a class="btn btn-secondary btn-block" href="${calendarLink(match)}" target="_blank" rel="noopener">Add to calendar</a>
        <a class="btn btn-secondary btn-block" href="#/match-days/manage/${encodeURIComponent(match.id)}">Manage</a>
        ${canManage ? `
          <div class="table-actions">
            <button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>
            <button class="btn btn-small btn-primary" data-action="result" type="button">${match.result ? "Update Result" : "Add Result"}</button>
            ${canDelete ? `<button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button>` : ""}
          </div>
        ` : ""}
      </div>
    </article>
  `;
}

export async function renderMatchDaysPage(container, { role, uid, player }) {
  const canManage = role === "admin" || role === "moderator";
  const canDelete = role === "admin";
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Match Days</h1>
        <p class="page-subtitle">Schedule, attendance, and calendar links for upcoming matches.</p>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="add-match-button" type="button">+ New Match Day</button>` : ""}
    </div>
    <div class="matchday-list" id="matchday-list">
      <p class="empty-state">Loading match days…</p>
    </div>
  `;

  const listEl = document.getElementById("matchday-list");

  async function refresh() {
    try {
      const [matches, players] = await Promise.all([listMatchDays(), listPlayers()]);
      if (!matches.length) {
        listEl.innerHTML = `<p class="empty-state">No match days scheduled yet.</p>`;
        return;
      }
      const responsesByMatch = await Promise.all(matches.map((match) => listMatchResponses(match.id)));
      listEl.innerHTML = matches
        .map((match, index) => matchCard(match, {
          totalPlayers: players.length,
          responses: responsesByMatch[index],
          uid,
          canManage,
          canDelete
        }))
        .join("");
      wireCardActions(matches, players);
    } catch (error) {
      listEl.innerHTML = `<p class="empty-state">Unable to load match days.</p>`;
      console.error("Unable to load match days", error);
    }
  }

  function wireCardActions(matches, players) {
    listEl.querySelectorAll(".matchday-card").forEach((card) => {
      const id = card.dataset.id;
      const match = matches.find((item) => item.id === id);
      card.querySelectorAll("[data-rsvp]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await setMatchResponse(id, uid, button.dataset.rsvp, player?.id || "");
            await refresh();
          } catch (error) {
            console.error("Unable to save your response", error);
          }
        });
      });
      card.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(match));
      card.querySelector("[data-action=result]")?.addEventListener("click", () => openResultForm(match, players));
      card.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm(`Delete ${match.title}?`)) return;
        try {
          await deleteMatchDay(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete match day", error);
        }
      });
    });
  }

  function closeForm() {
    closeModal();
  }

  async function openForm(match) {
    let venues = [];
    try {
      venues = await listVenues();
    } catch (error) {
      console.error("Unable to load venues for the match day form", error);
    }
    const overlay = openModal(matchFormHtml(match || {}, venues));
    const form = overlay.querySelector("#match-form");
    const errorEl = overlay.querySelector("#match-form-error");
    overlay.querySelector("#match-modal-close").addEventListener("click", closeForm);
    overlay.querySelector("#match-form-cancel").addEventListener("click", closeForm);
    overlay.querySelectorAll('input[type="date"], input[type="time"]').forEach((input) => {
      input.addEventListener("click", () => {
        if (typeof input.showPicker === "function") {
          try {
            input.showPicker();
          } catch {
            // Picker can't be shown programmatically in this browser; ignore.
          }
        }
      });
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const venueId = String(formData.get("venueId") || "");
      const venue = venues.find((item) => item.id === venueId);
      const payload = {
        title: String(formData.get("title") || "").trim(),
        date: String(formData.get("date") || ""),
        startTime: String(formData.get("startTime") || ""),
        endTime: String(formData.get("endTime") || ""),
        venueId: venueId || null,
        venueName: venue?.name || "",
        venueAddress: venue?.address || ""
      };
      if (!payload.title || !payload.date || !payload.startTime) {
        errorEl.textContent = "Title, date, and start time are required.";
        errorEl.hidden = false;
        return;
      }
      try {
        if (id) {
          await updateMatchDay(id, payload);
        } else {
          await addMatchDay(payload);
        }
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save match day. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save match day", error);
      }
    });
  }

  function openResultForm(match, players) {
    const overlay = openModal(resultFormHtml(match, players));
    const form = overlay.querySelector("#match-result-form");
    const errorEl = overlay.querySelector("#match-result-error");
    overlay.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeForm));
    const playerOptions = (placeholder) => `<option value="">${placeholder}</option>${players.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.name)}</option>`).join("")}`;
    form.querySelector("#add-scorer").addEventListener("click", () => form.querySelector("#scorer-rows").insertAdjacentHTML("beforeend", `<div class="result-entry-row"><select name="scorerId">${playerOptions("Select scorer")}</select><button class="icon-button" data-remove-scorer type="button" aria-label="Remove scorer">✕</button></div>`));
    form.querySelector("#add-card").addEventListener("click", () => form.querySelector("#card-rows").insertAdjacentHTML("beforeend", `<div class="result-entry-row"><select name="cardPlayerId">${playerOptions("Select player")}</select><select name="cardType"><option value="yellow">Yellow card</option><option value="red">Red card</option></select><button class="icon-button" data-remove-card type="button" aria-label="Remove card">✕</button></div>`));
    form.querySelector("#scorer-rows").addEventListener("click", (event) => event.target.closest("[data-remove-scorer]")?.closest(".result-entry-row")?.remove());
    form.querySelector("#card-rows").addEventListener("click", (event) => event.target.closest("[data-remove-card]")?.closest(".result-entry-row")?.remove());
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const status = String(data.get("status") || "Upcoming");
      const result = String(data.get("result") || "").trim();
      const scorerIds = Array.from(form.querySelectorAll("[name=scorerId]"), (input) => input.value).filter(Boolean);
      const cardPlayerIds = Array.from(form.querySelectorAll("[name=cardPlayerId]"), (input) => input.value);
      const cardTypes = Array.from(form.querySelectorAll("[name=cardType]"), (input) => input.value);
      const scorers = scorerIds.map((playerId) => ({ playerId }));
      const cards = cardPlayerIds.map((playerId, index) => ({ playerId, type: cardTypes[index] })).filter((card) => card.playerId);
      if (status === "Completed" && !result) {
        errorEl.textContent = "Enter a match result before marking the match completed.";
        errorEl.hidden = false;
        return;
      }
      try {
        await updateMatchDay(match.id, { status, result, scorers, cards });
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save the match result.";
        errorEl.hidden = false;
        console.error("Unable to save match result", error);
      }
    });
  }

  if (canManage) {
    document.getElementById("add-match-button").addEventListener("click", () => openForm());
  }

  await refresh();
}
