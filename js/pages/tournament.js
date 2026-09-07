import { DEFAULT_PLAYERS, TOURNAMENT_DATE, TOURNAMENT_TEAMS } from "../clubData.js";
import { escapeHtml } from "../utils.js";

function teamCard(team) {
  const players = DEFAULT_PLAYERS.filter((player) => player.team === team.name);
  return `
    <article class="team-card">
      <div class="team-card-header">
        <div>
          <span class="eyebrow">Team</span>
          <h2>${escapeHtml(team.name)}</h2>
        </div>
        <strong class="team-average">${team.average.toFixed(2)} <span>avg</span></strong>
      </div>
      <ol class="team-roster">
        ${players.map((player) => `
          <li>
            <span>${escapeHtml(player.name)}</span>
            <strong>${player.rating.toFixed(2)}</strong>
          </li>
        `).join("")}
      </ol>
    </article>
  `;
}

export function renderTournamentPage(container) {
  container.innerHTML = `
    <div class="page-header tournament-heading">
      <div>
        <span class="eyebrow">Upcoming tournament</span>
        <h1 class="page-title">Tournament 2026</h1>
        <p class="page-subtitle">Team line-ups and player ratings for ${TOURNAMENT_DATE}.</p>
      </div>
      <span class="date-chip">${TOURNAMENT_DATE}</span>
    </div>
    <section class="team-grid" aria-label="Tournament teams">
      ${TOURNAMENT_TEAMS.map(teamCard).join("")}
    </section>
  `;
}
