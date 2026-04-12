const API_BASE = "http://localhost:5000/api";
let cropper;
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

// --- JWT ÇÖZÜCÜ ---
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

// --- SAYFA YÜKLENİNCE ---
document.addEventListener("DOMContentLoaded", () => {
    checkTheme();
    loadUserProfile();
    loadSavedItems();
    loadMyComments();
});

// --- SEKME DEĞİŞTİRME MANTIĞI (V2) ---
function switchProfileTab(tabId, btnElement) {
    // Tüm butonları ve içerikleri pasif yap
    document.querySelectorAll('.content-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active-pane'));

    // Tıklananı aktif yap
    btnElement.classList.add('active');
    document.getElementById(tabId + '-tab').classList.add('active-pane');
}

// --- PROFİL YÜKLEME ---
async function loadUserProfile() {
    const params = new URLSearchParams(window.location.search);
    let targetUsername = params.get('u');
    const sessionUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!targetUsername) {
        if (sessionUser && sessionUser.username) {
            targetUsername = sessionUser.username;
        } else if (token) {
            const decoded = parseJwt(token);
            if (decoded && decoded.username) {
                targetUsername = decoded.username;
                localStorage.setItem('user', JSON.stringify({ id: decoded.id, username: decoded.username }));
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return window.location.href = "login.html";
            }
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return window.location.href = "login.html";
        }
    }

    try {
        const res = await fetch(`${API_BASE}/users/${targetUsername}`);
        if (!res.ok) {
            document.getElementById('displayName').innerText = "Kullanıcı Bulunamadı";
            return;
        }
        const user = await res.json();

        // Verileri Bas
        const avatarEl = document.getElementById('avatarDisplay');
        if (avatarEl) {
            let finalAvatar = user.avatar;
            if (!finalAvatar || finalAvatar === 'default_avatar.png' || finalAvatar.trim() === '') {
                finalAvatar = defaultAvatar;
            }
            avatarEl.src = finalAvatar;
            avatarEl.onerror = function () { this.onerror = null; this.src = defaultAvatar; };
        }

        document.getElementById('displayName').innerText = user.username;
        document.getElementById('displayBio').innerText = user.bio ? `"${user.bio}"` : '"Henüz bir dize yazılmamış..."';
        document.getElementById('displayEmail').innerText = user.email || `@${user.username}`;

        // Yetki Kontrolleri (Kendi profilindeyse)
        const isMyProfile = (token && parseJwt(token)?.username === user.username) || (sessionUser && sessionUser.username === user.username);
        const actionsArea = document.querySelector('.actions');
        const avatarBtn = document.getElementById('avatarEditIcon');
        const settingsTab = document.getElementById('settingsTabBtn');

        if (isMyProfile) {
            if (actionsArea) actionsArea.style.display = 'block';
            if (avatarBtn) avatarBtn.style.display = 'flex';
            if (settingsTab) settingsTab.style.display = 'flex'; // Ayarlar sekmesi sadece ona görünsün

            if (user.role === 'admin' || user.username === 'OnurCy') {
                const adminBtn = document.getElementById('adminPanelBtnArea');
                if (adminBtn) adminBtn.innerHTML = `<a href="adminPanel.html" class="btn-full" style="background:#ef4444; color:white; display:block; text-align:center;">👑 Yönetici Paneli</a>`;
            }
        } else {
            if (settingsTab) settingsTab.style.display = 'none';
        }

        // Tagları Bas
        renderUserTags(user);

    } catch (error) { console.error(error); }
}

// --- ETİKETLERİ BAS ---
function renderUserTags(user) {
    const tagsBox = document.getElementById('userTagsContainer');
    if (!tagsBox) return;
    let tags = user.tags || user.badges || [];
    if (typeof tags === 'string') tags = tags.split(',');

    if (tags.length > 0) {
        tagsBox.innerHTML = tags.map(tag => `<span class="user-tag">${tag.toUpperCase()}</span>`).join('');
    } else {
        tagsBox.innerHTML = `<span class="user-tag">ÜYE</span>`;
    }
}

