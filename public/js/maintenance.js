/* --------- Yapılandırma --------- */
const API_URL = "/api";

/* --------- Görünüm Kontrolleri --------- */

// Login ekranını gösterir
function showLogin() {
    document.getElementById('maintenance-content').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Login ekranını gizler ve ana mesaja döner
function hideLogin() {
    document.getElementById('maintenance-content').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
}

/* --------- Kimlik Doğrulama İşlemleri --------- */

// Yönetici girişi işlemini yönetir
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.querySelector('.login-btn');

    btn.innerText = "Kontrol Ediliyor...";

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.user.role === 'admin') {
            // Kimlik bilgilerini yerel depolamaya kaydet
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userRole', 'admin');

            // Panale yönlendir
            window.location.href = 'adminPanel.html';
        } else {
            alert("Hatalı giriş bilgileri veya yetkisiz erişim denemesi.");
            btn.innerText = "Giriş Yap";
        }
    } catch (err) {
        alert("Sunucu bağlantısı kurulamadı. Lütfen internetinizi kontrol edin.");
        btn.innerText = "Giriş Yap";
    }
}

/* --------- Otomatik Kontroller ve Dinleyiciler --------- */

// Enter tuşu ile hızlı giriş desteği
document.addEventListener('keypress', function (e) {
    const isLoginVisible = document.getElementById('login-form').style.display === 'block';
    if (e.key === 'Enter' && isLoginVisible) {
        handleLogin();
    }
});

// Bakım modunun durumunu periyodik olarak kontrol eder
setInterval(async () => {
    // Admin giriş yapmışsa kontrolü atla
    if (localStorage.getItem('userRole') === 'admin') return;

    try {
        const res = await fetch(`${API_URL}/settings/maintenance`);
        const data = await res.json();

        // Bakım modu kapandıysa ana sayfaya yönlendir
        if (data && !data.isMaintenance) {
            window.location.href = '/';
        }
    } catch (e) {
        // Hata durumunda sessizce devam et
    }
}, 5000);