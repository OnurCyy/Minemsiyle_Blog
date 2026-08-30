const API_BASE = "/api";
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

// --- HEDEF KULLANICIYI URL'DEN TESPİT ET ---
let targetUsername = null;
const pathSegments = window.location.pathname.split('/').filter(Boolean); // Boşlukları temizle

if (pathSegments.length > 0 && pathSegments[0] !== 'profile.html') {
    // URL örn: www.minemsiyle.com/Minemsi ise targetUsername = "Minemsi" olur
    targetUsername = decodeURIComponent(pathSegments[0]);
} else {
    // Eski usül ?u=... kalmışsa oradan al
    const params = new URLSearchParams(window.location.search);
    targetUsername = params.get('u');
}

// Eğer hala bulunamadıysa (örneğin direkt /profile.html girildiyse) kendi adını al
if (!targetUsername) {
    const sessionUser = JSON.parse(localStorage.getItem('user'));
    if (sessionUser) targetUsername = sessionUser.username;
}

// Adres çubuğunu şık bir şekilde /KullaniciAdi formatına sabitle
if (targetUsername && window.location.pathname !== `/${targetUsername}`) {
    window.history.replaceState({}, '', `/${targetUsername}`);
}


// --- SAYFA YÜKLENİNCE ---
document.addEventListener("DOMContentLoaded", () => {
    // Tema kontrolü artık HTML'in içindeki script'ten yapılıyor.
    loadUserProfile();
    loadSavedItems();
    loadMyComments();
});


// --- PROFİL YÜKLEME ---
async function loadUserProfile() {
    const sessionUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Hedef kullanıcı global olarak zaten tanımlandı (targetUsername).
    // Eğer kimse yoksa ve sen de giriş yapmadıysan login'e at.
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
        // ARTIK SADECE HEDEF KULLANICIYI ÇEKİYORUZ
        const res = await fetch(`${API_BASE}/public-user?u=${targetUsername}`);

        if (!res.ok) {
            document.getElementById('displayName').innerText = "Kullanıcı Bulunamadı";
            // Bulunamadıysa resmi ve bio'yu da temizle
            document.getElementById('displayBio').innerText = '"Bu sayfa boş..."';
            document.getElementById('displayEmail').innerText = "";
            return;
        }

        const viewedUser = await res.json();

        // 1. EKRANI ARTIK 'viewedUser' (Baktığımız Kişi) İLE DOLDURUYORUZ
        const avatarEl = document.getElementById('avatarDisplay');
        if (avatarEl) {
            let finalAvatar = viewedUser.avatar;
            if (!finalAvatar || finalAvatar === 'default_avatar.png' || finalAvatar.trim() === '') {
                finalAvatar = defaultAvatar;
            }
            avatarEl.src = finalAvatar;
            avatarEl.onerror = function () { this.onerror = null; this.src = defaultAvatar; };
        }

        document.getElementById('displayName').innerText = viewedUser.username;
        document.getElementById('displayBio').innerText = viewedUser.bio ? `"${viewedUser.bio}"` : '"Henüz bir dize yazılmamış..."';

        // Sadece admin ise veya kendi profilindeyse emaili göster, yoksa gizle veya sadece @kullaniciadi yaz
        const isMyProfile = (token && parseJwt(token)?.username === viewedUser.username) || (sessionUser && sessionUser.username === viewedUser.username);
        if (isMyProfile || (sessionUser && (sessionUser.role === 'admin' || sessionUser.username === 'OnurCy'))) {
            document.getElementById('displayEmail').innerText = viewedUser.email || `@${viewedUser.username}`;
        } else {
            document.getElementById('displayEmail').innerText = `@${viewedUser.username}`;
        }


        // 2. YETKİ KONTROLLERİ (Sadece kendi profilindeyse düzenleme butonlarını göster)
        const actionsArea = document.getElementById('logoutArea');
        const avatarBtn = document.getElementById('avatarEditIcon');
        const settingsTab = document.getElementById('settingsTabBtn');
        const adminBtn = document.getElementById('adminPanelBtnArea');

        if (isMyProfile) {
            // Kendi profili: Ayarları ve düzenlemeleri aç
            if (actionsArea) actionsArea.classList.remove('hidden');
            if (avatarBtn) avatarBtn.classList.remove('hidden');
            if (settingsTab) settingsTab.classList.remove('hidden');

            if (viewedUser.role === 'admin' || viewedUser.username === 'OnurCy') {
                if (adminBtn) {
                    adminBtn.innerHTML = `
                    <a href="adminPanel.html" class="w-full bg-danger hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-danger/20 mb-3">
                        <i class="ph-fill ph-crown text-lg"></i> Yönetici Paneli
                    </a>`;
                }
            }
        } else {
            // Başkasının profili: Ayarları ve düzenlemeleri gizle
            if (actionsArea) actionsArea.classList.add('hidden');
            if (avatarBtn) avatarBtn.classList.add('hidden');
            if (settingsTab) settingsTab.classList.add('hidden');
            if (adminBtn) adminBtn.innerHTML = ""; // Admin butonunu başkasında görme
        }

        // 3. ROZETLERİ HEDEF KULLANICIYA GÖRE BAS
        renderUserTags(viewedUser);

    } catch (error) {
        console.error("Profil Yükleme Hatası:", error);
    }
}

