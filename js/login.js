import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBA0yD6IqPV_x56BkXEfAG9zAF7wnYt_Zc',
  authDomain: 'lscustom-5014d.firebaseapp.com',
  projectId: 'lscustom-5014d',
  storageBucket: 'lscustom-5014d.firebasestorage.app',
  messagingSenderId: '810475753399',
  appId: '1:810475753399:web:5aeb4067f810995a60e232',
  measurementId: 'G-L6ELMX9LQX'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORAGE_KEY = 'lscustom_users';
const SESSION_KEY = 'lscustom_session';
const authForm = document.getElementById('authForm');
const pseudoInput = document.getElementById('pseudo');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const switchAuthBtn = document.getElementById('switchAuthBtn');
const switchText = document.getElementById('switchText');
const pageTitle = document.getElementById('pageTitle');
const identifierLabel = document.getElementById('identifierLabel');
const loginStatus = document.getElementById('loginStatus');
const privacyCheck = document.getElementById('privacyCheck');
const termsCheck = document.getElementById('termsCheck');
const modeRegister = [...document.querySelectorAll('[data-mode="register"]')];

let isRegisterMode = true;

function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Erreur lecture utilisateurs locale:', error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function setStatus(message, isError = false) {
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? '#ff7a7a' : '#d9d9df';
}

