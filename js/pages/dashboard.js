import {
  listFinanceBillPayments,
  listFinanceCollections,
  listMatchDays,
  listMatchResponses,
  listPlayers,
  listTransactions,
  normalizeLegacyBillPayments,
  normalizeLegacyCollections,
  setMatchResponse
} from "../data.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils.js";

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonthValue(monthValue, delta) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumAmount(records) {
  return records.reduce((total, record) => total + (Number(record.amount) || 0), 0);
}

async function loadFinanceSummary() {
  const [players, typedCollections, typedBillPayments, legacyTransactions] = await Promise.all([
    listPlayers(),
    listFinanceCollections(),
    listFinanceBillPayments(),
    listTransactions()
  ]);
  const collections = [...typedCollections, ...normalizeLegacyCollections(legacyTransactions)];
  const billPayments = [...typedBillPayments, ...normalizeLegacyBillPayments(legacyTransactions)];

  const totalCollections = sumAmount(collections);
  const totalExpenses = sumAmount(billPayments);

  const thisMonth = currentMonthValue();
  const lastMonth = shiftMonthValue(thisMonth, -1);
  const thisMonthCollections = collections.filter((record) => String(record.paymentMonth || "").slice(0, 7) === thisMonth);
  const lastMonthTotal = sumAmount(collections.filter((record) => String(record.paymentMonth || "").slice(0, 7) === lastMonth));
  const thisMonthTotal = sumAmount(thisMonthCollections);

  const activePlayers = players.filter((player) => player.status !== "inactive");
  const activePlayerIds = new Set(activePlayers.map((player) => player.id));
  const paidThisMonthIds = new Set(
    thisMonthCollections.filter((record) => activePlayerIds.has(record.playerId)).map((record) => record.playerId)
  );
  const dueThisMonth = Math.max(activePlayers.length - paidThisMonthIds.size, 0);

  return {
    playerCount: players.length,
    balance: totalCollections - totalExpenses,
    totalCollections,
    totalExpenses,
    thisMonthTotal,
    lastMonthTotal,
    activePlayerCount: activePlayers.length,
    dueThisMonth
  };
}

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
      <a class="btn btn-primary" href="#/tournaments">View tournaments</a>
    </div>
    <div class="dashboard-grid">
      <section class="balance-card">
        <div class="section-label"><span class="card-icon">▣</span> Account Balance</div>
        <p class="muted-copy">Overview of the club's current funds</p>
        <strong class="balance-value" id="dash-balance">—</strong>
        <p class="balance-change" id="dash-balance-change">—</p>
        <div class="balance-chart" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="account-row"><div><span class="stat-label">Role</span><strong>${role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Player"}</strong></div><a class="btn btn-secondary btn-small" href="#/finance/collections">See details</a></div>
        <div class="balance-actions"><a class="btn btn-primary" href="#/finance/collections">↓ Collection</a><a class="btn btn-secondary" href="#/finance/bill-payments">↑ Payment</a></div>
      </section>
      <section class="dashboard-side-stats">
        <div class="stat-card compact-stat"><span class="stat-label">Total Collection</span><strong class="stat-value" id="dash-collections">—</strong><span class="stat-accent positive">$</span></div>
        <div class="stat-card compact-stat"><span class="stat-label">Total Expense</span><strong class="stat-value" id="dash-expenses">—</strong><span class="stat-accent negative">−</span></div>
        <div class="stat-card compact-stat"><span class="stat-label">This Month Collection</span><strong class="stat-value" id="dash-month-collections">—</strong></div>
        <div class="stat-card compact-stat payment-due"><span class="stat-label">Due This Month</span><strong class="stat-value" id="dash-due-count">—</strong><span class="stat-note" id="dash-due-note">of 0 active players</span></div>
      </section>
      <div id="dashboard-match-slot">
        ${matchCardHtml(null, {})}
      </div>
    </div>
  `;

  let totalPlayers = 0;
  try {
    const summary = await loadFinanceSummary();
    totalPlayers = summary.playerCount;
    document.getElementById("dash-balance").textContent = formatCurrency(summary.balance);
    document.getElementById("dash-collections").textContent = formatCurrency(summary.totalCollections);
    document.getElementById("dash-expenses").textContent = formatCurrency(summary.totalExpenses);
    document.getElementById("dash-month-collections").textContent = formatCurrency(summary.thisMonthTotal);
    document.getElementById("dash-due-count").textContent = String(summary.dueThisMonth);
    document.getElementById("dash-due-note").textContent = `of ${summary.activePlayerCount} active players`;

    const changeLabel = document.getElementById("dash-balance-change");
    if (summary.lastMonthTotal > 0) {
      const percentChange = ((summary.thisMonthTotal - summary.lastMonthTotal) / summary.lastMonthTotal) * 100;
      changeLabel.textContent = `${percentChange >= 0 ? "↑" : "↓"} ${Math.abs(percentChange).toFixed(1)}% collections vs last month`;
    } else {
      changeLabel.textContent = summary.thisMonthTotal > 0 ? "↑ New collections this month" : "No collections last month";
    }
  } catch (error) {
    console.error("Unable to load dashboard summary", error);
  }

  try {
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
      matchSlot.innerHTML = matchCardHtml(upcoming, { totalPlayers, inCount, outCount, mine });
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
    console.error("Unable to load next match day", error);
  }
}
