
// ====== Utilities for LocalStorage CRUD ======
const STORAGE_KEY = 'users_by_email'; // { [email]: User }
const SESSION_KEY = 'current_user_email';

function readUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading users:', e);
    return {};
  }
}

function writeUsers(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function getCurrentEmail() {
  return sessionStorage.getItem(SESSION_KEY);
}
function setCurrentEmail(email) {
  sessionStorage.setItem(SESSION_KEY, email);
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ====== Password validation ======
function evaluatePassword(pwd) {
  const rules = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
  const valid = rules.length && rules.uppercase && rules.number && rules.special;
  return { ...rules, valid };
}

function updatePwdHints(containerUl, pwd) {
  const results = evaluatePassword(pwd);
  for (const [key, ok] of Object.entries(results)) {
    if (key === 'valid') continue;
    const li = containerUl.querySelector(`li[data-rule="${key}"]`);
    if (li) {
      li.classList.toggle('ok', ok);
    }
  }
  return results.valid;
}

// ====== View handling ======
const views = {
  login: document.getElementById('view-login'),
  register: document.getElementById('view-register'),
  profile: document.getElementById('view-profile'),
};

function showView(name) {
  for (const [k, el] of Object.entries(views)) {
    el.classList.toggle('hidden', k !== name);
  }
  // Clear messages when switching
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
  document.getElementById('register-success').textContent = '';
  document.getElementById('profile-msg').textContent = '';
  document.getElementById('profile-error').textContent = '';
}

// ====== Login logic (READ) ======
const formLogin = document.getElementById('form-login');
const loginError = document.getElementById('login-error');
document.getElementById('link-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  showView('register');
});

formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
  const password = document.getElementById('login-password').value || '';
  const users = readUsers();
  const user = users[email];
  if (!user || user.password !== password) {
    loginError.textContent = 'Usuario o contraseña incorrectos. Si no estás registrado, crea una cuenta.';
    return;
  }
  setCurrentEmail(email);
  renderProfile();
  showView('profile');
});

// ====== Register logic (CREATE) ======
const formRegister = document.getElementById('form-register');
const regPwd = document.getElementById('reg-password');
const regPwdRules = document.getElementById('pwd-rules');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');
document.getElementById('btn-cancel-register').addEventListener('click', () => showView('login'));

regPwd.addEventListener('input', () => {
  updatePwdHints(regPwdRules, regPwd.value);
});

