const SESSION_KEY = 'lscustom_session';
const STORAGE_KEY = 'lscustom_users';
const welcomeMessage = document.getElementById('welcomeMessage');
const headerUserName = document.getElementById('headerUserName');
const logoutBtn = document.getElementById('logoutBtn');

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erreur session:', error);
    return null;
  }
}

function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Erreur utilisateurs:', error);
    return [];
  }
}

const session = getSession();

if (!session || !session.pseudo) {
  window.location.href = 'login.html';
} else {
  const user = getUsers().find((member) => member.pseudo.toLowerCase() === session.pseudo.toLowerCase());
  headerUserName.textContent = user ? user.pseudo : session.pseudo;
  welcomeMessage.textContent = user
    ? `Bienvenue ${user.pseudo}, ton compte est bien connecté.`
    : `Bienvenue ${session.pseudo}, ton compte est bien connecté.`;
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
});
