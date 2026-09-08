import {
  addFinanceBillPayment,
  addFinanceCollection,
  listFinanceBillPayments,
  listFinanceCollections,
  listPlayers,
  listTransactions,
  normalizeLegacyBillPayments,
  normalizeLegacyCollections,
  updateFinanceBillPayment,
  updateFinanceCollection
} from "../data.js";
import { escapeHtml, formatCurrency, formatDate } from "../utils.js";
import { closeModal, openModal } from "../modal.js";

export const COST_TYPES = [
  "Match Day Expenses",
  "Equipment & Kits",
  "Food & Beverages",
  "Transportation",
  "Training & Coaching",
  "Medical & Physio",
  "Administration",
  "Tournament Fees",
  "Grounds Maintenance",
  "Miscellaneous"
];

const FINANCE_ACCOUNTS = ["Club Bank Account", "Club Mobile Wallet", "Cash in Hand"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ID_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomChars(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ID_CHARSET[byte % ID_CHARSET.length]).join("");
}

function generateUniqueId(prefix, length, existingIds) {
  let candidate;
  do {
    candidate = `${prefix}${randomChars(length)}`;
  } while (existingIds.has(candidate));
  return candidate;
}

function generateUniqueVoucher(prefix, year, existingVouchers) {
  let candidate;
  do {
    candidate = `${prefix}${year}${randomChars(4)}`;
  } while (existingVouchers.has(candidate));
  return candidate;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function yearOf(dateValue) {
  return dateValue ? String(dateValue).slice(0, 4) : "";
}

function monthNumberOf(dateValue) {
  return dateValue ? String(dateValue).slice(5, 7) : "";
}

function monthLabel(monthValue) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return "—";
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;
}

function optionsHtml(options, selected) {
  return options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function accountOptionsHtml(selected) {
  const notSpecified = `<option value="" ${!selected ? "selected" : ""}>Not specified</option>`;
  return notSpecified + FINANCE_ACCOUNTS.map((account) => `<option value="${escapeHtml(account)}" ${account === selected ? "selected" : ""}>${escapeHtml(account)}</option>`).join("");
}

function matchesSearch(record, term, fields) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(record[field] || "").toLowerCase().includes(needle));
}

function buildYearOptions(records, dateField) {
  const years = new Set(records.map((record) => yearOf(record[dateField])).filter(Boolean));
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function filterRecords(records, { search, year, month, searchFields, dateField }) {
  return records.filter((record) => {
    if (year && yearOf(record[dateField]) !== year) return false;
    if (month && monthNumberOf(record[dateField]) !== month) return false;
    return matchesSearch(record, search, searchFields);
  });
}

function aggregateMonthly(records, year, dateField, amountField) {
  const totals = new Array(12).fill(0);
  if (!year) return totals;
  records.forEach((record) => {
    if (yearOf(record[dateField]) !== year) return;
    const monthIndex = Number(monthNumberOf(record[dateField])) - 1;
    if (monthIndex >= 0 && monthIndex < 12) totals[monthIndex] += Number(record[amountField]) || 0;
  });
  return totals;
}

function computeNiceMax(max) {
  if (max <= 0) return 4000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function renderMonthlyChartSvg(totals) {
  const width = 760;
  const height = 220;
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;
  const niceMax = computeNiceMax(Math.max(...totals, 0));

  const points = totals.map((value, index) => {
    const x = paddingLeft + (innerW * index) / 11;
    const y = paddingTop + innerH - (innerH * Math.min(value, niceMax)) / niceMax;
    return [x, y];
  });
  const linePath = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[11][0].toFixed(1)},${(paddingTop + innerH).toFixed(1)} L${points[0][0].toFixed(1)},${(paddingTop + innerH).toFixed(1)} Z`;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((niceMax / 4) * index);
    const y = paddingTop + innerH - (innerH * value) / niceMax;
    return `<line x1="${paddingLeft}" y1="${y.toFixed(1)}" x2="${width - paddingRight}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1" />
      <text x="${paddingLeft - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="finance-chart-axis">${value.toLocaleString("en-US")}</text>`;
  }).join("");

  const monthLabels = MONTH_NAMES.map((name, index) => {
    const x = paddingLeft + (innerW * index) / 11;
    return `<text x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="finance-chart-axis">${name.slice(0, 3)}</text>`;
  }).join("");

  const dots = points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--surface)" stroke="var(--success)" stroke-width="2" />`).join("");

  return `
    <svg class="finance-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Monthly amount chart">
      ${gridLines}
      <path d="${areaPath}" fill="var(--success-soft)" opacity="0.6" stroke="none" />
      <path d="${linePath}" fill="none" stroke="var(--success)" stroke-width="2.5" />
      ${dots}
      ${monthLabels}
    </svg>
  `;
}

