import {
  addMatchDayFixture, addMatchDayTeam, deleteMatchDayFixture, deleteMatchDayTeam,
  listMatchDayFixtures, listMatchDayTeams, listMatchDays, listMatchResponses, listPlayers, listVenues,
  updateMatchDay, updateMatchDayFixture, updateMatchDayTeam
} from "../data.js";
import { closeModal, openModal } from "../modal.js";
import { navigate } from "../router.js";
import { escapeHtml, formatDate } from "../utils.js";

const staffRole = (role) => role === "admin" || role === "moderator";
const selected = (form, name) => Array.from(form.querySelectorAll(`[name=${name}]:checked`), (input) => input.value);
const nameFor = (id, players) => players.find((player) => player.id === id)?.name || "Unknown player";

function matchIdFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const pathId = hash.match(/^\/match-days\/manage\/([^?]+)/)?.[1];
  return pathId ? decodeURIComponent(pathId) : "";
}

function showModal(html) {
  const overlay = openModal(html);
  overlay.querySelector(".modal-card").classList.add("modal-card-wide");
  overlay.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  return overlay;
}

function showError(overlay, message) {
  const error = overlay.querySelector(".auth-error");
  error.textContent = message;
  error.hidden = false;
}

function playerChoices(players, selectedIds = [], unavailable = new Set()) {
  return players.map((player) => {
    const checked = selectedIds.includes(player.id);
    const disabled = unavailable.has(player.id) && !checked;
    return `<label class="selection-option${disabled ? " disabled" : ""}"><input type="checkbox" name="playerIds" value="${escapeHtml(player.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} /><span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.position || "Unassigned")}</small></span></label>`;
  }).join("") || `<p class="empty-state">No confirmed players are available.</p>`;
}

function detailHeader(match, staff, canDelete) {
  const status = match.status || "Upcoming";
  const badge = status === "Completed" ? "active" : status === "Cancelled" ? "inactive" : "moderator";
  return `<div class="breadcrumb"><a href="#/match-days">Match Days</a><span>/</span><span class="breadcrumb-current">${escapeHtml(match.title || "Match day")}</span></div><div class="page-header"><div><span class="eyebrow">Match day workspace</span><h1 class="page-title">${escapeHtml(match.title || "Match day")}</h1><p class="page-subtitle">${formatDate(match.date)} · ${escapeHtml(match.startTime || "Time TBC")} · ${escapeHtml(match.venueName || "Venue TBC")}</p></div><div class="tournament-heading-actions"><span class="badge badge-${badge}">${escapeHtml(status)}</span>${staff ? `<button class="btn btn-secondary btn-small" id="edit-match" type="button">Edit Match</button>` : ""}${canDelete ? `<a class="btn btn-danger btn-small" href="#/match-days">Back to Match Days</a>` : ""}</div></div>`;
}

function matchEditForm(match, venues) {
  return `<div class="modal-header"><h2>Edit Match Day</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="workspace-match-form"><div class="form-grid"><label class="form-field form-field-wide"><span>Match Day Name</span><input name="title" value="${escapeHtml(match.title || "")}" required /></label><label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(match.date || "")}" required /></label><label class="form-field"><span>Start Time</span><input type="time" name="startTime" value="${escapeHtml(match.startTime || "")}" required /></label><label class="form-field"><span>End Time</span><input type="time" name="endTime" value="${escapeHtml(match.endTime || "")}" /></label><label class="form-field form-field-wide"><span>Venue</span><select name="venueId"><option value="">Select venue</option>${venues.map((venue) => `<option value="${escapeHtml(venue.id)}" ${venue.id === match.venueId ? "selected" : ""}>${escapeHtml(venue.name)}</option>`).join("")}</select></label></div><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Match</button></div></form>`;
}