function persistSession(user) {
  if (user && user.status === 'pending') {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('currentUser');
    return;
  }

  const roleFlags = {
    isEmployee: !!user.isEmployee || false,
    isEmploye: !!user.isEmploye || false,
    isAdmin: !!user.isAdmin || false,
    isPatron: !!user.isPatron || false,
    isRH: !!user.isRH || false,
    isLivreur: !!user.isLivreur || false
  };

  const payload = {
    uid: user.id || user.pseudo,
    pseudo: user.pseudo,
    username: user.pseudo,
    displayName: user.pseudo,
    status: user.status || 'approved',
    ...roleFlags,
    loggedInAt: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  localStorage.setItem('currentUser', JSON.stringify(payload));
}

function updateMode() {
  const isLogin = !isRegisterMode;

  pageTitle.innerHTML = isLogin
    ? 'Se connecter à ton <em>espace</em>'
    : 'Créer un <em>compte</em>';

  identifierLabel.textContent = isLogin ? 'Pseudo ou email' : 'Pseudo';
  submitBtn.textContent = isLogin ? 'Me connecter' : 'Créer mon compte';
  switchText.textContent = isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?';
  switchAuthBtn.textContent = isLogin ? 'Créer un compte' : 'Se connecter';

  modeRegister.forEach((el) => {
    el.style.display = isLogin ? 'none' : '';
  });

  if (isLogin) {
    confirmPasswordInput.value = '';
    privacyCheck.checked = false;
    termsCheck.checked = false;
  }

  setStatus(
    isLogin
      ? 'Connecte-toi pour accéder à ton espace.'
      : 'Crée ton compte pour accéder à ton espace.'
  );

  if (confirmPasswordInput) {
    confirmPasswordInput.required = !isLogin;
  }
}

function sanitizeValue(value) {
  return String(value || '').trim();
}

function validateRegisterForm() {
  const pseudo = sanitizeValue(pseudoInput.value);
  const password = sanitizeValue(passwordInput.value);
  const confirmPassword = sanitizeValue(confirmPasswordInput.value);

  if (!pseudo || !password) {
    setStatus('Remplis ton pseudo et ton mot de passe.', true);
    return false;
  }

  if (pseudo.length < 3) {
    setStatus('Le pseudo doit contenir au moins 3 caractères.', true);
    return false;
  }

  if (password.length < 6) {
    setStatus('Le mot de passe doit contenir au moins 6 caractères.', true);
    return false;
  }

  if (password !== confirmPassword) {
    setStatus('Les mots de passe ne correspondent pas.', true);
    return false;
  }

  if (!privacyCheck.checked || !termsCheck.checked) {
    setStatus('Tu dois accepter la confidentialité et les conditions.', true);
    return false;
  }

  return true;
}

function validateLoginForm() {
  const pseudo = sanitizeValue(pseudoInput.value);
  const password = sanitizeValue(passwordInput.value);

  if (!pseudo || !password) {
    setStatus('Saisis ton pseudo et ton mot de passe.', true);
    return false;
  }

  return true;
}

async function getUserFromDb(pseudo) {
  const normalizedPseudo = pseudo.toLowerCase();
  const q = query(collection(db, 'users'), where('pseudo', '==', normalizedPseudo));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const first = snapshot.docs[0];
  return { id: first.id, ...first.data() };
}

async function saveUserInDb(user) {
  await addDoc(collection(db, 'users'), {
    pseudo: user.pseudo.toLowerCase(),
    password: user.password,
    displayName: user.pseudo,
    username: user.pseudo,
    status: 'pending',
    isEmployee: false,
    isEmploye: false,
    isAdmin: false,
    isPatron: false,
    isRH: false,
    isLivreur: false,
    createdAt: new Date().toISOString()
  });
}

async function handleRegister() {
  if (!validateRegisterForm()) {
    return;
  }

  const pseudo = sanitizeValue(pseudoInput.value);
  const password = sanitizeValue(passwordInput.value);
  submitBtn.disabled = true;
  submitBtn.textContent = 'Création...';

  try {
    const existingUser = await getUserFromDb(pseudo);
    if (existingUser) {
      setStatus('Ce pseudo est déjà utilisé. Choisis un autre nom.', true);
      return;
    }

    const newUser = {
      id: Date.now(),
      pseudo,
      password,
      displayName: pseudo,
      username: pseudo,
      status: 'pending',
      isEmployee: false,
      isEmploye: false,
      isAdmin: false,
      isPatron: false,
      isRH: false,
      isLivreur: false,
      createdAt: new Date().toISOString()
    };

    await saveUserInDb(newUser);

    const users = getUsers();
    users.push({
      id: newUser.id,
      pseudo: newUser.pseudo,
      password: newUser.password,
      displayName: newUser.displayName,
      username: newUser.username,
      status: 'pending',
      isEmployee: false,
      isEmploye: false,
      isAdmin: false,
      isPatron: false,
      isRH: false,
      isLivreur: false,
      createdAt: newUser.createdAt
    });
    saveUsers(users);

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('currentUser');
    setStatus(`Compte créé avec succès. Votre compte est en attente de validation par le patron ou le RH.`);

    pseudoInput.value = '';
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    privacyCheck.checked = false;
    termsCheck.checked = false;

    isRegisterMode = false;
    updateMode();
  } catch (error) {
    console.error('Erreur Firebase inscription:', error);

    const users = getUsers();
    const alreadyExists = users.some((user) => user.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (alreadyExists) {
      setStatus('Ce pseudo est déjà utilisé. Choisis un autre nom.', true);
      return;
    }

    const fallbackUser = {
      id: Date.now(),
      pseudo,
      password,
      displayName: pseudo,
      username: pseudo,
      status: 'pending',
      isEmployee: false,
      isEmploye: false,
      isAdmin: false,
      isPatron: false,
      isRH: false,
      isLivreur: false,
      createdAt: new Date().toISOString()
    };
    users.push(fallbackUser);
    saveUsers(users);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('currentUser');
    setStatus(`Compte créé localement. Votre compte est en attente de validation par le patron ou le RH.`);
    isRegisterMode = false;
    updateMode();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isRegisterMode ? 'Créer mon compte' : 'Me connecter';
  }
}

async function handleLogin() {
  if (!validateLoginForm()) {
    return;
  }

  const pseudo = sanitizeValue(pseudoInput.value);
  const password = sanitizeValue(passwordInput.value);
  submitBtn.disabled = true;
  submitBtn.textContent = 'Connexion...';

  try {
    const userFromDb = await getUserFromDb(pseudo);
    const isValid = userFromDb && userFromDb.password === password;

    if (userFromDb && userFromDb.status === 'pending') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('currentUser');
      setStatus('Compte en attente de validation par le patron ou le RH.', true);
      return;
    }

    if (!isValid) {
      const localUsers = getUsers();
      const localUser = localUsers.find(
        (account) => account.pseudo.toLowerCase() === pseudo.toLowerCase() && account.password === password
      );

      if (!localUser) {
        setStatus('Identifiants incorrects. Vérifie ton pseudo et ton mot de passe.', true);
        return;
      }

      if (localUser.status === 'pending') {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('currentUser');
        setStatus('Compte en attente de validation par le patron ou le RH.', true);
        return;
      }

      persistSession(localUser);
      setStatus(`Connexion réussie. Bienvenue ${localUser.pseudo} !`);
      window.location.href = 'Employer.html';
      return;
    }

    persistSession(userFromDb);
    setStatus(`Connexion réussie. Bienvenue ${userFromDb.pseudo} !`);
    window.location.href = 'Employer.html';
  } catch (error) {
    console.error('Erreur Firebase connexion:', error);
    const localUsers = getUsers();
    const localUser = localUsers.find(
      (account) => account.pseudo.toLowerCase() === pseudo.toLowerCase() && account.password === password
    );

    if (!localUser) {
      setStatus('Identifiants incorrects. Vérifie ton pseudo et ton mot de passe.', true);
      return;
    }

    persistSession(localUser);
    setStatus(`Connexion réussie. Bienvenue ${localUser.pseudo} !`);
    window.location.href = 'Employer.html';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isRegisterMode ? 'Créer mon compte' : 'Me connecter';
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (isRegisterMode) {
    await handleRegister();
    return;
  }

  await handleLogin();
}

switchAuthBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  updateMode();
  pseudoInput.focus();
});

cancelLoginBtn.addEventListener('click', () => {
  authForm.reset();
  setStatus(isRegisterMode ? 'Crée ton compte pour accéder à ton espace.' : 'Connecte-toi pour accéder à ton espace.');
});

authForm.addEventListener('submit', handleSubmit);
updateMode();

const currentSession = localStorage.getItem(SESSION_KEY);
if (currentSession) {
  try {
    const session = JSON.parse(currentSession);
    if (session && session.pseudo) {
      setStatus(`Tu es déjà connecté en tant que ${session.pseudo}.`);
    }
  } catch (error) {
    console.error('Erreur lecture session:', error);
  }
}
