const API_URL = "https://minemsiyle.com/api";

// ---------------------------------------------------------
// 1. SAYFA AÇILINCA VERİLERİ ÇEK (Undefined Sorununun Çözümü 💊)
// ---------------------------------------------------------
window.onload = async () => {
    const token = localStorage.getItem('userToken');

    // Giriş yapmamışsa login sayfasına at
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Backend'den bilgileri iste
        const res = await fetch(`${API_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Veri çekilemedi");

        const user = await res.json();

        // İsim ve Biyo'yu Ekrana Bas (Artık undefined yazmayacak!)
        document.getElementById('usernameDisplay').innerText = user.username || "İsimsiz";
        document.getElementById('emailDisplay').innerText = "@" + (user.username ? user.username.toLowerCase() : "user");
        document.getElementById('bioText').innerText = user.bio || "Merhaba, ben yeni bir kitap kurduyum! 📚";

        // Profil resmi varsa koy
        if (user.profileImage) {
            document.getElementById('profileImg').src = user.profileImage;
        }

    } catch (error) {
        console.log("Kullanıcı verisi alınamadı:", error);
    }
};

// ---------------------------------------------------------
// 2. RESİM KIRPMA VE YÜKLEME MOTORU (CROPPER) ✂️
// ---------------------------------------------------------
let cropper;

// Kalem butonuna basınca çalışır
function triggerFileUpload() {
    document.getElementById('imageUploadInput').click();
}

// Dosya seçilince önizleme ve kırpma ekranını açar
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        // 50MB Dosya Kontrolü
        if (file.size > 50 * 1024 * 1024) {
            alert("Dosya çok büyük! Daha küçük bir resim seç.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgElement = document.getElementById('imageToCrop');
            imgElement.src = e.target.result;

            // Kırpma penceresini aç
            document.getElementById('cropModal').style.display = 'flex';

            // Varsa eski kırpıcıyı temizle
            if (cropper) { cropper.destroy(); }

            // Yeni kırpıcıyı başlat
            cropper = new Cropper(imgElement, {
                aspectRatio: 1, // Kare olsun
                viewMode: 1,
                autoCropArea: 1,
                background: false
            });
        }
        reader.readAsDataURL(file);
    }
    // Input'u temizle ki aynı dosyayı tekrar seçebilsin
    event.target.value = '';
}

// "Kırp ve Kaydet" Butonu
async function cropAndSave() {
    if (!cropper) return;

    const saveBtn = document.querySelector('#cropModal .btn-save');
    saveBtn.innerText = "Yükleniyor...";

    // Resmi kırp ve al
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    const base64Image = canvas.toDataURL('image/jpeg', 0.8); // %80 kalite JPG

    // Sunucuya Gönder
    await saveOnlyImage(base64Image);

    // Kapat ve temizle
    closeCropModal();
    saveBtn.innerText = "Kırp ve Kaydet ✅";

    // Ekrandaki resmi de güncelle
    document.getElementById('profileImg').src = base64Image;
}

// Kırpma ekranını kapat
function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
    if (cropper) { cropper.destroy(); cropper = null; }
}

// Sadece resmi sunucuya kaydeden fonksiyon
async function saveOnlyImage(base64Image) {
    const token = localStorage.getItem('userToken');
    try {
        await fetch(`${API_URL}/user/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ profileImage: base64Image })
        });
    } catch (e) { console.log("Resim yükleme hatası"); }
}

// ---------------------------------------------------------
// 3. AYARLAR PENCERESİ (MODAL) ⚙️
// ---------------------------------------------------------
function openModal() {
    // Mevcut bilgileri kutucuklara doldur
    document.getElementById('editUsername').value = document.getElementById('usernameDisplay').innerText;
    document.getElementById('editBioInput').value = document.getElementById('bioText').innerText;

    // Şifre alanlarını temizle
    document.getElementById('oldPass').value = "";
    document.getElementById('newPass').value = "";

    // Pencereyi aç
    document.getElementById('editModal').classList.add('open');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('open');
}