function overview(state) {
  const confirmed = state.responses.filter((response) => response.response === "in").length;
  const results = state.fixtures.filter((fixture) => fixture.homeScore != null && fixture.awayScore != null);
  return `<div class="tournament-summary-grid"><div><span>Date</span><strong>${formatDate(state.match.date)}</strong></div><div><span>Venue</span><strong>${escapeHtml(state.match.venueName || "TBC")}</strong></div><div><span>Confirmed</span><strong>${confirmed}</strong></div><div><span>Teams</span><strong>${state.teams.length}</strong></div><div><span>Fixtures</span><strong>${state.fixtures.length}</strong></div></div><div class="tournament-overview-grid"><section class="tournament-section"><h2>Match Information</h2><dl class="detail-list"><div><dt>Start Time</dt><dd>${escapeHtml(state.match.startTime || "Not set")}</dd></div><div><dt>End Time</dt><dd>${escapeHtml(state.match.endTime || "Not set")}</dd></div><div><dt>Venue</dt><dd>${escapeHtml(state.match.venueName || "Not set")}</dd></div><div><dt>Result</dt><dd>${escapeHtml(state.match.result || "Not recorded")}</dd></div></dl></section><section class="tournament-section"><h2>Confirmed Players</h2><div class="roster-chip-list">${state.roster.map((player) => `<span>${escapeHtml(player.name)}<small>${escapeHtml(player.position || "Unassigned")}</small></span>`).join("") || `<p class="empty-state">No player RSVPs are linked yet.</p>`}</div></section></div><section class="tournament-section"><h2>Fixture Results</h2><ul class="result-summary-list">${results.map((fixture) => `<li><strong>${escapeHtml(fixture.homeTeamName)} ${fixture.homeScore} - ${fixture.awayScore} ${escapeHtml(fixture.awayTeamName)}</strong><span>${fixture.manOfTheMatchId ? `Man of the Match: ${escapeHtml(nameFor(fixture.manOfTheMatchId, state.players))}` : "Result recorded"}</span></li>`).join("") || `<li class="drop-hint">No fixture results recorded yet.</li>`}</ul></section>`;
}

