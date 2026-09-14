import {
  ensureSeedAdmin,
  loadUsers,
  updateAccess,
  loadAuditLog
} from './firebase-system.js';

const session = JSON.parse(localStorage.getItem('littleAngelSession') || 'null');

function requireAdmin() {
  if (!session || session.role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function renderUsers(users) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6">Aucun membre pour le moment.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map((user) => {
    const status = user.approved ? 'Autorisé' : 'En attente';
    const role = user.role === 'admin' ? 'Admin' : 'Membre';

    return `
      <tr>
        <td>${user.name || '-'}</td>
        <td>${user.username || '-'}</td>
        <td>${role}</td>
        <td>${status}</td>
        <td>${user.createdAt ? new Date(user.createdAt).toLocaleString('fr-FR') : '-'}</td>
        <td>
          ${user.role === 'admin'
            ? '<span class="tag admin">Admin</span>'
            : `
              <button class="mini-btn approve" data-user-id="${user.id}">Autoriser</button>
              <button class="mini-btn revoke" data-user-id="${user.id}">Révoquer</button>
            `}
        </td>
      </tr>
    `;
  }).join('');
}

function renderLogs(logs) {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="5">Aucun historique.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map((log) => `
    <tr>
      <td>${new Date(log.createdAt).toLocaleString('fr-FR')}</td>
      <td>${log.actor || '-'}</td>
      <td>${log.action || '-'}</td>
      <td>${log.details || '-'}</td>
      <td>${log.targetId || '-'}</td>
    </tr>
  `).join('');
}

async function refreshData() {
  const users = await loadUsers();
  const logs = await loadAuditLog();
  renderUsers(users);
  renderLogs(logs);
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('.approve');
  if (target) {
    const userId = target.dataset.userId;
    await updateAccess({ userId, approved: true, actorId: session.id });
    await refreshData();
    return;
  }

  const revokeTarget = event.target.closest('.revoke');
  if (revokeTarget) {
    const userId = revokeTarget.dataset.userId;
    await updateAccess({ userId, approved: false, actorId: session.id });
    await refreshData();
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('littleAngelSession');
  window.location.href = 'login.html';
});

document.getElementById('backBtn').addEventListener('click', () => {
  window.history.back();
});

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  await ensureSeedAdmin();
  await refreshData();
});
