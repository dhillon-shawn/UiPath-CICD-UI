function pad2(n){ return String(n).padStart(2, "0"); }

function isoToMMDDYY(iso){ // yyyy-mm-dd -> mm-dd-yy
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${pad2(m)}-${pad2(d)}-${String(y).slice(-2)}`;
}

function isoToMMDDslashYY(iso){ // yyyy-mm-dd -> mm/dd/yy
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${pad2(m)}/${pad2(d)}/${String(y).slice(-2)}`;
}

function val(id){ return document.getElementById(id).value.trim(); }
function checked(id){ return document.getElementById(id).checked; }

function noResponse(){
  return "_ No response _";
}

function section(label, value){
  const v = (value && value.length) ? value : noResponse();
  return `### ${label}\n\n${v}\n`;
}

function checkboxBlock(label, items){
  // GitHub task list format
  const lines = items.map(({text, on}) => `- [${on ? "x" : " "}] ${text}`).join("\n");
  return `### ${label}\n\n${lines}\n`;
}

function normalizeEmails(raw){
  // Allow comma/space/newline separated
  const tokens = (raw || "")
    .split(/[\s,;]+/g)
    .map(s => s.trim())
    .filter(Boolean);
  return tokens;
}

function isEmail(s){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidISODate(iso){
  // Strict YYYY-MM-DD check + real date check
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const dt = new Date(iso + "T00:00:00");
  if(Number.isNaN(dt.getTime())) return false;
  // Ensure it round-trips (guards 2026-02-31)
  const [y,m,d] = iso.split("-").map(Number);
  return dt.getFullYear() === y && (dt.getMonth()+1) === m && dt.getDate() === d;
}

function todayISO(){
  const now = new Date();
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  return `${y}-${m}-${d}`;
}

function cmpISO(a, b){
  // Works for YYYY-MM-DD lexicographically
  if(a === b) return 0;
  return a < b ? -1 : 1;
}

function minLen(id, label, n, errs){
  const s = val(id);
  if(!s) { errs.push(`${label} is required.`); return; }
  if(s.length < n) errs.push(`${label} must be at least ${n} characters.`);
}

function validateAll(){
  const errs = [];

  const requester = val("user_email");
  if(!requester) errs.push("Requester email is required.");
  else if(!isEmail(requester)) errs.push("Requester email looks invalid.");

  const backup = val("backup_contact");
  if(backup && !isEmail(backup)) errs.push("Backup contact email looks invalid.");

  const endIso = document.getElementById("target_end_date_picker").value;
  if(!endIso) errs.push("Target end date is required.");
  else if(!isValidISODate(endIso)) errs.push("Target end date is invalid.");
  else {
    const t = todayISO();
    if(cmpISO(endIso, t) === 0) errs.push("Target end date cannot be today.");
    if(cmpISO(endIso, t) < 0) errs.push("Target end date cannot be in the past.");
  }

  const lastIso = document.getElementById("last_notified_when_picker").value;
  if(!lastIso) errs.push("When were impacted users last notified? is required.");
  else if(!isValidISODate(lastIso)) errs.push("When were impacted users last notified? is invalid.");
  else {
    const t = todayISO();
    if(cmpISO(lastIso, t) > 0) errs.push("When were impacted users last notified? cannot be in the future.");
  }

  // Stronger min-lengths for big paragraphs (tweak as desired)
  minLen("description", "Description", 30, errs);
  minLen("business_value", "Business value", 15, errs);
  minLen("implementation_plan", "Implementation plan", 15, errs);
  minLen("backout_plan", "Backout plan", 10, errs);
  minLen("validation_plan", "Validation plan", 10, errs);

  const groups = val("impacted_groups");
  if(!groups) errs.push("Impacted groups is required.");

  const leadersRaw = val("impacted_users_emails");
  if(!leadersRaw) errs.push("Leadership notified (email) is required.");
  else {
    const emails = normalizeEmails(leadersRaw);
    if(!emails.length) errs.push("Leadership notified (email) is required.");
    else {
      const bad = emails.filter(e => !isEmail(e));
      if(bad.length) errs.push(`Leadership notified contains invalid email(s): ${bad.join(", ")}`);
    }
  }

  if(!document.getElementById("last_notified_how").value.trim())
    errs.push("How were impacted users last notified? is required.");

  if(!document.getElementById("effort").value.trim())
    errs.push("Effort/Project is required.");

  return errs;
}

function buildIssueBody(){
  // Labels MUST match your process.yml labels exactly
  const endIso = document.getElementById("target_end_date_picker").value;
  const lastIso = document.getElementById("last_notified_when_picker").value;

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
  // EXACT double-space in label:
  body.push(section("Leadership notified  (email)", val("impacted_users_emails")));
  body.push(section("When were impacted users last notified?", isoToMMDDslashYY(lastIso)));
  body.push(section("How were impacted users last notified?", document.getElementById("last_notified_how").value.trim()));
  body.push(section("Effort/Project", document.getElementById("effort").value.trim()));

  body.push(checkboxBlock("Confirmations", [
    { text: "Impacts the public.", on: checked("chk_impacts_public") },
    { text: "Involves CDT.", on: checked("chk_involves_cdt") },
    { text: "New app (ESD needs to know).", on: checked("chk_new_app_esd") },
    { text: "Impact a Vendors.", on: checked("chk_vendor_impact") },
  ]));

  return body.join("\n");
}

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

function setMsg(kind, text){
  const el = document.getElementById("msg");
  el.className = `msg ${kind || ""}`.trim();
  el.textContent = text || "";
}

function toast(text){
  const t = document.getElementById("toast");
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
  // reflow
  void btn.offsetWidth;
  btn.classList.add("rippling");
  window.setTimeout(() => btn.classList.remove("rippling"), 560);
}

async function onCopy(ev){
  if(ev?.currentTarget?.classList.contains("ripple")) addRipple(ev.currentTarget, ev);

  const errs = validateAll();
  if(errs.length){
    setMsg("err", errs.join("\n"));
    toast("Fix required fields");
    return;
  }

  const body = buildIssueBody();
  await copyText(body);

  setMsg("ok",
`Copied to clipboard.
Next: create a GitHub issue with labels "release" + "process", paste into the issue body, and submit.`);

  toast("Copied ✓");
}

/* Autosize textareas (start short, expand as you type) */
function autosize(el){
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
function setupAutosize(){
  const areas = document.querySelectorAll("textarea");
  for(const ta of areas){
    autosize(ta);
    ta.addEventListener("input", () => autosize(ta));
  }
}

/* Wire up */
document.getElementById("copyBtn").addEventListener("click", onCopy);
document.getElementById("copyBtn2").addEventListener("click", onCopy);

setupAutosize();
