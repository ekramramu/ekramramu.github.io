import { listFeedback, addFeedback, deleteFeedback, getFeedbackBoardVisibility, setFeedbackBoardVisibility } from "../data.js";
import { escapeHtml } from "../utils.js";

const MAX_LENGTH = 1000;

const CATEGORIES = [
  { value: "played-well", label: "Players Who Played Well", hint: "Give a shout-out to players who played well this time." },
  { value: "improve", label: "Who Should Improve", hint: "Suggest who could step it up next time." },
  { value: "other", label: "Anything Else", hint: "Any other feedback for the club." }
];

function categoryMeta(value) {
  return CATEGORIES.find((category) => category.value === value) || CATEGORIES[2];
}

function timestampDate(value) {
  return value?.toDate ? value.toDate() : value ? new Date(value) : null;
}

function formatWhen(value) {
  const date = timestampDate(value);
  if (!date || Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function feedbackItemHtml(item, canModerate) {
  const category = categoryMeta(item.category);
  return `
    <div class="feedback-item" data-id="${escapeHtml(item.id)}">
      <span class="badge badge-feedback-${escapeHtml(category.value)}">${escapeHtml(category.label)}</span>
      <p>${escapeHtml(item.message)}</p>
      <div class="feedback-item-meta">
        <span>${escapeHtml(formatWhen(item.createdAt))}</span>
        ${canModerate ? `<button class="btn btn-secondary btn-small" data-remove-feedback type="button">Remove</button>` : ""}
      </div>
    </div>
  `;
}

function categoryOptionsHtml() {
  return CATEGORIES.map((category, index) => `
    <label class="selection-option feedback-category-option">
      <input type="radio" name="category" value="${escapeHtml(category.value)}" ${index === 0 ? "checked" : ""} />
      <span><strong>${escapeHtml(category.label)}</strong><small>${escapeHtml(category.hint)}</small></span>
    </label>
  `).join("");
}

function groupByCategory(items) {
  const groups = new Map(CATEGORIES.map((category) => [category.value, []]));
  for (const item of items) {
    const key = groups.has(item.category) ? item.category : "other";
    groups.get(key).push(item);
  }
  return groups;
}

function boardSectionsHtml(items, canModerate) {
  const groups = groupByCategory(items);
  return CATEGORIES.map((category) => {
    const entries = groups.get(category.value) || [];
    return `
      <div class="feedback-section">
        <h3 class="feedback-section-title">${escapeHtml(category.label)}<span>${entries.length}</span></h3>
        <div class="feedback-board">
          ${entries.length ? entries.map((item) => feedbackItemHtml(item, canModerate)).join("") : `<p class="empty-state">No comments in this section yet.</p>`}
        </div>
      </div>
    `;
  }).join("");
}

// Public route: reachable signed-out (anonymous, no login required) and signed-in alike.
// Rendered as its own full page section (not the small auth-card modal) so it reads as a
// real part of the site rather than a login-style popup.
export function renderFeedbackPage(appRoot, { isSignedIn = false, canModerate = false } = {}) {
  const backPath = isSignedIn ? "/dashboard" : "/login";
  const backLabel = isSignedIn ? "Back to dashboard" : "Sign in";
  appRoot.innerHTML = `
    <div class="feedback-page">
      <header class="feedback-topbar">
        <a class="feedback-brand" href="#${backPath}">
          <img src="assets/club-logo.png" alt="" aria-hidden="true" />
          <span>SDFC</span>
        </a>
        <a class="btn btn-secondary btn-small" href="#${backPath}">${backLabel}</a>
      </header>
      <div class="feedback-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">Player Feedback</h1>
            <p class="page-subtitle">Share anything on your mind, anonymously. No account needed &mdash; every voice is welcome.</p>
          </div>
        </div>
        <div class="feedback-grid">
          <div class="feedback-card">
            <form id="feedback-form" class="auth-form" novalidate>
              <p class="auth-error" id="feedback-error" role="alert" hidden></p>
              <p class="auth-error" id="feedback-success" role="status" hidden></p>
              <fieldset class="selection-fieldset">
                <legend>Choose a section</legend>
                <div class="feedback-category-options">${categoryOptionsHtml()}</div>
              </fieldset>
              <label class="form-field">
                <span>Your feedback</span>
                <textarea name="message" rows="6" maxlength="${MAX_LENGTH}" placeholder="What's on your mind?" autofocus required></textarea>
              </label>
              <button class="btn btn-primary btn-block" type="submit">Post anonymously</button>
            </form>
          </div>
          <div class="feedback-board-card">
            <div class="feedback-board-header">
              <h2 class="feedback-board-title">Feedback Board</h2>
              ${canModerate ? `<button class="btn btn-secondary btn-small" id="toggle-board-visibility" type="button">Loading&hellip;</button>` : ""}
            </div>
            <p class="empty-state" id="feedback-visibility-note" hidden></p>
            <div id="feedback-sections"><p class="empty-state">Loading comments&hellip;</p></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("feedback-form");
  const errorEl = document.getElementById("feedback-error");
  const successEl = document.getElementById("feedback-success");
  const sectionsEl = document.getElementById("feedback-sections");
  const visibilityNote = document.getElementById("feedback-visibility-note");
  const toggleButton = document.getElementById("toggle-board-visibility");

  let boardVisible = false;

  function renderToggleButton() {
    if (!toggleButton) return;
    toggleButton.textContent = boardVisible ? "Hide board from members" : "Show board to all members";
  }

  async function refreshSections() {
    try {
      const [items, visible] = await Promise.all([listFeedback(), getFeedbackBoardVisibility()]);
      boardVisible = visible;
      renderToggleButton();

      if (!canModerate && !boardVisible) {
        visibilityNote.textContent = "The feedback board is currently private. Check back soon.";
        visibilityNote.hidden = false;
        sectionsEl.innerHTML = "";
        return;
      }

      visibilityNote.hidden = !(canModerate && !boardVisible);
      if (canModerate && !boardVisible) {
        visibilityNote.textContent = "Only club managers can see this board right now. Members won't see it until you show it.";
      }
      sectionsEl.innerHTML = boardSectionsHtml(items, canModerate);
    } catch (error) {
      console.error("Unable to load feedback", error);
      sectionsEl.innerHTML = `<p class="empty-state">Unable to load comments.</p>`;
    }
  }

  if (toggleButton) {
    toggleButton.addEventListener("click", async () => {
      toggleButton.disabled = true;
      try {
        await setFeedbackBoardVisibility(!boardVisible);
        await refreshSections();
      } catch (error) {
        console.error("Unable to update feedback board visibility", error);
      } finally {
        toggleButton.disabled = false;
      }
    });
  }

  sectionsEl.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-feedback]");
    if (!button) return;
    const item = button.closest(".feedback-item");
    const feedbackId = item?.dataset.id;
    if (!feedbackId) return;
    button.disabled = true;
    try {
      await deleteFeedback(feedbackId);
      await refreshSections();
    } catch (error) {
      console.error("Unable to remove feedback", error);
      button.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;
    const formData = new FormData(form);
    const message = String(formData.get("message") || "").trim();
    const category = String(formData.get("category") || CATEGORIES[0].value);
    if (!message) {
      errorEl.textContent = "Please enter your feedback before posting.";
      errorEl.hidden = false;
      return;
    }
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
      await addFeedback(message.slice(0, MAX_LENGTH), category);
      form.reset();
      successEl.textContent = "Thanks! Your feedback was posted anonymously.";
      successEl.hidden = false;
      await refreshSections();
    } catch (error) {
      console.error("Unable to post feedback", error);
      errorEl.textContent = "Something went wrong. Please try again.";
      errorEl.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });

  refreshSections();
}
