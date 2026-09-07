import { loginAccount, registerAccount, resendVerificationEmail, logoutAccount, refreshCurrentUser } from "../auth.js";
import { escapeHtml, friendlyAuthError } from "../utils.js";

function authShell(title, subtitle, bodyHtml) {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="auth-brand-mark" aria-hidden="true">⚽</span>
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
    try {
      await registerAccount({
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        password
      });
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
