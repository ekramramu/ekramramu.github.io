import { listPlayers, listTransactions, summarizeTransactions } from "../data.js";
import { escapeHtml, formatCurrency } from "../utils.js";

export async function renderDashboardPage(container, { profile, email, role }) {
  const displayName = escapeHtml(profile?.name || email || "there");
  container.innerHTML = `
    <div class="dashboard-intro">
      <div>
        <span class="eyebrow">Club overview</span>
        <h1 class="page-title">Welcome back, ${displayName}</h1>
        <p class="page-subtitle">Here is what is happening with the club.</p>
      </div>
      <a class="btn btn-primary" href="#/tournament-2026">View tournament</a>
    </div>
    <div class="dashboard-grid">
      <section class="balance-card">
        <div class="section-label"><span class="card-icon">▣</span> Account Balance</div>
        <p class="muted-copy">Overview of the club's current funds</p>
        <strong class="balance-value" id="dash-balance">—</strong>
        <p class="balance-change">↓ 21.2% collections vs last month</p>
        <div class="balance-chart" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="account-row"><div><span class="stat-label">Primary account</span><strong>City Bank ·••• •••• 6001</strong></div><a class="btn btn-secondary btn-small" href="#/finance">See details</a></div>
        <div class="balance-actions"><a class="btn btn-primary" href="#/finance">↓ Collection</a><a class="btn btn-secondary" href="#/finance">↑ Payment</a></div>
      </section>
      <section class="dashboard-side-stats">
        <div class="stat-card compact-stat"><span class="stat-label">Total Collections</span><strong class="stat-value" id="dash-collections">—</strong><span class="stat-accent positive">$</span></div>
        <div class="stat-card compact-stat"><span class="stat-label">Total Expenses</span><strong class="stat-value" id="dash-expenses">—</strong><span class="stat-accent negative">−</span></div>
        <div class="stat-card compact-stat"><span class="stat-label">This Month's Collections</span><strong class="stat-value">—</strong><span class="stat-note">September 2026</span></div>
        <div class="stat-card compact-stat payment-due"><span class="stat-label">Payment Due</span><strong class="stat-value">10</strong><span class="stat-note">players this month</span></div>
      </section>
      <section class="match-card">
        <div class="match-card-main">
          <span class="eyebrow">Next match day</span>
          <h2>Weekly Match · 26 September 2026 <span class="badge badge-active">Upcoming</span></h2>
          <p class="match-meta">◷ 26/09/2026, 06:00 pm – 07:30 pm &nbsp; · &nbsp; ◉ Club ground</p>
          <div class="match-counts"><div><strong>24</strong><span>Total</span></div><div><strong>4</strong><span>Teams</span></div><div><strong>6</strong><span>Players / team</span></div><div><strong>0</strong><span>Not joining</span></div></div>
        </div>
        <div class="match-actions"><span class="stat-label">Kick-off</span><strong>Starts in 19 days</strong><a class="btn btn-secondary btn-block" href="#/tournament-2026">View teams</a></div>
      </section>
    </div>
    <p class="empty-state dashboard-role">Role: ${role === "admin" ? "Admin" : "Member"}${role === "admin" ? " — you can manage Players and Finance." : ""}</p>
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
