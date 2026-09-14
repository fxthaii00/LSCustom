const DISCORD_CLIENT_ID = '1548358308216442951';
const IS_FILE_MODE = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null';
const DISCORD_REDIRECT_URI = IS_FILE_MODE
  ? 'http://localhost:8000/discord-callback.html'
  : `${window.location.origin}/discord-callback.html`;

function getDiscordAvatarUrl(profile) {
  if (!profile || !profile.id || !profile.avatar) {
    return '';
  }

  const isAnimated = profile.avatar.startsWith('a_');
  const extension = isAnimated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${extension}?size=256`;
}

function persistDiscordSession(profile, token) {
  const session = {
    id: `discord_${profile.id}`,
    username: profile.username,
    name: profile.global_name || profile.username,
    avatar: getDiscordAvatarUrl(profile),
    discordUsername: profile.global_name || profile.username,
    role: 'member',
    approved: true,
    loginMethod: 'discord'
  };

  localStorage.setItem('littleAngelSession', JSON.stringify(session));
  localStorage.setItem('littleAngelDiscordToken', JSON.stringify({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in * 1000)
  }));
}

async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem('discord_code_verifier');
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
    code_verifier: verifier || ''
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Erreur de connexion Discord.');
  }

  return data;
}

async function fetchDiscordProfile(token) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  });

  const profile = await response.json();
  if (!response.ok) {
    throw new Error(profile.error || 'Impossible de récupérer le profil Discord.');
  }

  return profile;
}

function renderError(message) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  if (IS_FILE_MODE) {
    renderError('La connexion Discord doit être ouverte via un serveur local : http://localhost:8000/login.html');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const expectedState = sessionStorage.getItem('discord_auth_state');

  if (!DISCORD_CLIENT_ID || DISCORD_CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID') {
    renderError('Ajoute ton Client ID Discord dans js/login.js et js/discord-callback.js pour activer la vraie connexion Discord.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2500);
    return;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    renderError('Connexion Discord invalide ou expirée.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2500);
    return;
  }

  const status = document.getElementById('status');
  if (status) status.textContent = 'Connexion Discord en cours...';

  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchDiscordProfile(token);
    persistDiscordSession(profile, token);
    window.location.href = 'index.html';
  } catch (error) {
    renderError(error.message || 'Erreur de connexion Discord.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2500);
  }
});
