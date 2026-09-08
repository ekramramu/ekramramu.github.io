import { escapeHtml } from "../utils.js";

export function renderSettingsPage(container, { profile, email, role }) {
  const displayName = escapeHtml(profile?.name || email || "Member");

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>
    <div class="inline-form">
      <div class="form-grid">
        <label class="form-field">
          <span>Name</span>
          <input type="text" value="${displayName}" disabled />
        </label>
        <label class="form-field">
          <span>Email</span>
          <input type="text" value="${escapeHtml(email || "")}" disabled />
        </label>
        <label class="form-field">
          <span>Role</span>
          <input type="text" value="${role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Player"}" disabled />
        </label>
      </div>
      <p class="muted-copy">Account changes are managed by a club admin.</p>
    </div>
  `;
}