// --- PROFİL GÜNCELLEME ---
async function saveSettings() {
    const newName = document.getElementById('editUsername').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newPass = document.getElementById('newPass').value.trim();

    let rawToken = localStorage.getItem('token');
    if (!rawToken) return window.location.href = "login.html";

    const updateData = {};
    if (newName) updateData.username = newName;
    if (newBio) updateData.bio = newBio;
    if (newPass && newPass.length >= 4) updateData.newPassword = newPass;

    const btn = document.querySelector('#profileSettingsForm button');
    const oldText = btn.innerText;
    btn.innerText = "⏳..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/users/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` },
            body: JSON.stringify(updateData)
        });

        if (res.ok) {
            alert("✅ Profilin güncellendi!");
            let user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                if (newName) user.username = newName;
                if (newBio) user.bio = newBio;
                localStorage.setItem('user', JSON.stringify(user));
            }
            location.reload();
        } else {
            const data = await res.json();
            alert("Hata: " + (data.message || "Güncellenemedi."));
        }
    } catch (err) { alert("Sunucuya ulaşılamadı!"); }
    finally { btn.innerText = oldText; btn.disabled = false; }
}

// --- FOTOĞRAF KIRPMA ---
const avatarInput = document.getElementById('avatarInput');
const imageToCrop = document.getElementById('imageToCrop');
const cropperModal = document.getElementById('cropperModal');

if (avatarInput) {
    avatarInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                imageToCrop.src = reader.result;
                cropperModal.classList.add('open');
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1 });
            };
            reader.readAsDataURL(file);
        }
    });
}

function closeCropper() {
    if (cropperModal) cropperModal.classList.remove('open');
    if (cropper) { cropper.destroy(); cropper = null; }
    if (avatarInput) avatarInput.value = "";
}

async function cropAndSave() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);
    let rawToken = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_BASE}/users/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` },
            body: JSON.stringify({ avatar: base64Image })
        });
        if (res.ok) {
            document.getElementById('avatarDisplay').src = base64Image;
            let user = JSON.parse(localStorage.getItem('user'));
            if (user) { user.avatar = base64Image; localStorage.setItem('user', JSON.stringify(user)); }
            closeCropper();
        } else { alert("Resim yüklenemedi."); }
    } catch (e) { alert("Sunucu hatası!"); }
}

// --- DİĞER (TEMA & ÇIKIŞ) ---
function checkTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        if (document.getElementById('themeCheckbox')) document.getElementById('themeCheckbox').checked = true;
    }
}
function toggleThemeSwitch() {
    const isLight = document.getElementById('themeCheckbox').checked;
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-mode', isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}
function logout() {
    if (confirm("Kütüphaneden ayrılıyorsun?")) { localStorage.clear(); window.location.href = 'login.html'; }
}

// --- ŞİFRE ALANINI AÇ/KAPA ---
function togglePasswordSection() {
    const sec = document.getElementById('passwordSection');
    if (sec.style.display === 'none') {
        sec.style.display = 'block';
    } else {
        sec.style.display = 'none';
        document.getElementById('newPass').value = '';
        document.getElementById('confirmPass').value = '';
    }
}

// ==========================================
// 📚 KAYDEDİLEN YAZILARI PROFİLE ÇEKME
// ==========================================

async function loadSavedItems() {
    const container = document.getElementById('saved-tab');
    if (!container) return;

    let token = localStorage.getItem('token');
    if (!token) return; // Giriş yapmamışsa zaten göremez
    token = token.replace(/"/g, '').trim();

    try {
        // Backend'deki profil/kaydedilenler rotasına istek at
        const res = await fetch(`${API_BASE}/users/profile/saved`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const items = data.savedItems || [];

            // Sol taraftaki "Kaydedilen" sayısını güncelle
            const statSaved = document.getElementById('statSaved');
            if (statSaved) statSaved.innerText = items.length;

            // Eğer hiç kayıt yoksa boş ekran kalsın
            if (items.length === 0) {
                container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-books"></i>
                    <p>Kütüphanen şu an boş. Hoşuna giden yazıları buraya kaydedebilirsin.</p>
                </div>`;
                return;
            }

            // Kayıtlar varsa HTML kartlarını oluştur
            let html = `<div class="saved-grid">`;

            // Diziyi tersine çeviriyoruz ki (reverse) en son kaydettiği en üstte çıksın
            items.reverse().forEach(item => {
                const date = new Date(item.savedAt).toLocaleDateString('tr-TR');
                const icon = item.type === 'blog' ? 'ph-article' : 'ph-book-open'; // Tipe göre ikon

                html += `
                <div class="saved-card">
                    <div class="saved-icon"><i class="ph-fill ${icon}"></i></div>
                    <a href="${item.url || '#'}" class="saved-info">
                        <h4 class="saved-title">${item.title}</h4>
                        <span class="saved-meta">Kaydedilme: ${date}</span>
                    </a>
                    <button class="remove-saved-btn" onclick="removeFromProfile('${item.itemId}')" title="Raftan Kaldır">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
                `;
            });
            html += `</div>`;
            container.innerHTML = html;
        }
    } catch (e) {
        console.error("Kaydedilenler çekilemedi:", e);
    }
}

