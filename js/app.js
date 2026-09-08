import { watchAuthState, getUserProfile, ensureUserProfile, logoutAccount, updateUserPreferences } from "./auth.js";
import { ensurePlayerProfile } from "./data.js";
import { renderShell } from "./layout.js";
import { renderLogin, renderRegister, renderVerifyNotice, renderForgotPassword } from "./pages/authPages.js";
import { needsProfileCompletion, renderCompleteProfilePage } from "./pages/completeProfile.js";
import { renderDashboardPage } from "./pages/dashboard.js";
import { renderRulesPage } from "./pages/rules.js";
import { renderPlayersPage, renderNewPlayerPage, renderMyProfilePage, renderMonthlyProfilePage } from "./pages/players.js";
import { renderFinancePage } from "./pages/finance.js";
import { renderTournamentPage } from "./pages/tournament.js";
import { renderMatchDaysPage } from "./pages/matchDays.js";
import { renderVenuesPage } from "./pages/venues.js";
import { renderSettingsPage } from "./pages/settings.js";
import { registerRoute, setNotFoundHandler, startRouter, navigate, getCurrentPath } from "./router.js";

const appRoot = document.querySelector("#app");
const ONBOARDING_PATH = "/complete-profile";
const PROTECTED_PATHS = ["/dashboard", ONBOARDING_PATH, "/rules", "/players", "/players/new", "/players/my-profile", "/players/monthly-profile", "/match-days", "/venues", "/tournament-2026", "/finance", "/settings"];

let authState = { status: "loading" };
let currentProfile = null;
let currentPlayer = null;
let onboardingRequired = false;

function renderCurrentView() {
  const path = getCurrentPath();

  if (authState.status === "loading") {
    return;
  }

  if (authState.status === "signed-out") {
    if (path === "/register") {
      renderRegister(appRoot);
    } else if (path === "/forgot-password") {
      renderForgotPassword(appRoot);
    } else {
      renderLogin(appRoot);
    }
    return;
  }

  if (authState.status === "unverified") {
    renderVerifyNotice(appRoot, {
      email: authState.user.email,
      onVerified: () => {
        authState = { status: "signed-in", user: authState.user };
        navigate("/dashboard");
      }
    });
    return;
  }

  if (onboardingRequired) {
    if (path !== ONBOARDING_PATH) {
      navigate(ONBOARDING_PATH);
      return;
    }
    renderCompleteProfilePage(appRoot, {
      profile: currentProfile,
      player: currentPlayer,
      email: authState.user.email,
      uid: authState.user.uid,
      onComplete: () => {
        onboardingRequired = false;
        navigate("/dashboard");
      }
    });
    return;
  }

  if (path === "/login" || path === "/register" || path === ONBOARDING_PATH || !PROTECTED_PATHS.includes(path)) {
    navigate("/dashboard");
    return;
  }

  const role = currentProfile?.role === "admin" ? "admin" : currentProfile?.role === "moderator" ? "moderator" : "player";
  const content = renderShell(appRoot, { activePath: path, profile: currentProfile, email: authState.user.email });
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => logoutAccount());
  }

  const pageContext = { profile: currentProfile, email: authState.user.email, role, uid: authState.user.uid };
  if (path === "/dashboard") {
    renderDashboardPage(content, pageContext);
  } else if (path === "/rules") {
    renderRulesPage(content);
  } else if (path === "/players") {
    renderPlayersPage(content, pageContext);
  } else if (path === "/players/new") {
    if (role !== "admin" && role !== "moderator") {
      navigate("/players");
      return;
    }
    renderNewPlayerPage(content, pageContext);
  } else if (path === "/players/my-profile") {
    renderMyProfilePage(content, pageContext);
  } else if (path === "/players/monthly-profile") {
    renderMonthlyProfilePage(content, pageContext);
  } else if (path === "/match-days") {
    renderMatchDaysPage(content, pageContext);
  } else if (path === "/venues") {
    renderVenuesPage(content, pageContext);
  } else if (path === "/tournament-2026") {
    renderTournamentPage(content);
  } else if (path === "/finance") {
    renderFinancePage(content, pageContext);
  } else if (path === "/settings") {
    renderSettingsPage(content, pageContext);
  }
}

[...PROTECTED_PATHS, "/login", "/register", "/forgot-password"].forEach((path) => registerRoute(path, renderCurrentView));
setNotFoundHandler(renderCurrentView);

watchAuthState(async (user) => {
  if (!user) {
    authState = { status: "signed-out" };
    currentProfile = null;
    currentPlayer = null;
    onboardingRequired = false;
    renderCurrentView();
    return;
  }
  if (!user.emailVerified) {
    authState = { status: "unverified", user };
    renderCurrentView();
    return;
  }
  authState = { status: "signed-in", user };
  try {
    await user.getIdToken(true);
  } catch (error) {
    console.error("Unable to refresh authentication", error);
  }
  try {
    currentProfile = await getUserProfile(user.uid);
    if (!currentProfile) {
      currentProfile = await ensureUserProfile(user);
    }
  } catch (error) {
    console.error("Unable to load user profile", error);
    currentProfile = null;
  }
  try {
    currentPlayer = await ensurePlayerProfile({
      ...currentProfile,
      email: user.email,
      name: currentProfile?.name || user.displayName
    });
  } catch (error) {
    console.error("Unable to link player profile", error);
    currentPlayer = null;
  }
  onboardingRequired = needsProfileCompletion(currentProfile, currentPlayer);
  if (!onboardingRequired && currentProfile && !currentProfile.profileCompleted) {
    // Back-fill the flag for accounts whose details were already on file.
    updateUserPreferences(user.uid, { profileCompleted: true }).catch((error) => {
      console.error("Unable to mark profile as complete", error);
    });
  }
  renderCurrentView();
});

startRouter();
