import { changePassword, updateUserPreferences } from "../auth.js";
import { listPlayers, updatePlayer } from "../data.js";
import { escapeHtml, friendlyAuthError } from "../utils.js";
import { photoUploadHtml, playerFieldsHtml, readPlayerForm, wirePhotoUpload } from "./players.js";

export async function renderSettingsPage(container, { profile, email, role, uid }) {
  container.innerHTML = `<div class="page-header"><h1 class="page-title">Settings</h1></div><div id="settings-content"><p class="empty-state">Loading settings…</p></div>`;
  const content = document.getElementById("settings-content");
  const player = (await listPlayers()).find((item) => (item.email || "").toLowerCase() === (email || "").toLowerCase());
  if (!player) {
    content.innerHTML = `<p class="empty-state">Your player profile is not available. Contact a club administrator or moderator.</p>`;
    return;
  }

  content.innerHTML = `<div class="form-panel"><div class="form-panel-heading">Player Profile</div><form id="settings-profile-form">${photoUploadHtml(player)}${playerFieldsHtml(player, { includeAdminFields: false })}<p class="auth-error" id="settings-profile-error" role="alert" hidden></p><p class="auth-error" id="settings-profile-success" role="status" hidden></p><div class="form-actions-row"><button class="btn btn-success" type="submit">Save Profile</button></div></form></div><div class="form-panel"><div class="form-panel-heading">Account</div><div class="form-grid"><label class="form-field"><span>Email</span><input value="${escapeHtml(email || "")}" disabled /></label><label class="form-field"><span>Role</span><input value="${role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Player"}" disabled /></label></div><form id="settings-password-form" class="form-grid"><label class="form-field"><span>Current Password</span><input type="password" name="currentPassword" autocomplete="current-password" required /></label><label class="form-field"><span>New Password</span><input type="password" name="newPassword" autocomplete="new-password" minlength="6" required /></label><label class="form-field"><span>Confirm New Password</span><input type="password" name="confirmPassword" autocomplete="new-password" minlength="6" required /></label><p class="auth-error" id="settings-password-error" role="alert" hidden></p><div class="form-actions-row"><button class="btn btn-success" type="submit">Update Password</button></div></form><label class="notification-row"><span class="profile-detail-icon" aria-hidden="true">♧</span><span style="flex:1;"><strong>Email Notifications</strong><small>Match day and payment reminders.</small></span><span class="toggle-switch"><input type="checkbox" id="notifications-toggle" ${profile?.emailNotifications === false ? "" : "checked"} /><span class="toggle-switch-track" aria-hidden="true"></span></span></label></div>`;
  const profileForm = document.getElementById("settings-profile-form");
  wirePhotoUpload(profileForm);
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = readPlayerForm(profileForm);
    const error = document.getElementById("settings-profile-error");
    const success = document.getElementById("settings-profile-success");
    try { await updatePlayer(player.id, payload); error.hidden = true; success.textContent = "Profile updated."; success.hidden = false; }
    catch (reason) { error.textContent = "Unable to save profile."; error.hidden = false; console.error(reason); }
  });
  document.getElementById("settings-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), error = document.getElementById("settings-password-error");
    const currentPassword = String(form.get("currentPassword") || ""), newPassword = String(form.get("newPassword") || ""), confirmPassword = String(form.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) { error.textContent = "New passwords do not match."; error.hidden = false; return; }
    try { await changePassword({ currentPassword, newPassword }); error.textContent = "Password updated."; error.hidden = false; event.currentTarget.reset(); }
    catch (reason) { error.textContent = friendlyAuthError(reason); error.hidden = false; }
  });
  document.getElementById("notifications-toggle").addEventListener("change", (event) => updateUserPreferences(uid, { emailNotifications: event.currentTarget.checked }).catch(console.error));
}
