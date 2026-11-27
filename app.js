// Portal de Evidencias - versión de demostración para navegador
const $ = (id) => document.getElementById(id);
const DB_USERS = "portal_users";
const DB_CURRENT = "portal_current";
const DB_DATA = "portal_data";

let currentUser = null;
let toastTimer;

function notify(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("show"), 2800);
}
function users() { return JSON.parse(localStorage.getItem(DB_USERS) || "[]"); }
function saveUsers(list) { localStorage.setItem(DB_USERS, JSON.stringify(list)); }
function userData() {
  const all = JSON.parse(localStorage.getItem(DB_DATA) || "{}");
  return all[currentUser.email] || { evidences: [], academic: [], extra: [], projects: [], profile: {} };
}
function saveData(data) {
  const all = JSON.parse(localStorage.getItem(DB_DATA) || "{}");
  all[currentUser.email] = data;
  localStorage.setItem(DB_DATA, JSON.stringify(all));
}
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(name + "View").classList.remove("hidden");
  $("mainNav").classList.remove("open");
  if (name === "dashboard" && currentUser) {
    document.querySelectorAll(".auth-only").forEach(x => x.classList.remove("hidden"));
    renderDashboard();
  }
}
function showSection(name) {
  document.querySelectorAll(".portal-section").forEach(s => s.classList.add("hidden"));
  $(name + "Section").classList.remove("hidden");
  document.querySelectorAll(".side-link").forEach(b => b.classList.toggle("active", b.dataset.section === name));
}
document.addEventListener("click", e => {
  const view = e.target.closest("[data-view]");
  if (view) showView(view.dataset.view);
  const section = e.target.closest("[data-section]");
  if (section) showSection(section.dataset.section);
});
$("menuBtn").addEventListener("click", () => $("mainNav").classList.toggle("open"));

$("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim().toLowerCase();
  const password = $("regPassword").value;
  if (password !== $("regConfirm").value) return notify("Las contraseñas no coinciden.");
  const list = users();
  if (list.some(u => u.email === email || u.folio === $("regFolio").value.trim())) return notify("Ese correo o matrícula ya está registrado.");
  const user = { name, email, phone: $("regPhone").value.trim(), folio: $("regFolio").value.trim(), password, curp: "" };
  list.push(user); saveUsers(list);
  $("registerForm").reset();
  notify("Cuenta creada. Ahora inicia sesión.");
  showView("login");
});

$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const identity = $("loginUser").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  const user = users().find(u => (u.email === identity || u.folio.toLowerCase() === identity) && u.password === password);
  if (!user) return notify("Usuario o contraseña incorrectos.");
  currentUser = user;
  sessionStorage.setItem(DB_CURRENT, user.email);
  $("loginForm").reset();
  showView("dashboard");
  notify("Bienvenido al Portal de Evidencias.");
});

$("logoutBtn").addEventListener("click", () => {
  currentUser = null; sessionStorage.removeItem(DB_CURRENT);
  document.querySelectorAll(".auth-only").forEach(x => x.classList.add("hidden"));
  showView("login"); notify("Sesión cerrada.");
});

function renderDashboard() {
  if (!currentUser) return;
  const data = userData();
  $("welcomeName").textContent = currentUser.name.split(" ")[0];
  $("totalCount").textContent = data.evidences.length;
  $("pendingCount").textContent = data.evidences.filter(x => x.status === "Pendiente").length;
  $("verifiedCount").textContent = data.evidences.filter(x => x.status === "Verificado").length;
  renderEvidence(data);
  renderSimple("academicList", data.academic, x => `<b>${escapeHTML(x.level)} · ${escapeHTML(x.school)}</b><br><small>${escapeHTML(x.doc)} · ${escapeHTML(x.year || "Año no indicado")}</small>`);
  renderSimple("extraList", data.extra, x => `<b>${escapeHTML(x.name)}</b><br><small>${escapeHTML(x.type)} · ${escapeHTML(x.date)} · ${escapeHTML(x.subject || "Sin materia")}</small>`);
  renderSimple("projectList", data.projects, x => `<b>${escapeHTML(x.name)} · ${escapeHTML(x.subject)}</b><br><small>${escapeHTML(x.description)}</small>${x.link ? `<br><a href="${safeURL(x.link)}" target="_blank" rel="noopener">Abrir proyecto</a>` : ""}`);
  renderPhotos(data);
  $("profileName").value = currentUser.name;
  $("profileEmail").value = currentUser.email;
  $("profilePhone").value = currentUser.phone || "";
  $("profileFolio").value = currentUser.folio || "";
  $("profileCurp").value = currentUser.curp || "";
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function safeURL(value) {
  try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? escapeHTML(u.href) : "#"; } catch { return "#"; }
}
function renderEvidence(data) {
  const q = $("searchEvidence").value.toLowerCase();
  const status = $("filterStatus").value;
  const filtered = data.evidences.filter(x => x.title.toLowerCase().includes(q) && (status === "todos" || x.status === status));
  $("evidenceList").innerHTML = filtered.length ? filtered.map(x => `
    <article class="evidence-item">
      <div class="file-info"><span class="file-icon">${x.kind === "application/pdf" ? "📄" : "🖼️"}</span>
        <div><b>${escapeHTML(x.title)}</b><small>${escapeHTML(x.type)} · ${escapeHTML(x.date)} · ${escapeHTML(x.fileName)}</small></div>
      </div><span class="status ${x.status}">${x.status}</span>
    </article>`).join("") : '<div class="empty">No se encontraron evidencias.</div>';
}
$("searchEvidence").addEventListener("input", () => renderEvidence(userData()));
$("filterStatus").addEventListener("change", () => renderEvidence(userData()));

