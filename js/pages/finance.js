import { addTransaction, deleteTransaction, listTransactions, summarizeTransactions } from "../data.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils.js";

function transactionRow(tx, isAdmin) {
  return `
    <tr data-id="${escapeHtml(tx.id)}">
      <td>${formatDate(tx.date)}</td>
      <td><span class="badge badge-${tx.type === "expense" ? "expense" : "collection"}">${tx.type === "expense" ? "Expense" : "Collection"}</span></td>
      <td>${escapeHtml(tx.description || "—")}</td>
      <td class="amount-cell">${formatCurrency(tx.amount)}</td>
      ${isAdmin ? `<td class="table-actions"><button class="btn btn-small btn-danger" data-action="delete" type="button">Delete</button></td>` : ""}
    </tr>
  `;
}

function transactionFormHtml() {
  return `
    <form class="inline-form" id="tx-form">
      <div class="form-grid">
        <label class="form-field">
          <span>Type</span>
          <select name="type">
            <option value="collection">Collection</option>
            <option value="expense">Expense</option>
          </select>
        </label>
        <label class="form-field">
          <span>Amount</span>
          <input type="number" name="amount" min="0" step="0.01" required />
        </label>
        <label class="form-field">
          <span>Date</span>
          <input type="date" name="date" required />
        </label>
        <label class="form-field form-field-wide">
          <span>Description</span>
          <input type="text" name="description" />
        </label>
      </div>
      <p class="auth-error" id="tx-form-error" role="alert" hidden></p>
      <div class="auth-actions">
        <button class="btn btn-primary" type="submit">Add transaction</button>
        <button class="btn btn-secondary" id="tx-form-cancel" type="button">Cancel</button>
      </div>
    </form>
  `;
}

export async function renderFinancePage(container, { role }) {
  const isAdmin = role === "admin" || role === "moderator";
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Finance</h1>
      ${isAdmin ? `<button class="btn btn-primary" id="add-tx-button" type="button">+ Add transaction</button>` : ""}
    </div>
    <div class="card-grid" id="summary-cards">
      <div class="stat-card"><span class="stat-label">Account Balance</span><strong class="stat-value" id="stat-balance">—</strong></div>
      <div class="stat-card"><span class="stat-label">Total Collections</span><strong class="stat-value" id="stat-collections">—</strong></div>
      <div class="stat-card"><span class="stat-label">Total Expenses</span><strong class="stat-value" id="stat-expenses">—</strong></div>
    </div>
    <div id="tx-form-slot"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th>${isAdmin ? "<th>Actions</th>" : ""}</tr>
        </thead>
        <tbody id="tx-tbody">
          <tr><td colspan="5" class="empty-state">Loading transactions…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("tx-tbody");
  const formSlot = document.getElementById("tx-form-slot");
  const colSpan = isAdmin ? 5 : 4;

  async function refresh() {
    try {
      const transactions = await listTransactions();
      const summary = summarizeTransactions(transactions);
      document.getElementById("stat-balance").textContent = formatCurrency(summary.balance);
      document.getElementById("stat-collections").textContent = formatCurrency(summary.collections);
      document.getElementById("stat-expenses").textContent = formatCurrency(summary.expenses);
      tbody.innerHTML = transactions.length
        ? transactions.map((tx) => transactionRow(tx, isAdmin)).join("")
        : `<tr><td colspan="${colSpan}" class="empty-state">No transactions yet.</td></tr>`;
      wireRowActions();
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load transactions.</td></tr>`;
      console.error("Unable to load transactions", error);
    }
  }

  function wireRowActions() {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector("[data-action=delete]")?.addEventListener("click", async () => {
        if (!window.confirm("Delete this transaction?")) return;
        try {
          await deleteTransaction(id);
          await refresh();
        } catch (error) {
          console.error("Unable to delete transaction", error);
        }
      });
    });
  }

  function closeForm() {
    formSlot.innerHTML = "";
  }

  function openForm() {
    formSlot.innerHTML = transactionFormHtml();
    const form = document.getElementById("tx-form");
    const errorEl = document.getElementById("tx-form-error");
    document.getElementById("tx-form-cancel").addEventListener("click", closeForm);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const formData = new FormData(form);
      const amount = Number(formData.get("amount"));
      if (!amount || amount <= 0) {
        errorEl.textContent = "Enter a valid amount.";
        errorEl.hidden = false;
        return;
      }
      const payload = {
        type: String(formData.get("type") || "collection"),
        amount,
        date: String(formData.get("date") || ""),
        description: String(formData.get("description") || "").trim()
      };
      try {
        await addTransaction(payload);
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save transaction. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save transaction", error);
      }
    });
  }

  if (isAdmin) {
    document.getElementById("add-tx-button").addEventListener("click", openForm);
  }

  await refresh();
}
