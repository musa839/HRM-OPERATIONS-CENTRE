// ═══════════════════════════════════════════════════════════════
//  HRMP LOGISTICS — OPERATIONS CENTRE
//  Pure Vanilla JavaScript — No frameworks, no dependencies
//  Author: Musa839 <Musa@hrmatters.co.za>
//  Repo:   https://github.com/musa839/HRM-OPERATIONS-CENTRE
//  Live:   https://hrmoperationscentre.com
// ═══════════════════════════════════════════════════════════════

// ── CONSTANTS ───────────────────────────────────────────────────
const TRUCKS = [
  { id: 1, reg: "BM 98 KZ ZN" },
  { id: 2, reg: "BD 29 LG ZN" },
  { id: 3, reg: "DD 76 MH ZN" },
  { id: 4, reg: "BJ 58 SW ZN" },
  { id: 5, reg: "BD 29 LG ZN" },
  { id: 6, reg: "CB 89 JK ZN" },
];

const EXPENSE_CATEGORIES = [
  "Fuel", "Driver Pay", "Maintenance",
  "Tyres & Parts", "Toll / Levies", "Insurance", "Other",
];

const STAGES = ["Lead", "Qualified", "Quoted", "Negotiation", "Won", "Lost"];

const STAGE_PROBS = {
  Lead: 10, Qualified: 25, Quoted: 50,
  Negotiation: 75, Won: 100, Lost: 0,
};

const STREAMS = {
  Trucks: "Trucks",
  Forklift: "Forklift Hire",
  VAS: "Value-Added Services",
};

// ── STATE ────────────────────────────────────────────────────────
const state = {
  activeTab: "dashboard",
  month: "",
  idCounter: 0,
  incomeRows: {},
  expenseRows: {},
  fuelEntries: [],
  odoEntries: [],
  driverEntries: [],
  maintEntries: [],
  tyreEntries: [],
  tripEntries: [],
  deals: [],
};

TRUCKS.forEach((t) => {
  state.incomeRows[t.id] = [];
  state.expenseRows[t.id] = [];
});

// ── UTILITIES ────────────────────────────────────────────────────
const uid = () => ++state.idCounter;

