// =========================================
// GLOBAL AYARLAR & YARDIMCILAR
// =========================================
const API_URL = "/api";

// Token Çözücü: Hem 'token' hem 'userToken' anahtarını kontrol eder
function getAuthToken() {
    let t = localStorage.getItem('token') || localStorage.getItem('userToken');
    return t ? t.replace(/"/g, '').trim() : null;
}

// Tarih formatlayıcı
function formatFullDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).replace(' ', ' - ');
}

// Modern Bildirim Sistemi (SweetAlert2 destekli / CSS fallback)
function showToast(message, type = 'success') {
    if (typeof Swal !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark') || true;
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: isDark ? '#211d1a' : '#fbf6ea',
            color: isDark ? '#ede6e1' : '#2c2c2c'
        });
        return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    const icon = type === 'success'
        ? '<i class="ph ph-check-circle" style="font-size:1.5rem; color:#10b981"></i>'
        : '<i class="ph ph-warning-circle" style="font-size:1.5rem; color:#ef4444"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =========================================
// 1. GİRİŞ & YETKİ KONTROLÜ
// =========================================
function checkAdminAuth() {
    const token = getAuthToken();
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('userRole') || userObj.role;
    const loginScreen = document.getElementById('login-screen');

    const isAdmin = (role === 'admin' || userObj.username === 'OnurCy');

    if (token && isAdmin) {
        if (loginScreen) loginScreen.style.display = 'none';
        const el = document.getElementById('adminWelcomeText');
        if (el) el.innerText = `Hoş geldin, ${userObj.username || 'Admin'} 👋`;
        loadDashboardStats();
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
    }
}

document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('emailInput')?.value.trim();
    const password = document.getElementById('passwordInput')?.value.trim();

    if (!email || !password) return showToast("Giriş bilgileri eksik!", "error");

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        const user = data.user || data;
        if (res.ok && (user.role === 'admin' || user.username === 'OnurCy')) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('user', JSON.stringify(user));
            showToast("Giriş başarılı! Yönlendiriliyorsunuz...");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast("Yetkisiz erişim! Admin yetkiniz yok.", "error");
        }
    } catch (e) {
        showToast("Sunucuya bağlanılamadı.", "error");
    }
});

function logout() {
    localStorage.clear();
    location.reload();
}

// =========================================
// 2. SEKME YÖNETİMİ
// =========================================
const tabs = {
    'btn-dashboard': 'page-dashboard',
    'btn-blog': 'page-blog',
    'btn-book': 'page-book',
    'btn-widget': 'page-widget',
    'btn-users': 'page-users',
    'btn-settings': 'page-settings'
};

for (const [btnId, pageId] of Object.entries(tabs)) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            btn.classList.add('active');
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.style.display = 'block';

            if (pageId === 'page-dashboard') loadDashboardStats();
            if (pageId === 'page-blog') fetchPosts();
            if (pageId === 'page-book') fetchBooksFromDB();
            if (pageId === 'page-users') loadUsers();
            if (pageId === 'page-widget') loadWidgets();
            if (pageId === 'page-settings') loadSystemSettings();
        });
    }
}

// =========================================
// 3. SÖZ HAVUZU YÖNETİMİ (GÜNCELLENDİ)
// =========================================

// Söz listesini ekrana basma
function loadQuoteList(quotes) {
    const tbody = document.getElementById('quoteListBody');
    if (!tbody) return;

    if (!Array.isArray(quotes) || quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:#888;">Henüz eklenmiş bir söz yok.</td></tr>';
        return;
    }

    tbody.innerHTML = quotes.map((q, i) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding:12px; font-style:italic; font-family:serif;">"${q.text}"</td>
            <td style="padding:12px; font-weight:600; color:var(--accent, #c07d56);">— ${q.author || 'Anonim'}</td>
            <td style="padding:12px; text-align:right;">
                <button class="action-btn delete-btn" onclick="deleteQuote(${i})" title="Sözü Sil" style="padding: 6px 10px; border-radius: 6px;">
                    <i class="ph ph-trash" style="font-size:1.1rem; color:#ef4444;"></i>
                </button>
            </td>
        </tr>`).join('');
}

// Söz ekleme
async function addQuote() {
    const textEl = document.getElementById('newQuoteText');
    const authorEl = document.getElementById('newQuoteAuthor');
    if (!textEl) return;

    const text = textEl.value.trim();
    const author = authorEl ? authorEl.value.trim() : '';

    if (!text) return showToast("Söz metni boş bırakılamaz!", "error");

    const token = getAuthToken();
    if (!token) return showToast("Oturum bulunamadı, lütfen tekrar giriş yapın.", "error");

    try {
        const res = await fetch(`${API_URL}/settings/quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text, author: author || 'Anonim' })
        });

        if (res.ok) {
            showToast("Söz havuzuna başarıyla eklendi! ✨");
            textEl.value = '';
            if (authorEl) authorEl.value = '';
            loadWidgets();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.message || "Söz eklenirken sunucu hatası oluştu!", "error");
        }
    } catch (e) {
        showToast("Sunucuya bağlanılamadı!", "error");
    }
}

