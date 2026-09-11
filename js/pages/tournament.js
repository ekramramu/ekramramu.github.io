import {
  addTournament, addTournamentBillPayment, addTournamentCollection, addTournamentFixture, addTournamentTeam,
  deleteTournament, deleteTournamentBillPayment, deleteTournamentCollection, deleteTournamentFixture, deleteTournamentTeam, getTournament, listPlayers,
  listTournamentBillPayments, listTournamentCollections, listTournamentFixtures, listTournaments, listTournamentTeams,
  listVenues, updateTournament, updateTournamentCollection, updateTournamentFixture,
  updateTournamentBillPayment, updateTournamentTeam
} from "../data.js";
import { closeModal, openModal } from "../modal.js";
import { navigate } from "../router.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils.js";

export const TOURNAMENT_STATUSES = ["Upcoming", "Registration/Open", "Team Formation", "Fixture Created", "Ongoing", "Completed", "Cancelled"];
const TOURNAMENT_FORMATS = ["League", "Knockout", "Group + Knockout", "Round Robin", "Friendly"];
const FIXTURE_STATUSES = ["Scheduled", "Ongoing", "Completed", "Cancelled"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Wallet", "Other"];

const staffRole = (role) => role === "admin" || role === "moderator";
const dateLabel = (value) => value ? formatDate(`${value}T00:00:00`) : "—";
const nameFor = (id, players) => players.find((item) => item.id === id)?.name || "Unknown player";
const selected = (form, name) => Array.from(form.querySelectorAll(`[name=${name}]:checked`), (input) => input.value);

function optionsHtml(items, selectedValue, placeholder = "") {
  return `${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ""}${items.map((item) => {
    const value = typeof item === "string" ? item : item.value;
    const label = typeof item === "string" ? item : item.label;
    return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("")}`;
}

function statusClass(status) {
  if (status === "Completed") return "active";
  if (status === "Cancelled") return "inactive";
  return "moderator";
}

function tournamentIdFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const pathId = hash.match(/^\/tournaments\/manage\/([^?]+)/)?.[1];
  return pathId ? decodeURIComponent(pathId) : new URLSearchParams(hash.split("?")[1] || "").get("id") || "";
}

function showModal(html) {
  const overlay = openModal(html);
  overlay.querySelector(".modal-card").classList.add("modal-card-wide");
  overlay.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  return overlay;
}

function showError(overlay, message) {
  const element = overlay.querySelector(".auth-error");
  element.textContent = message;
  element.hidden = false;
}

function playerChoices(players, selectedIds = [], disabledIds = new Set()) {
  if (!players.length) return `<p class="empty-state">No active players are available.</p>`;
  return players.map((player) => {
    const checked = selectedIds.includes(player.id);
    const disabled = disabledIds.has(player.id) && !checked;
    return `<label class="selection-option${disabled ? " disabled" : ""}">
      <input type="checkbox" name="playerIds" value="${escapeHtml(player.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.position || "Unassigned")}</small></span>
    </label>`;
  }).join("");
}

function tournamentForm(tournament, players, venues) {
  return `<div class="modal-header"><div><span class="eyebrow">Tournament setup</span><h2>${tournament.id ? "Edit Tournament" : "Create Tournament"}</h2></div><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div>
    <form id="tournament-form"><div class="form-grid">
      <label class="form-field form-field-wide"><span>Tournament Name</span><input name="name" value="${escapeHtml(tournament.name || "")}" placeholder="SDFC Championship 2026" required /></label>
      <label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(tournament.date || "")}" required /></label>
      <label class="form-field"><span>Start Time</span><input type="time" name="startTime" value="${escapeHtml(tournament.startTime || "09:00")}" required /></label>
      <label class="form-field form-field-wide"><span>Venue</span><select name="venueId" required>${optionsHtml(venues.map((venue) => ({ value: venue.id, label: venue.name })), tournament.venueId || "", "Select a venue")}</select></label>
      <label class="form-field"><span>Status</span><select name="status">${optionsHtml(TOURNAMENT_STATUSES, tournament.status || "Upcoming")}</select></label>
      <label class="form-field"><span>Format</span><select name="format">${optionsHtml(TOURNAMENT_FORMATS, tournament.format || "League")}</select></label>
      <label class="form-field form-field-wide"><span>Other Information</span><textarea name="notes" rows="3">${escapeHtml(tournament.notes || "")}</textarea></label>
    </div><fieldset class="selection-fieldset"><legend>Players <span>Select at least one</span></legend><div class="selection-grid">${playerChoices(players, tournament.playerIds || [])}</div></fieldset>
    <p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">${tournament.id ? "Save changes" : "Create Tournament"}</button></div></form>`;
}

