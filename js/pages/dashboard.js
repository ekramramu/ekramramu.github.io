import { listPlayers, listTransactions, summarizeTransactions, listMatchDays, listMatchResponses, setMatchResponse } from "../data.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils.js";

function matchCardHtml(match, { totalPlayers, inCount, outCount, mine }) {
  if (!match) {
    return `
      <section class="match-card">
        <div class="match-card-main">
          <span class="eyebrow">Next match day</span>
          <h2>No match day scheduled</h2>
          <p class="match-meta">Check back soon or ask an admin to add one.</p>
        </div>
        <div class="match-actions">
          <a class="btn btn-secondary btn-block" href="#/match-days">View match days</a>
        </div>
      </section>
    `;
  }
  const pendingCount = Math.max(totalPlayers - inCount - outCount, 0);
  const kickoff = new Date(`${match.date}T${match.startTime || "00:00"}`);
  const daysUntil = Math.ceil((kickoff.getTime() - Date.now()) / 86400000);
  const kickoffLabel = Number.isNaN(daysUntil)
    ? "—"
    : daysUntil > 0 ? `Starts in ${daysUntil} day${daysUntil === 1 ? "" : "s"}` : daysUntil === 0 ? "Today" : "Already played";

  return `
    <section class="match-card">
      <div class="match-card-main">
        <span class="eyebrow">Next match day</span>
        <h2>${escapeHtml(match.title || "Match day")} <span class="badge badge-active">Upcoming</span></h2>
        <p class="match-meta">◷ ${formatDate(match.date)}, ${escapeHtml(match.startTime || "—")}${match.endTime ? ` – ${escapeHtml(match.endTime)}` : ""} &nbsp; · &nbsp; ◉ ${escapeHtml(match.venueName || "Venue TBC")}</p>
        <div class="match-counts">
          <div><strong>${totalPlayers}</strong><span>Total</span></div>
          <div><strong>${inCount}</strong><span>Confirmed</span></div>
          <div><strong>${pendingCount}</strong><span>Pending</span></div>
          <div><strong>${outCount}</strong><span>Not joining</span></div>
        </div>
      </div>
      <div class="match-actions">
        <span class="stat-label">Kick-off</span>
        <strong>${kickoffLabel}</strong>
        <span class="stat-label">Are you participating?</span>
        <div class="rsvp-actions">
          <button class="btn btn-small ${mine?.response === "in" ? "btn-primary" : "btn-secondary"}" data-rsvp="in" type="button">✓ Yes, I'm in</button>
          <button class="btn btn-small ${mine?.response === "out" ? "btn-danger" : "btn-secondary"}" data-rsvp="out" type="button">✕ Can't make it</button>
        </div>
        <a class="btn btn-secondary btn-block" href="#/match-days">View match days</a>
      </div>
    </section>
  `;
}

export async function renderDashboardPage(container, { profile, email, role, uid }) {
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
        <div class="stat-card compact-stat"><span class="stat-label">Total Players</span><strong class="stat-value" id="dash-players">—</strong></div>
        <div class="stat-card compact-stat payment-due"><span class="stat-label">Role</span><strong class="stat-value">${role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Player"}</strong><span class="stat-note">${role === "admin" || role === "moderator" ? "You manage Players and Finance" : "View-only access"}</span></div>
      </section>
      <div id="dashboard-match-slot">
        ${matchCardHtml(null, {})}
      </div>
    </div>
  `;

  try {
    const [players, transactions] = await Promise.all([listPlayers(), listTransactions()]);
    const summary = summarizeTransactions(transactions);
    document.getElementById("dash-balance").textContent = formatCurrency(summary.balance);
    document.getElementById("dash-players").textContent = String(players.length);
    document.getElementById("dash-collections").textContent = formatCurrency(summary.collections);
    document.getElementById("dash-expenses").textContent = formatCurrency(summary.expenses);

    const matches = await listMatchDays();
    const now = Date.now();
    const upcoming = matches
      .filter((match) => new Date(`${match.date}T${match.endTime || match.startTime || "23:59"}`).getTime() >= now)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const matchSlot = document.getElementById("dashboard-match-slot");
    if (!upcoming) {
      matchSlot.innerHTML = matchCardHtml(null, {});
      return;
    }

    async function renderMatch() {
      const responses = await listMatchResponses(upcoming.id);
      const inCount = responses.filter((item) => item.response === "in").length;
      const outCount = responses.filter((item) => item.response === "out").length;
      const mine = responses.find((item) => item.id === uid);
      matchSlot.innerHTML = matchCardHtml(upcoming, { totalPlayers: players.length, inCount, outCount, mine });
      matchSlot.querySelectorAll("[data-rsvp]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await setMatchResponse(upcoming.id, uid, button.dataset.rsvp);
            await renderMatch();
          } catch (error) {
            console.error("Unable to save your response", error);
          }
        });
      });
    }
    await renderMatch();
  } catch (error) {
    console.error("Unable to load dashboard summary", error);
  }
}