// 🗑️ PROFİL İÇİNDEN KAYDEDİLENİ SİLME (Toggle)
async function removeFromProfile(itemId) {
    if (!confirm("Bu yazıyı kütüphanenden kaldırmak istiyor musun?")) return;

    let token = localStorage.getItem('token');
    if (!token) return;
    token = token.replace(/"/g, '').trim();

    try {
        // Zaten backend'de toggle (varsa sil, yoksa ekle) mantığı kurduğumuz için
        // aynı rotaya tekrar ID yollarsak o yazıyı silecektir.
        const res = await fetch(`${API_BASE}/users/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ itemId: itemId }) // Sadece ID yeterli
        });

        if (res.ok) {
            // Silme başarılıysa listeyi yeniden yükle (ekrandan anında kaybolsun)
            loadSavedItems();
        }
    } catch (e) {
        console.error("Silme hatası:", e);
    }
}

// ==========================================
// 💬 KULLANICININ YORUMLARINI PROFİLE ÇEKME
// ==========================================

async function loadMyComments() {
    const container = document.getElementById('comments-tab');
    if (!container) return;

    let token = localStorage.getItem('token');
    if (!token) return;
    token = token.replace(/"/g, '').trim();

    try {
        // Backend'e gidip "Benim yorumlarımı getir" diyoruz
        const res = await fetch(`${API_BASE}/users/profile/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const comments = data.comments || [];

            // Sol taraftaki "Yorum" sayısını güncelle
            const statComments = document.getElementById('statComments');
            if (statComments) statComments.innerText = comments.length;

            // Eğer hiç yorum yoksa boş ekran kalsın
            if (comments.length === 0) {
                container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-chat-teardrop-text"></i>
                    <p>Henüz hiçbir yazıya yorum yapmadın. Düşüncelerini paylaşmaktan çekinme!</p>
                </div>`;
                return;
            }

            // Yorumlar varsa, Kaydettiklerim listesiyle aynı şık tasarımı kullanalım
            let html = `<div class="saved-grid">`;

            comments.forEach(c => {
                const dateVal = c.createdAt || c.date || Date.now();
                const date = new Date(dateVal).toLocaleDateString('tr-TR');

                // 1. Tipi Belirle
                const typeLabel = c.contentType === 'blog' ? 'Blog' : 'Kitap';

                // 2. Başlığı Bul (Backend'de 'title' kaydettiysen onu alır, yoksa URL slug'ını (relatedId) gösterir)
                const postTitle = c.title || c.relatedId || 'Bilinmeyen Yazı';

                // 3. Tıklanabilir Link Oluştur
                const postLink = c.contentType === 'blog' ? `blog.html?id=${c.relatedId}` : `book.html?id=${c.relatedId}`;

                html += `
                <div class="saved-card" style="align-items: flex-start;">
                    <div class="saved-icon" style="background: rgba(136, 136, 136, 0.1); color: var(--muted);">
                        <i class="ph-fill ph-chat-centered-text"></i>
                    </div>
                    <div class="saved-info">
                        <a href="${postLink}" style="text-decoration:none; display:inline-block; margin-bottom:5px;">
                            <span class="saved-meta" style="color: var(--accent); font-weight:bold; transition:0.3s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--accent)'">
                                🔗 ${typeLabel}: ${postTitle} • ${date}
                            </span>
                        </a>
                        <p style="color: var(--ink); font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">"${c.content}"</p>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
        }
    } catch (e) {
        console.error("Yorumlar çekilemedi:", e);
    }
}