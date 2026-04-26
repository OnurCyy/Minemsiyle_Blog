// =========================================
// GLOBAL AYARLAR
// =========================================
const API_URL = "/api";

// Resmi Base64'e çeviren yardımcı
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Tarih formatlayıcı
function formatFullDate(dateString) {
    return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).replace(' ', ' - ');
}

// =========================================
// 1. GİRİŞ SİSTEMİ
// =========================================

// Sayfa yüklenince admin kontrolü yap
window.onload = () => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    const loginScreen = document.getElementById('login-screen');

    if (token && role === 'admin') {
        if (loginScreen) loginScreen.style.display = 'none';
        loadUsersForStat();
        const userObj = JSON.parse(localStorage.getItem('user'));
        if (userObj && userObj.username) {
            const el = document.getElementById('adminWelcomeText');
            if (el) el.innerText = `Hoş geldin, ${userObj.username} 👋`;
        }
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
    }
};

// Giriş butonuna tıklayınca
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && (data.user?.role === 'admin' || data.role === 'admin')) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('user', JSON.stringify(data.user || data));
            window.location.reload();
        } else {
            showToast("Yetkisiz erişim! Admin değilsin.", "error");
        }
    } catch (e) {
        showToast("Sunucuya bağlanılamadı.", "error");
    }
});

// Çıkış yap
function logout() {
    localStorage.clear();
    location.reload();
}

// =========================================
// 2. SEKME DEĞİŞTİRME SİSTEMİ
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

            // Sekmeye göre veri yenile
            if (pageId === 'page-blog') fetchPosts();
            if (pageId === 'page-book') fetchBooksFromDB();
            if (pageId === 'page-users') loadUsers();
            if (pageId === 'page-widget') loadWidgets();
            if (pageId === 'page-settings') loadSystemSettings();
        });
    }
}

// =========================================
// 3. TOAST BİLDİRİM SİSTEMİ
// =========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'success' ? 'var(--success)' : 'var(--danger)';
    const icon = type === 'success'
        ? '<i class="ph ph-check-circle" style="font-size:1.5rem; color:var(--success)"></i>'
        : '<i class="ph ph-warning-circle" style="font-size:1.5rem; color:var(--danger)"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =========================================
// 4. BLOG İŞLEMLERİ
// =========================================