// --- ETİKETLERİ BAS ---
function renderUserTags(user) {
    const tagsBox = document.getElementById('userTagsContainer');
    if (!tagsBox) return;

    let tags = user.tags || user.badges || [];
    if (typeof tags === 'string') tags = tags.split(',');

    if (tags.length === 0) {
        tags = ['ÜYE'];
    }

    // 🎨 ROZET TASARIM KÜTÜPHANESİ (İngilizce - Türkçe Çeviri Destekli)
    const badgeStyles = {
        // YÖNETİCİ
        'YÖNETİCİ': { label: 'YÖNETİCİ', icon: 'ph-fill ph-shield-check', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
        'ADMIN': { label: 'ADMIN', icon: 'ph-fill ph-shield-check', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },

        // GELİŞTİRİCİ
        'GELİŞTİRİCİ': { label: 'GELİŞTİRİCİ', icon: 'ph-bold ph-code', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
        'DEV': { label: 'DEV', icon: 'ph-bold ph-code', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },

        // MODERATÖR
        'MODERATÖR': { label: 'MODERATÖR', icon: 'ph-fill ph-hammer', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-500 border-amber-500/30' },
        'MOD': { label: 'MOD', icon: 'ph-fill ph-hammer', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-500 border-amber-500/30' },

        // VIP
        'VIP': { label: 'VIP', icon: 'ph-fill ph-star', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },

        // DESTEKÇİ
        'DESTEKÇİ': { label: 'DESTEKÇİ', icon: 'ph-fill ph-heart', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
        'SUPPORTER': { label: 'DESTEKÇİ', icon: 'ph-fill ph-heart', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },

        // ONAYLI
        'ONAYLI': { label: 'ONAYLI', icon: 'ph-fill ph-check-circle', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
        'VERIFIED': { label: 'ONAYLI', icon: 'ph-fill ph-check-circle', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },

        // YAZAR
        'YAZAR': { label: 'YAZAR', icon: 'ph-fill ph-pen-nib', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
        'WRITER': { label: 'YAZAR', icon: 'ph-fill ph-pen-nib', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },

        // ŞAİR
        'ŞAİR': { label: 'ŞAİR', icon: 'ph-fill ph-feather', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
        'POET': { label: 'ŞAİR', icon: 'ph-fill ph-feather', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },

        // BUG AVCISI
        'BUG AVCISI': { label: 'BUG AVCISI', icon: 'ph-fill ph-bug', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
        'BUG_HUNTER': { label: 'BUG AVCISI', icon: 'ph-fill ph-bug', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },

        // KİTAP KURDU
        'KİTAP KURDU': { label: 'KİTAP KURDU', icon: 'ph-fill ph-book-open', color: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30' },
        'BOOKWORM': { label: 'KİTAP KURDU', icon: 'ph-fill ph-book-open', color: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30' },

        // KAHVE SEVER
        'KAHVE SEVER': { label: 'KAHVE SEVER', icon: 'ph-fill ph-coffee', color: 'bg-orange-700/15 text-orange-800 dark:text-orange-400 border-orange-700/30' },
        'COFFEE': { label: 'KAHVE SEVER', icon: 'ph-fill ph-coffee', color: 'bg-orange-700/15 text-orange-800 dark:text-orange-400 border-orange-700/30' },

        // KEDİ SEVER
        'KEDİ SEVER': { label: 'KEDİ SEVER', icon: 'ph-fill ph-cat', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
        'CAT_LOVER': { label: 'KEDİ SEVER', icon: 'ph-fill ph-cat', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },

        // VARSAYILAN / ÜYE
        'DEFAULT': { label: 'ÜYE', icon: 'ph-fill ph-user', color: 'bg-black/5 dark:bg-white/5 text-inkLight dark:text-inkDark border-lineLight dark:border-lineDark' }
    };

    tagsBox.innerHTML = tags.map(tag => {
        const cleanTag = tag.trim().toUpperCase();

        // Stili kütüphaneden çek, bulamazsan DEFAULT kullan
        const style = badgeStyles[cleanTag] || badgeStyles['DEFAULT'];

        // Eğer kütüphanede tanımlanmamış yepyeni bir rozet gelirse alt tireleri silip yaz
        const displayLabel = style.label || cleanTag.replace(/_/g, ' ');

        return `
        <span class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-widest border shadow-sm ${style.color}">
            <i class="${style.icon} text-sm"></i> 
            ${displayLabel}
        </span>`;
    }).join('');
}

// --- PROFİL GÜNCELLEME (SweetAlert2 Ekli) ---
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
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/users/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` },
            body: JSON.stringify(updateData)
        });

        if (res.ok) {
            // Çirkin alert yerine şık bildirim
            Swal.fire({
                title: 'Başarılı!',
                text: 'Okur kimliğin başarıyla güncellendi.',
                icon: 'success',
                confirmButtonColor: '#c07d56', // Temanın Tarçın rengi
                background: document.documentElement.classList.contains('dark') ? '#211d1a' : '#fbf6ea',
                color: document.documentElement.classList.contains('dark') ? '#ede6e1' : '#2c2c2c'
            }).then(() => {
                let user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    if (newName) user.username = newName;
                    if (newBio) user.bio = newBio;
                    localStorage.setItem('user', JSON.stringify(user));
                }
                location.reload();
            });
        } else {
            const data = await res.json();
            Swal.fire('Hata!', data.message || "Güncellenemedi.", 'error');
        }
    } catch (err) {
        Swal.fire('Bağlantı Hatası', 'Sunucuya ulaşılamadı!', 'error');
    }
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

            Swal.fire({
                title: 'Harika!',
                text: 'Profil fotoğrafın yenilendi.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#211d1a' : '#fbf6ea',
                color: document.documentElement.classList.contains('dark') ? '#ede6e1' : '#2c2c2c'
            });
        } else { Swal.fire('Hata', 'Resim yüklenemedi.', 'error'); }
    } catch (e) { Swal.fire('Hata', 'Sunucu hatası!', 'error'); }
}

// --- GÜVENLİ ÇIKIŞ ---
function logout() {
    Swal.fire({
        title: 'Çıkış Yapıyorsun',
        text: 'Kütüphaneden ayrılmak istediğine emin misin?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#c07d56',
        confirmButtonText: 'Evet, Ayrıl',
        cancelButtonText: 'Vazgeç',
        background: document.documentElement.classList.contains('dark') ? '#211d1a' : '#fbf6ea',
        color: document.documentElement.classList.contains('dark') ? '#ede6e1' : '#2c2c2c'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
}

// ==========================================
// 📚 KAYDEDİLEN YAZILARI PROFİLE ÇEKME
// ==========================================
async function loadSavedItems() {
    const container = document.getElementById('saved-tab');
    if (!container) return;

    // ARTIK KENDİ BAŞINA ARAMIYOR, EN ÜSTTEKİ GLOBAL 'targetUsername'i KULLANIYOR
    if (!targetUsername) return;

    let token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token.replace(/"/g, '').trim()}` } : {};

    try {
        const res = await fetch(`${API_BASE}/users/profile/saved?u=${targetUsername}`, { headers });

        if (res.ok) {
            const data = await res.json();
            const items = data.savedItems || [];

            const statSaved = document.getElementById('statSaved');
            if (statSaved) statSaved.innerText = items.length;

            if (items.length === 0) {
                container.innerHTML = `
                <div class="text-center py-12 px-5 text-mutedLight dark:text-mutedDark">
                    <i class="ph-fill ph-books text-5xl text-lineLight dark:text-lineDark mb-4 block"></i>
                    <p>Bu kütüphane şu an boş.</p>
                </div>`;
                return;
            }

            let html = `<div class="flex flex-col gap-4">`;
            items.reverse().forEach(item => {
                const date = new Date(item.savedAt).toLocaleDateString('tr-TR');
                const icon = item.type === 'blog' ? 'ph-article' : 'ph-book-open';

                // Eğer başkasının profilindeysek silme butonunu gösterme
                const currentUser = JSON.parse(localStorage.getItem('user'));
                const isOwner = currentUser && (currentUser.username === targetUsername);

                const deleteBtn = isOwner ? `
                <button class="text-mutedLight dark:text-mutedDark hover:text-danger hover:bg-danger/10 p-2.5 rounded-full transition-colors flex items-center justify-center" onclick="removeFromProfile('${item.itemId}')" title="Raftan Kaldır">
                    <i class="ph-bold ph-trash text-lg"></i>
                </button>` : '';

                html += `
                <div class="flex items-center gap-4 bg-bgLight dark:bg-bgDark border border-lineLight dark:border-lineDark p-4 rounded-xl hover:border-accent transition-all group">
                    <div class="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        <i class="ph-fill ${icon}"></i>
                    </div>
                    <a href="${item.url || '#'}" class="flex-1 flex flex-col">
                        <h4 class="text-inkLight dark:text-inkDark font-serif font-bold text-base m-0 leading-tight group-hover:text-accent transition-colors">${item.title}</h4>
                        <span class="text-mutedLight dark:text-mutedDark text-[11px] mt-1.5 uppercase tracking-wide">Kaydedilme: ${date}</span>
                    </a>
                    ${deleteBtn}
                </div>`;
            });
            html += `</div>`;
            container.innerHTML = html;
        }
    } catch (e) { console.error("Kaydedilenler çekilemedi:", e); }
}

// ==========================================
// 💬 KULLANICININ YORUMLARINI PROFİLE ÇEKME
// ==========================================
async function loadMyComments() {
    const container = document.getElementById('comments-tab');
    if (!container) return;

    // ARTIK KENDİ BAŞINA ARAMIYOR, EN ÜSTTEKİ GLOBAL 'targetUsername'i KULLANIYOR
    if (!targetUsername) return;

    let token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token.replace(/"/g, '').trim()}` } : {};

    try {
        const res = await fetch(`${API_BASE}/users/profile/comments?u=${targetUsername}`, { headers });

        if (res.ok) {
            const data = await res.json();
            const comments = data.comments || [];

            const statComments = document.getElementById('statComments');
            if (statComments) statComments.innerText = comments.length;

            if (comments.length === 0) {
                container.innerHTML = `
                <div class="text-center py-12 px-5 text-mutedLight dark:text-mutedDark">
                    <i class="ph-fill ph-chat-teardrop-text text-5xl text-lineLight dark:text-lineDark mb-4 block"></i>
                    <p>Henüz hiçbir yazıya yorum yapılmamış.</p>
                </div>`;
                return;
            }

            let html = `<div class="flex flex-col gap-4">`;
            comments.forEach(c => {
                const dateVal = c.createdAt || c.date || Date.now();
                const date = new Date(dateVal).toLocaleDateString('tr-TR');
                const typeLabel = c.contentType === 'blog' ? 'Blog' : 'Kitap';
                const postTitle = c.title || c.relatedId || 'Bilinmeyen Yazı';
                const postLink = c.contentType === 'blog' ? `/blog/${c.relatedId}` : `/kitap/${c.relatedId}`;

                html += `
                <div class="flex items-start gap-4 bg-bgLight dark:bg-bgDark border border-lineLight dark:border-lineDark p-5 rounded-xl hover:border-accent transition-all">
                    <div class="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center text-xl shrink-0 mt-0.5">
                        <i class="ph-fill ph-chat-centered-text"></i>
                    </div>
                    <div class="flex-1">
                        <a href="${postLink}" class="inline-block mb-2 group">
                            <span class="text-accent font-bold text-sm group-hover:text-accent2 transition-colors">
                                <i class="ph-bold ph-link text-xs"></i> ${typeLabel}: ${postTitle.length > 35 ? postTitle.substring(0, 35) + '...' : postTitle}
                            </span>
                            <span class="text-mutedLight dark:text-mutedDark text-[11px] ml-2 font-medium">• ${date}</span>
                        </a>
                        <p class="text-inkLight dark:text-inkDark text-sm m-0 leading-relaxed font-serif italic border-l-2 border-accent/30 pl-3">"${c.content}"</p>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (e) { console.error("Yorumlar çekilemedi:", e); }
}

// 🗑️ PROFİL İÇİNDEN KAYDEDİLENİ SİLME
async function removeFromProfile(itemId) {
    Swal.fire({
        title: 'Emin misin?',
        text: 'Bu yazıyı kütüphanenden kaldırmak istiyor musun?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#c07d56',
        confirmButtonText: 'Evet, Kaldır',
        cancelButtonText: 'Vazgeç',
        background: document.documentElement.classList.contains('dark') ? '#211d1a' : '#fbf6ea',
        color: document.documentElement.classList.contains('dark') ? '#ede6e1' : '#2c2c2c'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let token = localStorage.getItem('token');
            if (!token) return;
            token = token.replace(/"/g, '').trim();

            try {
                const res = await fetch(`${API_BASE}/users/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ itemId: itemId })
                });

                if (res.ok) {
                    loadSavedItems();
                    Swal.fire({
                        title: 'Kaldırıldı!',
                        text: 'Yazı raftan indirildi.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false,
                        background: document.documentElement.classList.contains('dark') ? '#211d1a' : '#fbf6ea',
                        color: document.documentElement.classList.contains('dark') ? '#ede6e1' : '#2c2c2c'
                    });
                }
            } catch (e) { console.error("Silme hatası:", e); }
        }
    });
}