function teamsView(state, staff, canDelete) {
  const assigned = new Set(state.teams.flatMap((team) => team.playerIds || []));
  const playerTile = (playerId) => `<li class="team-player" ${staff ? `draggable="true" data-player-id="${escapeHtml(playerId)}"` : ""}>${escapeHtml(nameFor(playerId, state.players))}</li>`;
  const unassigned = state.roster.filter((player) => !assigned.has(player.id));
  const teamCards = state.teams.map((team) => `<article class="managed-team-card" data-id="${escapeHtml(team.id)}"><div><span class="eyebrow">Team</span><h3>${escapeHtml(team.name)}</h3></div><ul class="team-drop-zone" data-team-id="${escapeHtml(team.id)}">${(team.playerIds || []).map(playerTile).join("") || `<li class="drop-hint">Drop players here</li>`}</ul>${staff ? `<div class="table-actions"><button class="btn btn-secondary btn-small" data-edit-team type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-team type="button">Delete</button>` : ""}</div>` : ""}</article>`).join("");
  return `<div class="section-toolbar"><div><h2>Team Management</h2><p>${staff ? "Drag confirmed players between teams or back to unassigned." : "Confirmed players are assigned to teams."}</p></div>${staff ? `<button class="btn btn-primary btn-small" id="add-team" type="button">+ Create Team</button>` : ""}</div><section class="unassigned-players"><div><span class="eyebrow">Available roster</span><h2>Unassigned Players</h2></div><ul class="team-drop-zone" data-team-id="">${unassigned.map((player) => playerTile(player.id)).join("") || `<li class="drop-hint">All confirmed players are assigned</li>`}</ul></section><div class="managed-team-grid">${teamCards || `<div class="tournament-empty"><h2>No teams created</h2><p>Create teams from the confirmed player roster.</p></div>`}</div>`;
}

function fixturesView(state, staff, canDelete) {
  const rows = state.fixtures.map((fixture) => `<tr data-id="${escapeHtml(fixture.id)}"><td><strong>${escapeHtml(fixture.homeTeamName)}</strong> vs <strong>${escapeHtml(fixture.awayTeamName)}</strong></td><td>${formatDate(fixture.date)}, ${escapeHtml(fixture.startTime)}</td><td>${escapeHtml(fixture.venueName)}</td><td><span class="badge badge-${fixture.status === "Completed" ? "active" : "moderator"}">${escapeHtml(fixture.status || "Scheduled")}</span></td>${staff ? `<td class="table-actions"><button class="btn btn-secondary btn-small" data-edit-fixture type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-fixture type="button">Delete</button>` : ""}</td>` : ""}</tr>`).join("") || `<tr><td colspan="${staff ? 5 : 4}" class="empty-state">No fixtures created.</td></tr>`;
  return `<div class="section-toolbar"><div><h2>Fixtures</h2><p>Schedule match fixtures from the teams formed for this Match Day.</p></div>${staff ? `<button class="btn btn-primary btn-small" id="add-fixture" type="button">+ Create Fixture</button>` : ""}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Fixture</th><th>Date & Time</th><th>Venue</th><th>Status</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function resultsView(state, staff) {
  const rows = state.fixtures.map((fixture) => `<tr data-id="${escapeHtml(fixture.id)}"><td><strong>${escapeHtml(fixture.homeTeamName)}</strong> vs <strong>${escapeHtml(fixture.awayTeamName)}</strong></td><td class="score-cell">${fixture.homeScore == null ? "Pending" : `${fixture.homeScore} - ${fixture.awayScore}`}</td><td>${fixture.manOfTheMatchId ? escapeHtml(nameFor(fixture.manOfTheMatchId, state.players)) : "-"}</td><td>${(fixture.goals || []).map((goal) => escapeHtml(nameFor(goal.scorerId, state.players))).join(", ") || "-"}</td>${staff ? `<td><button class="btn btn-secondary btn-small" data-edit-result type="button">${fixture.homeScore == null ? "Add Result" : "Update Result"}</button></td>` : ""}</tr>`).join("") || `<tr><td colspan="${staff ? 5 : 4}" class="empty-state">Create fixtures before recording results.</td></tr>`;
  return `<div class="section-toolbar"><div><h2>Results</h2><p>Record fixture scores, scorers, cards, and Man of the Match.</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Fixture</th><th>Score</th><th>Man of the Match</th><th>Scorers</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function teamForm(team, roster, unavailable) {
  return `<div class="modal-header"><h2>${team.id ? "Edit Team" : "Create Team"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="match-team-form"><label class="form-field"><span>Team Name</span><input name="name" value="${escapeHtml(team.name || "")}" required /></label><fieldset class="selection-fieldset"><legend>Confirmed Players</legend><div class="selection-grid">${playerChoices(roster, team.playerIds || [], unavailable)}</div></fieldset><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Team</button></div></form>`;
}

function fixtureForm(fixture, teams, match) {
  const options = (selectedId) => `<option value="">Select team</option>${teams.map((team) => `<option value="${escapeHtml(team.id)}" ${team.id === selectedId ? "selected" : ""}>${escapeHtml(team.name)}</option>`).join("")}`;
  return `<div class="modal-header"><h2>${fixture.id ? "Edit Fixture" : "Create Fixture"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="match-fixture-form"><div class="form-grid"><label class="form-field"><span>Home Team</span><select name="homeTeamId">${options(fixture.homeTeamId || "")}</select></label><label class="form-field"><span>Away Team</span><select name="awayTeamId">${options(fixture.awayTeamId || "")}</select></label><label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(fixture.date || match.date || "")}" required /></label><label class="form-field"><span>Start Time</span><input type="time" name="startTime" value="${escapeHtml(fixture.startTime || match.startTime || "")}" required /></label><label class="form-field form-field-wide"><span>Venue</span><input value="${escapeHtml(match.venueName || "Venue TBC")}" disabled /></label></div><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Fixture</button></div></form>`;
}

