function pad2(n){ return String(n).padStart(2,'0'); }

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

function getVal(id){ return document.getElementById(id).value.trim(); }
function getChecked(id){ return document.getElementById(id).checked; }

function noResponse(){
  // Matches the “_ No response _” style shown in the parser’s example issue body. :contentReference[oaicite:3]{index=3}
  return "_ No response _";
}

function section(label, value){
  const v = (value && value.length) ? value : noResponse();
  return `### ${label}\n\n${v}\n`;
}

function checkboxBlock(label, items){
  // Issue forms render checkbox options as a markdown task list, e.g. "- [X] macOS". :contentReference[oaicite:4]{index=4}
  const lines = items.map(({text, checked}) => `- [${checked ? "X" : " "}] ${text}`).join("\n");
  return `### ${label}\n\n${lines}\n`;
}

function validateEmailBasic(s){
  if(!s) return false;
  // not RFC-perfect; just catches obvious mistakes
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validate(){
  const errs = [];

  const requiredEmails = [
    { id: "user_email", label: "Requester email" },
    { id: "impacted_users_emails", label: "Leadership notified (email)" },
  ];
  for (const e of requiredEmails){
    const v = getVal(e.id);
    if(!v) errs.push(`${e.label} is required.`);
    else if(!validateEmailBasic(v)) errs.push(`${e.label} looks invalid.`);
  }

  const targetIso = document.getElementById("target_end_date_picker").value;
  if(!targetIso) errs.push("Target end date is required.");

  const lastNotifIso = document.getElementById("last_notified_when_picker").value;
  if(!lastNotifIso) errs.push("When were impacted users last notified? is required.");

  const requiredText = [
    { id: "description", label: "Description" },
    { id: "business_value", label: "Business value" },
    { id: "implementation_plan", label: "Implementation plan" },
    { id: "backout_plan", label: "Backout plan" },
    { id: "validation_plan", label: "Validation plan" },
    { id: "impacted_groups", label: "Impacted groups" },
  ];
  for (const t of requiredText){
    if(!getVal(t.id)) errs.push(`${t.label} is required.`);
  }

  const lastHow = document.getElementById("last_notified_how").value.trim();
  if(!lastHow) errs.push("How were impacted users last notified? is required.");

  const effort = document.getElementById("effort").value.trim();
  if(!effort) errs.push("Effort/Project is required.");

  return errs;
}

function buildIssueBody(){
  // IMPORTANT: labels must match the issue form labels EXACTLY so the parser can map them.
  // This is the same structure shown in the github-issue-forms-parser README example. :contentReference[oaicite:5]{index=5}
  const targetIso = document.getElementById("target_end_date_picker").value;
  const lastNotifIso = document.getElementById("last_notified_when_picker").value;

  const bodyParts = [];

  bodyParts.push(section("Requester email", getVal("user_email")));
  bodyParts.push(section("Backup contact (email)(required for CR approval)", getVal("backup_contact")));
  bodyParts.push(section(
    "Target end date",
    isoToMMDDYY(targetIso) || getVal("target_end_date") // (fallback if you later add a raw field)
  ));

  bodyParts.push(section("Description", getVal("description")));
  bodyParts.push(section("Business value (executive summary)", getVal("business_value")));
  bodyParts.push(section("Implementation plan", getVal("implementation_plan")));
  bodyParts.push(section("Backout plan", getVal("backout_plan")));
  bodyParts.push(section("Validation plan", getVal("validation_plan")));

  bodyParts.push(section("Impacted groups", getVal("impacted_groups")));
  bodyParts.push(section("Leadership notified  (email)", getVal("impacted_users_emails")));
  bodyParts.push(section("When were impacted users last notified?", isoToMMDDslashYY(lastNotifIso)));
  bodyParts.push(section("How were impacted users last notified?", document.getElementById("last_notified_how").value.trim()));
  bodyParts.push(section("Effort/Project", document.getElementById("effort").value.trim()));

  bodyParts.push(checkboxBlock("Confirmations", [
    { text: "Impacts the public.", checked: getChecked("chk_impacts_public") },
    { text: "Involves CDT.", checked: getChecked("chk_involves_cdt") },
    { text: "New app (ESD needs to know).", checked: getChecked("chk_new_app_esd") },
    { text: "Impact a Vendors.", checked: getChecked("chk_vendor_impact") },
  ]));

  return bodyParts.join("\n");
}

async function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
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
  el.className = `msg ${kind}`;
  el.textContent = text;
}

function openIssue(){
  const owner = getVal("owner");
  const repo = getVal("repo");
  if(!owner || !repo){
    setMsg("err", "Set Owner/org and Repo first (or just use Copy + paste manually).");
    return;
  }

  const title = getVal("issueTitle");
  const template = getVal("openTemplate"); // optional (works best with a markdown issue template)
  const labels = "release,process";

  const base = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/new`;
  const params = new URLSearchParams();
  params.set("labels", labels);
  if(title) params.set("title", title);
  if(template) params.set("template", template);

  window.open(`${base}?${params.toString()}`, "_blank");
}

document.getElementById("previewBtn").addEventListener("click", () => {
  const errs = validate();
  if(errs.length){
    setMsg("err", errs.join("\n"));
    return;
  }
  setMsg("", "");
  document.getElementById("preview").textContent = buildIssueBody();
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const errs = validate();
  if(errs.length){
    setMsg("err", errs.join("\n"));
    return;
  }
  const body = buildIssueBody();
  await copyText(body);
  document.getElementById("preview").textContent = body;
  setMsg("ok", "Copied. Paste into the GitHub issue body and submit.");
});

document.getElementById("openIssueBtn").addEventListener("click", openIssue);