// Blog yazılarını çek ve listele
async function fetchPosts() {
    const tbody = document.getElementById('postsListBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();

        if (posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:gray;">Henüz yazı yok.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        posts.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td><span>${post.title}</span></td>
                    <td>
                        <button class="action-btn delete-btn" onclick="icerigiSil('posts', '${post._id}')">
                            <i class="ph ph-trash"></i> Sil
                        </button>
                    </td>`;
            tbody.appendChild(tr);
        });

        const blogCountEl = document.getElementById('statTotalBlogs');
        if (blogCountEl) blogCountEl.innerText = posts.length;

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:red;">Sunucuya bağlanılamadı.</td></tr>';
    }
}

// Blog yazısı kaydet
document.getElementById('savePostBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('postCategory').value.trim();
    const image = document.getElementById('postImage').value.trim();
    const seriesName = document.getElementById('postSeriesName').value.trim();
    const seriesOrder = parseInt(document.getElementById('postSeriesOrder').value) || 0;

    if (!title || !content) return showToast("Başlık ve içerik zorunlu!", "error");

    try {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, category, image, seriesName, seriesOrder })
        });

        if (res.ok) {
            showToast("Yazı yayına alındı! 🎉");
            fetchPosts();
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
        } else {
            showToast("Hata oluştu!", "error");
        }
    } catch (e) {
        showToast("Sunucu hatası!", "error");
    }
});

// =========================================
// 5. KİTAP İŞLEMLERİ
// =========================================

// Kitapları çek ve listele
async function fetchBooksFromDB() {
    const tbody = document.getElementById('booksListBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/books`);
        const books = await res.json();

        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:gray;">Kitap yok.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        books.forEach(book => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${book.cover}" style="width:30px; height:45px; object-fit:cover; border-radius:4px;">
                            <span>${book.title}</span>
                        </div>
                    </td>
                    <td>${book.author}</td>
                    <td>
                        <button class="action-btn delete-btn" onclick="icerigiSil('books', '${book._id}')">
                            <i class="ph ph-trash"></i> Sil
                        </button>
                    </td>`;
            tbody.appendChild(tr);
        });

        const bookCountEl = document.getElementById('statTotalBooks');
        if (bookCountEl) bookCountEl.innerText = books.length;

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Sunucuya bağlanılamadı.</td></tr>';
    }
}

// Kitap kaydet
document.getElementById('saveBookBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const publisher = document.getElementById('bookPublisher').value.trim();
    const year = document.getElementById('bookYear').value.trim();
    const pageCount = document.getElementById('bookPageCount').value.trim();
    const tag = document.getElementById('bookTag').value;
    const cover = document.getElementById('bookImage').value.trim();
    const desc = document.getElementById('bookContent').value.trim();

    if (!title || !author) return showToast("Kitap adı ve yazar zorunlu!", "error");

    try {
        const res = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, publisher, year, pageCount, tag, cover, desc })
        });

        if (res.ok) {
            showToast("Kitap kütüphaneye eklendi! 📚");
            fetchBooksFromDB();
        } else {
            showToast("Hata oluştu!", "error");
        }
    } catch (e) {
        showToast("Sunucu hatası!", "error");
    }
});

// =========================================
// 6. GENEL SİLME MOTORU
// =========================================
async function icerigiSil(tur, id) {
    if (!confirm("⚠️ Bu içeriği silmek istediğine emin misin?")) return;

    try {
        const response = await fetch(`${API_URL}/${tur}/${id}`, { method: "DELETE" });
        if (response.ok) {
            showToast("İçerik silindi! 🗑️");
            // Aktif sekmeye göre listeyi yenile
            if (tur === 'posts') fetchPosts();
            if (tur === 'books') fetchBooksFromDB();
        } else {
            showToast("Silinemedi!", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Sunucuya ulaşılamadı!", "error");
    }
}

// =========================================
// 7. KULLANICI İŞLEMLERİ
// =========================================

// Kullanıcıları çek ve listele
window.allUsersData = [];

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Yükleniyor...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        window.allUsersData = users;

        const countBadge = document.getElementById('statTotalUsers');
        if (countBadge) countBadge.innerText = users.length;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Kullanıcı yok.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');

            // Durum HTML
            let statusHTML = '';
            if (user.isBanned) {
                const reason = user.banReason || 'Sebep belirtilmedi';
                statusHTML = `<div style="display:flex; flex-direction:column;">
                            <span style="color:var(--danger); font-weight:bold;"><i class="ph-fill ph-warning-circle"></i> Banlı</span>
                            <span style="font-size:0.75rem; color:#aaa; font-style:italic;">"${reason}"</span>
                        </div>`;
                tr.style.opacity = "0.7";
            } else {
                statusHTML = `<span style="color:#10b981; font-weight:bold;">● Aktif</span>`;
            }

            // Rozetler HTML
            let badgesHTML = '<div style="display:flex; gap:5px; flex-wrap:wrap;">';
            if (user.badges && user.badges.length > 0) {
                user.badges.forEach(badgeId => {
                    const badgeInfo = AVAILABLE_BADGES.find(b => b.id === badgeId);
                    if (badgeInfo) {
                        badgesHTML += `<span class="custom-badge ${badgeInfo.class}"><i class="ph-bold ${badgeInfo.icon}"></i> ${badgeInfo.label}</span>`;
                    } else {
                        badgesHTML += `<span class="custom-badge badge-vip">${badgeId}</span>`;
                    }
                });
            } else {
                badgesHTML += '<span style="color:gray; font-size:0.8rem;">-</span>';
            }
            badgesHTML += '</div>';

            const userId = user._id || user.id;
            tr.innerHTML = `
                    <td><b>${user.username}</b></td>
                    <td>${user.email}</td>
                    <td>${badgesHTML}</td>
                    <td>${statusHTML}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button class="action-btn" style="background:#6366f1; padding:6px 12px;" onclick="openBadgeModal('${userId}')">
                                <i class="ph-bold ph-medal"></i>
                            </button>
                            <button class="action-btn" style="background:${user.isBanned ? '#3b82f6' : 'var(--danger)'}; padding:6px 12px;" onclick="banUser('${userId}', ${user.isBanned})">
                                <i class="ph-bold ${user.isBanned ? 'ph-arrow-u-up-left' : 'ph-prohibit'}"></i>
                            </button>
                        </div>
                    </td>`;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Sunucuya bağlanılamadı.</td></tr>';
    }
}

// Sadece istatistik için kullanıcı sayısını çek
async function loadUsersForStat() {
    const token = localStorage.getItem('userToken');
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.users) {
            const el = document.getElementById('statTotalUsers');
            if (el) el.innerText = data.users.length;
        }
    } catch (e) { }
}

// Kullanıcı arama
function searchUsers() {
    const filter = document.getElementById('userSearchInput').value.toLocaleLowerCase('tr');
    const rows = document.getElementById('usersTableBody').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const usernameCol = rows[i].getElementsByTagName('td')[0];
        const emailCol = rows[i].getElementsByTagName('td')[1];
        if (usernameCol || emailCol) {
            const uText = usernameCol ? usernameCol.textContent.toLocaleLowerCase('tr') : '';
            const eText = emailCol ? emailCol.textContent.toLocaleLowerCase('tr') : '';
            rows[i].style.display = (uText.includes(filter) || eText.includes(filter)) ? '' : 'none';
        }
    }
}

// Kullanıcı banla / ban kaldır
async function banUser(id, isCurrentlyBanned) {
    let reason = "";
    if (!isCurrentlyBanned) {
        reason = prompt("🚫 Bu kullanıcıyı neden banlıyorsun?");
        if (reason === null) return;
        if (reason.trim() === "") reason = "Yönetici tarafından uzaklaştırıldı.";
    } else {
        if (!confirm("Kullanıcının banını kaldırmak istiyor musun?")) return;
    }

    try {
        const res = await fetch(`${API_URL}/users/${id}/ban`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
        });
        if (res.ok) {
            showToast(isCurrentlyBanned ? "Ban kaldırıldı." : "Kullanıcı banlandı.");
            loadUsers();
        } else {
            showToast("İşlem başarısız!", "error");
        }
    } catch (e) { console.error(e); }
}

// =========================================
// 8. ROZET SİSTEMİ
// =========================================

// Mevcut rozet listesi
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

let selectedUserId = null;
let selectedUserEmail = null;
let currentSelectedBadges = [];

// Rozet modalını aç
function openBadgeModal(userId) {
    selectedUserId = userId;
    const user = window.allUsersData.find(u => (u._id || u.id) === userId);
    if (!user) return;

    selectedUserEmail = user.email;
    currentSelectedBadges = [...(user.badges || [])];

    const list = document.getElementById('badgeOptionsList');
    list.innerHTML = AVAILABLE_BADGES.map(badge => `
            <div class="badge-option ${currentSelectedBadges.includes(badge.id) ? 'selected' : ''}"
                onclick="toggleBadgeSelection('${badge.id}', this)">
                <span class="custom-badge ${badge.class}">
                    <i class="ph-bold ${badge.icon}"></i> ${badge.label}
                </span>
                <span style="color:gray; font-size:1rem;">
                    ${currentSelectedBadges.includes(badge.id) ? '✅' : '○'}
                </span>
            </div>`).join('');

    document.getElementById('badgeModal').classList.add('open');
}

// Rozet seçimini aç/kapat
function toggleBadgeSelection(badgeId, element) {
    const idx = currentSelectedBadges.indexOf(badgeId);
    if (idx > -1) {
        currentSelectedBadges.splice(idx, 1);
        element.classList.remove('selected');
        element.querySelector('span:last-child').textContent = '○';
    } else {
        currentSelectedBadges.push(badgeId);
        element.classList.add('selected');
        element.querySelector('span:last-child').textContent = '✅';
    }
}

// Rozet modalını kapat
function closeBadgeModal() {
    document.getElementById('badgeModal').classList.remove('open');
}

// Rozetleri kaydet
async function saveBadges() {
    const newBadges = [...currentSelectedBadges];

    // LocalStorage güncelle
    try {
        let localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = localUsers.findIndex(u => u.email === selectedUserEmail);
        if (userIndex > -1) {
            localUsers[userIndex].tags = newBadges;
            localStorage.setItem('users', JSON.stringify(localUsers));
        }
        let currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && currentUser.email === selectedUserEmail) {
            currentUser.badges = newBadges;
            currentUser.tags = newBadges;
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
    } catch (err) { console.error("LocalStorage hatası:", err); }

    // API güncelle
    try {
        const token = localStorage.getItem('userToken');
        await fetch(`${API_URL}/users/${selectedUserId}/badges`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ badges: newBadges })
        });
    } catch (err) { console.log("API hatası:", err); }

    showToast("Rozetler başarıyla güncellendi! 🎖️");
    closeBadgeModal();
    loadUsers();
}

// =========================================
// 9. WİDGET VE AYARLAR
// =========================================

// İlerleme yüzdesini hesapla
function calcWidgetPercent() {
    const total = parseInt(document.getElementById('widgetTotalPage').value) || 0;
    const current = parseInt(document.getElementById('widgetCurrentPage').value) || 0;
    const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    document.getElementById('widgetProgressBar').style.width = percent + '%';
    document.getElementById('widgetPercentText').innerText = `%${percent} Tamamlandı`;
}

// Widgetları backend'den yükle
async function loadWidgets() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        if (data.currentBook) {
            document.getElementById('widgetBookTitle').value = data.currentBook.title || '';
            document.getElementById('widgetBookAuthor').value = data.currentBook.author || '';
            document.getElementById('widgetTotalPage').value = data.currentBook.totalPages || '';
            document.getElementById('widgetCurrentPage').value = data.currentBook.currentPage || '';
            calcWidgetPercent();
        }
        if (data.goal) {
            document.getElementById('widgetGoalTarget').value = data.goal.target || '';
            document.getElementById('widgetGoalCurrent').value = data.goal.current || '';
        }
        if (data.quotes) loadQuoteList(data.quotes);
    } catch (e) { console.error("Widget yüklenemedi:", e); }
}

// Widgetları backend'e kaydet
async function saveWidgets() {
    const token = localStorage.getItem('userToken');
    const settings = {
        currentBook: {
            title: document.getElementById('widgetBookTitle').value,
            author: document.getElementById('widgetBookAuthor').value,
            totalPages: parseInt(document.getElementById('widgetTotalPage').value) || 0,
            currentPage: parseInt(document.getElementById('widgetCurrentPage').value) || 0
        },
        goal: {
            target: parseInt(document.getElementById('widgetGoalTarget').value) || 0,
            current: parseInt(document.getElementById('widgetGoalCurrent').value) || 0
        }
    };

    // Yeni resim seçildiyse ekle
    const fileInput = document.getElementById('bookCoverInput');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            settings.currentBook.cover = e.target.result;
            await saveOnlySettings(settings, token);
            showToast("Resim ve bilgiler güncellendi! ✅");
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        await saveOnlySettings(settings, token);
        showToast("Bilgiler güncellendi! ✅");
    }
}

async function saveOnlySettings(settings, token) {
    await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
    });
}

// Kitabı bitir
async function finishBook() {
    if (!confirm("Tebrikler! 🥳 Bu kitabı bitirip sayaca eklemek istiyor musun?")) return;
    const token = localStorage.getItem('userToken');
    await fetch(`${API_URL}/settings/finish-book`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast("Harikasın! Sayaç güncellendi. 📚");
    loadWidgets();
}

// =========================================
// 10. SÖZ YÖNETİMİ
// =========================================

// Söz listesini göster
function loadQuoteList(quotes) {
    const tbody = document.getElementById('quoteListBody');
    if (!tbody || !quotes) return;
    tbody.innerHTML = quotes.map((q, i) => `
            <tr>
                <td style="padding:10px; font-style:italic;">"${q.text}"</td>
                <td style="padding:10px;">— ${q.author}</td>
                <td style="padding:10px;">
                    <button onclick="deleteQuote(${i})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem;">🗑️</button>
                </td>
            </tr>`).join('');
}

// Söz ekle
async function addQuote() {
    const text = document.getElementById('newQuoteText').value.trim();
    const author = document.getElementById('newQuoteAuthor').value.trim();
    if (!text) return showToast("Söz boş olamaz!", "error");

    const token = localStorage.getItem('userToken');
    try {
        const res = await fetch(`${API_URL}/settings/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ text, author: author || 'Anonim' })
        });
        if (res.ok) {
            showToast("Söz eklendi! ✨");
            document.getElementById('newQuoteText').value = '';
            document.getElementById('newQuoteAuthor').value = '';
            loadWidgets();
        }
    } catch (e) { showToast("Hata!", "error"); }
}

