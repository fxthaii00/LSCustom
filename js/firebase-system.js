import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  OAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc
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
export const auth = getAuth(app);
export const db = getFirestore(app);

export function createDiscordProvider() {
  const provider = new OAuthProvider('oidc.discord');
  provider.addScope('identify');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'consent' });
  return provider;
}

export async function signInWithDiscord() {
  const result = await signInWithPopup(auth, createDiscordProvider());
  const user = result.user;
  return user;
}

export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin).trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function ensureSeedAdmin() {
  const snapshot = await getDocs(collection(db, 'users'));
  if (!snapshot.empty) return;

  // Le premier compte créé devient automatiquement admin.
  // Aucun compte admin par défaut n’est créé pour éviter de contourner le flux normal.
}

export async function addAuditLog({ userId, actor, action, details, targetId = userId }) {
  await addDoc(collection(db, 'auditLog'), {
    userId,
    actor,
    action,
    details,
    targetId,
    createdAt: new Date().toISOString()
  });
}

export async function findUserByUsername(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;

  const queries = [
    query(collection(db, 'users'), where('username', '==', clean)),
    query(collection(db, 'users'), where('name', '==', clean))
  ];

  for (const q of queries) {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  }

  return null;
}

export async function createMember({ username, name, pin, identifier }) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const cleanIdentifier = String(identifier || '').trim();
  const cleanPin = String(pin || '').trim();

  const chosenName = cleanName || cleanIdentifier;
  const chosenUsername = cleanUsername || cleanIdentifier.toLowerCase().replace(/\s+/g, '');

  if (!chosenName || !chosenUsername || !cleanPin) {
    throw new Error('Nom ou pseudo et code pin sont requis.');
  }

  const existing = await findUserByUsername(chosenUsername);
  if (existing) {
    throw new Error('Ce nom ou pseudo est déjà utilisé.');
  }

  const snapshot = await getDocs(collection(db, 'users'));
  const isFirstAccount = snapshot.empty;

  const user = {
    username: chosenUsername,
    name: chosenName,
    pinHash: await hashPin(cleanPin),
    role: isFirstAccount ? 'admin' : 'member',
    approved: isFirstAccount,
    createdAt: new Date().toISOString()
  };

  const ref = await addDoc(collection(db, 'users'), user);
  await addAuditLog({
    userId: ref.id,
    actor: 'system',
    action: isFirstAccount ? 'first_admin_created' : 'account_created',
    details: isFirstAccount ? 'Premier compte créé : accès admin attribué' : 'Nouvelle demande de compte créée',
    targetId: ref.id
  });

  return { id: ref.id, ...user };
}

export async function loginMember({ username, pin, identifier }) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanIdentifier = String(identifier || '').trim().toLowerCase();
  const user = await findUserByUsername(cleanUsername || cleanIdentifier);
  if (!user) {
    throw new Error('Compte introuvable.');
  }

  if (user.approved !== true && user.role !== 'admin') {
    throw new Error('Ton compte n’est pas encore approuvé.');
  }

  const pinHash = await hashPin(pin);
  if (user.pinHash !== pinHash) {
    throw new Error('Code pin incorrect.');
  }

  await updateDoc(doc(db, 'users', user.id), {
    lastLogin: new Date().toISOString()
  });

  await addAuditLog({
    userId: user.id,
    actor: user.id,
    action: 'login',
    details: 'Connexion réussie',
    targetId: user.id
  });

  return { id: user.id, username: user.username, name: user.name, role: user.role || 'member', approved: !!user.approved };
}

export async function loadUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function updateAccess({ userId, approved, actorId }) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { approved: !!approved });

  await addAuditLog({
    userId,
    actor: actorId,
    action: approved ? 'approved' : 'revoked',
    details: approved ? 'Accès autorisé' : 'Accès révoqué',
    targetId: userId
  });
}

export async function loadAuditLog() {
  const q = query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function loadShopData() {
  const ref = doc(db, 'shop', 'shared');
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return {
      prices: [],
      stock: [],
      stockHistory: [],
      customPriceOrder: [],
      customStockOrder: []
    };
  }

  const data = snapshot.data();
  return {
    prices: Array.isArray(data.prices) ? data.prices : [],
    stock: Array.isArray(data.stock) ? data.stock : [],
    stockHistory: Array.isArray(data.stockHistory) ? data.stockHistory : [],
    customPriceOrder: Array.isArray(data.customPriceOrder) ? data.customPriceOrder : [],
    customStockOrder: Array.isArray(data.customStockOrder) ? data.customStockOrder : []
  };
}

export async function saveShopData(data) {
  const ref = doc(db, 'shop', 'shared');
  await setDoc(ref, {
    prices: Array.isArray(data.prices) ? data.prices : [],
    stock: Array.isArray(data.stock) ? data.stock : [],
    stockHistory: Array.isArray(data.stockHistory) ? data.stockHistory : [],
    customPriceOrder: Array.isArray(data.customPriceOrder) ? data.customPriceOrder : [],
    customStockOrder: Array.isArray(data.customStockOrder) ? data.customStockOrder : [],
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