function resultForm(fixture, players) {
  const options = (selectedId, placeholder) => `<option value="">${placeholder}</option>${players.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("")}`;
  const goalRow = (goal = {}) => `<div class="goal-row"><select name="scorerId">${options(goal.scorerId || "", "Scorer")}</select><select name="assistId">${options(goal.assistId || "", "No assist")}</select><button class="icon-button" data-remove-goal type="button" aria-label="Remove goal">✕</button></div>`;
  const cardRow = (card = {}) => `<div class="card-row"><select name="cardPlayerId">${options(card.playerId || "", "Player")}</select><select name="cardType"><option value="yellow" ${card.type !== "red" ? "selected" : ""}>Yellow card</option><option value="red" ${card.type === "red" ? "selected" : ""}>Red card</option></select><button class="icon-button" data-remove-card type="button" aria-label="Remove card">✕</button></div>`;
  return `<div class="modal-header"><h2>Fixture Result</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="match-result-form"><div class="form-grid"><label class="form-field"><span>${escapeHtml(fixture.homeTeamName)} Score</span><input type="number" name="homeScore" min="0" value="${escapeHtml(fixture.homeScore ?? "")}" required /></label><label class="form-field"><span>${escapeHtml(fixture.awayTeamName)} Score</span><input type="number" name="awayScore" min="0" value="${escapeHtml(fixture.awayScore ?? "")}" required /></label><label class="form-field form-field-wide"><span>Man of the Match</span><select name="manOfTheMatchId">${options(fixture.manOfTheMatchId || "", "Select player")}</select></label></div><fieldset class="selection-fieldset"><legend>Goals</legend><div id="goal-rows">${(fixture.goals || []).map(goalRow).join("")}</div><button class="btn btn-secondary btn-small" id="add-goal" type="button">+ Add Goal</button></fieldset><fieldset class="selection-fieldset"><legend>Cards</legend><div id="card-rows">${(fixture.cards || []).map(cardRow).join("")}</div><button class="btn btn-secondary btn-small" id="add-card" type="button">+ Add Card</button></fieldset><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Result</button></div></form>`;
}

