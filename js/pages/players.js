import { addPlayer, deletePlayer, listMatchDays, listMatchResponses, listPlayers, listTournamentFixtures, listTournamentTeams, listTournaments, listUserProfiles, revokePortalAccessByEmail, updatePlayer, updateUserRole } from "../data.js";
import { escapeHtml, formatDate, friendlyAuthError } from "../utils.js";
import { changePassword, updateUserPreferences } from "../auth.js";
import { navigate } from "../router.js";

export const POSITION_OPTIONS = ["Unassigned", "Goalkeeper", "Defender", "Midfielder", "Forward"];

function playerRow(player, canManage, canDelete, userProfile, canChangeRole) {
  return `
    <tr data-id="${escapeHtml(player.id)}">
      <td>${escapeHtml(player.name)}</td>
      <td><strong class="rating-value">${player.rating == null ? "—" : Number(player.rating).toFixed(2)}</strong></td>
      <td>${escapeHtml(player.team || "—")}</td>
      <td>${escapeHtml(player.position || "—")}</td>
      <td>${escapeHtml(player.jerseyNumber ?? "—")}</td>
      <td>${escapeHtml(player.phone || "—")}</td>
      <td><span class="badge badge-${player.status === "inactive" ? "inactive" : "active"}">${player.status === "inactive" ? "Inactive" : "Active"}</span></td>
      ${canManage ? `
        <td class="table-actions">
          <button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>
          ${canChangeRole && userProfile && !userProfile.disabled ? `<button class="btn btn-small btn-secondary" data-action="role" type="button">${userProfile.role === "moderator" ? "Remove moderator" : "Make moderator"}</button>` : ""}
          ${canDelete ? `<button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button>` : ""}
        </td>
      ` : ""}
    </tr>
  `;
}

export function positionOptionsHtml(selected) {
  return POSITION_OPTIONS.map((option) => {
    const value = option === "Unassigned" ? "" : option;
    const isSelected = (selected || "") === value;
    return `<option value="${escapeHtml(value)}" ${isSelected ? "selected" : ""}>${escapeHtml(option)}</option>`;
  }).join("");
}

export function photoUploadHtml(player) {
  return `
    <div class="photo-upload-row">
      <span class="photo-avatar" id="player-photo-avatar">
        ${player.photoUrl ? `<img src="${escapeHtml(player.photoUrl)}" alt="" />` : "◉"}
      </span>
      <div>
        <button class="btn btn-secondary btn-small" id="player-photo-button" type="button">📷 Upload Photo</button>
        <p class="photo-upload-hint">JPG, PNG or WebP · square image recommended</p>
      </div>
      <input type="file" id="player-photo-input" accept="image/jpeg,image/png,image/webp" hidden />
      <input type="hidden" name="photoUrl" value="${escapeHtml(player.photoUrl || "")}" />
    </div>
  `;
}

