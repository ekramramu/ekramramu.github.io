import { escapeHtml } from "./utils.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "assets/dashboard.png" },
  {
    label: "Match Management",
    icon: "assets/football-field.png",
    activePaths: ["/match-days/manage"],
    children: [
      { path: "/match-days", label: "Match Days" },
      { path: "/venues", label: "Venues" }
    ]
  },
  { path: "/tournaments", activePaths: ["/tournaments", "/tournaments/manage"], label: "Tournaments", icon: "assets/turnement.png" },
  {
    label: "Player",
    icon: "assets/player.png",
    activePaths: ["/players/detail"],
    children: [
      { path: "/players", label: "Player List" },
      { path: "/players/my-profile", label: "My Player Profile" },
      { path: "/players/monthly-profile", label: "Player Monthly Profile" }
    ]
  },
  {
    label: "Finance",
    icon: "assets/finence.png",
    children: [
      { path: "/finance/collections", label: "Collections (+)" },
      { path: "/finance/bill-payments", label: "Bill Payment (-)" }
    ]
  },
  { path: "/rules", label: "Rule", icon: "assets/rule.png" },
  { path: "/settings", label: "Settings", icon: "assets/settings.png" }
];

export function renderShell(appRoot, { activePath, profile, email }) {
  const navHtml = NAV_ITEMS.map((item) => {
    if (item.children) {
      const groupActive = item.children.some((child) => child.path === activePath) || (item.activePaths || []).includes(activePath);
      const childLinks = item.children.map((child) => `
        <a class="app-nav-link app-nav-sublink${activePath === child.path ? " active" : ""}" href="#${child.path}">
          <span>${child.label}</span>
        </a>
      `).join("");
      return `
        <div class="app-nav-group${groupActive ? " open" : ""}">
          <button class="app-nav-link app-nav-toggle${groupActive ? " active" : ""}" type="button">
            <img class="app-nav-icon" src="${item.icon}" alt="" aria-hidden="true" />
            <span>${item.label}</span>
            <span class="app-nav-caret" aria-hidden="true">⌄</span>
          </button>
          <div class="app-nav-submenu">${childLinks}</div>
        </div>
      `;
    }
    const itemActive = (item.activePaths || [item.path]).includes(activePath);
    return `
      <a class="app-nav-link${itemActive ? " active" : ""}" href="#${item.path}">
        <img class="app-nav-icon" src="${item.icon}" alt="" aria-hidden="true" />
        <span>${item.label}</span>
      </a>
    `;
  }).join("");

  const displayName = escapeHtml(profile?.name || email || "Member");
  const role = profile?.role === "admin" ? "Admin" : profile?.role === "moderator" ? "Moderator" : "Player";

  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="app-sidebar" id="app-sidebar">
        <a class="app-brand" href="#/dashboard" title="Go to Dashboard">
          <img class="app-brand-mark" src="assets/club-logo.png" alt="" aria-hidden="true" />
          <span class="app-brand-title">SDFC</span>
        </a>
        <nav class="app-nav">${navHtml}</nav>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <button class="icon-button menu-button" type="button" aria-label="Toggle menu" title="Toggle menu" aria-expanded="true" aria-controls="app-sidebar">☰</button>
          <div class="topbar-actions">
            <div class="topbar-account">
              <button class="topbar-user" id="account-menu-button" type="button" aria-expanded="false" aria-controls="account-menu">
                <span class="topbar-avatar" aria-hidden="true">◉</span>
                <strong>${displayName}</strong>
                <span class="topbar-user-caret" aria-hidden="true">⌄</span>
              </button>
              <div class="account-menu" id="account-menu" hidden>
                <div class="account-menu-identity">
                  <strong>${displayName}</strong>
                  <span>${escapeHtml(email || "")}</span>
                  <span class="badge badge-${role.toLowerCase()}">${role}</span>
                </div>
                <a href="#/settings">Edit profile</a>
                <button id="logout-button" type="button">Log out</button>
              </div>
            </div>
          </div>
        </header>
        <div class="app-content" id="page-content"></div>
      </main>
    </div>
  `;

  appRoot.querySelectorAll(".app-nav-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".app-nav-group").classList.toggle("open");
    });
  });

  const shell = appRoot.querySelector(".app-shell");
  const menuButton = appRoot.querySelector(".menu-button");
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  const setMobileMenu = (mobile) => {
    shell.classList.toggle("sidebar-collapsed", mobile);
    menuButton.setAttribute("aria-expanded", String(!mobile));
  };
  setMobileMenu(mobileQuery.matches);
  mobileQuery.addEventListener("change", (event) => setMobileMenu(event.matches));
  menuButton.addEventListener("click", () => {
    const collapsed = shell.classList.toggle("sidebar-collapsed");
    menuButton.setAttribute("aria-expanded", String(!collapsed));
  });

  appRoot.querySelectorAll(".app-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) setMobileMenu(true);
    });
  });

  const account = appRoot.querySelector(".topbar-account");
  const accountButton = appRoot.querySelector("#account-menu-button");
  const accountMenu = appRoot.querySelector("#account-menu");
  const closeAccountMenu = () => {
    accountMenu.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
  };
  accountButton.addEventListener("click", () => {
    const opening = accountMenu.hidden;
    accountMenu.hidden = !opening;
    accountButton.setAttribute("aria-expanded", String(opening));
  });
  appRoot.onclick = (event) => {
    if (!account.contains(event.target)) closeAccountMenu();
  };
  account.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAccountMenu();
      accountButton.focus();
    }
  });

  return document.getElementById("page-content");
}
