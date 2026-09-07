import { addPlayer, deletePlayer, listPlayers, updatePlayer } from "../data.js";
import { escapeHtml } from "../utils.js";

function playerRow(player, isAdmin) {
  return `
    <tr data-id="${escapeHtml(player.id)}">
      <td>${escapeHtml(player.name)}</td>
      <td><strong class="rating-value">${player.rating == null ? "—" : Number(player.rating).toFixed(2)}</strong></td>
      <td>${escapeHtml(player.team || "—")}</td>
      <td>${escapeHtml(player.position || "—")}</td>
      <td>${escapeHtml(player.jerseyNumber ?? "—")}</td>
      <td>${escapeHtml(player.phone || "—")}</td>
      <td><span class="badge badge-${player.status === "inactive" ? "inactive" : "active"}">${player.status === "inactive" ? "Inactive" : "Active"}</span></td>
      ${isAdmin ? `
        <td class="table-actions">
          <button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>
          <button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button>
        </td>
      ` : ""}
    </tr>
  `;
}

function playerFormHtml(player = {}) {
  return `
    <form class="inline-form" id="player-form">
      <input type="hidden" name="id" value="${escapeHtml(player.id || "")}" />
      <div class="form-grid">
        <label class="form-field">
          <span>Name</span>
          <input type="text" name="name" value="${escapeHtml(player.name || "")}" required />
        </label>
        <label class="form-field">
          <span>Position</span>
          <input type="text" name="position" value="${escapeHtml(player.position || "")}" />
        </label>
        <label class="form-field">
          <span>Jersey #</span>
          <input type="number" name="jerseyNumber" min="0" value="${escapeHtml(player.jerseyNumber ?? "")}" />
        </label>
        <label class="form-field">
          <span>Phone</span>
          <input type="tel" name="phone" value="${escapeHtml(player.phone || "")}" />
        </label>
        <label class="form-field">
          <span>Status</span>
          <select name="status">
            <option value="active" ${player.status !== "inactive" ? "selected" : ""}>Active</option>
            <option value="inactive" ${player.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </label>
      </div>
      <p class="auth-error" id="player-form-error" role="alert" hidden></p>
      <div class="auth-actions">
        <button class="btn btn-primary" type="submit">${player.id ? "Save changes" : "Add player"}</button>
        <button class="btn btn-secondary" id="player-form-cancel" type="button">Cancel</button>
      </div>
    </form>
  `;
}

export async function renderPlayersPage(container, { role }) {
  const isAdmin = role === "admin";
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Players</h1>
      ${isAdmin ? `<button class="btn btn-primary" id="add-player-button" type="button">+ Add player</button>` : ""}
    </div>
    <div id="player-form-slot"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Rating</th><th>Tournament team</th><th>Position</th><th>Jersey #</th><th>Phone</th><th>Status</th>
            ${isAdmin ? "<th>Actions</th>" : ""}
          </tr>
        </thead>
        <tbody id="players-tbody">
          <tr><td colspan="6" class="empty-state">Loading players…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("players-tbody");
  const formSlot = document.getElementById("player-form-slot");
  const colSpan = isAdmin ? 8 : 7;

  async function refresh() {
    try {
      const players = await listPlayers();
      tbody.innerHTML = players.length
        ? players.map((player) => playerRow(player, isAdmin)).join("")
        : `<tr><td colspan="${colSpan}" class="empty-state">No players yet.</td></tr>`;
      wireRowActions(players);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load players.</td></tr>`;
      console.error("Unable to load players", error);
    }
  }

  function wireRowActions(players) {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const player = players.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(player));
      row.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm(`Remove ${player.name}?`)) return;
        try {
          await deletePlayer(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete player", error);
        }
      });
    });
  }

  function closeForm() {
    formSlot.innerHTML = "";
  }

  function openForm(player) {
    formSlot.innerHTML = playerFormHtml(player || {});
    const form = document.getElementById("player-form");
    const errorEl = document.getElementById("player-form-error");
    document.getElementById("player-form-cancel").addEventListener("click", closeForm);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const payload = {
        name: String(formData.get("name") || "").trim(),
        position: String(formData.get("position") || "").trim(),
        jerseyNumber: formData.get("jerseyNumber") ? Number(formData.get("jerseyNumber")) : null,
        phone: String(formData.get("phone") || "").trim(),
        status: String(formData.get("status") || "active")
      };
      if (!payload.name) {
        errorEl.textContent = "Name is required.";
        errorEl.hidden = false;
        return;
      }
      try {
        if (id) {
          await updatePlayer(id, payload);
        } else {
          await addPlayer(payload);
        }
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save player. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save player", error);
      }
    });
  }

  if (isAdmin) {
    document.getElementById("add-player-button").addEventListener("click", () => openForm());
  }

  await refresh();
}
