import { escapeHtml } from "./utils.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "▦" },
  { path: "/rules", label: "Rule", icon: "▤" },
  { path: "/players", label: "Player", icon: "◍" },
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
          <span class="app-brand-mark" aria-hidden="true">⚽</span>
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
        <div class="app-content" id="page-content"></div>
      </main>
    </div>
  `;

  return document.getElementById("page-content");
}
