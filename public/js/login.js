/* --------- Yapılandırma --------- */
const API_URL = "/api";

/* --------- Sosyal Medya Girişleri --------- */

function loginWithGoogle() {
    window.location.href = `${API_URL}/auth/google`;
}

function loginWithDiscord() {
    window.location.href = `${API_URL}/auth/discord`;
}

function loginWithTwitter() {
    window.location.href = `${API_URL}/auth/twitter`;
}

/* --------- Sayfa Başlatıcı ve Otomatik Kontroller --------- */

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        localStorage.setItem('token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("Giriş başarılı! Profilinize yönlendiriliyorsunuz.");
        window.location.href = "profile.html";
    } else if (localStorage.getItem("token")) {
        window.location.href = "profile.html";
    }
});

/* --------- Görünüm Kontrolleri (Sekme ve Modal) --------- */

// Giriş ve Kayıt sekmeleri arası geçişi sağlar
function switchTab(type) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (type === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

// Şifre sıfırlama modalını açar/kapatır
function openResetModal() { document.getElementById('reset-modal').style.display = 'flex'; }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; }

// Şifre görünürlüğünü değiştirir
function togglePasswordVisibility() {
    const passInput = document.getElementById('resetNewPass');
    const icon = document.getElementById('togglePassIcon');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.classList.replace('ph-eye-slash', 'ph-eye');
    } else {
        passInput.type = 'password';
        icon.classList.replace('ph-eye', 'ph-eye-slash');
    }
}

/* --------- Kimlik Doğrulama İşlemleri (API) --------- */

// Yeni kullanıcı kaydı
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "İşlem yapılıyor...";

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Kayıt işlemi başarılı. Giriş yapabilirsiniz.");
            switchTab('login');
            document.getElementById('loginEmail').value = email;
        } else {
            alert("Hata: " + (data.message || "Kayıt tamamlanamadı."));
        }
    } catch (err) {
        alert("Sunucu bağlantısı sağlanamadı.");
    } finally {
        btn.innerText = "Okur Kartı Oluştur";
    }
});

// Kullanıcı girişi
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "Giriş yapılıyor...";

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'profile.html';
        } else {
            alert("Hata: " + (data.message || "Giriş başarısız. Bilgilerinizi kontrol edin."));
        }
    } catch (err) {
        alert("Sunucu bağlantısı sağlanamadı.");
    } finally {
        btn.innerText = "Kütüphaneye Gir";
    }
});

/* --------- Şifre Sıfırlama İşlemleri --------- */

// Sıfırlama kodu gönderir
async function sendCode() {
    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.getElementById('sendCodeBtn');

    if (!email) return alert("Lütfen e-posta adresinizi girin.");

    btn.innerText = "Gönderiliyor...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/send-reset-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Onay kodu gönderildi.");
            btn.innerText = "Gönderildi";
        } else {
            alert("Hata: " + (data.message || "Kod gönderilemedi."));
            btn.disabled = false;
        }
    } catch (err) {
        alert("Sunucu hatası.");
        btn.disabled = false;
    }
}

// Kodu doğrular ve şifreyi yeniler
async function verifyAndReset() {
    const email = document.getElementById('resetEmail').value.trim();
    const code = document.getElementById('resetCode').value.trim();
    const newPassword = document.getElementById('resetNewPass').value.trim();

    if (!email || !code || !newPassword) return alert("Lütfen tüm alanları doldurun.");

    try {
        const res = await fetch(`${API_URL}/auth/verify-reset-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Şifreniz başarıyla güncellendi.");
            closeResetModal();
            document.getElementById('loginEmail').value = email;
        } else {
            alert("Hata: " + (data.message || "İşlem başarısız."));
        }
    } catch (err) {
        alert("Sunucu bağlantısı kesildi.");
    }
}