formRegister.addEventListener('submit', (e) => {
  e.preventDefault();
  registerError.textContent = '';
  registerSuccess.textContent = '';

  const nombre = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const cedula = document.getElementById('reg-cedula').value.trim();
  const codigo = document.getElementById('reg-codigo').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = regPwd.value;

  // Validate password
  if (!updatePwdHints(regPwdRules, password)) {
    registerError.textContent = 'La contraseña no cumple los requisitos mínimos.';
    return;
  }

  // Basic field checks
  if (!nombre || !apellido || !cedula || !codigo || !email) {
    registerError.textContent = 'Por favor completa todos los campos.';
    return;
  }

  const users = readUsers();
  if (users[email]) {
    registerError.textContent = 'Ya existe un usuario registrado con este correo.';
    return;
  }

  // Create user
  users[email] = {
    nombre,
    apellido,
    cedula,
    codigo,
    email,
    password, // Nota: solo para DEMO (no seguro). No usar en producción.
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeUsers(users);

  registerSuccess.textContent = 'Cuenta creada con éxito. Ahora puedes iniciar sesión.';
  // Auto-fill login email for convenience
  document.getElementById('login-email').value = email;
  // Optionally redirect to login
  setTimeout(() => showView('login'), 600);
});

// ====== Profile logic (READ/UPDATE/DELETE) ======
const formProfile = document.getElementById('form-profile');
const profFields = {
  nombre: document.getElementById('prof-nombre'),
  apellido: document.getElementById('prof-apellido'),
  cedula: document.getElementById('prof-cedula'),
  codigo: document.getElementById('prof-codigo'),
  email: document.getElementById('prof-email'),
  password: document.getElementById('prof-password'),
};
const profileMsg = document.getElementById('profile-msg');
const profileError = document.getElementById('profile-error');

const btnEdit = document.getElementById('btn-edit');
const btnSave = document.getElementById('btn-save');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnDelete = document.getElementById('btn-delete');
const btnLogout = document.getElementById('btn-logout');

const profPwdRules = document.getElementById('pwd-rules-profile');
profFields.password.addEventListener('input', () => {
  if (profFields.password.disabled || !profFields.password.value) {
    // Clear highlights
    Array.from(profPwdRules.querySelectorAll('li')).forEach(li => li.classList.remove('ok'));
    return;
  }
  updatePwdHints(profPwdRules, profFields.password.value);
});

function setProfileEditing(enabled) {
  profFields.email.disabled = !enabled;
  profFields.password.disabled = !enabled;
  btnSave.classList.toggle('hidden', !enabled);
  btnCancelEdit.classList.toggle('hidden', !enabled);
  btnEdit.classList.toggle('hidden', enabled);
}

btnEdit.addEventListener('click', () => setProfileEditing(true));
btnCancelEdit.addEventListener('click', () => {
  setProfileEditing(false);
  renderProfile(); // revert changes
});

btnSave.addEventListener('click', (e) => {
  e.preventDefault();
  profileError.textContent = '';
  profileMsg.textContent = '';

  const currentEmail = getCurrentEmail();
  if (!currentEmail) return;

  const users = readUsers();
  const user = users[currentEmail];
  if (!user) return;

  const newEmail = (profFields.email.value || '').trim().toLowerCase();
  const newPassword = (profFields.password.value || '').trim();

  // If changing password, validate rules
  if (newPassword && !evaluatePassword(newPassword).valid) {
    profileError.textContent = 'La nueva contraseña no cumple los requisitos mínimos.';
    return;
  }

  // If changing email, ensure unique
  if (newEmail !== currentEmail && users[newEmail]) {
    profileError.textContent = 'Ya existe un usuario con el correo indicado.';
    return;
  }

  // Update in map
  if (newEmail !== currentEmail) {
    users[newEmail] = { ...user, email: newEmail, updatedAt: new Date().toISOString() };
    delete users[currentEmail];
    setCurrentEmail(newEmail);
  }

  if (newPassword) {
    const updated = users[getCurrentEmail()];
    updated.password = newPassword;
    updated.updatedAt = new Date().toISOString();
    users[getCurrentEmail()] = updated;
  }

  writeUsers(users);
  setProfileEditing(false);
  renderProfile();
  profileMsg.textContent = 'Cambios guardados correctamente.';
});

btnDelete.addEventListener('click', () => {
  const currentEmail = getCurrentEmail();
  if (!currentEmail) return;
  const ok = confirm('Esta acción eliminará tu cuenta y tus datos locales. ¿Deseas continuar?');
  if (!ok) return;
  const users = readUsers();
  delete users[currentEmail];
  writeUsers(users);
  clearSession();
  showView('login');
});

btnLogout.addEventListener('click', () => {
  clearSession();
  showView('login');
});

function renderProfile() {
  const email = getCurrentEmail();
  if (!email) return;
  const users = readUsers();
  const user = users[email];
  if (!user) return;
  profFields.nombre.value = user.nombre || '';
  profFields.apellido.value = user.apellido || '';
  profFields.cedula.value = user.cedula || '';
  profFields.codigo.value = user.codigo || '';
  profFields.email.value = user.email || '';
  profFields.password.value = '';
  setProfileEditing(false);
}

// ====== Initial boot ======
(function init() {
  const current = getCurrentEmail();
  if (current && readUsers()[current]) {
    renderProfile();
    showView('profile');
  } else {
    showView('login');
  }
})();