// Söz sil
async function deleteQuote(index) {
    if (!confirm("Bu sözü silmek istiyor musun?")) return;
    const token = localStorage.getItem('userToken');
    try {
        const res = await fetch(`${API_URL}/settings/quote/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Söz silindi.");
            loadWidgets();
        }
    } catch (e) { showToast("Hata!", "error"); }
}

// =========================================
// 11. SİSTEM AYARLARI (Bakım Modu)
// =========================================

// Bakım modu durumunu yükle
async function loadSystemSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        const toggle = document.getElementById('maintenanceToggle');
        if (toggle && data.maintenance !== undefined) toggle.checked = data.maintenance;
    } catch (e) { console.error("Sistem ayarları yüklenemedi:", e); }
}

// Bakım modunu kaydet
async function saveSystemSettings() {
    const token = localStorage.getItem('userToken');
    const isMaintenanceOn = document.getElementById('maintenanceToggle').checked;
    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ maintenance: isMaintenanceOn })
        });
        if (res.ok) {
            showToast(isMaintenanceOn ? "Site bakıma alındı! 🚧" : "Site yayına açıldı! 🌍");
        } else {
            showToast("Hata oluştu!", "error");
        }
    } catch (e) { showToast("Sunucu hatası!", "error"); }
}

// =========================================
// 12. DASHBOARD İSTATİSTİKLERİ
// =========================================

// Dashboard sayılarını ve son hareketleri yükle
async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/dashboard/stats`);
        const data = await res.json();

        if (document.getElementById('statTotalUsers'))
            document.getElementById('statTotalUsers').textContent = data.counts.users;
        if (document.getElementById('statTotalBlogs'))
            document.getElementById('statTotalBlogs').textContent = data.counts.posts;
        if (document.getElementById('statTotalBooks'))
            document.getElementById('statTotalBooks').textContent = data.counts.books;

        const listEl = document.getElementById('activityList');
        if (listEl && data.activities) {
            if (data.activities.length === 0) {
                listEl.innerHTML = "<p style='color:gray;'>Henüz bir işlem yok.</p>";
            } else {
                listEl.innerHTML = data.activities.map(act => {
                    const date = new Date(act.date).toLocaleDateString("tr-TR");
                    return `<div style="display:flex; align-items:center; gap:15px; padding:12px; background:rgba(255,255,255,0.03); border-radius:8px; border-left:4px solid ${act.color};">
                                <i class="${act.icon}" style="font-size:1.2rem; color:${act.color};"></i>
                                <div style="flex:1;">
                                    <div style="font-size:0.95rem; color:var(--text-main);">${act.text}</div>
                                    <div style="font-size:0.75rem; color:gray; margin-top:2px;">${date}</div>
                                </div>
                            </div>`;
                }).join('');
            }
        }
    } catch (error) { console.error("Dashboard hatası:", error); }

    loadRecentActivities();
}