// Söz silme
async function deleteQuote(index) {
    if (!confirm("Bu sözü havuzdan kaldırmak istediğine emin misin?")) return;

    const token = getAuthToken();
    try {
        const res = await fetch(`${API_URL}/settings/quote/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("Söz havuzdan kaldırıldı.");
            loadWidgets();
        } else {
            showToast("Söz silinemedi!", "error");
        }
    } catch (e) {
        showToast("Sunucu hatası!", "error");
    }
}

// =========================================
// 4. WIDGET VE OKUMA DURUMU YÖNETİMİ
// =========================================
function calcWidgetPercent() {
    const total = parseInt(document.getElementById('widgetTotalPage')?.value) || 0;
    const current = parseInt(document.getElementById('widgetCurrentPage')?.value) || 0;
    const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

    const pBar = document.getElementById('widgetProgressBar');
    const pText = document.getElementById('widgetPercentText');
    if (pBar) pBar.style.width = percent + '%';
    if (pText) pText.innerText = `%${percent} Tamamlandı`;
}

async function loadWidgets() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();

        if (data.currentBook) {
            if (document.getElementById('widgetBookTitle')) document.getElementById('widgetBookTitle').value = data.currentBook.title || '';
            if (document.getElementById('widgetBookAuthor')) document.getElementById('widgetBookAuthor').value = data.currentBook.author || '';
            if (document.getElementById('widgetTotalPage')) document.getElementById('widgetTotalPage').value = data.currentBook.totalPages || '';
            if (document.getElementById('widgetCurrentPage')) document.getElementById('widgetCurrentPage').value = data.currentBook.currentPage || '';
            calcWidgetPercent();
        }
        if (data.goal) {
            if (document.getElementById('widgetGoalTarget')) document.getElementById('widgetGoalTarget').value = data.goal.target || '';
            if (document.getElementById('widgetGoalCurrent')) document.getElementById('widgetGoalCurrent').value = data.goal.current || '';
        }
        // Söz havuzunu doldur
        loadQuoteList(data.quotes || []);
    } catch (e) {
        console.error("Widget verileri çekilemedi:", e);
    }
}

async function saveWidgets() {
    const token = getAuthToken();
    const settings = {
        currentBook: {
            title: document.getElementById('widgetBookTitle')?.value || '',
            author: document.getElementById('widgetBookAuthor')?.value || '',
            totalPages: parseInt(document.getElementById('widgetTotalPage')?.value) || 0,
            currentPage: parseInt(document.getElementById('widgetCurrentPage')?.value) || 0
        },
        goal: {
            target: parseInt(document.getElementById('widgetGoalTarget')?.value) || 0,
            current: parseInt(document.getElementById('widgetGoalCurrent')?.value) || 0
        }
    };

    const fileInputEl = document.getElementById('bookCoverInput');
    if (fileInputEl && fileInputEl.files && fileInputEl.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            settings.currentBook.cover = e.target.result;
            await submitWidgetSettings(settings, token);
        };
        reader.readAsDataURL(fileInputEl.files[0]);
    } else {
        await submitWidgetSettings(settings, token);
    }
}

async function submitWidgetSettings(settings, token) {
    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(settings)
        });
        if (res.ok) {
            showToast("Widget ayarları güncellendi! ✅");
        } else {
            showToast("Ayarlar kaydedilemedi!", "error");
        }
    } catch (e) {
        showToast("Sunucu hatası!", "error");
    }
}

// =========================================
// 5. BLOG VE KİTAP İŞLEMLERİ
// =========================================
async function fetchPosts() {
    const tbody = document.getElementById('postsListBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();

        if (!Array.isArray(posts) || posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:gray;">Henüz blog yazısı yok.</td></tr>';
            return;
        }

        tbody.innerHTML = posts.map(post => `
            <tr>
                <td><strong>${post.title}</strong></td>
                <td style="text-align:right;">
                    <button class="action-btn delete-btn" onclick="icerigiSil('posts', '${post._id}')">
                        <i class="ph ph-trash"></i> Sil
                    </button>
                </td>
            </tr>
        `).join('');

        const blogCountEl = document.getElementById('statTotalBlogs');
        if (blogCountEl) blogCountEl.innerText = posts.length;
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:red;">Yazılar getirilemedi.</td></tr>';
    }
}

async function fetchBooksFromDB() {
    const tbody = document.getElementById('booksListBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/books`);
        const books = await res.json();

        if (!Array.isArray(books) || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:gray;">Kütüphane boş.</td></tr>';
            return;
        }

        tbody.innerHTML = books.map(book => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${book.cover || 'default_cover.png'}" style="width:30px; height:45px; object-fit:cover; border-radius:4px;">
                        <span>${book.title}</span>
                    </div>
                </td>
                <td>${book.author}</td>
                <td style="text-align:right;">
                    <button class="action-btn delete-btn" onclick="icerigiSil('books', '${book._id}')">
                        <i class="ph ph-trash"></i> Sil
                    </button>
                </td>
            </tr>
        `).join('');

        const bookCountEl = document.getElementById('statTotalBooks');
        if (bookCountEl) bookCountEl.innerText = books.length;
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Kitaplar getirilemedi.</td></tr>';
    }
}

async function icerigiSil(tur, id) {
    if (!confirm("⚠️ Bu içeriği silmek istediğine emin misin?")) return;
    const token = getAuthToken();

    try {
        const response = await fetch(`${API_URL}/${tur}/${id}`, {
            method: "DELETE",
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast("İçerik başarıyla silindi! 🗑️");
            if (tur === 'posts') fetchPosts();
            if (tur === 'books') fetchBooksFromDB();
        } else {
            showToast("Silme işlemi başarısız!", "error");
        }
    } catch (err) {
        showToast("Sunucuya ulaşılamadı!", "error");
    }
}

// =========================================
// 6. ROZET TANIMLARI & KULLANICI YÖNETİMİ
// =========================================

const AVAILABLE_BADGES = [
    { id: 'admin', label: 'Yönetici', icon: 'ph-shield-check', class: 'badge-admin-role' },
    { id: 'mod', label: 'Moderatör', icon: 'ph-hammer', class: 'badge-mod' },
    { id: 'dev', label: 'Geliştirici', icon: 'ph-code', class: 'badge-dev' },
    { id: 'vip', label: 'VIP', icon: 'ph-star', class: 'badge-vip' },
    { id: 'supporter', label: 'Destekçi', icon: 'ph-heart', class: 'badge-supporter' },
    { id: 'verified', label: 'Onaylı', icon: 'ph-seal-check', class: 'badge-verified' },
    { id: 'writer', label: 'Yazar', icon: 'ph-pen-nib', class: 'badge-writer' },
    { id: 'poet', label: 'Şair', icon: 'ph-feather', class: 'badge-poet' },
    { id: 'bug_hunter', label: 'Bug Avcısı', icon: 'ph-bug', class: 'badge-bug' },
    { id: 'bookworm', label: 'Kitap Kurdu', icon: 'ph-books', class: 'badge-bookworm' },
    { id: 'coffee', label: 'Kahve Sever', icon: 'ph-coffee', class: 'badge-coffee' },
    { id: 'cat_lover', label: 'Kedi Sever', icon: 'ph-cat', class: 'badge-cat' }
];

window.allUsersData = [];
let selectedUserId = null;
let currentSelectedBadges = [];

// Kullanıcı tablosunu oluştur
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#a1a1aa;">Kullanıcılar getiriliyor... ⏳</td></tr>';

    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        window.allUsersData = users;

        const countBadge = document.getElementById('statTotalUsers');
        if (countBadge) countBadge.innerText = users.length;

        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#a1a1aa;">Kayıtlı kullanıcı bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const userId = user._id || user.id;
            const isBanned = !!user.isBanned;

            // 1. BAN DURUMU VE SEBEBİ
            let statusHTML = '';
            if (isBanned) {
                const reason = user.banReason || 'Belirtilmedi';
                statusHTML = `
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="color:var(--danger, #ef4444); font-weight:700; font-size:0.85rem;">
                            <i class="ph-bold ph-prohibit"></i> Banlı
                        </span>
                        <span style="font-size:0.75rem; color:#9c948e; font-style:italic;" title="${reason}">
                            "${reason.length > 25 ? reason.substring(0, 25) + '...' : reason}"
                        </span>
                    </div>`;
            } else {
                statusHTML = `<span style="color:#10b981; font-weight:700; font-size:0.85rem;">● Aktif</span>`;
            }

            // 2. RENKLİ VE İKONLU TÜRKÇE ROZETLER
            let badgesHTML = '<div style="display:flex; gap:6px; flex-wrap:wrap;">';
            if (user.badges && user.badges.length > 0) {
                user.badges.forEach(badgeId => {
                    const badgeInfo = AVAILABLE_BADGES.find(b => b.id === badgeId);
                    if (badgeInfo) {
                        badgesHTML += `
                            <span class="custom-badge ${badgeInfo.class}">
                                <i class="ph-bold ${badgeInfo.icon}"></i> ${badgeInfo.label}
                            </span>`;
                    } else {
                        badgesHTML += `<span class="custom-badge badge-vip">${badgeId}</span>`;
                    }
                });
            } else {
                badgesHTML += '<span style="color:#71717a; font-size:0.8rem;">—</span>';
            }
            badgesHTML += '</div>';

            return `
                <tr style="${isBanned ? 'opacity: 0.65;' : ''}">
                    <td><strong>${user.username}</strong></td>
                    <td style="color:#a1a1aa;">${user.email || '-'}</td>
                    <td>${badgesHTML}</td>
                    <td>${statusHTML}</td>
                    <td style="text-align:right;">
                        <div style="display:inline-flex; gap:8px;">
                            <button class="action-btn" style="background:#6366f1; padding:7px 12px; border-radius:6px;" onclick="openBadgeModal('${userId}')" title="Rozetleri Düzenle">
                                <i class="ph-bold ph-medal"></i>
                            </button>
                            <button class="action-btn" style="background:${isBanned ? '#3b82f6' : 'var(--danger, #ef4444)'}; padding:7px 12px; border-radius:6px;" onclick="banUser('${userId}', ${isBanned})" title="${isBanned ? 'Banı Kaldır' : 'Kullanıcıyı Banla'}">
                                <i class="ph-bold ${isBanned ? 'ph-arrow-u-up-left' : 'ph-prohibit'}"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:20px;">Kullanıcı verileri çekilemedi!</td></tr>';
    }
}

// 3. ROZET MODALI AÇMA / KAPATMA / KAYDETME
function openBadgeModal(userId) {
    selectedUserId = userId;
    const user = window.allUsersData.find(u => (u._id || u.id) === userId);
    if (!user) return;

    currentSelectedBadges = [...(user.badges || [])];

    const list = document.getElementById('badgeOptionsList');
    if (list) {
        list.innerHTML = AVAILABLE_BADGES.map(badge => {
            const isSelected = currentSelectedBadges.includes(badge.id);
            return `
                <div class="badge-option ${isSelected ? 'selected' : ''}" onclick="toggleBadgeSelection('${badge.id}', this)">
                    <span class="custom-badge ${badge.class}">
                        <i class="ph-bold ${badge.icon}"></i> ${badge.label}
                    </span>
                    <span style="font-size:1.1rem; color:${isSelected ? 'var(--accent, #c07d56)' : '#71717a'};">
                        ${isSelected ? '✅' : '○'}
                    </span>
                </div>
            `;
        }).join('');
    }

    const modal = document.getElementById('badgeModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
}

function toggleBadgeSelection(badgeId, element) {
    const idx = currentSelectedBadges.indexOf(badgeId);
    const indicator = element.querySelector('span:last-child');
    if (idx > -1) {
        currentSelectedBadges.splice(idx, 1);
        element.classList.remove('selected');
        if (indicator) {
            indicator.textContent = '○';
            indicator.style.color = '#71717a';
        }
    } else {
        currentSelectedBadges.push(badgeId);
        element.classList.add('selected');
        if (indicator) {
            indicator.textContent = '✅';
            indicator.style.color = 'var(--accent, #c07d56)';
        }
    }
}

function closeBadgeModal() {
    const modal = document.getElementById('badgeModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

async function saveBadges() {
    if (!selectedUserId) return;
    const token = getAuthToken();

    try {
        const res = await fetch(`${API_URL}/users/${selectedUserId}/badges`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ badges: currentSelectedBadges })
        });

        if (res.ok) {
            showToast("Rozetler güncellendi! 🎖️");
            closeBadgeModal();
            loadUsers();
        } else {
            showToast("Rozetler kaydedilemedi!", "error");
        }
    } catch (err) {
        showToast("Sunucu hatası!", "error");
    }
}

// 4. BAN İŞLEMİ (SEBEP KAYDETME)
async function banUser(id, isCurrentlyBanned) {
    let reason = "";
    if (!isCurrentlyBanned) {
        reason = prompt("🚫 Bu kullanıcıyı neden banlıyorsun? (Kullanıcı durumunda görünecek)");
        if (reason === null) return;
        if (reason.trim() === "") reason = "Yönetici tarafından uzaklaştırıldı.";
    } else {
        if (!confirm("Kullanıcının banını kaldırmak istiyor musun?")) return;
    }

    const token = getAuthToken();
    try {
        const res = await fetch(`${API_URL}/users/${id}/ban`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason.trim() })
        });

        if (res.ok) {
            showToast(isCurrentlyBanned ? "Ban kaldırıldı." : "Kullanıcı banlandı.");
            loadUsers();
        } else {
            showToast("İşlem başarısız oldu!", "error");
        }
    } catch (e) {
        showToast("Sunucu hatası!", "error");
    }
}

