import { addPlayer, deletePlayer, ensurePlayerProfile, listMatchDays, listMatchResponses, listPlayers, updatePlayer } from "../data.js";
import { escapeHtml, formatDate, friendlyAuthError } from "../utils.js";
import { changePassword, updateUserPreferences } from "../auth.js";
import { navigate } from "../router.js";

export const POSITION_OPTIONS = ["Unassigned", "Goalkeeper", "Defender", "Midfielder", "Forward"];

function playerRow(player, isAdmin) {
  return `
    <tr data-id="${escapeHtml(player.id)}">
      <td>${escapeHtml(player.name)}</td>
      <td><strong class="rating-value">${player.rating == null ? "—" : Number(player.rating).toFixed(2)}</strong></td>
      <td>${escapeHtml(player.team || "—")}</td>
      <td>${escapeHtml(player.position || "—")}</td>
      <td>${escapeHtml(player.jerseyNumber ?? "—")}</td>
      <td>${escapeHtml(player.phone || "—")}</td>
      <td><span class="badge badge-${player.status === "inactive" ? "inactive" : "active"}">${player.status === "inactive" ? "Inactive" : "Active"}</span></td>
      ${isAdmin ? `
        <td class="table-actions">
          <button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>
          <button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button>
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

function photoUploadHtml(player) {
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

function wirePhotoUpload(form) {
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

function readPlayerForm(form) {
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
  setIfPresent("status", (v) => String(v || "active"));
  setIfPresent("photoUrl", (v) => String(v || ""));
  return payload;
}

function adminEditFieldsHtml(player) {
  return `
    <p class="photo-upload-hint" style="margin-bottom: 14px;">Editing <strong>${escapeHtml(player.name || "")}</strong> (${escapeHtml(player.email || "no email on file")})</p>
    <div class="form-grid">
      <label class="form-field">
        <span>Status</span>
        <select name="status">
          <option value="active" ${player.status !== "inactive" ? "selected" : ""}>Active</option>
          <option value="inactive" ${player.status === "inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </label>
      <label class="form-field">
        <span>Teams ID</span>
        <input type="text" name="teamsId" placeholder="Teams ID" value="${escapeHtml(player.teamsId || "")}" />
      </label>
    </div>
  `;
}

function playerFormHtml(player = {}) {
  return `
    <form class="inline-form" id="player-form">
      <input type="hidden" name="id" value="${escapeHtml(player.id || "")}" />
      ${adminEditFieldsHtml(player)}
      <p class="auth-error" id="player-form-error" role="alert" hidden></p>
      <div class="auth-actions">
        <button class="btn btn-primary" type="submit">Save changes</button>
        <button class="btn btn-secondary" id="player-form-cancel" type="button">Cancel</button>
      </div>
    </form>
  `;
}

export async function renderPlayersPage(container, { role }) {
  const isAdmin = role === "admin" || role === "moderator";
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Players</h1>
      ${isAdmin ? `<button class="btn btn-primary" id="add-player-button" type="button">+ Add player</button>` : ""}
    </div>
    <div id="player-form-slot"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Rating</th><th>Tournament team</th><th>Position</th><th>Jersey #</th><th>Phone</th><th>Status</th>
            ${isAdmin ? "<th>Actions</th>" : ""}
          </tr>
        </thead>
        <tbody id="players-tbody">
          <tr><td colspan="6" class="empty-state">Loading players…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("players-tbody");
  const formSlot = document.getElementById("player-form-slot");
  const colSpan = isAdmin ? 8 : 7;

  async function refresh() {
    try {
      const players = await listPlayers();
      tbody.innerHTML = players.length
        ? players.map((player) => playerRow(player, isAdmin)).join("")
        : `<tr><td colspan="${colSpan}" class="empty-state">No players yet.</td></tr>`;
      wireRowActions(players);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load players.</td></tr>`;
      console.error("Unable to load players", error);
    }
  }

  function wireRowActions(players) {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const player = players.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(player));
      row.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm(`Remove ${player.name}?`)) return;
        try {
          await deletePlayer(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete player", error);
        }
      });
    });
  }

  function closeForm() {
    formSlot.innerHTML = "";
  }

  function openForm(player) {
    formSlot.innerHTML = playerFormHtml(player || {});
    const form = document.getElementById("player-form");
    const errorEl = document.getElementById("player-form-error");
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

  if (isAdmin) {
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

const PROFILE_TABS = [
  { id: "edit", label: "✎ Edit Profile" },
  { id: "password", label: "🔒 Change Password" },
  { id: "matches", label: "◷ Match History" },
  { id: "goalkeeping", label: "🧤 Goalkeeping History" },
  { id: "captaincy", label: "🎖 Captaincy History" }
];

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
    try {
      mine = await ensurePlayerProfile({ ...profile, email, name: profile?.name || email });
    } catch (error) {
      root.innerHTML = `<p class="empty-state">Unable to load your profile.</p>`;
      console.error("Unable to create my player profile", error);
      return;
    }
  }

  const matchesPlayed = await countMatchesPlayed(uid).catch(() => 0);
  const goals = mine.goals || 0;
  const assists = mine.assists || 0;
  const staffPillHtml = role === "admin" ? `<span class="pill pill-outline">Admin</span> ` : role === "moderator" ? `<span class="pill pill-outline">Moderator</span> ` : "";

  root.innerHTML = `
    <div class="profile-banner">
      <img class="profile-banner-watermark" src="assets/club-logo.png" alt="" aria-hidden="true" />
      <div class="profile-avatar-wrap">
        <span class="profile-avatar" id="profile-banner-avatar">${mine.photoUrl ? `<img src="${escapeHtml(mine.photoUrl)}" alt="" />` : "◉"}</span>
        ${mine.status !== "inactive" ? `<span class="profile-online-dot" aria-hidden="true"></span>` : ""}
        <button class="profile-photo-button" id="profile-photo-button" type="button" title="Upload profile image" aria-label="Upload profile image">📷</button>
        <input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" hidden />
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
        ${profileDetailRow("✓", "Status", mine.status === "inactive" ? "Inactive" : "Active")}
        ${profileDetailRow("⛨", "Roles", `${staffPillHtml}<span class="pill pill-outline">Player</span>`)}
        <div class="profile-rating-block">
          <span class="stat-label">Performance Rating</span>
          <span><strong>${mine.rating == null ? "—" : Number(mine.rating).toFixed(1)}</strong> <span class="profile-stars">${starRatingHtml(mine.rating)}</span></span>
        </div>
        <div class="profile-disciplinary">
          <div class="yellow-cards"><strong>${mine.yellowCards || 0}</strong><span>Yellow Cards</span></div>
          <div class="red-cards"><strong>${mine.redCards || 0}</strong><span>Red Cards</span></div>
        </div>
      </div>
      <div class="profile-tabs-card">
        <div class="tabs" id="profile-tabs">
          ${PROFILE_TABS.map((tab, index) => `<button class="tab-button${index === 0 ? " active" : ""}" data-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}
        </div>
        <div id="profile-tab-content"></div>
      </div>
    </div>
  `;

  const tabButtons = Array.from(root.querySelectorAll("#profile-tabs .tab-button"));
  const tabContent = document.getElementById("profile-tab-content");
  const profilePhotoButton = document.getElementById("profile-photo-button");
  const profilePhotoInput = document.getElementById("profile-photo-input");
  const profilePhotoError = document.getElementById("profile-photo-error");
  profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());
  profilePhotoInput.addEventListener("change", () => {
    const file = profilePhotoInput.files && profilePhotoInput.files[0];
    if (!file) return;
    profilePhotoError.hidden = true;
    if (file.size > 700 * 1024) {
      profilePhotoError.textContent = "Please choose an image smaller than 700 KB.";
      profilePhotoError.hidden = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const photoUrl = String(reader.result || "");
      profilePhotoButton.disabled = true;
      try {
        await updatePlayer(mine.id, { photoUrl });
        mine.photoUrl = photoUrl;
        document.getElementById("profile-banner-avatar").innerHTML = `<img src="${escapeHtml(photoUrl)}" alt="" />`;
      } catch (error) {
        profilePhotoError.textContent = "Unable to upload your profile image. Please try again.";
        profilePhotoError.hidden = false;
        console.error("Unable to upload profile image", error);
      } finally {
        profilePhotoButton.disabled = false;
      }
    };
    reader.readAsDataURL(file);
  });

  function renderEditTab() {
    tabContent.innerHTML = `
      <form id="profile-edit-form">
        ${playerFieldsHtml(mine, { gridClass: "form-grid", includeAdminFields: false })}
        <p class="auth-error" id="profile-edit-error" role="alert" hidden></p>
        <p class="auth-error" id="profile-edit-success" role="status" hidden style="background: var(--success-soft); color: var(--success);"></p>
        <div class="form-actions-row" style="margin-top: 16px;">
          <button class="btn btn-success" type="submit">Save Changes</button>
        </div>
      </form>
      <div class="notification-row">
        <span class="profile-detail-icon" aria-hidden="true">♧</span>
        <div style="flex:1;">
          <strong>Email Notifications</strong>
          <p>Match day reminders, payment reminders and teams-announced emails. Turn off to stop receiving these.</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="notifications-toggle" ${mine.emailNotifications === false ? "" : "checked"} />
          <span class="toggle-switch-track" aria-hidden="true"></span>
        </label>
      </div>
    `;

    const form = document.getElementById("profile-edit-form");
    const errorEl = document.getElementById("profile-edit-error");
    const successEl = document.getElementById("profile-edit-success");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      successEl.hidden = true;
      const payload = readPlayerForm(form);
      if (!payload.name) {
        errorEl.textContent = "Name is required.";
        errorEl.hidden = false;
        return;
      }
      try {
        await updatePlayer(mine.id, payload);
        Object.assign(mine, payload);
        successEl.textContent = "Profile updated.";
        successEl.hidden = false;
      } catch (error) {
        errorEl.textContent = "Unable to save changes. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save profile", error);
      }
    });

    document.getElementById("notifications-toggle").addEventListener("change", async (event) => {
      const checked = event.currentTarget.checked;
      try {
        await updateUserPreferences(uid, { emailNotifications: checked });
      } catch (error) {
        console.error("Unable to save notification preference", error);
      }
    });
  }

  function renderPasswordTab() {
    tabContent.innerHTML = `
      <form id="password-form" class="form-grid">
        <p class="auth-error" id="password-error" role="alert" hidden></p>
        <p class="auth-error" id="password-success" role="status" hidden style="background: var(--success-soft); color: var(--success);"></p>
        <label class="form-field">
          <span>Current Password</span>
          <input type="password" name="currentPassword" autocomplete="current-password" required />
        </label>
        <label class="form-field">
          <span>New Password</span>
          <input type="password" name="newPassword" autocomplete="new-password" minlength="6" required />
        </label>
        <label class="form-field">
          <span>Confirm New Password</span>
          <input type="password" name="confirmPassword" autocomplete="new-password" minlength="6" required />
        </label>
        <div class="form-actions-row">
          <button class="btn btn-success" type="submit">Update Password</button>
        </div>
      </form>
    `;
    const form = document.getElementById("password-form");
    const errorEl = document.getElementById("password-error");
    const successEl = document.getElementById("password-success");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      successEl.hidden = true;
      const formData = new FormData(form);
      const currentPassword = String(formData.get("currentPassword") || "");
      const newPassword = String(formData.get("newPassword") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");
      if (newPassword !== confirmPassword) {
        errorEl.textContent = "New passwords do not match.";
        errorEl.hidden = false;
        return;
      }
      try {
        await changePassword({ currentPassword, newPassword });
        successEl.textContent = "Password updated.";
        successEl.hidden = false;
        form.reset();
      } catch (error) {
        errorEl.textContent = friendlyAuthError(error);
        errorEl.hidden = false;
      }
    });
  }

  async function renderMatchHistoryTab() {
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

  function renderEmptyTab(message) {
    tabContent.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
  }

  function activateTab(tabId) {
    tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
    if (tabId === "edit") renderEditTab();
    else if (tabId === "password") renderPasswordTab();
    else if (tabId === "matches") renderMatchHistoryTab();
    else if (tabId === "goalkeeping") renderEmptyTab("No goalkeeping history recorded yet.");
    else if (tabId === "captaincy") renderEmptyTab("No captaincy history recorded yet.");
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  activateTab("edit");
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