async function openTournamentForm(tournament, onSaved) {
  let [players, venues] = await Promise.all([listPlayers(), listVenues()]);
  players = players.filter((player) => player.status !== "inactive");
  venues = venues.filter((venue) => venue.status !== "inactive");
  const overlay = showModal(tournamentForm(tournament, players, venues));
  const form = overlay.querySelector("#tournament-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    overlay.querySelector(".auth-error").hidden = true;
    const data = new FormData(form);
    const venueId = String(data.get("venueId") || "");
    const venue = venues.find((item) => item.id === venueId);
    const playerIds = selected(form, "playerIds");
    const payload = {
      name: String(data.get("name") || "").trim(), date: String(data.get("date") || ""),
      startTime: String(data.get("startTime") || ""), venueId, venueName: venue?.name || "",
      venueAddress: venue?.address || "", status: String(data.get("status") || "Upcoming"),
      format: String(data.get("format") || "League"), notes: String(data.get("notes") || "").trim(), playerIds
    };
    if (!payload.name || !payload.date || !payload.startTime || !venue) return showError(overlay, "Name, date, time, and venue are required.");
    if (!playerIds.length) return showError(overlay, "Select at least one tournament player.");
    try {
      if (tournament.id) {
        const [teams, collections] = await Promise.all([listTournamentTeams(tournament.id), listTournamentCollections(tournament.id)]);
        const referenced = new Set([...teams.flatMap((team) => team.playerIds || []), ...collections.map((item) => item.playerId)]);
        const blocked = (tournament.playerIds || []).find((id) => !playerIds.includes(id) && referenced.has(id));
        if (blocked) return showError(overlay, `${nameFor(blocked, players)} is assigned to a team or collection and cannot be removed.`);
        await updateTournament(tournament.id, payload);
      } else {
        await addTournament(payload);
      }
      closeModal();
      await onSaved();
    } catch (error) {
      showError(overlay, "Unable to save the tournament. Please try again.");
      console.error("Unable to save tournament", error);
    }
  });
}

async function withSummary(tournament) {
  const [teams, fixtures, collections, billPayments] = await Promise.all([
    listTournamentTeams(tournament.id), listTournamentFixtures(tournament.id), listTournamentCollections(tournament.id), listTournamentBillPayments(tournament.id)
  ]);
  return { ...tournament, teamCount: teams.length, fixtureCount: fixtures.length, total: collections.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), expenses: billPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) };
}

function tournamentCard(item, staff, canDelete) {
  return `<article class="tournament-list-card" data-id="${escapeHtml(item.id)}">
    <div class="tournament-card-date"><strong>${escapeHtml(String(item.date || "").slice(8, 10) || "—")}</strong><span>${escapeHtml(dateLabel(item.date).slice(3))}</span></div>
    <div class="tournament-card-body"><div class="tournament-card-title"><div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.startTime)} · ${escapeHtml(item.venueName)}</p></div><span class="badge badge-${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
      <div class="tournament-card-stats"><span><strong>${(item.playerIds || []).length}</strong> Players</span><span><strong>${item.teamCount}</strong> Teams</span><span><strong>${item.fixtureCount}</strong> Fixtures</span><span><strong>${formatCurrency(item.total)}</strong> Collected</span></div></div>
    <div class="tournament-card-actions"><a class="btn btn-primary btn-small" href="#/tournaments/manage/${encodeURIComponent(item.id)}">${staff ? "Manage" : "View"}</a>${staff ? `<button class="btn btn-secondary btn-small" data-edit type="button">Edit</button>` : ""}${canDelete ? `<button class="btn btn-danger btn-small" data-delete-tournament type="button">Delete</button>` : ""}</div>
  </article>`;
}

export async function renderTournamentListPage(container, { role }) {
  const staff = staffRole(role);
  const canDelete = role === "admin";
  container.innerHTML = `<div class="page-header"><div><span class="eyebrow">Competition control</span><h1 class="page-title">Tournaments</h1><p class="page-subtitle">Teams, fixtures, and tournament collections in one place.</p></div>${staff ? `<button class="btn btn-primary" id="create-tournament" type="button">+ Create Tournament</button>` : ""}</div><div class="tournament-list" id="tournament-list"><p class="empty-state">Loading tournaments…</p></div>`;
  const list = container.querySelector("#tournament-list");
  async function refresh() {
    try {
      const items = await Promise.all((await listTournaments()).map(withSummary));
      list.innerHTML = items.length ? items.map((item) => tournamentCard(item, staff, canDelete)).join("") : `<div class="tournament-empty"><h2>No tournaments yet</h2><p>${staff ? "Create the first tournament from the existing player and venue lists." : "Tournament information will appear here when staff creates it."}</p></div>`;
      list.querySelectorAll("[data-edit]").forEach((button) => {
        const item = items.find((candidate) => candidate.id === button.closest("[data-id]").dataset.id);
        button.addEventListener("click", () => openTournamentForm(item, refresh));
      });
      list.querySelectorAll("[data-delete-tournament]").forEach((button) => {
        const item = items.find((candidate) => candidate.id === button.closest("[data-id]").dataset.id);
        button.addEventListener("click", async () => {
          if (!window.confirm(`Delete ${item.name} and all of its teams, fixtures, collections, and bill payments?`)) return;
          await deleteTournament(item.id);
          await refresh();
        });
      });
    } catch (error) {
      list.innerHTML = `<p class="empty-state">Unable to load tournaments.</p>`;
      console.error("Unable to load tournaments", error);
    }
  }
  container.querySelector("#create-tournament")?.addEventListener("click", () => openTournamentForm({}, refresh));
  await refresh();
}

