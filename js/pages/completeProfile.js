import { changePassword, updateUserPreferences } from "../auth.js";
import { updatePlayer } from "../data.js";
import { escapeHtml, friendlyAuthError } from "../utils.js";
import { photoUploadHtml, playerFieldsHtml, readPlayerForm, wirePhotoUpload } from "./players.js";

// A player counts as onboarded once these are on file and the one-time form was submitted.
export function needsProfileCompletion(profile, player) {
  if (profile?.profileCompleted) return false;
  if (!player) return true;
  return !player.name || !player.phone || !player.position || player.jerseyNumber == null;
}

export function renderCompleteProfilePage(appRoot, { profile, player, email, uid, onComplete }) {
  const seed = { ...player, name: player?.name || profile?.name || "", email };

  appRoot.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card auth-card-wide">
        <div class="auth-brand">
          <img class="auth-brand-mark" src="assets/club-logo.png" alt="" aria-hidden="true" />
          <span class="auth-brand-title">SDFC</span>
        </div>
        <h1 class="auth-title">Complete your profile</h1>
        <p class="auth-subtitle">Signed in as <strong>${escapeHtml(email)}</strong>. Fill in your club details and set a new password to continue.</p>
        <form id="onboarding-form" class="auth-form" novalidate>
          <p class="auth-error" id="onboarding-error" role="alert" hidden></p>
          ${photoUploadHtml(seed)}
          ${playerFieldsHtml(seed, { includeAdminFields: false })}
          <h2 class="onboarding-section-title">Set a new password</h2>
          <div class="form-grid">
            <label class="form-field">
              <span>Current password</span>
              <input type="password" name="currentPassword" autocomplete="current-password" required />
            </label>
            <label class="form-field">
              <span>New password</span>
              <input type="password" name="newPassword" autocomplete="new-password" minlength="8" required />
            </label>
            <label class="form-field">
              <span>Confirm new password</span>
              <input type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required />
            </label>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Save and continue</button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById("onboarding-form");
  const errorEl = document.getElementById("onboarding-error");
  const submitButton = form.querySelector("button[type=submit]");
  wirePhotoUpload(form);

  const emailInput = form.querySelector("input[name=email]");
  if (emailInput) emailInput.readOnly = true;

  const fail = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
    submitButton.disabled = false;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    submitButton.disabled = true;

    const payload = readPlayerForm(form);
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!payload.name) return fail("Please enter your full name.");
    if (!payload.phone) return fail("Please enter your mobile number.");
    if (!payload.position) return fail("Please select your playing position.");
    if (payload.jerseyNumber == null) return fail("Please enter your jersey number.");
    if (!currentPassword) return fail("Please enter your current password.");
    if (newPassword.length < 8) return fail("Your new password must be at least 8 characters.");
    if (newPassword === currentPassword) return fail("Please choose a password different from your current one.");
    if (newPassword !== confirmPassword) return fail("The new passwords do not match.");

    try {
      // Password first: it's the step most likely to fail, so nothing else is half-applied.
      await changePassword({ currentPassword, newPassword });
      if (player?.id) {
        await updatePlayer(player.id, payload);
      }
      await updateUserPreferences(uid, { name: payload.name, profileCompleted: true });
      onComplete();
    } catch (error) {
      fail(friendlyAuthError(error));
    }
  });
}