export function playerFieldsHtml(player, { gridClass = "form-grid", includeAdminFields = true } = {}) {
  return `
    <div class="${gridClass}">
      <label class="form-field">
        <span>Name</span>
        <input type="text" name="name" placeholder="Player's full name" value="${escapeHtml(player.name || "")}" required />
      </label>
      <label class="form-field">
        <span>Email</span>
        <input type="email" name="email" placeholder="Email address" value="${escapeHtml(player.email || "")}" />
      </label>
      <label class="form-field">
        <span>Mobile Number</span>
        <input type="tel" name="phone" placeholder="e.g. 01XXXXXXXXX" value="${escapeHtml(player.phone || "")}" />
      </label>
      <label class="form-field">
        <span>Playing Position</span>
        <select name="position">${positionOptionsHtml(player.position)}</select>
      </label>
      <label class="form-field">
        <span>Jersey Number</span>
        <input type="number" name="jerseyNumber" min="0" placeholder="e.g. 7" value="${escapeHtml(player.jerseyNumber ?? "")}" />
      </label>
      <label class="form-field">
        <span>Join Date</span>
        <input type="date" name="joinedAt" value="${escapeHtml(player.joinedAt || "")}" />
      </label>
      <label class="form-field">
        <span>Height (cm)</span>
        <input type="number" name="heightCm" min="1" value="${escapeHtml(player.heightCm ?? "")}" />
      </label>
      <label class="form-field">
        <span>Weight (kg)</span>
        <input type="number" name="weightKg" min="1" step="0.1" value="${escapeHtml(player.weightKg ?? "")}" />
      </label>
      <label class="form-field">
        <span>Fitness Status</span>
        <select name="fitnessStatus">
          ${["Fit", "Injured", "Recovering", "Unavailable"].map((status) => `<option value="${status}" ${player.fitnessStatus === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      ${includeAdminFields ? `
        <label class="form-field">
          <span>Teams ID</span>
          <input type="text" name="teamsId" placeholder="Teams ID" value="${escapeHtml(player.teamsId || "")}" />
        </label>
        <label class="form-field">
          <span>Status</span>
          <select name="status">
            <option value="active" ${player.status !== "inactive" ? "selected" : ""}>Active</option>
            <option value="inactive" ${player.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </label>
      ` : ""}
    </div>
  `;
}

export function wirePhotoUpload(form) {
  const button = form.querySelector("#player-photo-button");
  const input = form.querySelector("#player-photo-input");
  const avatar = form.querySelector("#player-photo-avatar");
  const hidden = form.querySelector("input[name=photoUrl]");
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      hidden.value = String(reader.result || "");
      avatar.innerHTML = `<img src="${escapeHtml(hidden.value)}" alt="" />`;
    };
    reader.readAsDataURL(file);
  });
}

export function readPlayerForm(form) {
  const formData = new FormData(form);
  const payload = {};
  const setIfPresent = (key, transform) => {
    if (!form.querySelector(`[name=${key}]`)) return;
    payload[key] = transform(formData.get(key));
  };
  setIfPresent("name", (v) => String(v || "").trim());
  setIfPresent("email", (v) => String(v || "").trim());
  setIfPresent("teamsId", (v) => String(v || "").trim());
  setIfPresent("phone", (v) => String(v || "").trim());
  setIfPresent("position", (v) => String(v || "").trim());
  setIfPresent("jerseyNumber", (v) => (v ? Number(v) : null));
  setIfPresent("joinedAt", (v) => String(v || ""));
  setIfPresent("heightCm", (v) => (v ? Number(v) : null));
  setIfPresent("weightKg", (v) => (v ? Number(v) : null));
  setIfPresent("fitnessStatus", (v) => String(v || "Fit"));
  setIfPresent("status", (v) => String(v || "active"));
  setIfPresent("photoUrl", (v) => String(v || ""));
  return payload;
}

function playerFormHtml(player = {}) {
  return `
    <form class="inline-form" id="player-form">
      <input type="hidden" name="id" value="${escapeHtml(player.id || "")}" />
      ${photoUploadHtml(player)}
      ${playerFieldsHtml(player)}
      <p class="auth-error" id="player-form-error" role="alert" hidden></p>
      <div class="auth-actions">
        <button class="btn btn-primary" type="submit">Save changes</button>
        <button class="btn btn-secondary" id="player-form-cancel" type="button">Cancel</button>
      </div>
    </form>
  `;
}

function playerCard(player, canManage, canDelete, userProfile, canChangeRole) {
  const photo = player.photoUrl ? `<img src="${escapeHtml(player.photoUrl)}" alt="" />` : `<span>${escapeHtml((player.name || "?").slice(0, 1))}</span>`;
  const joined = player.joinedAt ? timestampDate(player.joinedAt) : timestampDate(player.createdAt);
  return `<article class="player-directory-card" data-id="${escapeHtml(player.id)}" tabindex="0" role="link"><div class="player-directory-photo">${photo}</div><div class="player-directory-body"><h2>${escapeHtml(player.name)}</h2><p>${escapeHtml(player.position || "Unassigned")} · Jersey #${escapeHtml(player.jerseyNumber ?? "-")}</p><div><span class="badge badge-${player.status === "inactive" ? "inactive" : "active"}">${player.status === "inactive" ? "Inactive" : "Active"}</span><span class="player-card-rating">${player.rating == null ? "No rating" : `${Number(player.rating).toFixed(1)} rating`}</span></div><dl class="player-card-facts"><div><dt>Joined</dt><dd>${escapeHtml(joined ? formatDate(joined) : "Not recorded")}</dd></div><div><dt>Total Goals</dt><dd>${escapeHtml(player.goals ?? 0)}</dd></div></dl></div>${canManage ? `<div class="player-card-actions" onclick="event.stopPropagation()"><button class="btn btn-secondary btn-small" data-action="edit" type="button">Edit</button>${canChangeRole && userProfile && !userProfile.disabled ? `<button class="btn btn-secondary btn-small" data-action="role" type="button">${userProfile.role === "moderator" ? "Remove moderator" : "Make moderator"}</button>` : ""}${canDelete ? `<button class="btn btn-danger btn-small" data-action="delete" type="button">Delete</button>` : ""}</div>` : ""}</article>`;
}

function timestampDate(value) {
  return value?.toDate ? value.toDate() : value ? new Date(value) : null;
}

async function playerTournamentStats(player, allPlayers) {
  const tournaments = await listTournaments();
  const attended = tournaments.filter((tournament) => (tournament.playerIds || []).includes(player.id));
  const details = await Promise.all(attended.map(async (tournament) => {
    const [teams, fixtures] = await Promise.all([listTournamentTeams(tournament.id), listTournamentFixtures(tournament.id)]);
    return { tournament, team: teams.find((team) => (team.playerIds || []).includes(player.id)), fixtures };
  }));
  let goals = 0, assists = 0, wins = 0, losses = 0, draws = 0;
  const history = [];
  details.forEach(({ tournament, team, fixtures }) => {
    fixtures.forEach((fixture) => {
      (fixture.goals || []).forEach((goal) => { if (goal.scorerId === player.id) goals += 1; if (goal.assistId === player.id) assists += 1; });
      if (!team || fixture.homeScore == null || fixture.awayScore == null) return;
      const home = fixture.homeTeamId === team.id;
      const mine = home ? Number(fixture.homeScore) : Number(fixture.awayScore);
      const other = home ? Number(fixture.awayScore) : Number(fixture.homeScore);
      if (mine > other) wins += 1;
      else if (mine < other) losses += 1;
      else draws += 1;
      history.push({ tournament: tournament.name, fixture: `${fixture.homeTeamName} ${fixture.homeScore} - ${fixture.awayScore} ${fixture.awayTeamName}`, result: mine > other ? "Win" : mine < other ? "Loss" : "Draw", date: fixture.date });
    });
  });
  const matchDays = await listMatchDays();
  const matchDayResponses = await Promise.all(matchDays.map((match) => listMatchResponses(match.id)));
  matchDays.forEach((match, index) => {
    const response = matchDayResponses[index].find((item) => item.playerId === player.id && item.response === "in");
    const scored = (match.scorers || []).filter((scorer) => scorer.playerId === player.id).length;
    goals += scored;
    if (response) history.push({ tournament: "Club Match Day", fixture: `${match.title || "Match day"}${scored ? ` · ${scored} goal${scored === 1 ? "" : "s"}` : ""}`, result: match.result || "Result not recorded", date: match.date, venue: match.venueName || "-" });
  });
  const ranked = [...allPlayers].filter((item) => item.rating != null).sort((a, b) => Number(b.rating) - Number(a.rating));
  const rank = ranked.findIndex((item) => item.id === player.id) + 1;
  const percentile = rank ? Math.ceil((rank / ranked.length) * 100) : 0;
  return { attended: attended.length, goals: goals || Number(player.goals) || 0, assists: assists || Number(player.assists) || 0, wins, losses, draws, played: wins + losses + draws, history: history.sort((a, b) => new Date(b.date) - new Date(a.date)), rank, percentile };
}

function playerDetailsHtml(player, stats) {
  const joined = player.joinedAt ? timestampDate(player.joinedAt) : timestampDate(player.createdAt);
  const years = joined ? Math.max(0, new Date().getFullYear() - joined.getFullYear()) : null;
  const photo = player.photoUrl ? `<img src="${escapeHtml(player.photoUrl)}" alt="" />` : `<span>${escapeHtml((player.name || "?").slice(0, 1))}</span>`;
  const detail = (label, value) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
  return `<div class="player-detail-hero"><div class="player-detail-photo">${photo}</div><div><h1>${escapeHtml(player.name)}</h1><p>${escapeHtml(player.position || "Unassigned")} · Jersey #${escapeHtml(player.jerseyNumber ?? "-")}</p></div></div><div class="player-detail-grid">${detail("Joined Club", joined ? formatDate(joined) : "Not recorded")}${detail("Playing Years", years == null ? "Not recorded" : `${years} year${years === 1 ? "" : "s"}`)}${detail("Height", player.heightCm ? `${player.heightCm} cm` : "Not recorded")}${detail("Weight", player.weightKg ? `${player.weightKg} kg` : "Not recorded")}${detail("Fitness", player.fitnessStatus || "Not recorded")}${detail("Club Rating", player.rating == null ? "Not rated" : `${Number(player.rating).toFixed(1)} / 10`)}${detail("Rating Rank", stats.rank ? `Top ${stats.percentile}% (#${stats.rank})` : "Not ranked")}${detail("Tournaments", String(stats.attended))}${detail("Total Goals", String(stats.goals))}${detail("Total Assists", String(stats.assists))}</div><section class="player-record-summary"><h2>Match Record</h2><div><strong>${stats.played}</strong><span>Played</span></div><div><strong>${stats.wins}</strong><span>Wins</span></div><div><strong>${stats.losses}</strong><span>Losses</span></div><div><strong>${stats.draws}</strong><span>Draws</span></div></section><section class="player-game-history"><h2>Game History</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Competition</th><th>Match</th><th>Recorded Result</th><th>Minutes</th><th>Shots</th><th>Rating</th></tr></thead><tbody>${stats.history.map((game) => `<tr><td>${escapeHtml(game.tournament)}</td><td>${escapeHtml(game.fixture)}</td><td>${escapeHtml(game.result)}</td><td>-</td><td>-</td><td>-</td></tr>`).join("") || `<tr><td colspan="6" class="empty-state">No completed tournament matches or attended match days recorded.</td></tr>`}</tbody></table></div></section>`;
}

export async function renderPlayerDetailsPage(container) {
  const playerId = decodeURIComponent(window.location.hash.replace(/^#\/players\/detail\//, "").split("?")[0]);
  container.innerHTML = `<div class="breadcrumb"><a href="#/players">Players</a><span>/</span><span class="breadcrumb-current">Player Profile</span></div><div class="player-detail-page"><p class="empty-state">Loading player profile…</p></div>`;
  const page = container.querySelector(".player-detail-page");
  try {
    const players = await listPlayers();
    const player = players.find((item) => item.id === playerId);
    if (!player) throw new Error("Player not found");
    page.innerHTML = playerDetailsHtml(player, await playerTournamentStats(player, players));
  } catch (error) {
    page.innerHTML = `<div class="tournament-empty"><h2>Player profile unavailable</h2><p>This player may have been removed.</p><a class="btn btn-secondary" href="#/players">Back to Players</a></div>`;
    console.error("Unable to load player details", error);
  }
}

export async function renderPlayersPage(container, { role, email }) {
  const canManage = role === "admin" || role === "moderator";
  const canDelete = role === "admin";
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Players</h1>
      ${canManage ? `<button class="btn btn-primary" id="add-player-button" type="button">+ Add player</button>` : ""}
    </div>
    <div id="player-form-slot"></div>
    <p class="page-subtitle">Select a player to view their club profile, tournament record, and game history.</p>
    <div class="player-directory" id="player-directory"><p class="empty-state">Loading players…</p></div>
  `;

  const directory = document.getElementById("player-directory");
  const formSlot = document.getElementById("player-form-slot");

  async function refresh() {
    try {
      const [players, userProfiles] = await Promise.all([
        listPlayers(),
        role === "admin" ? listUserProfiles() : Promise.resolve([])
      ]);
      const profilesByEmail = new Map(userProfiles.map((item) => [(item.email || "").toLowerCase(), item]));
      directory.innerHTML = players.length
        ? players.map((player) => playerCard(
          player,
          canManage,
          canDelete && (player.email || "").toLowerCase() !== (email || "").toLowerCase(),
          profilesByEmail.get((player.email || "").toLowerCase()),
          role === "admin"
        )).join("")
        : `<p class="empty-state">No players yet.</p>`;
      wireRowActions(players, profilesByEmail);
    } catch (error) {
      directory.innerHTML = `<p class="empty-state">Unable to load players.</p>`;
      console.error("Unable to load players", error);
    }
  }

  function wireRowActions(players, profilesByEmail) {
    directory.querySelectorAll("[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const player = players.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(player));
      row.querySelector("[data-action=role]")?.addEventListener("click", async () => {
        const userProfile = profilesByEmail.get((player.email || "").toLowerCase());
        const role = userProfile.role === "moderator" ? "player" : "moderator";
        if (!window.confirm(`${role === "moderator" ? "Make" : "Remove"} ${player.name} ${role === "moderator" ? "a moderator" : "as moderator"}?`)) return;
        await updateUserRole(userProfile.id, role);
        await refresh();
      });
      row.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm(`Remove ${player.name}'s player profile and revoke their portal access? Their Firebase Authentication account must be deleted separately in Firebase Console.`)) return;
        try {
          await revokePortalAccessByEmail(player.email);
          await deletePlayer(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete player", error);
        }
      });
      const openDetails = () => navigate(`/players/detail/${encodeURIComponent(player.id)}`);
      row.addEventListener("click", openDetails);
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); } });
    });
  }

  function closeForm() {
    formSlot.innerHTML = "";
  }

  function openForm(player) {
    formSlot.innerHTML = playerFormHtml(player || {});
    const form = document.getElementById("player-form");
    const errorEl = document.getElementById("player-form-error");
    wirePhotoUpload(form);
    document.getElementById("player-form-cancel").addEventListener("click", closeForm);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const payload = readPlayerForm(form);
      try {
        await updatePlayer(id, payload);
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save player. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save player", error);
      }
    });
  }

  if (canManage) {
    document.getElementById("add-player-button").addEventListener("click", () => navigate("/players/new"));
  }

  await refresh();
}