function detailHeader(tournament, staff, canDelete) {
  return `<div class="breadcrumb"><a href="#/tournaments">Tournaments</a><span>/</span><span class="breadcrumb-current">${escapeHtml(tournament.name)}</span></div>
    <div class="page-header"><div><span class="eyebrow">${escapeHtml(tournament.format)}</span><h1 class="page-title">${escapeHtml(tournament.name)}</h1><p class="page-subtitle">${dateLabel(tournament.date)}, ${escapeHtml(tournament.startTime)} · ${escapeHtml(tournament.venueName)}</p></div><div class="tournament-heading-actions"><span class="badge badge-${statusClass(tournament.status)}">${escapeHtml(tournament.status)}</span>${staff ? `<button class="btn btn-secondary btn-small" id="edit-tournament" type="button">Edit Tournament</button>` : ""}${canDelete ? `<button class="btn btn-danger btn-small" id="delete-tournament" type="button">Delete Tournament</button>` : ""}</div></div>`;
}

function overview(state) {
  const roster = (state.tournament.playerIds || []).map((id) => state.players.find((player) => player.id === id)).filter(Boolean);
  const total = state.collections.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const completedFixtures = state.fixtures.filter((fixture) => fixture.homeScore != null && fixture.awayScore != null);
  const scorerTotals = new Map();
  completedFixtures.forEach((fixture) => (fixture.goals || []).forEach((goal) => {
    scorerTotals.set(goal.scorerId, (scorerTotals.get(goal.scorerId) || 0) + 1);
  }));
  const topScorers = [...scorerTotals.entries()].filter(([, goals]) => goals === Math.max(...scorerTotals.values())).map(([playerId, goals]) => `${nameFor(playerId, state.players)} (${goals})`);
  const results = completedFixtures.map((fixture) => {
    const winner = fixture.homeScore === fixture.awayScore ? "Draw" : fixture.homeScore > fixture.awayScore ? fixture.homeTeamName : fixture.awayTeamName;
    const motm = fixture.manOfTheMatchId ? nameFor(fixture.manOfTheMatchId, state.players) : "Not selected";
    return `<li><strong>${escapeHtml(fixture.homeTeamName)} ${fixture.homeScore} - ${fixture.awayScore} ${fixture.awayTeamName}</strong><span>${escapeHtml(winner)}${fixture.homeScore === fixture.awayScore ? "" : " won"} · Man of the Match: ${escapeHtml(motm)}</span></li>`;
  }).join("");
  return `<div class="tournament-summary-grid"><div><span>Status</span><strong>${escapeHtml(state.tournament.status)}</strong></div><div><span>Players</span><strong>${roster.length}</strong></div><div><span>Teams</span><strong>${state.teams.length}</strong></div><div><span>Fixtures</span><strong>${state.fixtures.length}</strong></div><div><span>Collected</span><strong>${formatCurrency(total)}</strong></div></div>
    <div class="tournament-overview-grid"><section class="tournament-section"><h2>Tournament Information</h2><dl class="detail-list"><div><dt>Date & Time</dt><dd>${dateLabel(state.tournament.date)}, ${escapeHtml(state.tournament.startTime)}</dd></div><div><dt>Venue</dt><dd>${escapeHtml(state.tournament.venueName)}</dd></div><div><dt>Format</dt><dd>${escapeHtml(state.tournament.format)}</dd></div><div><dt>Other Information</dt><dd>${escapeHtml(state.tournament.notes || "No additional information.")}</dd></div></dl></section>
    <section class="tournament-section"><h2>Tournament Players</h2><div class="roster-chip-list">${roster.map((player) => `<span>${escapeHtml(player.name)}<small>${escapeHtml(player.position || "Unassigned")}</small></span>`).join("") || `<p class="empty-state">No selected players.</p>`}</div></section></div><section class="tournament-section"><h2>Results Summary</h2><div class="results-summary"><div><span>Completed Matches</span><strong>${completedFixtures.length}</strong></div><div><span>Top Scorer</span><strong>${escapeHtml(topScorers.join(", ") || "No goals recorded")}</strong></div></div><ul class="result-summary-list">${results || `<li class="drop-hint">No match results recorded yet.</li>`}</ul></section>`;
}