// Son hareketleri yükle (Blog + Kitap + Kullanıcı)
async function loadRecentActivities() {
    const listContainer = document.querySelector('.recent-activities-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Veriler yükleniyor... ⏳</div>';

    try {
        const [postsRes, usersRes, booksRes] = await Promise.all([
            fetch('/api/posts'),
            fetch('/api/users'),
            fetch('/api/books')
        ]);
        const posts = await postsRes.json();
        const users = await usersRes.json();
        const books = await booksRes.json();

        let activities = [];

        posts.forEach(post => activities.push({
            type: 'blog', title: post.title,
            author: post.author || 'Anonim',
            date: new Date(post.date || post.createdAt || Date.now()),
            icon: '<i class="ph ph-article"></i>', desc: 'Yeni bir yazı yayınladı'
        }));

        books.forEach(book => activities.push({
            type: 'book', title: book.title,
            author: book.addedBy || 'Yönetici',
            date: new Date(book.createdAt || Date.now()),
            icon: '<i class="ph ph-books"></i>', desc: 'Kütüphaneye kitap eklendi'
        }));

        users.forEach(user => activities.push({
            type: 'user', title: user.username, author: 'Sistem',
            date: new Date(user.createdAt || Date.now()),
            icon: '<i class="ph ph-user-plus"></i>', desc: 'Aramıza katıldı'
        }));

        activities.sort((a, b) => b.date - a.date);
        const recent = activities.slice(0, 10);

        let html = '<div class="activity-list">';
        recent.forEach(act => {
            const timeAgo = new Date(act.date).toLocaleString('tr-TR', {
                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
            });
            let colorClass = 'act-user';
            if (act.type === 'blog') colorClass = 'act-blog';
            if (act.type === 'book') colorClass = 'act-book';

            html += `<div class="activity-item">
                        <div class="activity-icon ${colorClass}">${act.icon}</div>
                        <div class="activity-details">
                            <span class="activity-title">${act.title}</span>
                            <div class="activity-meta">
                                <span>${act.desc}</span>
                                ${(act.type === 'blog' || act.type === 'book') ? `<span>• ✍️ ${act.author}</span>` : ''}
                            </div>
                        </div>
                        <span class="activity-time">${timeAgo}</span>
                    </div>`;
        });
        html += '</div>';
        listContainer.innerHTML = html;

    } catch (error) {
        listContainer.innerHTML = '<div style="color:red; text-align:center;">Sunucuya ulaşılamadı 🔴</div>';
    }
}

// =========================================
// 13. DOSYA YÜKLEME ETKİLEŞİMİ
// =========================================
const fileInput = document.getElementById('bookCoverInput');
const fileLabelText = document.querySelector('.file-upload-label span');
if (fileInput && fileLabelText) {
    fileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            fileLabelText.textContent = "✅ " + e.target.files[0].name;
            fileLabelText.style.color = "var(--text-main)";
        }
    });
}

// =========================================
// SAYFA BAŞLARKEN ÇALIŞACAKLAR (TEK BLOK)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadRecentActivities();
    loadSystemSettings();
});