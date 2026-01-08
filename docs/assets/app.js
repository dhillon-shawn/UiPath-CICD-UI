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

function validateEmailBasic(s){
  if(!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function noResponse(){
  // github-issue-forms-parser examples commonly show this value
  return "_ No response _";
}

function section(label, value){
  const v = (value && value.length) ? value : noResponse();
  return `### ${label}\n\n${v}\n`;
}

function checkboxBlock(label, items){
  // Correct GitHub task list format under the heading:
  // ### Confirmations
  // - [x] Impacts the public.
  const lines = items.map(({text, on}) => `- [${on ? "x" : " "}] ${text}`).join("\n");
  return `### ${label}\n\n${lines}\n`;
}

function validateAll(){
  const errs = [];

  // Required
  if(!val("user_email")) errs.push("Requester email is required.");
  else if(!validateEmailBasic(val("user_email"))) errs.push("Requester email looks invalid.");

  const targetIso = document.getElementById("target_end_date_picker").value;
  if(!targetIso) errs.push("Target end date is required.");

  const requiredTextareas = [
    { id: "description", label: "Description" },
    { id: "business_value", label: "Business value" },
    { id: "implementation_plan", label: "Implementation plan" },
    { id: "backout_plan", label: "Backout plan" },
    { id: "validation_plan", label: "Validation plan" },
  ];
  for(const f of requiredTextareas){
    if(!val(f.id)) errs.push(`${f.label} is required.`);
  }

  if(!val("impacted_groups")) errs.push("Impacted groups is required.");

  if(!val("impacted_users_emails")) errs.push("Leadership notified (email) is required.");
  else if(!validateEmailBasic(val("impacted_users_emails"))) errs.push("Leadership notified (email) looks invalid.");

  const lastNotifIso = document.getElementById("last_notified_when_picker").value;
  if(!lastNotifIso) errs.push("When were impacted users last notified? is required.");

  if(!document.getElementById("last_notified_how").value.trim()) errs.push("How were impacted users last notified? is required.");
  if(!document.getElementById("effort").value.trim()) errs.push("Effort/Project is required.");

  // Optional backup contact: if provided, validate format
  if(val("backup_contact") && !validateEmailBasic(val("backup_contact"))){
    errs.push("Backup contact email looks invalid.");
  }

  return errs;
}

function buildIssueBody(){
  // IMPORTANT: These labels must match your process.yml labels exactly.
  // - "Backup contact (email)(required for CR approval)" (no extra space)
  // - "Leadership notified  (email)" (double space)
  const targetIso = document.getElementById("target_end_date_picker").value;
  const lastNotifIso = document.getElementById("last_notified_when_picker").value;

  const body = [];

  body.push(section("Requester email", val("user_email")));
  body.push(section("Backup contact (email)(required for CR approval)", val("backup_contact")));
  body.push(section("Target end date", isoToMMDDYY(targetIso)));

  body.push(section("Description", val("description")));
  body.push(section("Business value (executive summary)", val("business_value")));
  body.push(section("Implementation plan", val("implementation_plan")));
  body.push(section("Backout plan", val("backout_plan")));
  body.push(section("Validation plan", val("validation_plan")));

  body.push(section("Impacted groups", val("impacted_groups")));
  body.push(section("Leadership notified  (email)", val("impacted_users_emails")));
  body.push(section("When were impacted users last notified?", isoToMMDDslashYY(lastNotifIso)));
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

async function onCopy(){
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
Next: create a GitHub issue with labels "release" + "process", then paste into the issue body and submit.`);

  toast("Copied ✓");
}

// Wire up buttons
document.getElementById("copyBtn").addEventListener("click", onCopy);
document.getElementById("copyBtn2").addEventListener("click", onCopy);