function teamsView(state, staff, canDelete) {
  const assignedIds = new Set(state.teams.flatMap((team) => team.playerIds || []));
  const unassigned = (state.tournament.playerIds || []).filter((playerId) => !assignedIds.has(playerId));
  const playerHtml = (playerId) => `<li class="team-player" ${staff ? `draggable="true" data-player-id="${escapeHtml(playerId)}"` : ""}>${escapeHtml(nameFor(playerId, state.players))}</li>`;
  const teamCard = (team) => `<article class="managed-team-card" data-id="${escapeHtml(team.id)}"><div><span class="eyebrow">Team</span><h3>${escapeHtml(team.name)}</h3></div><ul class="team-drop-zone" data-team-id="${escapeHtml(team.id)}">${(team.playerIds || []).map(playerHtml).join("") || `<li class="drop-hint">Drop players here</li>`}</ul>${staff ? `<div class="table-actions"><button class="btn btn-secondary btn-small" data-edit-team type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-team type="button">Delete</button>` : ""}</div>` : ""}</article>`;
  return `<div class="section-toolbar"><div><h2>Team Management</h2><p>${staff ? "Drag players between teams to change their assignment." : "Tournament players are assigned to one team each."}</p></div>${staff ? `<button class="btn btn-primary btn-small" id="add-team" type="button">+ Create Team</button>` : ""}</div><section class="unassigned-players"><div><span class="eyebrow">Available roster</span><h2>Unassigned Players</h2></div><ul class="team-drop-zone" data-team-id="">${unassigned.map(playerHtml).join("") || `<li class="drop-hint">All tournament players are assigned</li>`}</ul></section><div class="managed-team-grid">${state.teams.map(teamCard).join("") || `<div class="tournament-empty"><h2>No teams created</h2><p>Build teams from the tournament player list.</p></div>`}</div>`;
}

function scoreSummary(fixture) {
  if (fixture.homeScore == null || fixture.awayScore == null) return "Result pending";
  return `${fixture.homeScore} - ${fixture.awayScore}`;
}

function scoreView(state, staff) {
  const rows = state.fixtures.map((fixture) => {
    const motm = fixture.manOfTheMatchId ? nameFor(fixture.manOfTheMatchId, state.players) : "-";
    const goals = (fixture.goals || []).map((goal) => `${nameFor(goal.scorerId, state.players)}${goal.assistId ? ` (Assist: ${nameFor(goal.assistId, state.players)})` : ""}`).join("; ") || "-";
    const cards = (fixture.cards || []).map((card) => `${card.type === "red" ? "Red" : "Yellow"}: ${nameFor(card.playerId, state.players)}`).join("; ") || "-";
    return `<tr data-id="${escapeHtml(fixture.id)}"><td><strong>${escapeHtml(fixture.homeTeamName)}</strong> vs <strong>${escapeHtml(fixture.awayTeamName)}</strong></td><td class="score-cell">${escapeHtml(scoreSummary(fixture))}</td><td>${escapeHtml(motm)}</td><td>${escapeHtml(goals)}</td><td>${escapeHtml(cards)}</td><td>${escapeHtml(fixture.resultNotes || "-")}</td>${staff ? `<td><button class="btn btn-secondary btn-small" data-edit-result type="button">${fixture.homeScore == null ? "Add Result" : "Update Result"}</button></td>` : ""}</tr>`;
  }).join("") || `<tr><td colspan="${staff ? 7 : 6}" class="empty-state">Create fixtures before recording results.</td></tr>`;
  return `<div class="section-toolbar"><div><h2>Match Scores</h2><p>Fixture results, player of the match, scorers, assists, cards, and notes.</p></div></div><div class="table-wrap"><table class="data-table score-table"><thead><tr><th>Fixture</th><th>Result</th><th>Man of the Match</th><th>Scorers & Assists</th><th>Cards</th><th>Notes</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function fixturesView(state, staff, canDelete) {
  return `<div class="section-toolbar"><div><h2>Fixture Management</h2><p>Schedule tournament teams, times, and venues.</p></div>${staff ? `<button class="btn btn-primary btn-small" id="add-fixture" type="button">+ Create Fixture</button>` : ""}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Fixture</th><th>Date & Time</th><th>Venue</th><th>Status</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${state.fixtures.map((fixture) => `<tr data-id="${escapeHtml(fixture.id)}"><td><strong>${escapeHtml(fixture.homeTeamName)}</strong> vs <strong>${escapeHtml(fixture.awayTeamName)}</strong></td><td>${dateLabel(fixture.date)}, ${escapeHtml(fixture.startTime)}</td><td>${escapeHtml(fixture.venueName)}</td><td><span class="badge badge-${statusClass(fixture.status)}">${escapeHtml(fixture.status)}</span></td>${staff ? `<td class="table-actions"><button class="btn btn-secondary btn-small" data-edit-fixture type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-fixture type="button">Delete</button>` : ""}</td>` : ""}</tr>`).join("") || `<tr><td colspan="${staff ? 5 : 4}" class="empty-state">No fixtures created.</td></tr>`}</tbody></table></div>`;
}

function financeTotals(state) {
  const collections = state.collections.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const expenses = state.billPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const paidPlayerIds = new Set(state.collections.map((item) => item.playerId));
  const duePlayers = (state.tournament.playerIds || []).filter((playerId) => !paidPlayerIds.has(playerId)).length;
  return { collections, expenses, duePlayers, balance: collections - expenses };
}

function financeView(state, staff, canDelete) {
  const totals = financeTotals(state);
  const actions = staff ? `<div class="table-actions"><button class="btn btn-primary btn-small" id="add-collection" type="button">+ Add Collection</button><button class="btn btn-secondary btn-small" id="add-bill-payment" type="button">+ Add Bill Payment</button></div>` : "";
  const collectionRows = state.collections.map((item) => `<tr data-id="${escapeHtml(item.id)}"><td>${escapeHtml(item.payerName)}</td><td>${dateLabel(item.date)}</td><td>${escapeHtml(item.paymentMethod)}</td><td class="amount-cell">${formatCurrency(item.amount)}</td><td>${escapeHtml(item.notes || "—")}</td>${staff ? `<td class="table-actions"><button class="btn btn-secondary btn-small" data-edit-collection type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-collection type="button">Delete</button>` : ""}</td>` : ""}</tr>`).join("") || `<tr><td colspan="${staff ? 6 : 5}" class="empty-state">No tournament collections recorded.</td></tr>`;
  const billRows = state.billPayments.map((item) => `<tr data-id="${escapeHtml(item.id)}"><td>${escapeHtml(item.payeeName)}</td><td>${dateLabel(item.date)}</td><td>${escapeHtml(item.paymentMethod)}</td><td class="amount-cell">${formatCurrency(item.amount)}</td><td>${escapeHtml(item.notes || "—")}</td>${staff ? `<td class="table-actions"><button class="btn btn-secondary btn-small" data-edit-bill-payment type="button">Edit</button>${canDelete ? `<button class="btn btn-danger btn-small" data-delete-bill-payment type="button">Delete</button>` : ""}</td>` : ""}</tr>`).join("") || `<tr><td colspan="${staff ? 6 : 5}" class="empty-state">No tournament bill payments recorded.</td></tr>`;
  return `<div class="section-toolbar"><div><h2>Tournament Finance</h2><p>Collections, bill payments, and tournament balance.</p></div>${actions}</div><div class="tournament-summary-grid"><div><span>Total Collection</span><strong>${formatCurrency(totals.collections)}</strong></div><div><span>Total Expense</span><strong>${formatCurrency(totals.expenses)}</strong></div><div><span>Players Due</span><strong>${totals.duePlayers}</strong></div><div><span>Current Balance</span><strong>${formatCurrency(totals.balance)}</strong></div></div><section class="tournament-section"><h2>Collections</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Payer</th><th>Date</th><th>Method</th><th>Amount</th><th>Notes</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${collectionRows}</tbody></table></div></section><section class="tournament-section"><h2>Bill Payments</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Payee</th><th>Date</th><th>Method</th><th>Amount</th><th>Notes</th>${staff ? "<th>Actions</th>" : ""}</tr></thead><tbody>${billRows}</tbody></table></div></section>`;
}

