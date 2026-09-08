let lastFocusedElement = null;

export function openModal(bodyHtml) {
  closeModal();
  lastFocusedElement = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "active-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `<div class="modal-card">${bodyHtml}</div>`;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.body.appendChild(overlay);
  const firstFocusable = overlay.querySelector('input, select, textarea, button');
  firstFocusable?.focus();
  return overlay;
}

export function closeModal() {
  document.getElementById("active-modal")?.remove();
  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}