export function renderNewPlayerPage(container) {
  container.innerHTML = `
    <div class="breadcrumb">
      <a href="#/dashboard">⌂ Home</a> <span>/</span> <a href="#/players">◍ Players</a> <span>/</span> <span class="breadcrumb-current">New Player</span>
    </div>
    <h1 class="page-title"><span class="page-title-icon" aria-hidden="true">◍</span>Create New Player</h1>
    <div class="form-panel">
      <div class="form-panel-heading">◍ Player Information</div>
      <form id="new-player-form">
        ${photoUploadHtml({})}
        ${playerFieldsHtml({}, { gridClass: "form-grid form-grid-3" })}
        <p class="auth-error" id="new-player-error" role="alert" hidden></p>
        <hr class="form-divider" />
        <div class="form-actions-row">
          <button class="btn btn-success" type="submit">Create</button>
          <button class="btn btn-secondary" id="new-player-reset" type="reset">Reset</button>
          <a class="btn btn-secondary" href="#/players">Cancel</a>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById("new-player-form");
  const errorEl = document.getElementById("new-player-error");
  wirePhotoUpload(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const payload = readPlayerForm(form);
    if (!payload.name) {
      errorEl.textContent = "Name is required.";
      errorEl.hidden = false;
      return;
    }
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
      await addPlayer(payload);
      navigate("/players");
    } catch (error) {
      errorEl.textContent = "Unable to create player. Please try again.";
      errorEl.hidden = false;
      console.error("Unable to create player", error);
    } finally {
      submitButton.disabled = false;
    }
  });
}

function starRatingHtml(rating) {
  const filled = Math.round((Number(rating) || 0) / 2);
  return Array.from({ length: 5 }, (_, index) => `<span class="${index < filled ? "" : "star-off"}">★</span>`).join("");
}

function profileDetailRow(icon, label, valueHtml) {
  return `
    <div class="profile-detail-row">
      <span class="profile-detail-icon" aria-hidden="true">${icon}</span>
      <div class="profile-detail-body">
        <span class="profile-detail-label">${escapeHtml(label)}</span>
        <span class="profile-detail-value">${valueHtml}</span>
      </div>
    </div>
  `;
}

async function countMatchesPlayed(uid) {
  const matches = await listMatchDays();
  const responses = await Promise.all(matches.map((match) => listMatchResponses(match.id)));
  return responses.reduce((total, list) => total + (list.some((item) => item.id === uid && item.response === "in") ? 1 : 0), 0);
}

export async function renderMyProfilePage(container, { email, uid, role, profile }) {
  container.innerHTML = `
    <div class="breadcrumb">
      <a href="#/dashboard">⌂ Home</a> <span>/</span> <span class="breadcrumb-current">My Player Profile</span>
    </div>
    <div id="my-profile-root"><p class="empty-state">Loading profile…</p></div>
  `;

  const root = document.getElementById("my-profile-root");
  let players;
  let mine;
  try {
    players = await listPlayers();
    mine = players.find((player) => (player.email || "").toLowerCase() === (email || "").toLowerCase());
  } catch (error) {
    root.innerHTML = `<p class="empty-state">Unable to load your profile.</p>`;
    console.error("Unable to load my player profile", error);
    return;
  }

  if (!mine) {
    const canManage = role === "admin" || role === "moderator";
    root.innerHTML = `
      <div class="empty-state">
        <h2>Player profile not found</h2>
        <p>${canManage ? "Create a new player record with your signed-in email address to restore this profile." : "Contact an administrator or moderator to add your player profile."}</p>
        ${canManage ? `<a class="btn btn-primary" href="#/players/new">Create my player profile</a>` : ""}
      </div>
    `;
    return;
  }

  const matchesPlayed = await countMatchesPlayed(uid).catch(() => 0);
  const goals = mine.goals || 0;
  const assists = mine.assists || 0;
  const joined = mine.joinedAt ? timestampDate(mine.joinedAt) : timestampDate(mine.createdAt);
  const playingYears = joined ? Math.max(0, new Date().getFullYear() - joined.getFullYear()) : null;
  const ratedPlayers = players.filter((player) => player.rating != null).sort((a, b) => Number(b.rating) - Number(a.rating));
  const ratingRank = ratedPlayers.findIndex((player) => player.id === mine.id) + 1;
  const ratingPercentile = ratingRank ? Math.ceil((ratingRank / ratedPlayers.length) * 100) : 0;
  const staffPillHtml = role === "admin" ? `<span class="pill pill-outline">Admin</span> ` : role === "moderator" ? `<span class="pill pill-outline">Moderator</span> ` : "";

  root.innerHTML = `
    <div class="profile-banner">
      <img class="profile-banner-watermark" src="assets/club-logo.png" alt="" aria-hidden="true" />
      <div class="profile-avatar-wrap">
        <span class="profile-avatar" id="profile-banner-avatar">${mine.photoUrl ? `<img src="${escapeHtml(mine.photoUrl)}" alt="" />` : "◉"}</span>
        ${mine.status !== "inactive" ? `<span class="profile-online-dot" aria-hidden="true"></span>` : ""}
      </div>
      <div class="profile-heading">
        <h1 class="profile-name">${escapeHtml(mine.name)}</h1>
        <p class="profile-email">${escapeHtml(email || "")}</p>
        <div class="profile-badges">
          <span class="pill pill-solid">${escapeHtml(mine.position || "Unassigned")}</span>
          ${staffPillHtml}
          <span class="pill pill-outline">Player</span>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat-chip stat-matches"><strong>${matchesPlayed}</strong><span>Matches</span></div>
        <div class="profile-stat-chip stat-goals"><strong>${goals}</strong><span>Goals</span></div>
        <div class="profile-stat-chip stat-assists"><strong>${assists}</strong><span>Assists</span></div>
        <div class="profile-stat-chip stat-ga"><strong>${goals + assists}</strong><span>G+A</span></div>
      </div>
    </div>
    <p class="auth-error profile-photo-error" id="profile-photo-error" role="alert" hidden></p>
    <div class="profile-layout">
      <div class="profile-details-card">
        <h2>Player Details</h2>
        ${profileDetailRow("✉", "Email", escapeHtml(mine.email || "—"))}
        ${profileDetailRow("☎", "Mobile", escapeHtml(mine.phone || "—"))}
        ${profileDetailRow("◍", "Teams", escapeHtml(mine.teamsId || "—"))}
        ${profileDetailRow("#", "Jersey Number", escapeHtml(mine.jerseyNumber ?? "—"))}
        ${profileDetailRow("⌚", "Joined Club", escapeHtml(joined ? formatDate(joined) : "Not recorded"))}
        ${profileDetailRow("◷", "Playing Years", escapeHtml(playingYears == null ? "Not recorded" : `${playingYears} year${playingYears === 1 ? "" : "s"}`))}
        ${profileDetailRow("↕", "Height", escapeHtml(mine.heightCm ? `${mine.heightCm} cm` : "Not recorded"))}
        ${profileDetailRow("◒", "Weight", escapeHtml(mine.weightKg ? `${mine.weightKg} kg` : "Not recorded"))}
        ${profileDetailRow("♥", "Fitness", escapeHtml(mine.fitnessStatus || "Not recorded"))}
        ${profileDetailRow("✓", "Status", mine.status === "inactive" ? "Inactive" : "Active")}
        ${profileDetailRow("⛨", "Roles", `${staffPillHtml}<span class="pill pill-outline">Player</span>`)}
        <div class="profile-rating-block">
          <span class="stat-label">Performance Rating</span>
          <span><strong>${mine.rating == null ? "—" : Number(mine.rating).toFixed(1)}</strong> <span class="profile-stars">${starRatingHtml(mine.rating)}</span></span>
        </div>
        ${profileDetailRow("★", "Club Rating Rank", escapeHtml(ratingRank ? `Top ${ratingPercentile}% (#${ratingRank})` : "Not ranked"))}
        <div class="profile-disciplinary">
          <div class="yellow-cards"><strong>${mine.yellowCards || 0}</strong><span>Yellow Cards</span></div>
          <div class="red-cards"><strong>${mine.redCards || 0}</strong><span>Red Cards</span></div>
        </div>
      </div>
      <div class="profile-tabs-card"><h2>Match History</h2><div id="profile-tab-content"><p class="empty-state">Loading match history…</p></div></div>
    </div>
  `;

  const tabContent = document.getElementById("profile-tab-content");
  async function renderMatchHistory() {
    tabContent.innerHTML = `<p class="empty-state">Loading match history…</p>`;
    try {
      const matches = await listMatchDays();
      const responses = await Promise.all(matches.map((match) => listMatchResponses(match.id)));
      const played = matches
        .map((match, index) => ({ match, mine: responses[index].find((item) => item.id === uid) }))
        .filter((entry) => entry.mine?.response === "in")
        .sort((a, b) => new Date(b.match.date) - new Date(a.match.date));
      if (!played.length) {
        tabContent.innerHTML = `<p class="empty-state">No match history recorded yet.</p>`;
        return;
      }
      tabContent.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Match Day</th><th>Date</th><th>Venue</th></tr></thead>
            <tbody>
              ${played.map(({ match }) => `
                <tr>
                  <td>${escapeHtml(match.title || "Match day")}</td>
                  <td>${formatDate(match.date)}</td>
                  <td>${escapeHtml(match.venueName || "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      tabContent.innerHTML = `<p class="empty-state">Unable to load match history.</p>`;
      console.error("Unable to load match history", error);
    }
  }

  renderMatchHistory();
}