function teamForm(team, players, unavailable) {
  return `<div class="modal-header"><h2>${team.id ? "Edit Team" : "Create Team"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="team-form"><label class="form-field"><span>Team Name</span><input name="name" value="${escapeHtml(team.name || "")}" required /></label><fieldset class="selection-fieldset"><legend>Players <span>Assigned players are unavailable</span></legend><div class="selection-grid">${playerChoices(players, team.playerIds || [], unavailable)}</div></fieldset><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Team</button></div></form>`;
}

function fixtureForm(fixture, teams, venues, tournament) {
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  return `<div class="modal-header"><h2>${fixture.id ? "Edit Fixture" : "Create Fixture"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="fixture-form"><div class="form-grid"><label class="form-field"><span>Home Team</span><select name="homeTeamId">${optionsHtml(teamOptions, fixture.homeTeamId || "", "Select team")}</select></label><label class="form-field"><span>Away Team</span><select name="awayTeamId">${optionsHtml(teamOptions, fixture.awayTeamId || "", "Select team")}</select></label><label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(fixture.date || tournament.date || "")}" /></label><label class="form-field"><span>Start Time</span><input type="time" name="startTime" value="${escapeHtml(fixture.startTime || tournament.startTime || "09:00")}" /></label><label class="form-field form-field-wide"><span>Venue</span><select name="venueId">${optionsHtml(venues.map((venue) => ({ value: venue.id, label: venue.name })), fixture.venueId || tournament.venueId || "", "Select venue")}</select></label><label class="form-field"><span>Status</span><select name="status">${optionsHtml(FIXTURE_STATUSES, fixture.status || "Scheduled")}</select></label><label class="form-field form-field-wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(fixture.notes || "")}</textarea></label></div><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Fixture</button></div></form>`;
}

function resultForm(fixture, players) {
  const playerOptions = players.map((player) => ({ value: player.id, label: player.name }));
  const goalRow = (goal = {}) => `<div class="goal-row"><select name="scorerId">${optionsHtml(playerOptions, goal.scorerId || "", "Scorer")}</select><select name="assistId">${optionsHtml(playerOptions, goal.assistId || "", "No assist")}</select><button class="icon-button" data-remove-goal type="button" aria-label="Remove goal">✕</button></div>`;
  const cardRow = (card = {}) => `<div class="card-row"><select name="cardPlayerId">${optionsHtml(playerOptions, card.playerId || "", "Player")}</select><select name="cardType">${optionsHtml([{ value: "yellow", label: "Yellow card" }, { value: "red", label: "Red card" }], card.type || "yellow")}</select><button class="icon-button" data-remove-card type="button" aria-label="Remove card">✕</button></div>`;
  return `<div class="modal-header"><div><span class="eyebrow">${escapeHtml(fixture.homeTeamName)} vs ${escapeHtml(fixture.awayTeamName)}</span><h2>Match Result</h2></div><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="result-form"><div class="form-grid"><label class="form-field"><span>${escapeHtml(fixture.homeTeamName)} Score</span><input type="number" name="homeScore" min="0" value="${escapeHtml(fixture.homeScore ?? "")}" required /></label><label class="form-field"><span>${escapeHtml(fixture.awayTeamName)} Score</span><input type="number" name="awayScore" min="0" value="${escapeHtml(fixture.awayScore ?? "")}" required /></label><label class="form-field form-field-wide"><span>Man of the Match</span><select name="manOfTheMatchId">${optionsHtml(playerOptions, fixture.manOfTheMatchId || "", "Select player")}</select></label><label class="form-field form-field-wide"><span>Match Notes</span><textarea name="resultNotes" rows="3">${escapeHtml(fixture.resultNotes || "")}</textarea></label></div><fieldset class="selection-fieldset"><legend>Goals <span>Add scorer and optional assist for each goal</span></legend><div id="goal-rows">${(fixture.goals || []).map(goalRow).join("")}</div><button class="btn btn-secondary btn-small" id="add-goal" type="button">+ Add Goal</button></fieldset><fieldset class="selection-fieldset"><legend>Cards <span>Record yellow and red cards</span></legend><div id="card-rows">${(fixture.cards || []).map(cardRow).join("")}</div><button class="btn btn-secondary btn-small" id="add-card" type="button">+ Add Card</button></fieldset><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Result</button></div></form>`;
}

