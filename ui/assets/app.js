// assets/app.js
function pad2(n){ return String(n).padStart(2, "0"); }

function isoToMMDDYY(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${pad2(m)}-${pad2(d)}-${String(y).slice(-2)}`;
}

function isoToMMDDslashYY(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${pad2(m)}/${pad2(d)}/${String(y).slice(-2)}`;
}

function el(id){ return document.getElementById(id); }
function val(id){ return el(id).value.trim(); }
function checked(id){ return el(id).checked; }

function noResponse(){ return "_ No response _"; }

function section(label, value){
  const v = (value && value.length) ? value : noResponse();
  return `### ${label}\n\n${v}\n`;
}

function checkboxBlock(label, items){
  const lines = items.map(({text, on}) => `- [${on ? "x" : " "}] ${text}`).join("\n");
  return `### ${label}\n\n${lines}\n`;
}

function normalizeEmails(raw){
  return (raw || "")
    .split(/[\s,;]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function isEmail(s){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidISODate(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const dt = new Date(iso + "T00:00:00");
  if(Number.isNaN(dt.getTime())) return false;
  const [y,m,d] = iso.split("-").map(Number);
  return dt.getFullYear() === y && (dt.getMonth()+1) === m && dt.getDate() === d;
}

function todayISO(){
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
}

function cmpISO(a,b){
  if(a===b) return 0;
  return a < b ? -1 : 1;
}

/* ===== UI helpers ===== */
function toast(text){
  const t = el("toast");
  t.textContent = text;
  t.classList.add("show");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => t.classList.remove("show"), 2200);
}

function addRipple(btn, ev){
  const r = btn.getBoundingClientRect();
  const x = ev.clientX - r.left;
  const y = ev.clientY - r.top;
  btn.style.setProperty("--rx", `${x}px`);
  btn.style.setProperty("--ry", `${y}px`);
  btn.classList.remove("rippling");
  void btn.offsetWidth;
  btn.classList.add("rippling");
  window.setTimeout(() => btn.classList.remove("rippling"), 560);
}

function setCopiedState(btn){
  if(!btn) return;
  btn.classList.add("copied");
  const label = btn.querySelector(".btn-label");
  if(label) label.textContent = "Copied";
  window.clearTimeout(setCopiedState._t);
  setCopiedState._t = window.setTimeout(() => {
    btn.classList.remove("copied");
    if(label) label.textContent = "Copy to clipboard";
  }, 1800);
}

/* Modal */
function openModal(message){
  el("modalBody").textContent = message;
  el("modalBackdrop").classList.add("show");
  el("modalBackdrop").setAttribute("aria-hidden", "false");
}
function closeModal(){
  el("modalBackdrop").classList.remove("show");
  el("modalBackdrop").setAttribute("aria-hidden", "true");
}

/* Accordion */
function setAccordionOpen(acc, open){
  acc.dataset.open = open ? "true" : "false";
  const head = acc.querySelector(".acc-head");
  if(head) head.setAttribute("aria-expanded", open ? "true" : "false");
}
function setupAccordions(){
  document.querySelectorAll("[data-accordion]").forEach(acc => {
    const def = acc.getAttribute("data-default") === "open";
    setAccordionOpen(acc, def);

    const head = acc.querySelector(".acc-head");
    if(!head) return;
    head.addEventListener("click", () => {
      const isOpen = acc.dataset.open === "true";
      setAccordionOpen(acc, !isOpen);
    });
  });
}

/* Autosize */
function autosize(area){
  area.style.height = "0px";
  const next = Math.min(area.scrollHeight, 1000);
  area.style.height = `${Math.max(next, 56)}px`;
}
function setupAutosize(){
  const areas = document.querySelectorAll("textarea");
  for(const ta of areas){
    requestAnimationFrame(() => autosize(ta));
    ta.addEventListener("input", () => autosize(ta));
    ta.addEventListener("paste", () => requestAnimationFrame(() => autosize(ta)));
  }
}

/* Counters */
const MIN_LEN = {
  description: 30,
  business_value: 15,
  implementation_plan: 15,
  backout_plan: 10,
  validation_plan: 10
};
function updateCounters(){
  document.querySelectorAll("[data-counter-for]").forEach(node => {
    const id = node.getAttribute("data-counter-for");
    const target = el(id);
    if(!target) return;
    const min = MIN_LEN[id] ?? 0;
    const len = (target.value || "").length;
    node.textContent = min ? `${len}/${min}` : `${len}`;
    // tint via inline style only if needed; keep simple:
    node.style.opacity = (min && len < min) ? "0.85" : "1";
  });
}

/* Field error rendering */
function clearFieldErrors(){
  document.querySelectorAll(".field").forEach(f => {
    f.classList.remove("has-error");
    const e = f.querySelector(".error");
    if(e) e.textContent = "";
  });
}
function setFieldError(fieldId, message){
  const wrapper = document.querySelector(`.field[data-field="${fieldId}"]`);
  if(!wrapper) return;
  wrapper.classList.add("has-error");
  const e = wrapper.querySelector(".error");
  if(e) e.textContent = message;
}

/* Scroll/focus first invalid */
function focusFirstError(fieldId){
  const wrapper = document.querySelector(`.field[data-field="${fieldId}"]`);
  if(!wrapper) return;

  // Open accordion containing this field
  const acc = wrapper.closest("[data-accordion]");
  if(acc) setAccordionOpen(acc, true);

  // Focus the input/textarea/select
  const input = wrapper.querySelector("input, textarea, select");
  if(input) input.focus({ preventScroll: true });

  // Smooth scroll
  const y = wrapper.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

/* ===== Validation ===== */
function validateAll(){
  const errs = []; // [{field, msg}]
  const t = todayISO();

  const requester = val("user_email");
  if(!requester) errs.push({ field: "user_email", msg: "Requester email is required." });
  else if(!isEmail(requester)) errs.push({ field: "user_email", msg: "Requester email looks invalid." });

  const backup = val("backup_contact");
  if(backup && !isEmail(backup)) errs.push({ field: "backup_contact", msg: "Backup contact email looks invalid." });

  const endIso = el("target_end_date_picker").value;
  if(!endIso) errs.push({ field: "target_end_date_picker", msg: "Target end date is required." });
  else if(!isValidISODate(endIso)) errs.push({ field: "target_end_date_picker", msg: "Target end date is invalid." });
  else {
    if(cmpISO(endIso, t) === 0) errs.push({ field: "target_end_date_picker", msg: "Target end date cannot be today." });
    if(cmpISO(endIso, t) < 0) errs.push({ field: "target_end_date_picker", msg: "Target end date cannot be in the past." });
  }

  const lastIso = el("last_notified_when_picker").value;
  if(!lastIso) errs.push({ field: "last_notified_when_picker", msg: "When were impacted users last notified? is required." });
  else if(!isValidISODate(lastIso)) errs.push({ field: "last_notified_when_picker", msg: "When were impacted users last notified? is invalid." });
  else if(cmpISO(lastIso, t) > 0) errs.push({ field: "last_notified_when_picker", msg: "Last notified date cannot be in the future." });

  // text minimums
  for(const [id, min] of Object.entries(MIN_LEN)){
    const s = val(id);
    if(!s) errs.push({ field: id, msg: `${labelFor(id)} is required.` });
    else if(s.length < min) errs.push({ field: id, msg: `${labelFor(id)} must be at least ${min} characters.` });
  }

  if(!val("impacted_groups")) errs.push({ field: "impacted_groups", msg: "Impacted groups is required." });

  const leadersRaw = val("impacted_users_emails");
  if(!leadersRaw) errs.push({ field: "impacted_users_emails", msg: "Leadership notified (email) is required." });
  else {
    const emails = normalizeEmails(leadersRaw);
    if(!emails.length) errs.push({ field: "impacted_users_emails", msg: "Leadership notified (email) is required." });
    else {
      const bad = emails.filter(e => !isEmail(e));
      if(bad.length) errs.push({ field: "impacted_users_emails", msg: `Invalid email(s): ${bad.join(", ")}` });
    }
  }

  if(!el("last_notified_how").value.trim())
    errs.push({ field: "last_notified_how", msg: "How were impacted users last notified? is required." });

  if(!el("effort").value.trim())
    errs.push({ field: "effort", msg: "Effort/Project is required." });

  return errs;
}

function labelFor(id){
  const map = {
    description: "Description",
    business_value: "Business value",
    implementation_plan: "Implementation plan",
    backout_plan: "Backout plan",
    validation_plan: "Validation plan"
  };
  return map[id] ?? id;
}

/* ===== Payload ===== */
function buildIssueBody(){
  // IMPORTANT: labels must match your process.yml headings exactly
  const endIso = el("target_end_date_picker").value;
  const lastIso = el("last_notified_when_picker").value;

  const body = [];
  body.push(section("Requester email", val("user_email")));
  body.push(section("Backup contact (email)(required for CR approval)", val("backup_contact")));
  body.push(section("Target end date", isoToMMDDYY(endIso)));

  body.push(section("Description", val("description")));
  body.push(section("Business value (executive summary)", val("business_value")));
  body.push(section("Implementation plan", val("implementation_plan")));
  body.push(section("Backout plan", val("backout_plan")));
  body.push(section("Validation plan", val("validation_plan")));

  body.push(section("Impacted groups", val("impacted_groups")));
  body.push(section("Leadership notified  (email)", val("impacted_users_emails"))); // double-space preserved
  body.push(section("When were impacted users last notified?", isoToMMDDslashYY(lastIso)));
  body.push(section("How were impacted users last notified?", el("last_notified_how").value.trim()));
  body.push(section("Effort/Project", el("effort").value.trim()));

  body.push(checkboxBlock("Confirmations", [
    { text: "Impacts the public.", on: checked("chk_impacts_public") },
    { text: "Involves CDT.", on: checked("chk_involves_cdt") },
    { text: "New app (ESD needs to know).", on: checked("chk_new_app_esd") },
    { text: "Impact a Vendors.", on: checked("chk_vendor_impact") },
  ]));

  return body.join("\n");
}

/* Clipboard */
async function copyText(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/* Inline message */
function setMsg(kind, text){
  const m = el("msg");
  m.className = `msg ${kind || ""}`.trim();
  m.textContent = text || "";
}

/* ===== Copy handler ===== */
async function onCopy(ev){
  const btn = ev?.currentTarget;
  if(btn?.classList.contains("ripple")) addRipple(btn, ev);

  clearFieldErrors();

  const errors = validateAll();
  if(errors.length){
    // Render field-level errors
    errors.forEach(e => setFieldError(e.field, e.msg));

    // Open a modal + keep inline message
    const msg = errors.map(e => e.msg).join("\n");
    setMsg("err", msg);
    openModal(msg);

    // Focus the first error
    focusFirstError(errors[0].field);
    return;
  }

  const body = buildIssueBody();
  await copyText(body);

  setMsg("ok",
`Copied to clipboard.
Next: create a GitHub issue with labels "release" + "process", paste into the issue body, and submit.`);

  setCopiedState(el("copyBtn"));
  setCopiedState(el("copyBtn2"));
  toast("Copied ✓");
}

/* Live validation (optional light-touch) */
function setupLiveValidation(){
  const watch = [
    "user_email","backup_contact","target_end_date_picker","last_notified_when_picker",
    "description","business_value","implementation_plan","backout_plan","validation_plan",
    "impacted_groups","impacted_users_emails","last_notified_how","effort"
  ];

  watch.forEach(id => {
    const node = el(id);
    if(!node) return;
    node.addEventListener("input", () => {
      // remove error styling when user edits
      const wrapper = document.querySelector(`.field[data-field="${id}"]`);
      if(wrapper){
        wrapper.classList.remove("has-error");
        const e = wrapper.querySelector(".error");
        if(e) e.textContent = "";
      }
      updateCounters();
    });
    node.addEventListener("change", () => updateCounters());
  });

  updateCounters();
}

/* Wire up */
el("copyBtn").addEventListener("click", onCopy);
el("copyBtn2").addEventListener("click", onCopy);

el("modalClose").addEventListener("click", closeModal);
el("modalOk").addEventListener("click", (e) => { addRipple(e.currentTarget, e); closeModal(); });
el("modalBackdrop").addEventListener("click", (e) => { if(e.target?.id === "modalBackdrop") closeModal(); });
document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeModal(); });

setupAccordions();
setupAutosize();
setupLiveValidation();
