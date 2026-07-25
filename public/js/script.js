document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const toast = document.getElementById('toast');

  const fileInputs = [
    { id: 'file_siakad', nameId: 'file_siakad_name' },
    { id: 'file_tiktok', nameId: 'file_tiktok_name' },
    { id: 'file_instagram', nameId: 'file_instagram_name' }
  ];

  fileInputs.forEach(({ id, nameId }) => {
    const input = document.getElementById(id);
    const nameEl = document.getElementById(nameId);
    const label = input.nextElementSibling;

    input.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        nameEl.textContent = this.files[0].name;
        nameEl.classList.add('has-file');
      } else {
        nameEl.textContent = 'Tidak ada file dipilih';
        nameEl.classList.remove('has-file');
      }
    });

    label.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('dragover');
    });

    label.addEventListener('dragleave', function() {
      this.classList.remove('dragover');
    });

    label.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        const event = new Event('change');
        input.dispatchEvent(event);
      }
    });
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const angkatan = document.querySelector('input[name="angkatan"]:checked');
    if (!angkatan) {
      showToast('Silakan pilih angkatan terlebih dahulu', 'error');
      return;
    }

    submitBtn.disabled = true;
    loadingOverlay.classList.add('active');

    const formData = new FormData(form);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        loadingOverlay.classList.remove('active');
        successModal.classList.add('active');
        form.reset();
        fileInputs.forEach(({ nameId }) => {
          const el = document.getElementById(nameId);
          el.textContent = 'Tidak ada file dipilih';
          el.classList.remove('has-file');
        });
      } else {
        loadingOverlay.classList.remove('active');
        showToast(result.error || 'Terjadi kesalahan saat mendaftar', 'error');
      }
    } catch (err) {
      loadingOverlay.classList.remove('active');
      showToast('Gagal terhubung ke server. Silakan coba lagi.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  closeModalBtn.addEventListener('click', function() {
    successModal.classList.remove('active');
  });

  successModal.addEventListener('click', function(e) {
    if (e.target === this) {
      successModal.classList.remove('active');
    }
  });

  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
});