function billPaymentForm(item) {
  return `<div class="modal-header"><h2>${item.id ? "Edit Bill Payment" : "Add Tournament Bill Payment"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="bill-payment-form"><div class="form-grid"><label class="form-field form-field-wide"><span>Payee</span><input name="payeeName" value="${escapeHtml(item.payeeName || "")}" required /></label><label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(item.date || new Date().toISOString().slice(0, 10))}" /></label><label class="form-field"><span>Amount</span><input type="number" name="amount" min="0.01" step="0.01" value="${escapeHtml(item.amount || "")}" /></label><label class="form-field form-field-wide"><span>Payment Method</span><select name="paymentMethod">${optionsHtml(PAYMENT_METHODS, item.paymentMethod || "Cash")}</select></label><label class="form-field form-field-wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(item.notes || "")}</textarea></label></div><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Bill Payment</button></div></form>`;
}

function collectionForm(item, players) {
  return `<div class="modal-header"><h2>${item.id ? "Edit Collection" : "Add Tournament Collection"}</h2><button class="icon-button" data-close-modal type="button" aria-label="Close">✕</button></div><form id="collection-form"><div class="form-grid"><label class="form-field form-field-wide"><span>Payer</span><select name="playerId">${optionsHtml(players.map((player) => ({ value: player.id, label: player.name })), item.playerId || "", "Select tournament player")}</select></label><label class="form-field"><span>Date</span><input type="date" name="date" value="${escapeHtml(item.date || new Date().toISOString().slice(0, 10))}" /></label><label class="form-field"><span>Amount</span><input type="number" name="amount" min="0.01" step="0.01" value="${escapeHtml(item.amount || "")}" /></label><label class="form-field form-field-wide"><span>Payment Method</span><select name="paymentMethod">${optionsHtml(PAYMENT_METHODS, item.paymentMethod || "Cash")}</select></label><label class="form-field form-field-wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(item.notes || "")}</textarea></label></div><p class="auth-error" role="alert" hidden></p><div class="auth-actions modal-actions"><button class="btn btn-secondary" data-close-modal type="button">Cancel</button><button class="btn btn-primary" type="submit">Save Collection</button></div></form>`;
}