// Ayarları Kaydet
async function saveProfileChanges() {
    const username = document.getElementById('editUsername').value;
    const bio = document.getElementById('editBioInput').value;
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;
    const token = localStorage.getItem('userToken');

    const payload = { username, bio };

    // Şifre girildiyse onları da ekle
    if (oldPass && newPass) {
        payload.oldPassword = oldPass;
        payload.newPassword = newPass;
    }

    try {
        const res = await fetch(`${API_URL}/user/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            location.reload(); // İsim değiştiği için sayfayı yenile
        } else {
            alert("Güncelleme başarısız. Şifreni doğru girdiğinden emin ol.");
        }
    } catch (e) { alert("Sunucu hatası!"); }
}

// Sekme Değiştirme (Saved / Badges)
function openTab(evt, tabName) {
    var i, content, tablinks;
    content = document.getElementsByClassName("tab-content");
    for (i = 0; i < content.length; i++) { content[i].style.display = "none"; }

    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" is-active", ""); }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " is-active";
}

// Dışarı tıklayınca modal kapatma
window.onclick = function (event) {
    const modal = document.getElementById('editModal');
    if (event.target == modal) closeModal();
}
// ÇIKIŞ YAPMA FONKSİYONU 🚪
function logout() {
    // Yanlışlıkla basarsa diye soralım
    if (confirm("Hesabından çıkış yapmak istediğine emin misin?")) {

        // 1. Kimlik kartını (Token) yırt at
        localStorage.removeItem('userToken');

        // 2. İstersen temayı da sıfırlayabilirsin (Opsiyonel)
        // localStorage.removeItem('theme'); 

        // 3. Ana sayfaya veya Giriş sayfasına postala
        window.location.href = 'index.html';
    }
}
// 🌓 TEMA DEĞİŞTİRME MOTORU
const themeToggle = document.getElementById('themeToggle'); // Butona bu ID'yi vermeyi unutma!
const body = document.body;

// Sayfa açılınca: Daha önce seçilen tema var mı?
if (localStorage.getItem('theme') === 'light') {
    body.classList.add('light-mode');
    // Butonun ikonunu güneşe çevir (Eğer ikon font kullanıyorsan class'ı değiştir)
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode'); // CSS'te .light-mode sınıfını tanımlamış olmalısın

    // Tercihi kaydet
    if (body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
});
// 👤 PROFİL BİLGİLERİNİ ÇEK VE GÖSTER
window.onload = function () {
    // 1. LocalStorage'dan kullanıcıyı al
    const userStr = localStorage.getItem('user'); // Kayıt olurken 'user' diye kaydettiğini varsayıyorum

    if (userStr) {
        const user = JSON.parse(userStr);

        // 2. Ekrana bas
        const nameElement = document.getElementById('profileName');
        const emailElement = document.getElementById('profileEmail'); // @... yazan yer

        if (nameElement) nameElement.innerText = user.username || user.name || "İsimsiz Kahraman";
        if (emailElement) emailElement.innerText = "@" + (user.username || "kullanici");

        // 3. Avatar varsa onu da güncelle (Opsiyonel)
        // document.getElementById('avatarImg').src = user.avatar || 'default.png';

    } else {
        // Giriş yapmamışsa login sayfasına postala
        // window.location.href = 'login.html';
        console.log("Kullanıcı bulunamadı ama şimdilik atmıyorum.");
    }

    // Tema ayarını da burada çalıştırabilirsin
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
};
function forceThemeToggle() {
    // 1. Sınıfı değiştir
    document.body.classList.toggle('light-mode');

    // 2. Durumu kontrol et
    const isLight = document.body.classList.contains('light-mode');
    const icon = document.getElementById('themeIcon');
    const btn = document.getElementById('themeToggle');

    if (isLight) {
        // Mod: AYDINLIK -> İkon: AY (Karanlığa davet et)
        icon.classList.remove('ph-sun');
        icon.classList.add('ph-moon');

        // Buton rengi siyah olsun ki beyazda görünsün
        btn.style.color = '#000';
        btn.style.borderColor = '#ccc';

        localStorage.setItem('theme', 'light');
    } else {
        // Mod: KARANLIK -> İkon: GÜNEŞ (Aydınlığa davet et)
        icon.classList.remove('ph-moon');
        icon.classList.add('ph-sun');

        // Buton rengi beyaz olsun
        btn.style.color = '#fff';
        btn.style.borderColor = '#555';

        localStorage.setItem('theme', 'dark');
    }
}
// 1. SAYFA YÜKLENİNCE
window.onload = function () {
    // A. Tema Kontrolü
    const savedTheme = localStorage.getItem('theme');
    const checkbox = document.getElementById('themeCheckbox');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        checkbox.checked = true; // Switch'i açık konuma getir
    }

    // B. Kullanıcıyı Çek
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('profileName').innerText = user.username || "Misafir";
        document.getElementById('profileEmail').innerText = user.email || "@misafir";
        document.getElementById('editUsername').value = user.username || ""; // Ayarlara ismi doldur
    } else {
        document.getElementById('profileName').innerText = "Admin Kral";
        document.getElementById('profileEmail').innerText = "@minemsiyle";
    }
}

// 2. SWITCH İLE TEMA DEĞİŞTİRME
function toggleThemeSwitch() {
    const checkbox = document.getElementById('themeCheckbox');
    document.body.classList.toggle('light-mode');

    if (checkbox.checked) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

// 3. SEKME (TAB) DEĞİŞTİRME
function switchTab(tabName) {
    // Tüm içerikleri gizle
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Tüm sekmelerin aktifliğini al
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

    // İstenen içeriği aç
    document.getElementById(tabName + '-content').classList.add('active');

    // Tıklanan sekmeyi aktif yap (Basit seçim mantığı)
    // (Bu örnekte event.target ile yakalamak yerine manuel sınıf ekledim, sırayla)
    const tabs = document.querySelectorAll('.tab');
    if (tabName === 'saved') tabs[0].classList.add('active');
    if (tabName === 'badges') tabs[1].classList.add('active');
}

// 4. MODAL (AYARLAR PENCERESİ) İŞLEMLERİ
const modal = document.getElementById('settingsModal');

function openSettings() {
    modal.classList.add('open');
}

function closeSettings() {
    modal.classList.remove('open');
}

// Modal dışına tıklayınca kapat
modal.addEventListener('click', function (e) {
    if (e.target === modal) closeSettings();
});

function saveSettings() {
    const newName = document.getElementById('editUsername').value;
    const newPass = document.getElementById('editPassword').value;

    // Mevcut veriyi al
    let user = JSON.parse(localStorage.getItem('user')) || {};

    if (newName) user.username = newName;
    if (newPass) user.password = newPass;

    // Kaydet
    localStorage.setItem('user', JSON.stringify(user));

    alert("✅ Profil güncellendi!");
    location.reload(); // Sayfayı yenile ki isim değişsin
}

// 5. ÇIKIŞ YAP
function logout() {
    if (confirm("Çıkıyor muyuz Kral?")) {
        localStorage.removeItem('user');
        localStorage.removeItem('userToken');
        window.location.href = 'index.html';
    }
}