export async function renderMonthlyProfilePage(container, { uid }) {
  container.innerHTML = `
    <div class="breadcrumb">
      <a href="#/dashboard">⌂ Home</a> <span>/</span> <span class="breadcrumb-current">Player Monthly Profile</span>
    </div>
    <h1 class="page-title"><span class="page-title-icon" aria-hidden="true">◍</span>Player Monthly Profile</h1>
    <div class="form-panel" id="monthly-profile-panel">
      <p class="empty-state">Loading this month's activity…</p>
    </div>
  `;

  const panel = document.getElementById("monthly-profile-panel");
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  try {
    const matches = await listMatchDays();
    const monthMatches = matches.filter((match) => {
      const date = new Date(match.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });

    if (!monthMatches.length) {
      panel.innerHTML = `<p class="empty-state">No match days scheduled in ${escapeHtml(monthLabel)}.</p>`;
      return;
    }

    const responses = await Promise.all(monthMatches.map((match) => listMatchResponses(match.id)));
    let confirmed = 0;
    let notJoining = 0;
    const rows = monthMatches.map((match, index) => {
      const mine = responses[index].find((item) => item.id === uid);
      const status = mine?.response === "in" ? "Confirmed" : mine?.response === "out" ? "Not joining" : "Pending";
      if (mine?.response === "in") confirmed += 1;
      if (mine?.response === "out") notJoining += 1;
      return `
        <tr>
          <td>${escapeHtml(match.title || "Match day")}</td>
          <td>${formatDate(match.date)}</td>
          <td>${escapeHtml(match.venueName || "—")}</td>
          <td><span class="badge badge-${status === "Confirmed" ? "active" : status === "Not joining" ? "inactive" : "member"}">${status}</span></td>
        </tr>
      `;
    }).join("");

    panel.innerHTML = `
      <div class="card-grid">
        <div class="stat-card"><span class="stat-label">Month</span><span class="stat-value">${escapeHtml(monthLabel)}</span></div>
        <div class="stat-card"><span class="stat-label">Total match days</span><span class="stat-value">${monthMatches.length}</span></div>
        <div class="stat-card"><span class="stat-label">Confirmed</span><span class="stat-value">${confirmed}</span></div>
        <div class="stat-card"><span class="stat-label">Not joining</span><span class="stat-value">${notJoining}</span></div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Match Day</th><th>Date</th><th>Venue</th><th>My Response</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (error) {
    panel.innerHTML = `<p class="empty-state">Unable to load this month's activity.</p>`;
    console.error("Unable to load monthly player profile", error);
  }
}
