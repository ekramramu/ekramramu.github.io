export function openModal(bodyHtml) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "active-modal";
  overlay.innerHTML = `<div class="modal-card">${bodyHtml}</div>`;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function closeModal() {
  document.getElementById("active-modal")?.remove();
}