export async function renderMatchDayManagePage(container, { role }) {
  const matchId = matchIdFromHash();
  if (!matchId) return navigate("/match-days");
  const staff = staffRole(role);
  const canDelete = role === "admin";
  let state, tab = "overview";
  container.innerHTML = `<p class="empty-state">Loading Match Day workspace…</p>`;

  async function refresh() {
    try {
      const match = (await listMatchDays()).find((item) => item.id === matchId);
      if (!match) throw new Error("Match Day not found");
      const [players, responses, teams, fixtures] = await Promise.all([listPlayers(), listMatchResponses(matchId), listMatchDayTeams(matchId), listMatchDayFixtures(matchId)]);
      const rosterIds = new Set(responses.filter((response) => response.response === "in" && response.playerId).map((response) => response.playerId));
      const roster = rosterIds.size ? players.filter((player) => rosterIds.has(player.id)) : players.filter((player) => player.status !== "inactive");
      state = { match, players, responses, roster, teams, fixtures };
      render();
    } catch (error) {
      container.innerHTML = `<div class="tournament-empty"><h2>Match Day unavailable</h2><p>It may have been removed or you may not have access.</p><a class="btn btn-secondary" href="#/match-days">Back to Match Days</a></div>`;
      console.error("Unable to load Match Day workspace", error);
    }
  }

  function render() {
    const content = tab === "teams" ? teamsView(state, staff, canDelete) : tab === "fixtures" ? fixturesView(state, staff, canDelete) : tab === "result" ? resultsView(state, staff) : overview(state);
    container.innerHTML = `${detailHeader(state.match, staff, canDelete)}<div class="tabs tournament-tabs">${["overview", "teams", "fixtures", "result"].map((name) => `<button class="tab-button ${tab === name ? "active" : ""}" data-tab="${name}" type="button">${name[0].toUpperCase() + name.slice(1)}</button>`).join("")}</div><div class="tournament-workspace">${content}</div>`;
    wire();
  }

  function openTeam(team = {}) {
    const unavailable = new Set(state.teams.filter((item) => item.id !== team.id).flatMap((item) => item.playerIds || []));
    const overlay = showModal(teamForm(team, state.roster, unavailable));
    overlay.querySelector("#match-team-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get("name") || "").trim();
      const playerIds = selected(event.currentTarget, "playerIds");
      if (!name || !playerIds.length) return showError(overlay, "Team name and at least one confirmed player are required.");
      try { if (team.id) await updateMatchDayTeam(matchId, team.id, { name, playerIds }); else await addMatchDayTeam(matchId, { name, playerIds }); closeModal(); await refresh(); } catch (error) { showError(overlay, "Unable to save team."); console.error(error); }
    });
  }

  async function openMatchEditor() {
    const venues = (await listVenues()).filter((venue) => venue.status !== "inactive");
    const overlay = showModal(matchEditForm(state.match, venues));
    overlay.querySelector("#workspace-match-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget), venueId = String(data.get("venueId") || ""), venue = venues.find((item) => item.id === venueId);
      const payload = { title: String(data.get("title") || "").trim(), date: String(data.get("date") || ""), startTime: String(data.get("startTime") || ""), endTime: String(data.get("endTime") || ""), venueId: venueId || null, venueName: venue?.name || "", venueAddress: venue?.address || "" };
      if (!payload.title || !payload.date || !payload.startTime) return showError(overlay, "Name, date, and start time are required.");
      try { await updateMatchDay(matchId, payload); closeModal(); await refresh(); } catch (error) { showError(overlay, "Unable to save Match Day."); console.error(error); }
    });
  }

  function openFixture(fixture = {}) {
    if (state.teams.length < 2) return window.alert("Create at least two teams before adding a fixture.");
    const overlay = showModal(fixtureForm(fixture, state.teams, state.match));
    overlay.querySelector("#match-fixture-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget), homeTeamId = String(data.get("homeTeamId") || ""), awayTeamId = String(data.get("awayTeamId") || "");
      const home = state.teams.find((team) => team.id === homeTeamId), away = state.teams.find((team) => team.id === awayTeamId);
      const payload = { homeTeamId, homeTeamName: home?.name || "", awayTeamId, awayTeamName: away?.name || "", date: String(data.get("date") || ""), startTime: String(data.get("startTime") || ""), venueName: state.match.venueName || "", venueId: state.match.venueId || "", status: fixture.status || "Scheduled" };
      if (!home || !away || homeTeamId === awayTeamId || !payload.date || !payload.startTime) return showError(overlay, "Choose two different teams and provide date and time.");
      try { if (fixture.id) await updateMatchDayFixture(matchId, fixture.id, payload); else await addMatchDayFixture(matchId, payload); closeModal(); await refresh(); } catch (error) { showError(overlay, "Unable to save fixture."); console.error(error); }
    });
  }

  function openResult(fixture) {
    const overlay = showModal(resultForm(fixture, state.roster));
    const form = overlay.querySelector("#match-result-form");
    const optionList = (placeholder) => `<option value="">${placeholder}</option>${state.roster.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.name)}</option>`).join("")}`;
    form.querySelector("#add-goal").addEventListener("click", () => form.querySelector("#goal-rows").insertAdjacentHTML("beforeend", `<div class="goal-row"><select name="scorerId">${optionList("Scorer")}</select><select name="assistId">${optionList("No assist")}</select><button class="icon-button" data-remove-goal type="button">✕</button></div>`));
    form.querySelector("#add-card").addEventListener("click", () => form.querySelector("#card-rows").insertAdjacentHTML("beforeend", `<div class="card-row"><select name="cardPlayerId">${optionList("Player")}</select><select name="cardType"><option value="yellow">Yellow card</option><option value="red">Red card</option></select><button class="icon-button" data-remove-card type="button">✕</button></div>`));
    form.querySelector("#goal-rows").addEventListener("click", (event) => event.target.closest("[data-remove-goal]")?.closest(".goal-row")?.remove());
    form.querySelector("#card-rows").addEventListener("click", (event) => event.target.closest("[data-remove-card]")?.closest(".card-row")?.remove());
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form), homeScore = Number(data.get("homeScore")), awayScore = Number(data.get("awayScore"));
      const scorerIds = Array.from(form.querySelectorAll("[name=scorerId]"), (input) => input.value), assistIds = Array.from(form.querySelectorAll("[name=assistId]"), (input) => input.value);
      const cardIds = Array.from(form.querySelectorAll("[name=cardPlayerId]"), (input) => input.value), cardTypes = Array.from(form.querySelectorAll("[name=cardType]"), (input) => input.value);
      if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) return showError(overlay, "Enter valid scores of zero or more.");
      try { await updateMatchDayFixture(matchId, fixture.id, { homeScore, awayScore, manOfTheMatchId: String(data.get("manOfTheMatchId") || ""), goals: scorerIds.map((scorerId, index) => ({ scorerId, assistId: assistIds[index] || "" })).filter((goal) => goal.scorerId), cards: cardIds.map((playerId, index) => ({ playerId, type: cardTypes[index] })).filter((card) => card.playerId), status: "Completed" }); closeModal(); await refresh(); } catch (error) { showError(overlay, "Unable to save result."); console.error(error); }
    });
  }

  function wire() {
    container.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { tab = button.dataset.tab; render(); }));
    container.querySelector("#edit-match")?.addEventListener("click", () => openMatchEditor().catch((error) => console.error("Unable to open Match Day editor", error)));
    container.querySelector("#add-team")?.addEventListener("click", () => openTeam());
    container.querySelector("#add-fixture")?.addEventListener("click", () => openFixture());
    container.querySelectorAll("[data-edit-team]").forEach((button) => button.addEventListener("click", () => openTeam(state.teams.find((team) => team.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-fixture]").forEach((button) => button.addEventListener("click", () => openFixture(state.fixtures.find((fixture) => fixture.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-result]").forEach((button) => button.addEventListener("click", () => openResult(state.fixtures.find((fixture) => fixture.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-delete-team]").forEach((button) => button.addEventListener("click", async () => { const team = state.teams.find((item) => item.id === button.closest("[data-id]").dataset.id); if (!state.fixtures.some((fixture) => fixture.homeTeamId === team.id || fixture.awayTeamId === team.id) && window.confirm(`Delete ${team.name}?`)) { await deleteMatchDayTeam(matchId, team.id); await refresh(); } }));
    container.querySelectorAll("[data-delete-fixture]").forEach((button) => button.addEventListener("click", async () => { const fixture = state.fixtures.find((item) => item.id === button.closest("[data-id]").dataset.id); if (window.confirm(`Delete ${fixture.homeTeamName} vs ${fixture.awayTeamName}?`)) { await deleteMatchDayFixture(matchId, fixture.id); await refresh(); } }));
    if (staff) {
      let draggedId = "";
      container.querySelectorAll("[data-player-id]").forEach((item) => item.addEventListener("dragstart", () => { draggedId = item.dataset.playerId; }));
      container.querySelectorAll(".team-drop-zone").forEach((zone) => {
        zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("drag-over"); });
        zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
        zone.addEventListener("drop", async (event) => { event.preventDefault(); zone.classList.remove("drag-over"); const targetId = zone.dataset.teamId, source = state.teams.find((team) => (team.playerIds || []).includes(draggedId)), target = state.teams.find((team) => team.id === targetId); if (!draggedId || source?.id === targetId) return; const updates = []; if (source) updates.push(updateMatchDayTeam(matchId, source.id, { playerIds: source.playerIds.filter((id) => id !== draggedId) })); if (target) updates.push(updateMatchDayTeam(matchId, target.id, { playerIds: [...(target.playerIds || []), draggedId] })); try { await Promise.all(updates); await refresh(); } catch (error) { console.error("Unable to move player", error); } });
      });
    }
  }
  await refresh();
}