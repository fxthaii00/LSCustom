import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const STORAGE_KEY = 'littleAngelAuthUsers';
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

const authForm = document.getElementById('authForm');
const switchAuthBtn = document.getElementById('switchAuthBtn');
const switchText = document.getElementById('switchText');
const submitBtn = document.getElementById('submitBtn');
const pageTitle = document.getElementById('pageTitle');
const statusBox = document.getElementById('loginStatus');
const cancelBtn = document.getElementById('cancelLoginBtn');
const passwordLabel = document.getElementById('passwordLabel');
const identifierLabel = document.getElementById('identifierLabel');

let authMode = 'register';

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';

  document.querySelectorAll('[data-mode="register"]').forEach((element) => {
    element.classList.toggle('hidden-by-mode', !isRegister);
  });

  pageTitle.innerHTML = isRegister ? 'Créer un <em>compte</em>' : 'Se <em>connecter</em>';
  submitBtn.textContent = isRegister ? 'Créer mon compte' : 'Se connecter';
  switchText.textContent = isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?';
  switchAuthBtn.textContent = isRegister ? 'Se connecter' : 'Créer un compte';
  passwordLabel.textContent = 'Mot de passe';
  identifierLabel.textContent = 'Pseudo';

  const primaryText = isRegister
    ? 'Crée ton compte pour accéder à ton espace.'
    : 'Renseigne ton pseudo et ton mot de passe pour te connecter.';

  if (statusBox) {
    statusBox.textContent = primaryText;
  }
}

function getStoredUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map((user) => ({
      pseudo: String(user.pseudo || user.username || user.nom || user.prenom || user.numero || '').trim(),
      password: String(user.password || ''),
      numero: user.numero || '',
      nom: user.nom || '',
      prenom: user.prenom || ''
    })).filter((user) => user.pseudo || user.password) : [];
  } catch (error) {
    return [];
  }
}

function syncLocalUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function isPermissionError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'permission-denied' || message.includes('permission') || message.includes('insufficient permissions');
}

async function saveUserToFirebase(user) {
  const usersRef = collection(db, 'users');
  const sanitizedPseudo = String(user.pseudo || '').trim();

  try {
    const existing = await getDocs(query(usersRef, where('pseudoLower', '==', sanitizedPseudo.toLowerCase())));
    if (!existing.empty) {
      throw new Error('Ce pseudo est déjà utilisé.');
    }

    const userToSave = {
      pseudo: sanitizedPseudo,
      pseudoLower: sanitizedPseudo.toLowerCase(),
      password: String(user.password || ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ref = await addDoc(usersRef, userToSave);
    const localUsers = getStoredUsers();
    const exists = localUsers.some((item) => String(item.pseudo || '').trim().toLowerCase() === sanitizedPseudo.toLowerCase());

    if (!exists) {
      localUsers.push({
        pseudo: sanitizedPseudo,
        password: String(user.password || ''),
        id: ref.id
      });
      syncLocalUsers(localUsers);
    }

    return ref;
  } catch (error) {
    if (isPermissionError(error)) {
      const localUsers = getStoredUsers();
      const exists = localUsers.some((item) => String(item.pseudo || '').trim().toLowerCase() === sanitizedPseudo.toLowerCase());

      if (!exists) {
        localUsers.push({
          pseudo: sanitizedPseudo,
          password: String(user.password || ''),
          id: `local-${Date.now()}`
        });
        syncLocalUsers(localUsers);
      }

      return { id: `local-${Date.now()}` };
    }

    throw error;
  }
}

async function findUserInFirebase(pseudo, password) {
  const normalizedPseudo = String(pseudo || '').trim().toLowerCase();
  const localUsers = getStoredUsers();
  const localUser = localUsers.find((item) => String(item.pseudo || '').trim().toLowerCase() === normalizedPseudo && String(item.password || '') === String(password || ''));
  if (localUser) {
    return {
      id: localUser.id || 'local',
      pseudo: localUser.pseudo,
      password: localUser.password
    };
  }

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(query(usersRef, where('pseudoLower', '==', normalizedPseudo)));

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    if (String(user.password || '') !== String(password || '')) {
      return null;
    }

    const firebaseUser = { id: userDoc.id, ...user };
    const fallbackUsers = getStoredUsers();
    const exists = fallbackUsers.some((item) => String(item.pseudo || '').trim().toLowerCase() === normalizedPseudo);
    if (!exists) {
      fallbackUsers.push({ pseudo: firebaseUser.pseudo, password: firebaseUser.password, id: firebaseUser.id });
      syncLocalUsers(fallbackUsers);
    }

    return firebaseUser;
  } catch (error) {
    if (isPermissionError(error)) {
      return localUser || null;
    }

    throw error;
  }
}

function showStatus(message, isError = false) {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.style.color = isError ? 'var(--ac)' : 'var(--tx2)';
}

function validateRegisterForm(data) {
  if (!data.pseudo || !data.password || !data.confirmPassword) {
    return 'Le pseudo et le mot de passe sont obligatoires.';
  }

  if (data.pseudo.length < 3) {
    return 'Le pseudo doit contenir au moins 3 caractères.';
  }

  if (data.password.length < 6) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  if (data.password !== data.confirmPassword) {
    return 'La confirmation du mot de passe ne correspond pas.';
  }

  if (!document.getElementById('privacyCheck')?.checked) {
    return 'Tu dois accepter la confidentialité.';
  }

  if (!document.getElementById('termsCheck')?.checked) {
    return 'Tu dois accepter les conditions d’inscription.';
  }

  return '';
}

async function handleRegister(event) {
  event.preventDefault();

  const pseudo = document.getElementById('pseudo')?.value.trim() || '';
  const formData = {
    pseudo,
    password: document.getElementById('password')?.value || '',
    confirmPassword: document.getElementById('confirmPassword')?.value || ''
  };

  const error = validateRegisterForm(formData);
  if (error) {
    showStatus(error, true);
    return;
  }

  try {
    await saveUserToFirebase({
      pseudo: formData.pseudo,
      password: formData.password
    });

    showStatus('Compte créé avec succès. Tu peux maintenant te connecter.');
    setAuthMode('login');
    authForm.reset();
    document.getElementById('pseudo').focus();
  } catch (fireError) {
    showStatus(fireError.message || 'Erreur lors de la création du compte.', true);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const pseudo = document.getElementById('pseudo')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';

  if (!pseudo || !password) {
    showStatus('Le pseudo et le mot de passe sont obligatoires.', true);
    return;
  }

  try {
    const user = await findUserInFirebase(pseudo, password);

    if (!user) {
      showStatus('Pseudo ou mot de passe incorrect.', true);
      return;
    }

    localStorage.setItem('littleAngelSession', JSON.stringify({
      approved: true,
      pseudo: user.pseudo,
      uid: user.id
    }));

    showStatus(`Bienvenue ${user.pseudo} ! Redirection...`);
    window.location.href = 'index.html';
  } catch (fireError) {
    showStatus(fireError.message || 'Erreur de connexion.', true);
  }
}

switchAuthBtn?.addEventListener('click', () => {
  const nextMode = authMode === 'register' ? 'login' : 'register';
  setAuthMode(nextMode);
});

authForm?.addEventListener('submit', (event) => {
  if (authMode === 'register') {
    handleRegister(event);
  } else {
    handleLogin(event);
  }
});

cancelBtn?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = JSON.parse(localStorage.getItem('littleAngelSession') || 'null');
  if (saved && saved.approved) {
    window.location.href = 'index.html';
    return;
  }

  setAuthMode('register');
});