export async function renderTournamentManagePage(container, { role }) {
  const id = tournamentIdFromHash();
  const staff = staffRole(role);
  const canDelete = role === "admin";
  if (!id) return navigate("/tournaments");
  let state;
  let tab = "overview";
  container.innerHTML = `<p class="empty-state">Loading tournament workspace…</p>`;

  async function refresh() {
    try {
      const [tournament, players, venues, teams, fixtures, collections, billPayments] = await Promise.all([getTournament(id), listPlayers(), listVenues(), listTournamentTeams(id), listTournamentFixtures(id), listTournamentCollections(id), listTournamentBillPayments(id)]);
      if (!tournament) throw new Error("Tournament not found");
      state = { tournament, players, venues, teams, fixtures, collections, billPayments };
      render();
    } catch (error) {
      container.innerHTML = `<div class="tournament-empty"><h2>Tournament unavailable</h2><p>It may have been removed or you may not have access.</p><a class="btn btn-secondary" href="#/tournaments">Back to Tournaments</a></div>`;
      console.error("Unable to load tournament", error);
    }
  }

  function render() {
    const content = tab === "teams" ? teamsView(state, staff, canDelete) : tab === "fixtures" ? fixturesView(state, staff, canDelete) : tab === "score" ? scoreView(state, staff) : tab === "finance" ? financeView(state, staff, canDelete) : overview(state);
    container.innerHTML = `${detailHeader(state.tournament, staff, canDelete)}<div class="tabs tournament-tabs">${["overview", "teams", "fixtures", "score", "finance"].map((name) => `<button class="tab-button ${tab === name ? "active" : ""}" data-tab="${name}" type="button">${name === "finance" ? "Tournament Finance" : name === "score" ? "Score" : name[0].toUpperCase() + name.slice(1)}</button>`).join("")}</div><div class="tournament-workspace">${content}</div>`;
    wire();
  }

  function openTeam(team = {}) {
    const players = state.players.filter((player) => player.status !== "inactive");
    const unavailable = new Set(state.teams.filter((item) => item.id !== team.id).flatMap((item) => item.playerIds || []));
    const overlay = showModal(teamForm(team, players, unavailable));
    const form = overlay.querySelector("#team-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = String(new FormData(form).get("name") || "").trim();
      const playerIds = selected(form, "playerIds");
      if (!name || !playerIds.length) return showError(overlay, "Team name and at least one player are required.");
      try {
        const tournamentPlayerIds = Array.from(new Set([...(state.tournament.playerIds || []), ...playerIds]));
        if (tournamentPlayerIds.length !== (state.tournament.playerIds || []).length) await updateTournament(id, { playerIds: tournamentPlayerIds });
        if (team.id) await updateTournamentTeam(id, team.id, { name, playerIds }); else await addTournamentTeam(id, { name, playerIds });
        closeModal();
        await refresh();
      }
      catch (error) { showError(overlay, "Unable to save the team."); console.error(error); }
    });
  }

  function openFixture(fixture = {}) {
    if (state.teams.length < 2) return window.alert("Create at least two teams before adding a fixture.");
    const venues = state.venues.filter((venue) => venue.status !== "inactive");
    const overlay = showModal(fixtureForm(fixture, state.teams, venues, state.tournament));
    const form = overlay.querySelector("#fixture-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form), homeTeamId = String(data.get("homeTeamId") || ""), awayTeamId = String(data.get("awayTeamId") || ""), venueId = String(data.get("venueId") || "");
      const home = state.teams.find((item) => item.id === homeTeamId), away = state.teams.find((item) => item.id === awayTeamId), venue = venues.find((item) => item.id === venueId);
      const payload = { homeTeamId, homeTeamName: home?.name || "", awayTeamId, awayTeamName: away?.name || "", date: String(data.get("date") || ""), startTime: String(data.get("startTime") || ""), venueId, venueName: venue?.name || "", status: String(data.get("status") || "Scheduled"), notes: String(data.get("notes") || "").trim() };
      if (!home || !away || homeTeamId === awayTeamId || !payload.date || !payload.startTime || !venue) return showError(overlay, "Choose two different teams and provide date, time, and venue.");
      try { if (fixture.id) await updateTournamentFixture(id, fixture.id, payload); else await addTournamentFixture(id, payload); closeModal(); await refresh(); }
      catch (error) { showError(overlay, "Unable to save the fixture."); console.error(error); }
    });
  }

  function openCollection(item = {}) {
    const players = (state.tournament.playerIds || []).map((playerId) => state.players.find((player) => player.id === playerId)).filter(Boolean);
    const overlay = showModal(collectionForm(item, players));
    const form = overlay.querySelector("#collection-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form), playerId = String(data.get("playerId") || ""), player = players.find((candidate) => candidate.id === playerId);
      const payload = { playerId, payerName: player?.name || "", date: String(data.get("date") || ""), amount: Number(data.get("amount")), paymentMethod: String(data.get("paymentMethod") || "Cash"), notes: String(data.get("notes") || "").trim() };
      if (!player || !payload.date || !Number.isFinite(payload.amount) || payload.amount <= 0) return showError(overlay, "Payer, date, and an amount greater than zero are required.");
      try { if (item.id) await updateTournamentCollection(id, item.id, payload); else await addTournamentCollection(id, payload); closeModal(); await refresh(); }
      catch (error) { showError(overlay, "Unable to save the collection."); console.error(error); }
    });
  }

  function openBillPayment(item = {}) {
    const overlay = showModal(billPaymentForm(item));
    const form = overlay.querySelector("#bill-payment-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = { payeeName: String(data.get("payeeName") || "").trim(), date: String(data.get("date") || ""), amount: Number(data.get("amount")), paymentMethod: String(data.get("paymentMethod") || "Cash"), notes: String(data.get("notes") || "").trim() };
      if (!payload.payeeName || !payload.date || !Number.isFinite(payload.amount) || payload.amount <= 0) return showError(overlay, "Payee, date, and an amount greater than zero are required.");
      try { if (item.id) await updateTournamentBillPayment(id, item.id, payload); else await addTournamentBillPayment(id, payload); closeModal(); await refresh(); }
      catch (error) { showError(overlay, "Unable to save the bill payment."); console.error(error); }
    });
  }

  function openResult(fixture) {
    const players = (state.tournament.playerIds || []).map((playerId) => state.players.find((player) => player.id === playerId)).filter(Boolean);
    const overlay = showModal(resultForm(fixture, players));
    const form = overlay.querySelector("#result-form");
    const addGoalRow = () => {
      const scorerOptions = optionsHtml(players.map((player) => ({ value: player.id, label: player.name })), "", "Scorer");
      const assistOptions = optionsHtml(players.map((player) => ({ value: player.id, label: player.name })), "", "No assist");
      form.querySelector("#goal-rows").insertAdjacentHTML("beforeend", `<div class="goal-row"><select name="scorerId">${scorerOptions}</select><select name="assistId">${assistOptions}</select><button class="icon-button" data-remove-goal type="button" aria-label="Remove goal">✕</button></div>`);
    };
    form.querySelector("#add-goal").addEventListener("click", addGoalRow);
    form.querySelector("#goal-rows").addEventListener("click", (event) => event.target.closest("[data-remove-goal]")?.closest(".goal-row")?.remove());
    form.querySelector("#add-card").addEventListener("click", () => {
      const playerOptions = optionsHtml(players.map((player) => ({ value: player.id, label: player.name })), "", "Player");
      const cardTypes = optionsHtml([{ value: "yellow", label: "Yellow card" }, { value: "red", label: "Red card" }], "yellow");
      form.querySelector("#card-rows").insertAdjacentHTML("beforeend", `<div class="card-row"><select name="cardPlayerId">${playerOptions}</select><select name="cardType">${cardTypes}</select><button class="icon-button" data-remove-card type="button" aria-label="Remove card">✕</button></div>`);
    });
    form.querySelector("#card-rows").addEventListener("click", (event) => event.target.closest("[data-remove-card]")?.closest(".card-row")?.remove());
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const homeScore = Number(data.get("homeScore")), awayScore = Number(data.get("awayScore"));
      const scorerIds = Array.from(form.querySelectorAll("[name=scorerId]"), (input) => input.value);
      const assistIds = Array.from(form.querySelectorAll("[name=assistId]"), (input) => input.value);
      const goals = scorerIds.map((scorerId, index) => ({ scorerId, assistId: assistIds[index] || "" })).filter((goal) => goal.scorerId);
      const cardPlayerIds = Array.from(form.querySelectorAll("[name=cardPlayerId]"), (input) => input.value);
      const cardTypes = Array.from(form.querySelectorAll("[name=cardType]"), (input) => input.value);
      const cards = cardPlayerIds.map((playerId, index) => ({ playerId, type: cardTypes[index] })).filter((card) => card.playerId);
      if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) return showError(overlay, "Enter valid scores of zero or more.");
      try { await updateTournamentFixture(id, fixture.id, { homeScore, awayScore, manOfTheMatchId: String(data.get("manOfTheMatchId") || ""), resultNotes: String(data.get("resultNotes") || "").trim(), goals, cards, status: "Completed" }); closeModal(); await refresh(); }
      catch (error) { showError(overlay, "Unable to save the result."); console.error(error); }
    });
  }

  function wire() {
    container.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { tab = button.dataset.tab; render(); }));
    container.querySelector("#edit-tournament")?.addEventListener("click", () => openTournamentForm(state.tournament, refresh));
    container.querySelector("#delete-tournament")?.addEventListener("click", async () => {
      if (!window.confirm(`Delete ${state.tournament.name} and all of its teams, fixtures, collections, and bill payments?`)) return;
      await deleteTournament(id);
      navigate("/tournaments");
    });
    container.querySelector("#add-team")?.addEventListener("click", () => openTeam());
    container.querySelector("#add-fixture")?.addEventListener("click", () => openFixture());
    container.querySelector("#add-collection")?.addEventListener("click", () => openCollection());
    container.querySelector("#add-bill-payment")?.addEventListener("click", () => openBillPayment());
    container.querySelectorAll("[data-edit-team]").forEach((button) => button.addEventListener("click", () => openTeam(state.teams.find((item) => item.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-fixture]").forEach((button) => button.addEventListener("click", () => openFixture(state.fixtures.find((item) => item.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-result]").forEach((button) => button.addEventListener("click", () => openResult(state.fixtures.find((item) => item.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-collection]").forEach((button) => button.addEventListener("click", () => openCollection(state.collections.find((item) => item.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-edit-bill-payment]").forEach((button) => button.addEventListener("click", () => openBillPayment(state.billPayments.find((item) => item.id === button.closest("[data-id]").dataset.id))));
    container.querySelectorAll("[data-delete-collection]").forEach((button) => button.addEventListener("click", async () => {
      const item = state.collections.find((collection) => collection.id === button.closest("[data-id]").dataset.id);
      if (window.confirm(`Delete the ${formatCurrency(item.amount)} collection from ${item.payerName}?`)) { await deleteTournamentCollection(id, item.id); await refresh(); }
    }));
    container.querySelectorAll("[data-delete-bill-payment]").forEach((button) => button.addEventListener("click", async () => {
      const item = state.billPayments.find((payment) => payment.id === button.closest("[data-id]").dataset.id);
      if (window.confirm(`Delete the ${formatCurrency(item.amount)} bill payment to ${item.payeeName}?`)) { await deleteTournamentBillPayment(id, item.id); await refresh(); }
    }));
    container.querySelectorAll("[data-delete-team]").forEach((button) => button.addEventListener("click", async () => {
      const team = state.teams.find((item) => item.id === button.closest("[data-id]").dataset.id);
      if (state.fixtures.some((fixture) => fixture.homeTeamId === team.id || fixture.awayTeamId === team.id)) return window.alert("Delete this team's fixtures before deleting the team.");
      if (window.confirm(`Delete ${team.name}?`)) { await deleteTournamentTeam(id, team.id); await refresh(); }
    }));
    container.querySelectorAll("[data-delete-fixture]").forEach((button) => button.addEventListener("click", async () => {
      const fixture = state.fixtures.find((item) => item.id === button.closest("[data-id]").dataset.id);
      if (window.confirm(`Delete ${fixture.homeTeamName} vs ${fixture.awayTeamName}?`)) { await deleteTournamentFixture(id, fixture.id); await refresh(); }
    }));
    if (staff) {
      let draggedPlayerId = "";
      container.querySelectorAll("[data-player-id]").forEach((player) => player.addEventListener("dragstart", () => { draggedPlayerId = player.dataset.playerId; }));
      container.querySelectorAll(".team-drop-zone").forEach((zone) => {
        zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("drag-over"); });
        zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
        zone.addEventListener("drop", async (event) => {
          event.preventDefault();
          zone.classList.remove("drag-over");
          const targetTeamId = zone.dataset.teamId;
          const sourceTeam = state.teams.find((team) => (team.playerIds || []).includes(draggedPlayerId));
          if (!draggedPlayerId || sourceTeam?.id === targetTeamId) return;
          const targetTeam = state.teams.find((team) => team.id === targetTeamId);
          try {
            const updates = [];
            if (sourceTeam) updates.push(updateTournamentTeam(id, sourceTeam.id, { playerIds: sourceTeam.playerIds.filter((playerId) => playerId !== draggedPlayerId) }));
            if (targetTeam) updates.push(updateTournamentTeam(id, targetTeam.id, { playerIds: [...(targetTeam.playerIds || []), draggedPlayerId] }));
            await Promise.all(updates);
            await refresh();
          } catch (error) { console.error("Unable to move player", error); }
        });
      });
    }
  }

  await refresh();
}