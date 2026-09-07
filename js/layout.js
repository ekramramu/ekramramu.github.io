import { escapeHtml } from "./utils.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "▦" },
  { path: "/rules", label: "Rule", icon: "▤" },
  { path: "/players", label: "Player", icon: "◍" },
  { path: "/match-days", label: "Match Days", icon: "◷" },
  { path: "/tournament-2026", label: "Tournament 2026", icon: "★" },
  { path: "/finance", label: "Finance", icon: "৳" }
];

export function renderShell(appRoot, { activePath, profile, email }) {
  const navHtml = NAV_ITEMS.map((item) => `
    <a class="app-nav-link${activePath === item.path ? " active" : ""}" href="#${item.path}">
      <span class="app-nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join("");

  const displayName = escapeHtml(profile?.name || email || "Member");
  const role = profile?.role === "admin" ? "Admin" : "Member";

  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="app-sidebar">
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
          <button class="icon-button menu-button" type="button" aria-label="Toggle menu" title="Toggle menu">☰</button>
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

  return document.getElementById("page-content");
}
