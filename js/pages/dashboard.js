import { listPlayers, listTransactions, summarizeTransactions } from "../data.js";
import { escapeHtml, formatCurrency } from "../utils.js";

export async function renderDashboardPage(container, { profile, email, role }) {
  const displayName = escapeHtml(profile?.name || email || "there");
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Welcome, ${displayName}</h1>
    </div>
    <div class="card-grid" id="dashboard-cards">
      <div class="stat-card"><span class="stat-label">Account Balance</span><strong class="stat-value" id="dash-balance">—</strong></div>
      <div class="stat-card"><span class="stat-label">Total Players</span><strong class="stat-value" id="dash-players">—</strong></div>
      <div class="stat-card"><span class="stat-label">Total Collections</span><strong class="stat-value" id="dash-collections">—</strong></div>
      <div class="stat-card"><span class="stat-label">Total Expenses</span><strong class="stat-value" id="dash-expenses">—</strong></div>
    </div>
    <p class="empty-state">Role: ${role === "admin" ? "Admin" : "Member"}${role === "admin" ? " — you can manage Players and Finance." : ""}</p>
  `;

  try {
    const [players, transactions] = await Promise.all([listPlayers(), listTransactions()]);
    const summary = summarizeTransactions(transactions);
    document.getElementById("dash-balance").textContent = formatCurrency(summary.balance);
    document.getElementById("dash-players").textContent = String(players.length);
    document.getElementById("dash-collections").textContent = formatCurrency(summary.collections);
    document.getElementById("dash-expenses").textContent = formatCurrency(summary.expenses);
  } catch (error) {
    console.error("Unable to load dashboard summary", error);
  }
}
