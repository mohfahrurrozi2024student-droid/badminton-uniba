const API = {
  checkAuth: '/api/admin/check',
  login: '/api/admin/login',
  logout: '/api/admin/logout',
  data: '/api/admin/data',
  csv: '/api/admin/data/csv',
  delete: '/api/admin/data/delete/',
  settings: '/api/admin/settings',
  sendOtp: '/api/admin/send-otp',
  changePassword: '/api/admin/change-password'
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

document.getElementById('settingsNavBtn').addEventListener('click', function() {
  document.getElementById('dataPage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'block';
  loadSettings();
});

document.getElementById('backToDataBtn').addEventListener('click', function() {
  document.getElementById('settingsPage').style.display = 'none';
  document.getElementById('dataPage').style.display = 'block';
});

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
          <td colspan="14" class="empty-state">
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

      const fotoLink = row.foto ? `<a href="${row.foto}" target="_blank" class="file-link"><i class="fas fa-image"></i> Lihat</a>` : '-';
      const siakadLink = row.file_siakad ? `<a href="${row.file_siakad}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';
      const tiktokLink = row.file_tiktok ? `<a href="${row.file_tiktok}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';
      const igLink = row.file_instagram ? `<a href="${row.file_instagram}" target="_blank" class="file-link"><i class="fas fa-external-link-alt"></i> Lihat</a>` : '-';

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(row.nama)}</strong></td>
          <td>${fotoLink}</td>
          <td>${escapeHtml(row.username_tiktok)}</td>
          <td>${escapeHtml(row.username_ig)}</td>
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

// Settings
async function loadSettings() {
  try {
    const res = await fetch(API.settings);
    if (res.ok) {
      const data = await res.json();
      document.getElementById('adminEmail').value = data.email || '';
    }
  } catch (e) {}
}

document.getElementById('saveSettingsBtn').addEventListener('click', async function() {
  const email = document.getElementById('adminEmail').value.trim();
  const gmail_app_password = document.getElementById('gmailAppPassword').value.trim();

  if (!email) { showToast('Masukkan alamat Gmail', 'error'); return; }
  if (!gmail_app_password) { showToast('Masukkan App Password Gmail', 'error'); return; }

  try {
    const res = await fetch(API.settings, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, gmail_app_password })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Pengaturan disimpan', 'success');
      document.getElementById('gmailAppPassword').value = '';
    }
  } catch (e) {
    showToast('Gagal menyimpan', 'error');
  }
});

document.getElementById('sendOtpBtn').addEventListener('click', async function() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if (!current || !newPass || !confirmPass) {
    showToast('Isi semua field password', 'error'); return;
  }
  if (newPass.length < 6) {
    showToast('Password baru minimal 6 karakter', 'error'); return;
  }
  if (newPass !== confirmPass) {
    showToast('Password baru tidak cocok', 'error'); return;
  }

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(API.sendOtp, { method: 'POST', signal: controller.signal });
    clearTimeout(timeout);
    const result = await res.json();

    if (result.success) {
      showToast('Kode OTP terkirim ke email admin', 'success');
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('sendOtpBtn').style.display = 'none';
      document.getElementById('changePasswordBtn').style.display = 'inline-flex';
    } else {
      showToast(result.error, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim OTP';
    }
  } catch (e) {
    showToast('Gagal kirim OTP. Cek koneksi dan pengaturan email.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim OTP';
  }
});

document.getElementById('changePasswordBtn').addEventListener('click', async function() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const otp = document.getElementById('otpCode').value.trim();

  if (!otp) { showToast('Masukkan kode OTP', 'error'); return; }

  const btn = document.getElementById('changePasswordBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  try {
    const res = await fetch(API.changePassword, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: newPass, otp })
    });
    const result = await res.json();

    if (result.success) {
      showToast('Password berhasil diganti!', 'success');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      document.getElementById('otpCode').value = '';
      document.getElementById('otpSection').style.display = 'none';
      document.getElementById('sendOtpBtn').style.display = 'inline-flex';
      document.getElementById('changePasswordBtn').style.display = 'none';
    } else {
      showToast(result.error, 'error');
    }
  } catch (e) {
    showToast('Gagal ganti password', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Ganti Password';
  }
});

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
