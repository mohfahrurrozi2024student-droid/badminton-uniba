const API = {
  checkAuth: '/api/admin/check',
  login: '/api/admin/login',
  logout: '/api/admin/logout',
  data: '/api/admin/data',
  csv: '/api/admin/data/csv',
  delete: '/api/admin/data/delete/'
};

const toast = document.getElementById('toast');
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');

document.addEventListener('DOMContentLoaded', async function() {
  const isAuth = await checkAuth();
  if (isAuth) {
    showDashboard();
    loadData();
  }
});

async function checkAuth() {
  try {
    const res = await fetch(API.checkAuth);
    if (res.ok) {
      const data = await res.json();
      document.getElementById('adminName').innerHTML = `<i class="fas fa-user-shield"></i> ${data.username}`;
      return true;
    }
  } catch (e) {}
  return false;
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  const btn = this.querySelector('.login-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  try {
    const res = await fetch(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (result.success) {
      showDashboard();
      loadData();
    } else {
      errorEl.textContent = result.error || 'Login gagal';
    }
  } catch (err) {
    errorEl.textContent = 'Gagal terhubung ke server';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async function() {
  await fetch(API.logout, { method: 'POST' });
  loginPage.style.display = 'flex';
  dashboardPage.style.display = 'none';
  showToast('Berhasil logout', 'success');
});

document.getElementById('downloadCsvBtn').addEventListener('click', function() {
  window.location.href = API.csv;
});

document.getElementById('refreshBtn').addEventListener('click', loadData);

function showDashboard() {
  loginPage.style.display = 'none';
  dashboardPage.style.display = 'block';
}

async function loadData() {
  const tbody = document.getElementById('dataBody');
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

  try {
    const res = await fetch(API.data);
    if (!res.ok) {
      if (res.status === 401) {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        showToast('Sesi habis, silakan login ulang', 'error');
        return;
      }
      throw new Error('Failed to fetch');
    }

    const data = await res.json();
    document.getElementById('totalCount').textContent = data.length;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>Belum ada data pendaftar</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map((row, index) => {
      const date = row.created_at ? new Date(row.created_at + 'Z').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      const siakadLink = row.file_siakad ? `<a href="${row.file_siakad}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';
      const tiktokLink = row.file_tiktok ? `<a href="${row.file_tiktok}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';
      const igLink = row.file_instagram ? `<a href="${row.file_instagram}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(row.nama)}</strong></td>
          <td>${escapeHtml(row.email)}</td>
          <td>${escapeHtml(row.jurusan)}</td>
          <td>${escapeHtml(row.angkatan)}</td>
          <td>${escapeHtml(row.no_hp)}</td>
          <td>${escapeHtml(row.alasan)}</td>
          <td>${siakadLink}</td>
          <td>${tiktokLink}</td>
          <td>${igLink}</td>
          <td>${date}</td>
          <td>
            <button class="delete-btn" onclick="deleteData(${row.id})">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    showToast('Gagal memuat data', 'error');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

async function deleteData(id) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;

  try {
    const res = await fetch(API.delete + id);
    const result = await res.json();

    if (result.success) {
      showToast('Data berhasil dihapus', 'success');
      loadData();
    } else {
      showToast('Gagal menghapus data', 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus data', 'error');
  }
}

function escapeHtml(text) {
  if (!text) return '-';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type) {
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 4000);
}