function setFieldError(form, fieldName, message) {
  const field = form.querySelector(`[name=${fieldName}]`)?.closest(".form-field");
  if (!field) return;
  field.classList.add("has-error");
  let errorEl = field.querySelector(".form-field-error");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.className = "form-field-error";
    field.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll(".form-field.has-error").forEach((field) => {
    field.classList.remove("has-error");
    field.querySelector(".form-field-error")?.remove();
  });
}

function toolbarHtml({ searchPlaceholder, years, selectedYear, selectedMonth }) {
  const yearOptionsMarkup = `<option value="">All Years</option>${years.map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}`;
  const monthOptionsMarkup = `<option value="">All Months</option>${MONTH_NAMES.map((name, index) => {
    const value = String(index + 1).padStart(2, "0");
    return `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${name}</option>`;
  }).join("")}`;
  return `
    <div class="finance-toolbar">
      <input type="search" id="finance-search-input" placeholder="${escapeHtml(searchPlaceholder)}" aria-label="${escapeHtml(searchPlaceholder)}" />
      <select id="finance-year-filter" aria-label="Filter by year">${yearOptionsMarkup}</select>
      <select id="finance-month-filter" aria-label="Filter by month">${monthOptionsMarkup}</select>
    </div>
  `;
}

function chartCardHtml(years, chartYear, legendLabel) {
  const yearOptionsMarkup = years.length
    ? years.map((year) => `<option value="${year}" ${year === chartYear ? "selected" : ""}>${year}</option>`).join("")
    : `<option value="">${new Date().getFullYear()}</option>`;
  return `
    <div class="finance-chart-card">
      <div class="finance-chart-header">
        <select id="finance-chart-year" class="finance-chart-year" aria-label="Chart year">${yearOptionsMarkup}</select>
        <span class="finance-chart-legend"><span class="finance-chart-legend-swatch" aria-hidden="true"></span>${escapeHtml(legendLabel)}</span>
      </div>
      <div id="finance-chart-slot"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

function collectionRowHtml(record, isAdmin) {
  return `
    <tr data-id="${escapeHtml(record.id)}">
      <td>${escapeHtml(record.transactionId)}</td>
      <td>${formatDate(record.collectionDate)}</td>
      <td>${escapeHtml(monthLabel(record.paymentMonth))}</td>
      <td>${escapeHtml(record.payerName || "—")}</td>
      <td class="amount-cell">${formatCurrency(record.amount)}</td>
      <td>${escapeHtml(record.voucher || "-")}</td>
      <td>${escapeHtml(record.receivedInto || "-")}</td>
      <td class="amount-cell">${formatCurrency(record.amount)}</td>
      ${isAdmin ? `<td class="table-actions">${record.legacy ? "—" : `<button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>`}</td>` : ""}
    </tr>
  `;
}

function collectionFormHtml(record, players) {
  const playerOptions = players.map((player) => `<option value="${escapeHtml(player.id)}" ${player.id === record.playerId ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("");
  return `
    <div class="modal-header">
      <h2>Payment Collection</h2>
      <button class="icon-button" id="collection-modal-close" type="button" aria-label="Close">✕</button>
    </div>
    <form id="collection-form">
      <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
      <label class="form-field form-field-wide">
        <span>Player</span>
        <select name="playerId" required>
          <option value="">Select a Player</option>
          ${playerOptions}
        </select>
      </label>
      <label class="form-field">
        <span>Collection Date</span>
        <input type="date" name="collectionDate" value="${escapeHtml(record.collectionDate || todayIso())}" required />
      </label>
      <label class="form-field">
        <span>Amount</span>
        <input type="number" name="amount" min="1" step="1" value="${escapeHtml(record.amount ?? 1000)}" required />
      </label>
      <label class="form-field">
        <span>Month of Collection</span>
        <input type="month" name="paymentMonth" value="${escapeHtml(record.paymentMonth || currentMonthValue())}" required />
      </label>
      <label class="form-field">
        <span>Received Into (optional)</span>
        <select name="receivedInto">${accountOptionsHtml(record.receivedInto)}</select>
      </label>
      <label class="form-field form-field-wide">
        <span>Comments</span>
        <textarea name="comments" rows="3">${escapeHtml(record.comments || "")}</textarea>
      </label>
      <p class="auth-error" id="collection-form-error" role="alert" hidden></p>
      <div class="auth-actions modal-actions">
        <button class="btn btn-secondary" id="collection-form-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" type="submit">${record.id ? "Save changes" : "Create"}</button>
      </div>
    </form>
  `;
}

export async function renderCollectionsPage(container, { role }) {
  const isAdmin = role === "admin" || role === "moderator";
  const colSpan = isAdmin ? 9 : 8;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="card-icon">▤</span> Payment Collections</h1>
      ${isAdmin ? `<div class="finance-actions"><button class="btn btn-primary" id="add-collection-button" type="button">+ New Collection</button></div>` : ""}
    </div>
    <div id="collections-chart-slot"></div>
    <div id="collections-toolbar-slot"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>TrxID</th><th>Date</th><th>Month Of Payment</th><th>Payer Name</th><th>Amount</th>
            <th>Voucher</th><th>Received Into</th><th>Total Amount</th>${isAdmin ? "<th>Action</th>" : ""}
          </tr>
        </thead>
        <tbody id="collections-tbody">
          <tr><td colspan="${colSpan}" class="empty-state">Loading collections…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("collections-tbody");
  const chartSlot = document.getElementById("collections-chart-slot");
  const toolbarSlot = document.getElementById("collections-toolbar-slot");

  let allRecords = [];
  let players = [];
  const state = { search: "", year: "", month: "" };

  function renderTable() {
    const filtered = filterRecords(allRecords, {
      search: state.search,
      year: state.year,
      month: state.month,
      searchFields: ["transactionId", "voucher"],
      dateField: "collectionDate"
    });
    tbody.innerHTML = filtered.length
      ? filtered.map((record) => collectionRowHtml(record, isAdmin)).join("")
      : `<tr><td colspan="${colSpan}" class="empty-state">${allRecords.length ? "No collections match your search." : "No collections yet."}</td></tr>`;
    wireRowActions(filtered);
  }

  function renderChart(chartYear) {
    const totals = aggregateMonthly(allRecords, chartYear, "collectionDate", "amount");
    const chartCard = chartSlot.querySelector(".finance-chart-card") || (() => {
      chartSlot.innerHTML = chartCardHtml(buildYearOptions(allRecords, "collectionDate"), chartYear, "Monthly Amount");
      return chartSlot.querySelector(".finance-chart-card");
    })();
    chartCard.querySelector("#finance-chart-slot").innerHTML = renderMonthlyChartSvg(totals);
  }

  function wireRowActions(records) {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const record = records.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(record));
    });
  }

  function currentChartYear() {
    const select = document.getElementById("finance-chart-year");
    if (select?.value) return select.value;
    const years = buildYearOptions(allRecords, "collectionDate");
    const thisYear = String(new Date().getFullYear());
    return years.includes(thisYear) ? thisYear : years[0] || thisYear;
  }

  async function refresh() {
    // Independent settles: a Collections read failure (e.g. rules not deployed yet) must
    // never wipe out an already-loaded player list, or the Player dropdown goes empty.
    const [collectionsResult, legacyResult, playersResult] = await Promise.allSettled([
      listFinanceCollections(),
      listTransactions(),
      listPlayers()
    ]);

    if (playersResult.status === "fulfilled") {
      players = playersResult.value;
    } else {
      console.error("Unable to load players", playersResult.reason);
    }

    const typedRecords = collectionsResult.status === "fulfilled" ? collectionsResult.value : [];
    const legacyTransactions = legacyResult.status === "fulfilled" ? legacyResult.value : [];
    if (collectionsResult.status === "rejected") console.error("Unable to load collections", collectionsResult.reason);
    if (legacyResult.status === "rejected") console.error("Unable to load legacy transactions", legacyResult.reason);

    allRecords = [...typedRecords, ...normalizeLegacyCollections(legacyTransactions)].sort(
      (a, b) => String(b.collectionDate || "").localeCompare(String(a.collectionDate || ""))
    );

    if (collectionsResult.status === "rejected" && legacyResult.status === "rejected") {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load collections.</td></tr>`;
      return;
    }

    const years = buildYearOptions(allRecords, "collectionDate");
    toolbarSlot.innerHTML = toolbarHtml({
      searchPlaceholder: "Search TrxID or Voucher",
      years,
      selectedYear: state.year,
      selectedMonth: state.month
    });
    wireToolbar();

    renderChart(currentChartYear());
    renderTable();
  }

  function wireToolbar() {
    document.getElementById("finance-search-input").addEventListener("input", (event) => {
      state.search = event.target.value;
      renderTable();
    });
    document.getElementById("finance-year-filter").addEventListener("change", (event) => {
      state.year = event.target.value;
      renderTable();
    });
    document.getElementById("finance-month-filter").addEventListener("change", (event) => {
      state.month = event.target.value;
      renderTable();
    });
    chartSlot.querySelector("#finance-chart-year")?.addEventListener("change", (event) => {
      renderChart(event.target.value);
    });
  }

  function closeForm() {
    closeModal();
  }

  function openForm(record = {}) {
    const activePlayers = players.filter((player) => player.status !== "inactive");
    const dropdownPlayers = record.playerId && !activePlayers.some((player) => player.id === record.playerId)
      ? [...activePlayers, ...players.filter((player) => player.id === record.playerId)]
      : activePlayers;
    const overlay = openModal(collectionFormHtml(record, dropdownPlayers));
    const form = overlay.querySelector("#collection-form");
    const errorEl = overlay.querySelector("#collection-form-error");
    overlay.querySelector("#collection-modal-close").addEventListener("click", closeForm);
    overlay.querySelector("#collection-form-cancel").addEventListener("click", closeForm);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      clearFieldErrors(form);

      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const playerId = String(formData.get("playerId") || "");
      const collectionDate = String(formData.get("collectionDate") || "");
      const paymentMonth = String(formData.get("paymentMonth") || "");
      const amount = Number(formData.get("amount"));

      let hasError = false;
      if (!playerId) {
        setFieldError(form, "playerId", "Please select a player.");
        hasError = true;
      }
      if (!collectionDate) {
        setFieldError(form, "collectionDate", "Collection date is required.");
        hasError = true;
      }
      if (!paymentMonth) {
        setFieldError(form, "paymentMonth", "Month of collection is required.");
        hasError = true;
      }
      if (!amount || amount <= 0) {
        setFieldError(form, "amount", "Enter an amount greater than zero.");
        hasError = true;
      }
      if (hasError) return;

      const player = players.find((item) => item.id === playerId);
      const payload = {
        playerId,
        payerName: player?.name || "",
        collectionDate,
        paymentMonth,
        amount,
        receivedInto: String(formData.get("receivedInto") || ""),
        comments: String(formData.get("comments") || "").trim()
      };

      try {
        if (id) {
          const existing = allRecords.find((item) => item.id === id);
          await updateFinanceCollection(id, {
            ...payload,
            transactionId: existing?.transactionId,
            voucher: existing?.voucher
          });
        } else {
          const existingIds = new Set(allRecords.map((item) => item.transactionId).filter(Boolean));
          const existingVouchers = new Set(allRecords.map((item) => item.voucher).filter(Boolean));
          await addFinanceCollection({
            ...payload,
            transactionId: generateUniqueId("COL", 10, existingIds),
            voucher: generateUniqueVoucher("RV", yearOf(collectionDate) || new Date().getFullYear(), existingVouchers)
          });
        }
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save collection. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save collection", error);
      }
    });
  }

  if (isAdmin) {
    document.getElementById("add-collection-button").addEventListener("click", () => openForm());
  }

  await refresh();
}

// ---------------------------------------------------------------------------
// Bill Payments
// ---------------------------------------------------------------------------

function billPaymentRowHtml(record, isAdmin) {
  return `
    <tr data-id="${escapeHtml(record.id)}">
      <td>${escapeHtml(record.billId)}</td>
      <td>${escapeHtml(record.voucher || "-")}</td>
      <td>${formatDate(record.paymentDate)}</td>
      <td>${escapeHtml(record.costType || "—")}</td>
      <td>${escapeHtml(record.paidFrom || "-")}</td>
      <td class="amount-cell">${formatCurrency(record.amount)}</td>
      ${isAdmin ? `<td class="table-actions">${record.legacy ? "—" : `<button class="btn btn-small btn-secondary" data-action="edit" type="button">Edit</button>`}</td>` : ""}
    </tr>
  `;
}

function billPaymentFormHtml(record) {
  return `
    <div class="modal-header">
      <h2>Bill Payment</h2>
      <button class="icon-button" id="bill-modal-close" type="button" aria-label="Close">✕</button>
    </div>
    <form id="bill-form">
      <input type="hidden" name="id" value="${escapeHtml(record.id || "")}" />
      <label class="form-field form-field-wide">
        <span>CostType</span>
        <select name="costType" required>
          <option value="">Select a CostType</option>
          ${optionsHtml(COST_TYPES, record.costType)}
        </select>
      </label>
      <label class="form-field">
        <span>Amount</span>
        <input type="number" name="amount" min="1" step="1" value="${escapeHtml(record.amount ?? 1000)}" required />
      </label>
      <label class="form-field">
        <span>Date</span>
        <input type="date" name="paymentDate" value="${escapeHtml(record.paymentDate || todayIso())}" required />
      </label>
      <label class="form-field">
        <span>Paid From (optional)</span>
        <select name="paidFrom">${accountOptionsHtml(record.paidFrom)}</select>
      </label>
      <label class="form-field form-field-wide">
        <span>Comments</span>
        <textarea name="comments" rows="3">${escapeHtml(record.comments || "")}</textarea>
      </label>
      <p class="auth-error" id="bill-form-error" role="alert" hidden></p>
      <div class="auth-actions modal-actions">
        <button class="btn btn-secondary" id="bill-form-cancel" type="button">Cancel</button>
        <button class="btn btn-primary" type="submit">${record.id ? "Save changes" : "Create"}</button>
      </div>
    </form>
  `;
}

export async function renderBillPaymentsPage(container, { role }) {
  const isAdmin = role === "admin" || role === "moderator";
  const colSpan = isAdmin ? 7 : 6;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="card-icon">✎</span> Bill Payments</h1>
      ${isAdmin ? `<div class="finance-actions"><button class="btn btn-primary" id="add-bill-button" type="button">+ New Bill Payment</button></div>` : ""}
    </div>
    <div id="bills-chart-slot"></div>
    <div id="bills-toolbar-slot"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Bill ID</th><th>Voucher</th><th>Date</th><th>Cost Type</th><th>Paid From</th><th>Amount</th>${isAdmin ? "<th>Action</th>" : ""}
          </tr>
        </thead>
        <tbody id="bills-tbody">
          <tr><td colspan="${colSpan}" class="empty-state">Loading bill payments…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById("bills-tbody");
  const chartSlot = document.getElementById("bills-chart-slot");
  const toolbarSlot = document.getElementById("bills-toolbar-slot");

  let allRecords = [];
  const state = { search: "", year: "", month: "" };

  function renderTable() {
    const filtered = filterRecords(allRecords, {
      search: state.search,
      year: state.year,
      month: state.month,
      searchFields: ["billId", "voucher"],
      dateField: "paymentDate"
    });
    tbody.innerHTML = filtered.length
      ? filtered.map((record) => billPaymentRowHtml(record, isAdmin)).join("")
      : `<tr><td colspan="${colSpan}" class="empty-state">${allRecords.length ? "No bill payments match your search." : "No bill payments yet."}</td></tr>`;
    wireRowActions(filtered);
  }

  function renderChart(chartYear) {
    const totals = aggregateMonthly(allRecords, chartYear, "paymentDate", "amount");
    const chartCard = chartSlot.querySelector(".finance-chart-card") || (() => {
      chartSlot.innerHTML = chartCardHtml(buildYearOptions(allRecords, "paymentDate"), chartYear, "Monthly Expense");
      return chartSlot.querySelector(".finance-chart-card");
    })();
    chartCard.querySelector("#finance-chart-slot").innerHTML = renderMonthlyChartSvg(totals);
  }

  function wireRowActions(records) {
    if (!isAdmin) return;
    tbody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const record = records.find((item) => item.id === id);
      row.querySelector("[data-action=edit]")?.addEventListener("click", () => openForm(record));
    });
  }

  function currentChartYear() {
    const select = document.getElementById("finance-chart-year");
    if (select?.value) return select.value;
    const years = buildYearOptions(allRecords, "paymentDate");
    const thisYear = String(new Date().getFullYear());
    return years.includes(thisYear) ? thisYear : years[0] || thisYear;
  }

  async function refresh() {
    // Independent settles: a typed-ledger read failure must not hide legacy records that
    // are still readable (and vice versa).
    const [typedResult, legacyResult] = await Promise.allSettled([
      listFinanceBillPayments(),
      listTransactions()
    ]);

    const typedRecords = typedResult.status === "fulfilled" ? typedResult.value : [];
    const legacyTransactions = legacyResult.status === "fulfilled" ? legacyResult.value : [];
    if (typedResult.status === "rejected") console.error("Unable to load bill payments", typedResult.reason);
    if (legacyResult.status === "rejected") console.error("Unable to load legacy transactions", legacyResult.reason);

    allRecords = [...typedRecords, ...normalizeLegacyBillPayments(legacyTransactions)].sort(
      (a, b) => String(b.paymentDate || "").localeCompare(String(a.paymentDate || ""))
    );

    if (typedResult.status === "rejected" && legacyResult.status === "rejected") {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Unable to load bill payments.</td></tr>`;
      return;
    }

    const years = buildYearOptions(allRecords, "paymentDate");
    toolbarSlot.innerHTML = toolbarHtml({
      searchPlaceholder: "Search Bill ID or Voucher",
      years,
      selectedYear: state.year,
      selectedMonth: state.month
    });
    wireToolbar();

    renderChart(currentChartYear());
    renderTable();
  }

  function wireToolbar() {
    document.getElementById("finance-search-input").addEventListener("input", (event) => {
      state.search = event.target.value;
      renderTable();
    });
    document.getElementById("finance-year-filter").addEventListener("change", (event) => {
      state.year = event.target.value;
      renderTable();
    });
    document.getElementById("finance-month-filter").addEventListener("change", (event) => {
      state.month = event.target.value;
      renderTable();
    });
    chartSlot.querySelector("#finance-chart-year")?.addEventListener("change", (event) => {
      renderChart(event.target.value);
    });
  }

  function closeForm() {
    closeModal();
  }

  function openForm(record = {}) {
    const overlay = openModal(billPaymentFormHtml(record));
    overlay.querySelector(".modal-card").classList.add("modal-card-wide");
    const form = overlay.querySelector("#bill-form");
    const errorEl = overlay.querySelector("#bill-form-error");
    overlay.querySelector("#bill-modal-close").addEventListener("click", closeForm);
    overlay.querySelector("#bill-form-cancel").addEventListener("click", closeForm);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      clearFieldErrors(form);

      const formData = new FormData(form);
      const id = String(formData.get("id") || "");
      const costType = String(formData.get("costType") || "");
      const paymentDate = String(formData.get("paymentDate") || "");
      const amount = Number(formData.get("amount"));

      let hasError = false;
      if (!costType) {
        setFieldError(form, "costType", "Please select a cost type.");
        hasError = true;
      }
      if (!paymentDate) {
        setFieldError(form, "paymentDate", "Date is required.");
        hasError = true;
      }
      if (!amount || amount <= 0) {
        setFieldError(form, "amount", "Enter an amount greater than zero.");
        hasError = true;
      }
      if (hasError) return;

      const payload = {
        costType,
        paymentDate,
        amount,
        paidFrom: String(formData.get("paidFrom") || ""),
        comments: String(formData.get("comments") || "").trim()
      };

      try {
        if (id) {
          const existing = allRecords.find((item) => item.id === id);
          await updateFinanceBillPayment(id, {
            ...payload,
            billId: existing?.billId,
            voucher: existing?.voucher
          });
        } else {
          const existingIds = new Set(allRecords.map((item) => item.billId).filter(Boolean));
          const existingVouchers = new Set(allRecords.map((item) => item.voucher).filter(Boolean));
          await addFinanceBillPayment({
            ...payload,
            billId: generateUniqueId("BIL", 10, existingIds),
            voucher: generateUniqueVoucher("PV", yearOf(paymentDate) || new Date().getFullYear(), existingVouchers)
          });
        }
        closeForm();
        await refresh();
      } catch (error) {
        errorEl.textContent = "Unable to save bill payment. Please try again.";
        errorEl.hidden = false;
        console.error("Unable to save bill payment", error);
      }
    });
  }

  if (isAdmin) {
    document.getElementById("add-bill-button").addEventListener("click", () => openForm());
  }

  await refresh();
}

