import { addVenue, deleteVenue, listVenues, updateVenue } from "../data.js";
import { escapeHtml } from "../utils.js";
import { closeModal, openModal } from "../modal.js";

function venueRow(venue, isAdmin) {
  return `
    <tr data-id="${escapeHtml(venue.id)}">
      <td>
        <strong>${escapeHtml(venue.name)}</strong>
        ${venue.mapsLink ? `<a class="venue-map-link" href="${escapeHtml(venue.mapsLink)}" target="_blank" rel="noopener" aria-label="Open in Google Maps">🔗</a>` : ""}
      </td>
      <td>${escapeHtml(venue.address || "—")}</td>
      <td><span class="badge badge-${venue.status === "inactive" ? "inactive" : "active"}">${venue.status === "inactive" ? "Inactive" : "Active"}</span></td>
      ${isAdmin ? `
        <td class="table-actions">
          <button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>
          <button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button>
        </td>
      ` : ""}
    </tr>
  `;
}

function venueFormHtml(venue = {}) {
  return `
    <div class="modal-header">
      <h2>Venue</h2>
      <button class="icon-button" id="venue-modal-close" type="button" aria-label="Close">✕</button>
    </div>
    <form id="venue-form">
      <input type="hidden" name="id" value="${escapeHtml(venue.id || "")}" />
      <label class="form-field form-field-wide">
        <span>Venue Name</span>
        <input type="text" name="name" value="${escapeHtml(venue.name || "")}" required />
      </label>
      <label class="form-field form-field-wide">
        <span>Address</span>
        <textarea name="address" rows="3">${escapeHtml(venue.address || "")}</textarea>
      </label>
      <label class="form-field form-field-wide">
        <span>Google Maps Link (optional)</span>
        <input type="url" name="mapsLink" value="${escapeHtml(venue.mapsLink || "")}" placeholder="https://maps.app.goo.gl/..." />
      </label>
      <p class="auth-error" id="venue-form-error" role="alert" hidden></p>
      <div class="auth-actions modal-actions">
        <button class="btn btn-secondary" id="venue-form-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" type="submit">${venue.id ? "Save changes" : "Create"}</button>
      </div>
    </form>
  `;
}

export async function renderVenuesPage(container, { role }) {
  const isAdmin = role === "admin" || role === "moderator";
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="card-icon">▤</span> Venues</h1>
      ${isAdmin ? `<button class="btn btn-primary" id="add-venue-button" type="button">+ Add Venue</button>` : ""}
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Venue Name</th><th>Address</th><th>Status</th>
            ${isAdmin ? "<th>Action</th>" : ""}
          </tr>
        </thead>
        <tbody id="venues-tbody">
          <tr><td colspan="${isAdmin ? 4 : 3}" class="empty-state">Loading venues…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("venues-tbody");
  const colSpan = isAdmin ? 4 : 3;

  async function refresh() {
    try {
      const venues = await listVenues();
      tbody.innerHTML = venues.length
        ? venues.map((venue) => venueRow(venue, isAdmin)).join("")
        : `<tr><td colspan="${colSpan}" class="empty-state">No venues yet.</td></tr>`;
      wireRowActions(venues);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load venues.</td></tr>`;
      console.error("Unable to load venues", error);
    }
  }

  function wireRowActions(venues) {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const venue = venues.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(venue));
      row.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm(`Remove ${venue.name}?`)) return;
        try {
          await deleteVenue(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete venue", error);
        }
      });
    });
  }

  function openForm(venue) {
    const overlay = openModal(venueFormHtml(venue || {}));
    const form = overlay.querySelector("#venue-form");
    const errorEl = overlay.querySelector("#venue-form-error");
    overlay.querySelector("#venue-modal-close").addEventListener("click", closeModal);
    overlay.querySelector("#venue-form-cancel").addEventListener("click", closeModal);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const payload = {
        name: String(formData.get("name") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        mapsLink: String(formData.get("mapsLink") || "").trim()
      };
      if (!payload.name) {
        errorEl.textContent = "Venue name is required.";
        errorEl.hidden = false;
        return;
      }
      try {
        if (id) {
          await updateVenue(id, payload);
        } else {
          await addVenue(payload);
        }
        closeModal();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save venue. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save venue", error);
      }
    });
  }

  if (isAdmin) {
    document.getElementById("add-venue-button").addEventListener("click", () => openForm());
  }

  await refresh();
}