// =========================================
// 7. SİSTEM AYARLARI & DASHBOARD
// =========================================
async function loadSystemSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        const toggle = document.getElementById('maintenanceToggle');
        if (toggle && data.maintenance !== undefined) toggle.checked = data.maintenance;
    } catch (e) { console.error(e); }
}

async function saveSystemSettings() {
    const token = getAuthToken();
    const isMaintenanceOn = document.getElementById('maintenanceToggle')?.checked;
    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ maintenance: isMaintenanceOn })
        });
        if (res.ok) {
            showToast(isMaintenanceOn ? "Site bakıma alındı! 🚧" : "Site yayına açıldı! 🌍");
        }
    } catch (e) { showToast("Ayar kaydedilemedi!", "error"); }
}

async function loadDashboardStats() {
    try {
        const [postsRes, usersRes, booksRes] = await Promise.all([
            fetch(`${API_URL}/posts`),
            fetch(`${API_URL}/users`),
            fetch(`${API_URL}/books`)
        ]);
        const posts = await postsRes.json();
        const users = await usersRes.json();
        const books = await booksRes.json();

        if (document.getElementById('statTotalUsers')) document.getElementById('statTotalUsers').innerText = users.length || 0;
        if (document.getElementById('statTotalBlogs')) document.getElementById('statTotalBlogs').innerText = posts.length || 0;
        if (document.getElementById('statTotalBooks')) document.getElementById('statTotalBooks').innerText = books.length || 0;
    } catch (e) { console.error("Dashboard verileri alınamadı:", e); }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();

    // İlk açılışta Dashboard'u zorla görünür kıl
    const defaultPage = document.getElementById('page-dashboard');
    if (defaultPage) defaultPage.style.display = 'block';

    // Söz ekleme butonunu dinle
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addQuote();
        });
    }

    // Okuma widgetı input dinleyicileri
    document.getElementById('widgetTotalPage')?.addEventListener('input', calcWidgetPercent);
    document.getElementById('widgetCurrentPage')?.addEventListener('input', calcWidgetPercent);
});

// =========================================
// BAŞLANGIÇ DİNLENİCİLERİ
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();

    // Söz ekleme butonunu dinle (HTML'de onclick olmasa bile yakalar)
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addQuote();
        });
    }

    // Okuma widgetı input dinleyicileri
    document.getElementById('widgetTotalPage')?.addEventListener('input', calcWidgetPercent);
    document.getElementById('widgetCurrentPage')?.addEventListener('input', calcWidgetPercent);
});