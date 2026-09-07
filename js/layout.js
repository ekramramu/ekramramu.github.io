import { escapeHtml } from "./utils.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "▦" },
  { path: "/rules", label: "Rule", icon: "▤" },
  { path: "/players", label: "Player", icon: "◍" },
  {
    label: "Match Management",
    icon: "◷",
    children: [
      { path: "/match-days", label: "Match Days" },
      { path: "/venues", label: "Venues" }
    ]
  },
  { path: "/tournament-2026", label: "Tournament 2026", icon: "★" },
  { path: "/finance", label: "Finance", icon: "৳" }
];

export function renderShell(appRoot, { activePath, profile, email }) {
  const navHtml = NAV_ITEMS.map((item) => {
    if (item.children) {
      const groupActive = item.children.some((child) => child.path === activePath);
      const childLinks = item.children.map((child) => `
        <a class="app-nav-link app-nav-sublink${activePath === child.path ? " active" : ""}" href="#${child.path}">
          <span>${child.label}</span>
        </a>
      `).join("");
      return `
        <div class="app-nav-group${groupActive ? " open" : ""}">
          <button class="app-nav-link app-nav-toggle${groupActive ? " active" : ""}" type="button">
            <span class="app-nav-icon" aria-hidden="true">${item.icon}</span>
            <span>${item.label}</span>
            <span class="app-nav-caret" aria-hidden="true">⌄</span>
          </button>
          <div class="app-nav-submenu">${childLinks}</div>
        </div>
      `;
    }
    return `
      <a class="app-nav-link${activePath === item.path ? " active" : ""}" href="#${item.path}">
        <span class="app-nav-icon" aria-hidden="true">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `;
  }).join("");

  const displayName = escapeHtml(profile?.name || email || "Member");
  const role = profile?.role === "admin" ? "Admin" : "Member";

  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="app-sidebar" id="app-sidebar">
        <div class="app-brand">
          <img class="app-brand-mark" src="assets/logo-mark.svg" alt="" aria-hidden="true" />
          <span class="app-brand-title">SDFC</span>
        </div>
        <nav class="app-nav">${navHtml}</nav>
        <div class="app-sidebar-footer">
          <div class="app-user">
            <span class="app-user-name">${displayName}</span>
            <span class="badge badge-${role.toLowerCase()}">${role}</span>
          </div>
          <button class="btn btn-secondary btn-block" id="logout-button" type="button">Log out</button>
        </div>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <button class="icon-button menu-button" type="button" aria-label="Toggle menu" title="Toggle menu" aria-expanded="true" aria-controls="app-sidebar">☰</button>
          <span class="topbar-mark" aria-hidden="true">◷</span>
          <label class="search-box">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search players, match days, venues..." aria-label="Search" />
          </label>
          <div class="topbar-actions">
            <button class="icon-button" type="button" aria-label="Toggle theme" title="Toggle theme">◐</button>
            <button class="icon-button notification-button" type="button" aria-label="Notifications" title="Notifications">♧<span>7</span></button>
            <div class="topbar-user"><span class="topbar-avatar" aria-hidden="true">◉</span><strong>${displayName}</strong><span aria-hidden="true">⌄</span></div>
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
  menuButton.addEventListener("click", () => {
    const collapsed = shell.classList.toggle("sidebar-collapsed");
    menuButton.setAttribute("aria-expanded", String(!collapsed));
  });

  return document.getElementById("page-content");
}