const money = (n) =>
  "R\u00a0" + (Math.abs(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

const moneyD = (n) =>
  "R\u00a0" + (Math.abs(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const num = (n, dp = 0) =>
  (parseFloat(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: dp, maximumFractionDigits: dp,
  });

const fmtSigned = (n) => (n < 0 ? "\u2013" : "") + money(n);
const today = () => new Date().toISOString().substring(0, 10);
const inMonth = (d) => !state.month || (d || "").substring(0, 7) === state.month;
const truckReg = (id) => { const t = TRUCKS.find((x) => x.id == id); return t ? t.reg : ""; };
const daysUntil = (ds) => { if (!ds) return null; return Math.round((new Date(ds) - new Date()) / 86400000); };
const timeDiff = (dep, arr) => {
  if (!dep || !arr) return 0;
  const [dh, dm] = dep.split(":").map(Number);
  const [ah, am] = arr.split(":").map(Number);
  let depM = dh * 60 + dm, arrM = ah * 60 + am;
  if (arrM < depM) arrM += 1440;
  return (arrM - depM) / 60;
};

// ── DOM HELPERS ──────────────────────────────────────────────────
const el = (id) => document.getElementById(id);
const setText = (id, val) => { if (el(id)) el(id).textContent = val; };
const setVal = (id, val) => { if (el(id)) el(id).value = val; };
const getVal = (id) => { const e = el(id); return e ? e.value : ""; };
const getNum = (id) => parseFloat(getVal(id)) || 0;
const tbadge = (id) => `<span class="tbadge">${id}</span>`;
const delBtn = (fn, id) => `<button class="btn-del" onclick="${fn}(${id})">&#10005;</button>`;
const emptyRow = (cols) => `<tr class="empty-msg"><td colspan="${cols}">No entries yet.</td></tr>`;

const showMsg = (id, msg, ok) => {
  const e = el(id); if (!e) return;
  e.style.color = ok ? "var(--gdk)" : "var(--red)";
  e.textContent = msg;
  setTimeout(() => (e.textContent = ""), 3000);
};

// ── FLEET CALCULATIONS ───────────────────────────────────────────
const getTruckIncome = (tid) =>
  (state.incomeRows[tid] || []).reduce((s, r) => {
    const e = el(`inc_amt_${r.id}`);
    return s + (e ? parseFloat(e.value) || 0 : 0);
  }, 0);

const getTruckExpenses = (tid) =>
  (state.expenseRows[tid] || []).reduce((s, r) => {
    const e = el(`exp_amt_${r.id}`);
    return s + (e ? parseFloat(e.value) || 0 : 0);
  }, 0);

const getExpByCat = (tid, cat) =>
  (state.expenseRows[tid] || []).reduce((s, r) => {
    const c = getVal(`exp_cat_${r.id}`) || r.category;
    const e = el(`exp_amt_${r.id}`);
    return s + (c === cat ? (e ? parseFloat(e.value) || 0 : 0) : 0);
  }, 0);

// ── FLEET INCOME ROW ─────────────────────────────────────────────
const addIncomeRow = (tid) => {
  const id = uid();
  state.incomeRows[tid].push({ id });
  const tbody = el(`incBody_${tid}`); if (!tbody) return;
  const tr = document.createElement("tr");
  tr.id = `incRow_${id}`;
  tr.innerHTML = `
    <td><input class="inline-input" id="inc_cust_${id}" placeholder="Customer name" oninput="recalcTruck(${tid})"/></td>
    <td class="rt"><input class="inline-input rt" id="inc_amt_${id}" type="number" placeholder="0" min="0" step="100" oninput="recalcTruck(${tid})"/></td>
    <td>${delBtn(`delIncomeRow_${tid}`, id)}</td>`;
  tbody.appendChild(tr);
  window[`delIncomeRow_${tid}`] = (iid) => {
    state.incomeRows[tid] = state.incomeRows[tid].filter((r) => r.id !== iid);
    const row = el(`incRow_${iid}`); if (row) row.remove();
    recalcTruck(tid);
  };
  recalcTruck(tid);
};

// ── FLEET EXPENSE ROW ────────────────────────────────────────────
const addExpenseRow = (tid) => {
  const id = uid();
  state.expenseRows[tid].push({ id, category: "Fuel" });
  const tbody = el(`expBody_${tid}`); if (!tbody) return;
  const opts = EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  const tr = document.createElement("tr");
  tr.id = `expRow_${id}`;
  tr.innerHTML = `
    <td><select class="inline-select" id="exp_cat_${id}" onchange="recalcTruck(${tid})">${opts}</select></td>
    <td><input class="inline-input" id="exp_desc_${id}" placeholder="Description" oninput="recalcTruck(${tid})"/></td>
    <td class="rt"><input class="inline-input rt" id="exp_amt_${id}" type="number" placeholder="0" min="0" step="100" oninput="recalcTruck(${tid})"/></td>
    <td>${delBtn(`delExpenseRow_${tid}`, id)}</td>`;
  tbody.appendChild(tr);
  window[`delExpenseRow_${tid}`] = (eid) => {
    state.expenseRows[tid] = state.expenseRows[tid].filter((r) => r.id !== eid);
    const row = el(`expRow_${eid}`); if (row) row.remove();
    recalcTruck(tid);
  };
  recalcTruck(tid);
};

// ── RECALC TRUCK ─────────────────────────────────────────────────
const recalcTruck = (tid) => {
  const inc = getTruckIncome(tid), exp = getTruckExpenses(tid), net = inc - exp;
  setText(`kInc_${tid}`, money(inc));
  setText(`kExp_${tid}`, money(exp));
  setText(`incTotal_${tid}`, money(inc));
  setText(`expTotal_${tid}`, money(exp));
  const kn = el(`kNet_${tid}`);
  if (kn) { kn.textContent = fmtSigned(net); kn.style.color = net >= 0 ? "var(--gdk)" : "var(--red)"; }
  const pb = el(`pbNet_${tid}`);
  if (pb) { pb.textContent = fmtSigned(net); pb.style.color = net >= 0 ? "var(--gdk)" : "var(--red)"; }
  renderFleetSummary();
  renderDashboard();
};

// ── BUILD TRUCK ACCORDIONS ───────────────────────────────────────
const buildTruckWorkings = () => {
  const container = el("truckWorkings"); if (!container) return;
  container.innerHTML = "";
  TRUCKS.forEach((t) => {
    const div = document.createElement("div");
    div.className = "form-card";
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;" onclick="toggleTruck(${t.id})">
        <span class="tbadge">${t.id}</span>
        <span class="reg" style="font-size:12px;background:var(--bg);border:1.5px solid var(--bdk);border-radius:3px;padding:3px 8px;">${t.reg}</span>
        <div style="margin-left:auto;display:flex;gap:20px;">
          <div style="text-align:right;"><div style="font-size:9px;color:var(--mlt);letter-spacing:1px;text-transform:uppercase;">Income</div>
            <div style="font-family:var(--fh);font-weight:700;font-size:14px;color:var(--gdk);" id="kInc_${t.id}">R 0</div></div>
          <div style="text-align:right;"><div style="font-size:9px;color:var(--mlt);letter-spacing:1px;text-transform:uppercase;">Expenses</div>
            <div style="font-family:var(--fh);font-weight:700;font-size:14px;color:var(--red);" id="kExp_${t.id}">R 0</div></div>
          <div style="text-align:right;"><div style="font-size:9px;color:var(--mlt);letter-spacing:1px;text-transform:uppercase;">Net P/L</div>
            <div style="font-family:var(--fh);font-weight:700;font-size:14px;" id="kNet_${t.id}">R 0</div></div>
        </div>
        <span style="font-size:16px;color:var(--muted);margin-left:10px;" id="twChev_${t.id}">&#8964;</span>
      </div>
      <div id="twBody_${t.id}" style="display:none;border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
          <div style="padding:0 16px 0 0;border-right:1px solid var(--border);">
            <div style="font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gdk);margin-bottom:10px;">+ Income by Customer</div>
            <table class="data-table" style="margin-bottom:8px;">
              <thead><tr><th>Customer</th><th class="rt">Amount (R)</th><th></th></tr></thead>
              <tbody id="incBody_${t.id}"></tbody>
              <tfoot><tr><td style="color:var(--gdk);font-weight:700;">Total Income</td><td class="rt" style="color:var(--gdk);" id="incTotal_${t.id}">R 0</td><td></td></tr></tfoot>
            </table>
            <button onclick="addIncomeRow(${t.id})" style="background:transparent;border:1.5px dashed var(--bdk);color:var(--muted);font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border-radius:4px;cursor:pointer;">+ Add Customer</button>
          </div>
          <div style="padding:0 0 0 16px;">
            <div style="font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:10px;">− Expenses by Item</div>
            <table class="data-table" style="margin-bottom:8px;">
              <thead><tr><th>Category</th><th>Description</th><th class="rt">Amount (R)</th><th></th></tr></thead>
              <tbody id="expBody_${t.id}"></tbody>
              <tfoot><tr><td colspan="2" style="color:var(--red);font-weight:700;">Total Expenses</td><td class="rt" style="color:var(--red);" id="expTotal_${t.id}">R 0</td><td></td></tr></tfoot>
            </table>
            <button onclick="addExpenseRow(${t.id})" style="background:transparent;border:1.5px dashed var(--bdk);color:var(--muted);font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border-radius:4px;cursor:pointer;">+ Add Expense</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;background:var(--bg);border-radius:4px;padding:10px 14px;">
          <span style="font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Net P/L — Truck ${t.id}</span>
          <span style="font-family:var(--fh);font-size:20px;font-weight:900;" id="pbNet_${t.id}">R 0</span>
        </div>
      </div>`;
    container.appendChild(div);
  });
};

const toggleTruck = (tid) => {
  const body = el(`twBody_${tid}`), chev = el(`twChev_${tid}`);
  if (!body) return;
  const open = body.style.display === "block";
  body.style.display = open ? "none" : "block";
  if (chev) chev.style.transform = open ? "" : "rotate(180deg)";
};

// ── FUEL ─────────────────────────────────────────────────────────
const fuelAdd = () => {
  const date = getVal("ffDate"), truckId = parseInt(getVal("ffTruck")) || 0;
  const litres = getNum("ffLitres"), cost = getNum("ffCost");
  if (!date || !truckId || !litres || !cost) { showMsg("fuelMsg", "Fill Date, Truck, Litres & Cost.", false); return; }
  state.fuelEntries.push({ id: uid(), date, truckId, litres, cost, km: getNum("ffKm"), notes: getVal("ffNotes").trim() });
  state.fuelEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("ffLitres", ""); setVal("ffCost", ""); setVal("ffKm", ""); setVal("ffNotes", "");
  showMsg("fuelMsg", "Added ✓", true); renderAll();
};
window.fuelDel = (id) => { state.fuelEntries = state.fuelEntries.filter((e) => e.id !== id); renderAll(); };

const renderFuel = () => {
  const filterTruck = parseInt(getVal("fuelFilter")) || 0;
  const rows = state.fuelEntries.filter((e) => inMonth(e.date) && (!filterTruck || e.truckId === filterTruck));
  const tbody = el("fuelBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totL = 0, totC = 0, totKm = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(10); }
  else rows.forEach((e) => {
    totL += e.litres; totC += e.cost; totKm += e.km;
    const rate = e.litres > 0 ? e.cost / e.litres : 0;
    const eff = e.km > 0 && e.litres > 0 ? e.km / e.litres : 0;
    const ec = eff >= 3.5 ? "var(--gdk)" : eff >= 2.8 ? "var(--amber)" : "var(--red)";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td>${tbadge(e.truckId)}</td><td><span class="reg">${truckReg(e.truckId)}</span></td>
      <td class="rt">${num(e.litres, 1)}L</td><td class="rt">${moneyD(e.cost)}</td>
      <td class="rt">${rate > 0 ? moneyD(rate) : "—"}</td>
      <td class="rt">${e.km > 0 ? num(e.km, 0) + " km" : "—"}</td>
      <td class="rt" style="font-weight:700;color:${eff > 0 ? ec : "inherit"}">${eff > 0 ? num(eff, 2) + " km/L" : "—"}</td>
      <td>${e.notes || ""}</td><td class="ct">${delBtn("fuelDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  const ar = totL > 0 ? totC / totL : 0, ae = totL > 0 && totKm > 0 ? totKm / totL : 0;
  setText("fftL", num(totL, 1) + " L"); setText("fftC", moneyD(totC));
  setText("fftR", ar > 0 ? moneyD(ar) : "—"); setText("fftKm", totKm > 0 ? num(totKm, 0) + " km" : "—");
  setText("fftE", ae > 0 ? num(ae, 2) + " km/L" : "—");
  const me = state.fuelEntries.filter((e) => inMonth(e.date));
  let ml = 0, mc = 0, mk = 0;
  me.forEach((e) => { ml += e.litres; mc += e.cost; mk += e.km; });
  const mr = ml > 0 ? mc / ml : 0, meff = ml > 0 && mk > 0 ? mk / ml : 0;
  setText("fkL", num(ml, 1) + " L"); setText("fkC", money(mc));
  setText("fkR", mr > 0 ? moneyD(mr) : "—"); setText("fkKm", num(mk, 0) + " km");
  setText("fkEff", meff > 0 ? num(meff, 2) + " km/L" : "—");
};

// ── ODOMETER ─────────────────────────────────────────────────────
const odoAdd = () => {
  const date = getVal("ofDate"), truckId = parseInt(getVal("ofTruck")) || 0;
  const start = getNum("ofStart"), end = getNum("ofEnd");
  if (!date || !truckId || !start || !end) { showMsg("odoMsg", "Fill all fields.", false); return; }
  if (end <= start) { showMsg("odoMsg", "End must be greater than Start.", false); return; }
  state.odoEntries.push({ id: uid(), date, truckId, driver: getVal("ofDriver"), start, end });
  state.odoEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("ofStart", ""); setVal("ofEnd", "");
  showMsg("odoMsg", "Added ✓", true); renderAll();
};
window.odoDel = (id) => { state.odoEntries = state.odoEntries.filter((e) => e.id !== id); renderAll(); };

const renderOdo = () => {
  const rows = state.odoEntries.filter((e) => inMonth(e.date));
  const tbody = el("odoBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totD = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(8); }
  else rows.forEach((e) => {
    const dist = e.end - e.start; totD += dist;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td>${tbadge(e.truckId)}</td><td><span class="reg">${truckReg(e.truckId)}</span></td>
      <td>${e.driver || "—"}</td><td class="rt">${num(e.start, 0)} km</td><td class="rt">${num(e.end, 0)} km</td>
      <td class="rt" style="font-weight:700;color:var(--gdk)">${num(dist, 0)} km</td>
      <td class="ct">${delBtn("odoDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  setText("oftD", totD > 0 ? num(totD, 0) + " km" : "—");
  setText("okTotal", num(totD, 0) + " km");
  setText("okAvg", rows.length > 0 ? num(totD / rows.length, 0) + " km" : "0 km");
  setText("okCount", rows.length);
  const tkm = {};
  rows.forEach((e) => { tkm[e.truckId] = (tkm[e.truckId] || 0) + (e.end - e.start); });
  let best = 0, bestId = 0;
  Object.keys(tkm).forEach((k) => { if (tkm[k] > best) { best = tkm[k]; bestId = k; } });
  setText("okBest", bestId > 0 ? "Truck " + bestId : "—");
};

// ── DRIVERS ──────────────────────────────────────────────────────
const driverAdd = () => {
  const date = getVal("drfDate"), name = getVal("drfName").trim();
  if (!date || !name) { showMsg("driverMsg", "Date and Driver Name required.", false); return; }
  state.driverEntries.push({
    id: uid(), date, name, lic: getVal("drfLic").trim(),
    truckId: parseInt(getVal("drfTruck")) || 0, hours: getNum("drfHours"),
    status: getVal("drfStatus"), incidents: getNum("drfInc"),
    ontime: getNum("drfOntime"), deliveries: getNum("drfDel"), notes: getVal("drfNotes").trim(),
  });
  state.driverEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("drfName", ""); setVal("drfLic", ""); setVal("drfHours", "");
  setVal("drfInc", ""); setVal("drfOntime", ""); setVal("drfDel", ""); setVal("drfNotes", "");
  showMsg("driverMsg", "Added ✓", true); populateSelects(); renderAll();
};
window.driverDel = (id) => { state.driverEntries = state.driverEntries.filter((e) => e.id !== id); populateSelects(); renderAll(); };

const calcDriverRating = (name) => {
  const entries = state.driverEntries.filter((e) => e.name === name && inMonth(e.date));
  if (!entries.length) return { rating: 0, km: 0, hours: 0, incidents: 0, ontime: 0, deliveries: 0, eff: 0 };
  let totH = 0, totInc = 0, totOT = 0, totDel = 0; const truckIds = {};
  entries.forEach((e) => { totH += e.hours; totInc += e.incidents; totOT += e.ontime; totDel += e.deliveries; if (e.truckId) truckIds[e.truckId] = 1; });
  let totKm = 0;
  state.odoEntries.filter((e) => e.driver === name && inMonth(e.date)).forEach((e) => (totKm += e.end - e.start));
  let totL = 0, totFKm = 0;
  state.fuelEntries.filter((e) => inMonth(e.date) && truckIds[e.truckId]).forEach((e) => { totL += e.litres; totFKm += e.km; });
  const eff = totL > 0 && totFKm > 0 ? totFKm / totL : 0;
  let r = 0, factors = 0;
  if (totInc === 0) { r += 5; factors++; } else if (totInc === 1) { r += 3; factors++; } else { r += 1; factors++; }
  if (totDel > 0) { const otPct = totOT / totDel; r += otPct >= 0.95 ? 5 : otPct >= 0.85 ? 4 : otPct >= 0.7 ? 3 : 2; factors++; }
  if (eff > 0) { r += eff >= 3.5 ? 5 : eff >= 3 ? 4 : eff >= 2.5 ? 3 : 2; factors++; }
  if (totH > 0) { r += 4; factors++; }
  return { rating: Math.min(5, factors > 0 ? Math.round(r / factors) : 0), km: totKm, hours: totH, incidents: totInc, ontime: totOT, deliveries: totDel, eff };
};

const renderDrivers = () => {
  const names = {};
  state.driverEntries.filter((e) => inMonth(e.date)).forEach((e) => { if (e.name) names[e.name] = 1; });
  const grid = el("scorecardGrid");
  if (grid) {
    grid.innerHTML = "";
    const nameList = Object.keys(names);
    if (!nameList.length) { grid.innerHTML = '<div style="font-size:12px;color:var(--mlt);font-style:italic;padding:8px 0;">No driver entries logged this month.</div>'; }
    else nameList.forEach((name) => {
      const sc = calcDriverRating(name);
      const stars = Array.from({ length: 5 }, (_, i) => `<span class="star${i < sc.rating ? " filled" : ""}">★</span>`).join("");
      const lastTruck = state.driverEntries.filter((e) => e.name === name && e.truckId).slice(-1)[0];
      const card = document.createElement("div"); card.className = "sc-card";
      card.innerHTML = `<div class="sc-head"><div class="sc-name">${name}</div><div class="rating-wrap">${stars}</div></div>
        ${lastTruck ? `<div class="sc-truck-label">Truck ${lastTruck.truckId} — ${truckReg(lastTruck.truckId)}</div>` : ""}
        <div class="sc-stats">
          <div class="sc-stat"><div class="scl">km Driven</div><div class="scv">${num(sc.km, 0)}</div></div>
          <div class="sc-stat"><div class="scl">Hours</div><div class="scv">${num(sc.hours, 1)}</div></div>
          <div class="sc-stat"><div class="scl">Incidents</div><div class="scv" style="color:${sc.incidents === 0 ? "var(--gdk)" : sc.incidents === 1 ? "var(--amber)" : "var(--red)"}">${sc.incidents}</div></div>
          <div class="sc-stat"><div class="scl">On-Time</div><div class="scv">${sc.deliveries > 0 ? num((sc.ontime / sc.deliveries) * 100, 0) + "%" : "—"}</div></div>
          <div class="sc-stat"><div class="scl">Deliveries</div><div class="scv">${sc.deliveries}</div></div>
          <div class="sc-stat"><div class="scl">Fuel Eff.</div><div class="scv" style="color:${sc.eff >= 3.5 ? "var(--gdk)" : sc.eff >= 2.8 ? "var(--amber)" : sc.eff > 0 ? "var(--red)" : "inherit"}">${sc.eff > 0 ? num(sc.eff, 2) + " km/L" : "—"}</div></div>
        </div>`;
      grid.appendChild(card);
    });
  }
  const rows = state.driverEntries.filter((e) => inMonth(e.date));
  const tbody = el("driverBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totH = 0, totI = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(11); }
  else rows.forEach((e) => {
    totH += e.hours; totI += e.incidents;
    const sc = e.status === "Active" ? "sb-active" : e.status === "Sick" ? "sb-sick" : "sb-off";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td style="font-weight:600">${e.name}</td>
      <td style="font-family:monospace;font-size:10px">${e.lic || "—"}</td>
      <td>${e.truckId ? tbadge(e.truckId) : "—"}</td>
      <td>${e.truckId ? `<span class="reg">${truckReg(e.truckId)}</span>` : "—"}</td>
      <td class="rt">${num(e.hours, 1)}h</td>
      <td class="rt" style="color:${e.incidents > 0 ? "var(--red)" : "var(--gdk)"}">${e.incidents}</td>
      <td class="rt">${e.deliveries > 0 ? num((e.ontime / e.deliveries) * 100, 0) + "%" : "—"}</td>
      <td class="rt">${e.deliveries}</td>
      <td class="ct"><span class="status-badge ${sc}">${e.status}</span></td>
      <td class="ct">${delBtn("driverDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  setText("drftH", num(totH, 1) + "h"); setText("drftI", totI);
};

// ── MAINTENANCE ───────────────────────────────────────────────────
const maintAdd = () => {
  const date = getVal("mfDate"), truckId = parseInt(getVal("mfTruck")) || 0;
  if (!date || !truckId) { showMsg("maintMsg", "Date and Truck required.", false); return; }
  state.maintEntries.push({ id: uid(), date, truckId, type: getVal("mfType"), shop: getVal("mfShop").trim(), cost: getNum("mfCost"), next: getNum("mfNext"), notes: getVal("mfNotes").trim() });
  state.maintEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("mfShop", ""); setVal("mfCost", ""); setVal("mfNext", ""); setVal("mfNotes", "");
  showMsg("maintMsg", "Added ✓", true); renderAll();
};
window.maintDel = (id) => { state.maintEntries = state.maintEntries.filter((e) => e.id !== id); renderAll(); };

const renderMaint = () => {
  const rows = state.maintEntries.filter((e) => inMonth(e.date));
  const tbody = el("maintBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totC = 0, due = 0, over = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(9); }
  else rows.forEach((e) => {
    totC += e.cost;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td>${tbadge(e.truckId)}</td><td><span class="reg">${truckReg(e.truckId)}</span></td>
      <td>${e.type}</td><td>${e.shop || "—"}</td><td class="rt">${money(e.cost)}</td>
      <td class="rt">${e.next > 0 ? num(e.next, 0) + " km" : "—"}</td>
      <td>${e.notes || ""}</td><td class="ct">${delBtn("maintDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  TRUCKS.forEach((t) => {
    let lastOdo = 0;
    state.odoEntries.filter((e) => e.truckId === t.id).forEach((e) => { if (e.end > lastOdo) lastOdo = e.end; });
    state.maintEntries.filter((e) => e.truckId === t.id && e.next > 0).forEach((e) => {
      const gap = e.next - lastOdo;
      if (gap < 0) over++; else if (gap <= 5000) due++;
    });
  });
  setText("mftC", money(totC)); setText("mkCost", money(totC));
  setText("mkCount", rows.length); setText("mkDue", due); setText("mkOver", over);
};

// ── TYRES ─────────────────────────────────────────────────────────
const tyreAdd = () => {
  const date = getVal("tfDate"), truckId = parseInt(getVal("tfTruck")) || 0;
  if (!date || !truckId) { showMsg("tyreMsg", "Date and Truck required.", false); return; }
  state.tyreEntries.push({ id: uid(), date, truckId, pos: getVal("tfPos"), brand: getVal("tfBrand").trim(), action: getVal("tfAction"), cost: getNum("tfCost"), tread: getNum("tfTread"), notes: getVal("tfNotes").trim() });
  state.tyreEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("tfBrand", ""); setVal("tfCost", ""); setVal("tfTread", ""); setVal("tfNotes", "");
  showMsg("tyreMsg", "Added ✓", true); renderAll();
};
window.tyreDel = (id) => { state.tyreEntries = state.tyreEntries.filter((e) => e.id !== id); renderAll(); };

const renderTyres = () => {
  const rows = state.tyreEntries.filter((e) => inMonth(e.date));
  const tbody = el("tyreBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totC = 0, newT = 0, rep = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(10); }
  else rows.forEach((e) => {
    totC += e.cost; if (e.action === "New Tyre") newT++; if (e.action === "Repair") rep++;
    const tc = e.tread > 0 ? (e.tread >= 4 ? "var(--gdk)" : e.tread >= 2 ? "var(--amber)" : "var(--red)") : "inherit";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td>${tbadge(e.truckId)}</td><td><span class="reg">${truckReg(e.truckId)}</span></td>
      <td>${e.pos}</td><td>${e.brand || "—"}</td><td>${e.action}</td>
      <td class="rt" style="font-weight:700;color:${tc}">${e.tread > 0 ? num(e.tread, 1) + "mm" : "—"}</td>
      <td class="rt">${money(e.cost)}</td><td>${e.notes || ""}</td>
      <td class="ct">${delBtn("tyreDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  setText("tftC", money(totC)); setText("tkCost", money(totC));
  setText("tkNew", newT); setText("tkRep", rep); setText("tkCount", state.tyreEntries.length);
};

// ── TRIPS ─────────────────────────────────────────────────────────
const tripAdd = () => {
  const date = getVal("trfDate"), truckId = parseInt(getVal("trfTruck")) || 0;
  if (!date || !truckId) { showMsg("tripMsg", "Date and Truck required.", false); return; }
  const dep = getVal("trfDep"), arr = getVal("trfArr");
  state.tripEntries.push({ id: uid(), date, truckId, driver: getVal("trfDriver"), dist: getNum("trfDist"), origin: getVal("trfOrigin").trim(), dest: getVal("trfDest").trim(), dep, arr, load: getVal("trfLoad").trim(), hrs: timeDiff(dep, arr) });
  state.tripEntries.sort((a, b) => b.date.localeCompare(a.date));
  setVal("trfDist", ""); setVal("trfOrigin", ""); setVal("trfDest", ""); setVal("trfDep", ""); setVal("trfArr", ""); setVal("trfLoad", "");
  showMsg("tripMsg", "Added ✓", true); renderAll();
};
window.tripDel = (id) => { state.tripEntries = state.tripEntries.filter((e) => e.id !== id); renderAll(); };

const renderTrips = () => {
  const rows = state.tripEntries.filter((e) => inMonth(e.date));
  const tbody = el("tripBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totD = 0, totH = 0; const at = {};
  if (!rows.length) { tbody.innerHTML = emptyRow(11); }
  else rows.forEach((e) => {
    totD += e.dist; totH += e.hrs; at[e.truckId] = 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.date}</td><td>${tbadge(e.truckId)}</td><td><span class="reg">${truckReg(e.truckId)}</span></td>
      <td>${e.driver || "—"}</td><td>${e.origin || "—"}</td><td>${e.dest || "—"}</td>
      <td class="rt" style="font-weight:700">${e.dist > 0 ? num(e.dist, 0) + " km" : "—"}</td>
      <td>${e.dep || "—"}</td><td>${e.arr || "—"}</td>
      <td style="font-size:10px">${e.load || "—"}</td>
      <td class="ct">${delBtn("tripDel", e.id)}</td>`;
    tbody.appendChild(tr);
  });
  setText("trftD", totD > 0 ? num(totD, 0) + " km" : "—");
  setText("trpCount", rows.length); setText("trpKm", num(totD, 0) + " km");
  setText("trpAvg", rows.length > 0 ? num(totD / rows.length, 0) + " km" : "0 km");
  setText("trpHrs", num(totH, 1)); setText("trpTrucks", Object.keys(at).length);
};

// ── BD PIPELINE ───────────────────────────────────────────────────
const dealAdd = () => {
  const company = getVal("pfCompany").trim();
  if (!company) { showMsg("dealMsg", "Company name required.", false); return; }
  const stage = getVal("pfStage"), prob = getNum("pfProb") || STAGE_PROBS[stage] || 10;
  state.deals.push({ id: uid(), company, contact: getVal("pfContact").trim(), phone: getVal("pfPhone").trim(), rep: getVal("pfRep").trim(), stream: getVal("pfStream"), stage, value: getNum("pfValue"), prob, priority: getVal("pfPriority"), dateAdded: getVal("pfDate") || today(), closeDate: getVal("pfClose"), followup: getVal("pfFollowup"), notes: getVal("pfNotes").trim() });
  state.deals.sort((a, b) => b.value - a.value);
  setVal("pfCompany", ""); setVal("pfContact", ""); setVal("pfPhone", ""); setVal("pfValue", ""); setVal("pfClose", ""); setVal("pfFollowup", ""); setVal("pfNotes", "");
  showMsg("dealMsg", "Deal added ✓", true); renderAll();
};
window.dealDel = (id) => { state.deals = state.deals.filter((d) => d.id !== id); renderAll(); };
window.dealStageChange = (id, newStage) => {
  const d = state.deals.find((x) => x.id === id); if (!d) return;
  d.stage = newStage; d.prob = STAGE_PROBS[newStage] || 0; renderAll();
};

const renderPipeline = () => {
  const stageF = getVal("filterStage"), streamF = getVal("filterStream");
  const rows = state.deals.filter((d) => (!stageF || d.stage === stageF) && (!streamF || d.stream === streamF));
  const tbody = el("pipelineBody"); if (!tbody) return;
  tbody.innerHTML = "";
  let totVal = 0, totWtd = 0;
  if (!rows.length) { tbody.innerHTML = emptyRow(13); }
  else rows.forEach((d) => {
    const wtd = Math.round(d.value * (d.prob / 100)); totVal += d.value; totWtd += wtd;
    const fu = daysUntil(d.followup);
    const fuStr = d.followup ? (fu < 0 ? `<span style="color:var(--red);font-weight:700">${d.followup} ⚠</span>` : fu === 0 ? `<span style="color:var(--amber);font-weight:700">Today</span>` : d.followup) : "—";
    const stageOpts = STAGES.map((s) => `<option value="${s}"${d.stage === s ? " selected" : ""}>${s}</option>`).join("");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="font-weight:600">${d.company}</td>
      <td><div style="font-size:11px">${d.contact || "—"}</div><div style="font-size:10px;color:var(--mlt)">${d.phone || ""}</div></td>
      <td>${d.rep || "—"}</td>
      <td><span class="stbadge st-${d.stream.toLowerCase()}">${STREAMS[d.stream]}</span></td>
      <td class="ct"><select style="font-family:var(--fh);font-size:9px;font-weight:700;border:none;background:transparent;cursor:pointer" onchange="dealStageChange(${d.id}, this.value)">${stageOpts}</select></td>
      <td class="rt" style="font-weight:700">${money(d.value)}</td>
      <td class="rt">${d.prob}%</td>
      <td class="rt" style="color:var(--gdk);font-weight:700">${money(wtd)}</td>
      <td class="ct"><span class="pdot ${d.priority === "High" ? "pd-high" : d.priority === "Medium" ? "pd-med" : "pd-low"}"></span>${d.priority}</td>
      <td>${d.closeDate || "—"}</td><td>${fuStr}</td>
      <td style="font-size:10px;max-width:160px">${d.notes || ""}</td>
      <td class="ct">${delBtn("dealDel", d.id)}</td>`;
    tbody.appendChild(tr);
  });
  setText("pftVal", totVal > 0 ? money(totVal) : "—");
  setText("pftWtd", totWtd > 0 ? money(totWtd) : "—");
  const active = state.deals.filter((d) => d.stage !== "Lost" && d.stage !== "Won");
  const wonD = state.deals.filter((d) => d.stage === "Won" && inMonth(d.dateAdded));
  const closedD = state.deals.filter((d) => (d.stage === "Won" || d.stage === "Lost") && inMonth(d.dateAdded));
  let pipeV = 0, wtdV = 0, wonV = 0;
  active.forEach((d) => { pipeV += d.value; wtdV += Math.round(d.value * (d.prob / 100)); });
  wonD.forEach((d) => (wonV += d.value));
  const winRate = closedD.length > 0 ? Math.round((wonD.length / closedD.length) * 100) : 0;
  setText("bdkPipe", money(pipeV)); setText("bdkFcast", money(wtdV));
  setText("bdkDeals", active.length); setText("bdkWon", money(wonV));
  setText("bdkWinRate", winRate + "%"); setText("bdkAvg", active.length > 0 ? money(Math.round(pipeV / active.length)) : "R 0");
  const fw = el("bdFunnel");
  if (fw) {
    const fsMap = { Lead: "fs-lead", Qualified: "fs-qual", Quoted: "fs-quote", Negotiation: "fs-neg", Won: "fs-won", Lost: "fs-lost" };
    fw.innerHTML = STAGES.map((s) => {
      const sd = state.deals.filter((d) => d.stage === s); let sv = 0;
      sd.forEach((d) => (sv += d.value));
      const pct = state.deals.length > 0 ? Math.round((sd.length / state.deals.length) * 100) : 0;
      return `<div class="fstage ${fsMap[s] || "fs-lead"}"><div class="fsl">${s}</div><div class="fsc">${sd.length}</div><div class="fsv">${money(sv)}</div><div class="fsp">${pct}%</div></div>`;
    }).join("");
  }
  const sc = el("bdStreams");
  if (sc) {
    sc.innerHTML = Object.keys(STREAMS).map((s) => {
      const sd = active.filter((d) => d.stream === s);
      const won = state.deals.filter((d) => d.stream === s && d.stage === "Won");
      const lost = state.deals.filter((d) => d.stream === s && d.stage === "Lost");
      let totV = 0, wonV2 = 0;
      sd.forEach((d) => (totV += d.value)); won.forEach((d) => (wonV2 += d.value));
      const wr = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
      const cls = s === "Trucks" ? "sc-truck" : s === "Forklift" ? "sc-fork" : "sc-vas";
      return `<div class="stream-card ${cls}"><h4>${STREAMS[s]}</h4>
        <div class="scs">
          <div class="sc-stat"><div class="scl">Pipeline</div><div class="scv">${money(totV)}</div></div>
          <div class="sc-stat"><div class="scl">Deals</div><div class="scv">${sd.length}</div></div>
          <div class="sc-stat"><div class="scl">Won</div><div class="scv" style="color:var(--gdk)">${money(wonV2)}</div></div>
          <div class="sc-stat"><div class="scl">Win Rate</div><div class="scv">${wr}%</div></div>
        </div></div>`;
    }).join("");
  }
};

// ── FLEET SUMMARY ────────────────────────────────────────────────
const renderFleetSummary = () => {
  const tbody = el("fleetSumBody"); if (!tbody) return;
  tbody.innerHTML = "";
  const totals = { rev: 0, fuel: 0, drv: 0, mnt: 0, tyr: 0, tol: 0, ins: 0, oth: 0, cst: 0, net: 0 };
  TRUCKS.forEach((t) => {
    const rev = getTruckIncome(t.id), exp = getTruckExpenses(t.id), net = rev - exp;
    const cats = { fuel: getExpByCat(t.id, "Fuel"), drv: getExpByCat(t.id, "Driver Pay"), mnt: getExpByCat(t.id, "Maintenance"), tyr: getExpByCat(t.id, "Tyres & Parts"), tol: getExpByCat(t.id, "Toll / Levies"), ins: getExpByCat(t.id, "Insurance"), oth: getExpByCat(t.id, "Other") };
    totals.rev += rev; totals.fuel += cats.fuel; totals.drv += cats.drv; totals.mnt += cats.mnt;
    totals.tyr += cats.tyr; totals.tol += cats.tol; totals.ins += cats.ins; totals.oth += cats.oth; totals.cst += exp; totals.net += net;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${tbadge(t.id)}</td><td><span class="reg">${t.reg}</span></td>
      <td class="rt">${money(rev)}</td><td class="rt">${money(cats.fuel)}</td><td class="rt">${money(cats.drv)}</td>
      <td class="rt">${money(cats.mnt)}</td><td class="rt">${money(cats.tyr)}</td><td class="rt">${money(cats.tol)}</td>
      <td class="rt">${money(cats.ins)}</td><td class="rt">${money(cats.oth)}</td><td class="rt">${money(exp)}</td>
      <td class="rt" style="font-weight:700;color:${net >= 0 ? "var(--gdk)" : "var(--red)"}">${fmtSigned(net)}</td>`;
    tbody.appendChild(tr);
  });
  setText("fsRev", money(totals.rev)); setText("fsFuel", money(totals.fuel)); setText("fsDrv", money(totals.drv));
  setText("fsMnt", money(totals.mnt)); setText("fsTyr", money(totals.tyr)); setText("fsTol", money(totals.tol));
  setText("fsIns", money(totals.ins)); setText("fsOth", money(totals.oth)); setText("fsCst", money(totals.cst));
  const fsNet = el("fsNet");
  if (fsNet) { fsNet.textContent = fmtSigned(totals.net); fsNet.style.color = totals.net >= 0 ? "var(--gdk)" : "var(--red)"; }
  setText("fltRev", money(totals.rev)); setText("fltCost", money(totals.cst));
  const fltNet = el("fltNet");
  if (fltNet) { fltNet.textContent = fmtSigned(totals.net); fltNet.style.color = totals.net >= 0 ? "var(--gdk)" : "var(--red)"; }
  setText("fltMgn", (totals.rev > 0 ? ((totals.net / totals.rev) * 100).toFixed(1) : 0) + "%");
};

// ── DASHBOARD ─────────────────────────────────────────────────────
const renderDashboard = () => {
  let totRev = 0, totCost = 0, totNet = 0;
  TRUCKS.forEach((t) => { const r = getTruckIncome(t.id), c = getTruckExpenses(t.id); totRev += r; totCost += c; totNet += r - c; });
  const fm = state.fuelEntries.filter((e) => inMonth(e.date)); let fCost = 0;
  fm.forEach((e) => (fCost += e.cost));
  const active = state.deals.filter((d) => d.stage !== "Lost" && d.stage !== "Won");
  const wonD = state.deals.filter((d) => d.stage === "Won" && inMonth(d.dateAdded));
  const closedD = state.deals.filter((d) => (d.stage === "Won" || d.stage === "Lost") && inMonth(d.dateAdded));
  let pipeV = 0; active.forEach((d) => (pipeV += d.value));
  const winRate = closedD.length > 0 ? Math.round((wonD.length / closedD.length) * 100) : 0;
  setText("ekRev", money(totRev)); setText("ekCost", money(totCost));
  const ekn = el("ekNet"); if (ekn) { ekn.textContent = fmtSigned(totNet); ekn.style.color = totNet >= 0 ? "var(--gdk)" : "var(--red)"; }
  setText("ekFuel", money(fCost)); setText("ekPipe", money(pipeV)); setText("ekWin", winRate + "%");
  const pl = el("execTruckPL");
  if (pl) {
    let maxAbs = 0;
    TRUCKS.forEach((t) => { const n = Math.abs(getTruckIncome(t.id) - getTruckExpenses(t.id)); if (n > maxAbs) maxAbs = n; });
    pl.innerHTML = TRUCKS.map((t) => {
      const r = getTruckIncome(t.id), c = getTruckExpenses(t.id), n = r - c;
      const pct = maxAbs > 0 ? Math.round((Math.abs(n) / maxAbs) * 100) : 0;
      return `<div class="list-item"><span style="font-family:var(--fh);font-weight:900;font-size:11px;min-width:18px">${t.id}</span>
        <span class="reg" style="min-width:95px;font-size:10px">${t.reg}</span>
        <div class="bar-wrap"><div class="bar ${n >= 0 ? "bar-g" : "bar-a"}" style="width:${pct}%"></div></div>
        <span style="font-family:var(--fh);font-weight:700;font-size:11px;color:${n >= 0 ? "var(--gdk)" : "var(--red)"};min-width:70px;text-align:right">${fmtSigned(n)}</span></div>`;
    }).join("");
  }
  const alerts = [];
  TRUCKS.forEach((t) => {
    let lastOdo = 0;
    state.odoEntries.filter((e) => e.truckId === t.id).forEach((e) => { if (e.end > lastOdo) lastOdo = e.end; });
    state.maintEntries.filter((e) => e.truckId === t.id && e.next > 0).forEach((e) => {
      const gap = e.next - lastOdo;
      if (gap < 0) alerts.push({ dot: "dot-r", msg: `Truck ${t.id}: ${e.type} OVERDUE` });
      else if (gap <= 5000) alerts.push({ dot: "dot-a", msg: `Truck ${t.id}: ${e.type} due in ${num(gap, 0)}km` });
    });
  });
  state.tyreEntries.forEach((e) => {
    if (e.tread > 0 && e.tread < 2) alerts.push({ dot: "dot-r", msg: `Truck ${e.truckId} ${e.pos}: tread ${num(e.tread, 1)}mm — REPLACE NOW` });
    else if (e.tread >= 2 && e.tread < 4) alerts.push({ dot: "dot-a", msg: `Truck ${e.truckId} ${e.pos}: tread ${num(e.tread, 1)}mm — monitor` });
  });
  state.deals.forEach((d) => {
    if (d.followup) { const days = daysUntil(d.followup); if (days !== null && days <= 0 && d.stage !== "Won" && d.stage !== "Lost") alerts.push({ dot: "dot-a", msg: `BD follow-up: ${d.company}${days < 0 ? " (overdue)" : ""}` }); }
  });
  const al = el("execAlerts");
  if (al) al.innerHTML = alerts.length ? alerts.slice(0, 7).map((a) => `<div class="list-item"><span class="alert-dot ${a.dot}"></span><span style="font-size:11px">${a.msg}</span></div>`).join("") : '<div style="font-size:11px;color:var(--mlt);font-style:italic;padding:8px 0">No alerts — all clear.</div>';
  const fe = el("execFuelEff");
  if (fe) fe.innerHTML = TRUCKS.map((t) => {
    let fl = 0, fk = 0;
    fm.forEach((e) => { if (e.truckId === t.id) { fl += e.litres; fk += e.km; } });
    const eff = fl > 0 && fk > 0 ? fk / fl : 0;
    const col = eff >= 3.5 ? "var(--gdk)" : eff >= 2.8 ? "var(--amber)" : "var(--mlt)";
    return `<div class="list-item"><span style="font-family:var(--fh);font-weight:900;font-size:11px;min-width:18px">${t.id}</span>
      <span class="reg" style="min-width:95px;font-size:10px">${t.reg}</span>
      <span style="flex:1;font-size:10px;color:var(--muted)">${num(fl, 0)}L</span>
      <span style="font-family:var(--fh);font-weight:700;font-size:12px;color:${col}">${eff > 0 ? num(eff, 2) + " km/L" : "—"}</span></div>`;
  }).join("");
  const bd = el("execBD");
  if (bd) {
    const topDeals = active.slice().sort((a, b) => b.value - a.value).slice(0, 4);
    bd.innerHTML = topDeals.length ? topDeals.map((d, i) =>
      `<div class="list-item"><span style="font-family:var(--fh);font-weight:900;font-size:11px;color:var(--mlt);min-width:16px">${i + 1}.</span>
      <span style="flex:1;font-weight:600;font-size:11px">${d.company}</span>
      <span class="sbadge stage-${d.stage.toLowerCase()}" style="margin-right:6px">${d.stage}</span>
      <span style="font-family:var(--fh);font-weight:700;font-size:11px;color:var(--gdk)">${money(d.value)}</span></div>`
    ).join("") : '<div style="font-size:11px;color:var(--mlt);font-style:italic;padding:8px 0">No active deals.</div>';
  }
};

// ── POPULATE SELECTS ─────────────────────────────────────────────
const populateSelects = () => {
  ["ffTruck", "ofTruck", "drfTruck", "mfTruck", "tfTruck", "trfTruck"].forEach((sid) => {
    const sel = el(sid); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select truck…</option>';
    TRUCKS.forEach((t) => { const o = document.createElement("option"); o.value = t.id; o.textContent = `${t.id} — ${t.reg}`; sel.appendChild(o); });
    if (cur) sel.value = cur;
  });
  const ff = el("fuelFilter");
  if (ff) {
    const cur = ff.value;
    ff.innerHTML = '<option value="0">All Trucks</option>';
    TRUCKS.forEach((t) => { const o = document.createElement("option"); o.value = t.id; o.textContent = `${t.id} — ${t.reg}`; ff.appendChild(o); });
    if (cur) ff.value = cur;
  }
  const driverNames = {};
  state.driverEntries.forEach((e) => { if (e.name) driverNames[e.name] = 1; });
  ["ofDriver", "trfDriver"].forEach((sid) => {
    const sel = el(sid); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select driver…</option>';
    Object.keys(driverNames).forEach((n) => { const o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o); });
    if (cur) sel.value = cur;
  });
};

// ── RENDER ALL ───────────────────────────────────────────────────
const renderAll = () => {
  renderFleetSummary(); renderFuel(); renderOdo(); renderDrivers();
  renderMaint(); renderTyres(); renderTrips(); renderPipeline(); renderDashboard();
};

// ── EXPORT ───────────────────────────────────────────────────────
const exportCSV = () => {
  const period = state.month || "all";
  const rows = ["HRMP LOGISTICS — OPERATIONS CENTRE", `Period: ${period}`, "", "FLEET FINANCE", "Truck#,Registration,Revenue,Total Cost,Net P/L"];
  TRUCKS.forEach((t) => { const rev = getTruckIncome(t.id), exp = getTruckExpenses(t.id); rows.push([t.id, t.reg, rev, exp, rev - exp].join(",")); });
  rows.push("", "FUEL LOG", "Date,Truck,Litres,Cost,km,Notes");
  state.fuelEntries.forEach((e) => rows.push([e.date, e.truckId, e.litres, e.cost, e.km || "", e.notes || ""].join(",")));
  rows.push("", "BD PIPELINE", "Company,Stage,Value,Prob%,Weighted");
  state.deals.forEach((d) => rows.push([d.company, d.stage, d.value, d.prob, Math.round(d.value * d.prob / 100)].join(",")));
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `HRMP-${period}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};

const exportHTML = () => {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `HRMP-${state.month || "all"}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};

// ── TAB SWITCHING ────────────────────────────────────────────────
const ALL_TABS = ["dashboard", "fleet", "fuel", "odo", "drivers", "maint", "tyre", "trip", "bd", "report", "export"];

const switchTab = (name) => {
  ALL_TABS.forEach((n) => {
    const p = el(`panel-${n}`), t = el(`tab-${n}`);
    if (p) p.classList.remove("active"); if (t) t.classList.remove("active");
  });
  const pp = el(`panel-${name}`), tt = el(`tab-${name}`);
  if (pp) pp.classList.add("active"); if (tt) tt.classList.add("active");
  state.activeTab = name;
};

// ── INIT ─────────────────────────────────────────────────────────
const init = () => {
  const now = new Date();
  state.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mp = el("monthPicker");
  if (mp) { mp.value = state.month; mp.addEventListener("change", () => { state.month = mp.value; renderAll(); }); }
  const dateFields = ["ffDate", "ofDate", "drfDate", "mfDate", "tfDate", "trfDate", "pfDate"];
  dateFields.forEach((id) => setVal(id, today()));
  const wire = (btnId, fn) => { const b = el(btnId); if (b) b.addEventListener("click", fn); };
  wire("btnFuelAdd", fuelAdd); wire("btnOdoAdd", odoAdd); wire("btnDriverAdd", driverAdd);
  wire("btnMaintAdd", maintAdd); wire("btnTyreAdd", tyreAdd); wire("btnTripAdd", tripAdd);
  wire("btnDealAdd", dealAdd); wire("btnCSV", exportCSV); wire("btnHTML", exportHTML);
  wire("btnPDF", () => window.print());
  const ff = el("fuelFilter"); if (ff) ff.addEventListener("change", renderFuel);
  const pfs = el("filterStage"); if (pfs) pfs.addEventListener("change", renderPipeline);
  const pfst = el("filterStream"); if (pfst) pfst.addEventListener("change", renderPipeline);
  populateSelects();
  buildTruckWorkings();
  renderAll();
};

document.addEventListener("DOMContentLoaded", init);

// ── EXPOSE GLOBALS ───────────────────────────────────────────────
window.switchTab = switchTab;
window.toggleTruck = toggleTruck;
window.addIncomeRow = addIncomeRow;
window.addExpenseRow = addExpenseRow;
window.recalcTruck = recalcTruck;
window.fuelAdd = fuelAdd;
window.odoAdd = odoAdd;
window.driverAdd = driverAdd;
window.maintAdd = maintAdd;
window.tyreAdd = tyreAdd;
window.tripAdd = tripAdd;
window.dealAdd = dealAdd;
window.exportCSV = exportCSV;
window.exportHTML = exportHTML;