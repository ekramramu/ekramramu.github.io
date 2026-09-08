import { loginAccount, registerAccount, resendVerificationEmail, logoutAccount, refreshCurrentUser, requestPasswordReset } from "../auth.js";
import { addPlayer } from "../data.js";
import { positionOptionsHtml } from "./players.js";
import { escapeHtml, friendlyAuthError } from "../utils.js";

function authShell(title, subtitle, bodyHtml) {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-brand">
          <img class="auth-brand-mark" src="assets/club-logo.png" alt="" aria-hidden="true" />
          <span class="auth-brand-title">SDFC</span>
        </div>
        <h1 class="auth-title">${title}</h1>
        <p class="auth-subtitle">${subtitle}</p>
        ${bodyHtml}
      </div>
    </div>
  `;
}


export function renderLogin(appRoot) {
  appRoot.innerHTML = authShell(
    "Welcome back",
    "Sign in to access your club dashboard.",
    `
      <form id="login-form" class="auth-form" novalidate>
        <p class="auth-error" id="login-error" role="alert" hidden></p>
        <label class="form-field">
          <span>Email address</span>
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label class="form-field">
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <p class="auth-forgot"><a href="#/forgot-password">Forgot password?</a></p>
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      </form>
      <p class="auth-switch">Don't have an account? <a href="#/register">Register</a></p>
    `
  );

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    const formData = new FormData(form);
    try {
      await loginAccount({
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || "")
      });
      // onAuthStateChanged in app.js drives the redirect
    } catch (error) {
      errorEl.textContent = friendlyAuthError(error);
      errorEl.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
}

export function renderRegister(appRoot) {
  appRoot.innerHTML = authShell(
    "Create your account",
    "Register to join the club. You'll need to confirm your email before signing in.",
    `
      <form id="register-form" class="auth-form" novalidate>
        <p class="auth-error" id="register-error" role="alert" hidden></p>
        <label class="form-field">
          <span>Full name</span>
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label class="form-field">
          <span>Email address</span>
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label class="form-field">
          <span>Playing Position</span>
          <select name="position">${positionOptionsHtml()}</select>
        </label>
        <label class="form-field">
          <span>Mobile Number</span>
          <input type="tel" name="phone" autocomplete="tel" placeholder="e.g. 01XXXXXXXXX" />
        </label>
        <label class="form-field">
          <span>Jersey Number</span>
          <input type="number" name="jerseyNumber" min="0" placeholder="e.g. 7" />
        </label>
        <label class="form-field">
          <span>Password</span>
          <input type="password" name="password" autocomplete="new-password" minlength="6" required />
        </label>
        <label class="form-field">
          <span>Confirm password</span>
          <input type="password" name="confirmPassword" autocomplete="new-password" minlength="6" required />
        </label>
        <button class="btn btn-primary btn-block" type="submit">Create account</button>
      </form>
      <p class="auth-switch">Already have an account? <a href="#/login">Sign in</a></p>
    `
  );

  const form = document.getElementById("register-form");
  const errorEl = document.getElementById("register-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      errorEl.textContent = "Passwords do not match.";
      errorEl.hidden = false;
      return;
    }
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    try {
      await registerAccount({ name, email, password });
      try {
        await addPlayer({
          name,
          email,
          position: String(formData.get("position") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          jerseyNumber: formData.get("jerseyNumber") ? Number(formData.get("jerseyNumber")) : null,
          status: "active"
        });
      } catch (playerError) {
        // Non-fatal: the "Create my player profile" fallback on My Player Profile covers this.
        console.error("Unable to create linked player profile", playerError);
      }
      // onAuthStateChanged in app.js drives the redirect to the verify-notice screen
    } catch (error) {
      errorEl.textContent = friendlyAuthError(error);
      errorEl.hidden = false;
      submitButton.disabled = false;
    }
  });
}

export function renderVerifyNotice(appRoot, { email, onVerified }) {
  appRoot.innerHTML = authShell(
    "Confirm your email",
    "Almost there.",
    `
      <p class="auth-hint">
        We sent a confirmation link to <strong>${escapeHtml(email || "your email")}</strong>.
        Click the link, then come back here.
      </p>
      <p class="auth-error" id="verify-message" role="status" hidden></p>
      <div class="auth-actions">
        <button class="btn btn-primary btn-block" id="verify-refresh" type="button">I've confirmed, continue</button>
        <button class="btn btn-secondary btn-block" id="verify-resend" type="button">Resend email</button>
        <button class="btn btn-secondary btn-block" id="verify-logout" type="button">Log out</button>
      </div>
    `
  );

  const messageEl = document.getElementById("verify-message");

  document.getElementById("verify-refresh").addEventListener("click", async () => {
    messageEl.hidden = true;
    const user = await refreshCurrentUser();
    if (user && user.emailVerified) {
      onVerified();
    } else {
      messageEl.textContent = "Still not confirmed yet. Please check your inbox (and spam folder).";
      messageEl.hidden = false;
    }
  });

  document.getElementById("verify-resend").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await resendVerificationEmail();
      messageEl.textContent = "Confirmation email sent again.";
      messageEl.hidden = false;
    } catch (error) {
      messageEl.textContent = friendlyAuthError(error);
      messageEl.hidden = false;
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("verify-logout").addEventListener("click", async () => {
    await logoutAccount();
  });
}

function renderForgotPasswordForm(appRoot) {
  appRoot.innerHTML = authShell(
    "Forgot Password?",
    "Enter your email and we'll send you a link to reset it.",
    `
      <form id="forgot-form" class="auth-form" novalidate>
        <p class="auth-error" id="forgot-error" role="alert" hidden></p>
        <label class="form-field">
          <span>Email Address</span>
          <input type="email" name="email" autocomplete="email" placeholder="Enter your email address" required />
        </label>
        <button class="btn btn-primary btn-block" type="submit">Send Reset Link</button>
      </form>
      <p class="auth-switch"><a href="#/login">Back to Login</a></p>
    `
  );

  const form = document.getElementById("forgot-form");
  const errorEl = document.getElementById("forgot-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    const email = String(new FormData(form).get("email") || "").trim();
    try {
      await requestPasswordReset(email);
      renderForgotPasswordSent(appRoot, email);
    } catch (error) {
      if (error && error.code === "auth/user-not-found") {
        // Don't reveal whether an account exists for this email.
        renderForgotPasswordSent(appRoot, email);
        return;
      }
      errorEl.textContent = friendlyAuthError(error);
      errorEl.hidden = false;
      submitButton.disabled = false;
    }
  });
}

function renderForgotPasswordSent(appRoot, email) {
  appRoot.innerHTML = authShell(
    "Check your email",
    "",
    `
      <p class="auth-hint">If an account exists for <strong>${escapeHtml(email)}</strong>, a password reset link is on its way. The link expires in 1 hour.</p>
      <a class="btn btn-primary btn-block" href="#/login">Back to Login</a>
    `
  );
}

export function renderForgotPassword(appRoot) {
  renderForgotPasswordForm(appRoot);
}