$("uploadForm").addEventListener("submit", e => {
  e.preventDefault();
  const file = $("evidenceFile").files[0];
  if (!file) return notify("Selecciona un archivo.");
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) return notify("Solo se permiten archivos PDF, JPG o PNG.");
  if (file.size > 2 * 1024 * 1024) return notify("El archivo supera 2 MB en esta versión de demostración.");
  const reader = new FileReader();
  reader.onload = () => {
    const data = userData();
    data.evidences.unshift({
      id: Date.now(), title: $("evidenceTitle").value.trim(), type: $("evidenceType").value,
      date: $("evidenceDate").value, fileName: file.name, kind: file.type, content: reader.result, status: "Pendiente"
    });
    try { saveData(data); $("uploadForm").reset(); renderDashboard(); showSection("evidencias"); notify("Evidencia guardada correctamente."); }
    catch { notify("No hay espacio disponible en el almacenamiento del navegador."); }
  };
  reader.readAsDataURL(file);
});

$("profileForm").addEventListener("submit", e => {
  e.preventDefault();
  const list = users();
  const i = list.findIndex(u => u.email === currentUser.email);
  list[i] = {...list[i], name: $("profileName").value.trim(), phone: $("profilePhone").value.trim(), folio: $("profileFolio").value.trim(), curp: $("profileCurp").value.trim()};
  currentUser = list[i]; saveUsers(list); renderDashboard(); notify("Perfil actualizado.");
});
$("academicForm").addEventListener("submit", e => {
  e.preventDefault(); const d = userData();
  d.academic.unshift({level:$("academicLevel").value, school:$("academicSchool").value.trim(), year:$("academicYear").value, doc:$("academicDoc").value});
  saveData(d); $("academicForm").reset(); renderDashboard(); notify("Formación agregada.");
});
$("extraForm").addEventListener("submit", e => {
  e.preventDefault(); const d = userData();
  d.extra.unshift({name:$("extraName").value.trim(), type:$("extraType").value, date:$("extraDate").value, subject:$("extraSubject").value.trim()});
  saveData(d); $("extraForm").reset(); renderDashboard(); notify("Actividad agregada.");
});
$("projectForm").addEventListener("submit", e => {
  e.preventDefault(); const d = userData();
  d.projects.unshift({name:$("projectName").value.trim(), subject:$("projectSubject").value.trim(), description:$("projectDescription").value.trim(), link:$("projectLink").value.trim()});
  saveData(d); $("projectForm").reset(); renderDashboard(); notify("Proyecto agregado.");
});
function renderSimple(id, items, template) {
  $(id).innerHTML = items.length ? items.map(x => `<article class="simple-item"><div>${template(x)}</div></article>`).join("") : '<div class="empty">Todavía no hay registros.</div>';
}
function renderPhotos(data) {
  const photos = data.evidences.filter(x => x.kind.startsWith("image/"));
  $("photoList").innerHTML = photos.length ? photos.map(x => `<article class="photo-card"><img src="${x.content}" alt="${escapeHTML(x.title)}"><p><b>${escapeHTML(x.title)}</b><br>${escapeHTML(x.date)}</p></article>`).join("") : '<div class="empty">Aún no has subido fotografías. Usa “Subir evidencia” y selecciona “Fotografía”.</div>';
}

// Recuperar sesión mientras la pestaña siga abierta.
const savedEmail = sessionStorage.getItem(DB_CURRENT);
if (savedEmail) {
  currentUser = users().find(u => u.email === savedEmail) || null;
  if (currentUser) showView("dashboard");
}
