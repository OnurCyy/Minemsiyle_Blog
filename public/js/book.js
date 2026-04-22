// =========================================
// GLOBAL AYARLAR VE URL PARÇALAMA
// =========================================
const API_BASE = "/api";
let contentId = null;
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
const currentType = 'book';

// URL'den ID okuma — hem ?id=X hem /kitap/X formatını destekler
let currentRelatedId = null;
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('id')) {
    currentRelatedId = urlParams.get('id');
} else {
    const pathArr = window.location.pathname.split('/');
    currentRelatedId = pathArr[pathArr.length - 1];
}
// Güvenlik: yanlışlıkla sayfa adı alındıysa temizle
if (currentRelatedId === "book" || currentRelatedId === "book.html" || currentRelatedId === "kitap") {
    currentRelatedId = null;
}

// Resim modalı için global değişken
let currentModalImageBase64 = null;

// =========================================
// 1. SAYFA YÜKLENİNCE — Kitabı Getir
// =========================================
document.addEventListener("DOMContentLoaded", async () => {

    // Yorum kutusunu kullanıcı durumuna göre ayarla
    checkUserLoginForComments();

    // Tema toggle
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    if (toggleSwitch) {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark', 'dark-theme');
            toggleSwitch.checked = true;
        }
        toggleSwitch.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark', 'dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                document.body.classList.remove('dark', 'dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // ID yoksa hata göster
    if (!currentRelatedId) {
        showError("Linkte ID bulunamadı. Lütfen ana sayfadan tekrar deneyin.");
        return;
    }

    // Backend'den kitabı çek
    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}`);
        if (!res.ok) {
            showError(`Kitap bulunamadı! (Hata Kodu: ${res.status})`);
            return;
        }

        const post = await res.json();
        contentId = post._id || currentRelatedId;

        // Sayfayı doldur
        renderBook(post);

        // Durum kontrollerini başlat
        updateHeaderProfile();
        checkLikeStatus();
        loadComments();
        incrementView();

        // Admin düzenleme butonunu göster
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user.username === 'OnurCy' || user.username === 'Minemsi' || user.role === 'admin')) {
            const editBtn = document.getElementById('adminEditBtn');
            if (editBtn) editBtn.style.display = 'flex';
        }

        // Resim yükleme olayını bağla
        const inputContainer = document.getElementById('editImagePreviewArea');
        const fileInput = document.getElementById('editImageInput');
        if (inputContainer && fileInput) {
            inputContainer.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const img = new Image();
                        img.src = event.target.result;
                        img.onload = function () {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 600;
                            let width = img.width;
                            let height = img.height;
                            if (width > MAX_WIDTH) {
                                height = Math.round((height *= MAX_WIDTH / width));
                                width = MAX_WIDTH;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            currentModalImageBase64 = canvas.toDataURL('image/jpeg', 0.75);
                            setModalImagePreview(currentModalImageBase64);
                        };
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

    } catch (err) {
        console.error("Fetch Hatası:", err);
        showError("Sunucuya bağlanılamadı. Backend kapalı olabilir.");
    }
});

// =========================================
// 2. KİTABI EKRANA ÇİZ
// =========================================
function renderBook(post) {
    const date = new Date(post.createdAt || post.date || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const contentArea = document.getElementById("articleArea");
    document.title = `${post.title} | Minemsiyle`;

    const imageSrc = post.cover || "https://via.placeholder.com/300x450?text=Kapak+Yok";

    contentArea.innerHTML = `
            <div class="book-hero">
                <div class="book-cover-wrapper">
                    <img src="${imageSrc}" class="book-cover-img" alt="${post.title}">
                </div>
                <div class="book-info">
                    <span class="book-tag">${post.tag || "Kitap"}</span>
                    <h1 class="book-title">${post.title}</h1>
                    <div class="book-meta">
                        <span>✍️ ${post.author || "Bilinmiyor"}</span>
                        <span>📅 ${date}</span>
                        ${post.pageCount ? `<span style="margin:0 8px; opacity:0.5">|</span><span>📄 ${post.pageCount} Sayfa</span>` : ''}
                    </div>
                    <div class="book-desc">${formatContent(post.desc || post.content)}</div>
                    ${post.publisher ? `<p style="margin-top:20px; font-size:0.9rem; color:var(--muted);"><em>Yayınevi: ${post.publisher}</em></p>` : ''}
                </div>
            </div>`;
}

// Hata mesajı göster
function showError(message) {
    const area = document.getElementById("articleArea");
    area.innerHTML = `
            <div style="text-align:center; padding:50px; background:var(--panel); border-radius:12px; border:1px solid var(--line);">
                <h2 style="color:#ef4444;">😔 Ops!</h2>
                <p>${message}</p>
                <a href="/" style="display:inline-block; margin-top:20px; color:var(--accent); text-decoration:underline;">Ana Sayfaya Dön</a>
            </div>`;
}

// Düz metni paragraflara böl
function formatContent(text) {
    if (!text) return "İçerik yok.";
    return text.split('\n').map(p => p.trim() ? `<p>${p}</p>` : "").join('');
}

// =========================================
// 3. YARDIMCI FONKSİYONLAR
// =========================================

// Header profil fotoğrafını güncelle
function updateHeaderProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    const profileLink = document.getElementById('headerProfileLink');
    if (user && user.avatar && profileLink) {
        profileLink.innerHTML = `<img src="${user.avatar}" class="header-avatar-img" alt="Profil">`;
        profileLink.href = "/profile.html";
    }
}

// Kullanıcı giriş yapmamışsa yorum kutusunu değiştir
function checkUserLoginForComments() {
    const user = JSON.parse(localStorage.getItem('user'));
    const commentBox = document.querySelector('.blog-comment-box');
    if (!commentBox) return;
    if (!user) {
        commentBox.innerHTML = `
                <div style="padding: 30px; text-align: center; color: var(--muted); background: var(--panel); border: 1px dashed var(--line); border-radius: 12px;">
                    <i class="ph-duotone ph-lock-key" style="font-size: 2rem; margin-bottom: 10px; color: var(--accent);"></i>
                    <p style="margin:0;">Yorum yapmak için <a href="/login.html" style="color: var(--accent); font-weight: bold; text-decoration: underline;">giriş yapmalısın</a>.</p>
                </div>`;
    }
}

// =========================================
// 4. YORUM SİSTEMİ
// =========================================

// Yorum gönder
async function postComment() {
    const input = document.getElementById('commentText');
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
        alert("Giriş yapmamışsın! Login sayfasına yönlendiriyorum.");
        window.location.href = "/login.html";
        return;
    }

    const user = JSON.parse(rawUser);
    const userId = user._id || user.id;

    if (!userId) {
        alert("Kimlik bilgisi bozulmuş. Tekrar giriş yapmalısın! 🔄");
        localStorage.clear();
        window.location.href = "/login.html";
        return;
    }

    let token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return alert("Anahtarın (Token) eksik. Tekrar giriş yapmalısın.");
    token = token.replace(/"/g, '').trim();

    const text = input.value.trim();
    if (!text) return alert("Boş yorum olmaz! ✍️");

    const btn = document.querySelector('.blog-send-btn');
    if (btn) { btn.innerText = "⏳..."; btn.disabled = true; }

    try {
        const pageTitle = document.querySelector('.book-title') ? document.querySelector('.book-title').innerText : document.title;
        const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
                userId, username: user.username, avatar: user.avatar,
                content: text, contentType: currentType,
                relatedId: currentRelatedId, title: pageTitle
            })
        });

        if (res.ok) {
            input.value = "";
            loadComments();
            alert("Yorumun yapıştırıldı! 🚀");
        } else {
            const err = await res.json();
            alert("Hata: " + (err.message || "Sunucu reddetti"));
        }
    } catch (err) {
        console.error(err);
        alert("Sunucuya ulaşılamadı!");
    } finally {
        if (btn) { btn.innerText = "Yorumu Yayınla 🚀"; btn.disabled = false; }
    }
}

// Yorumları yükle
async function loadComments() {
    const list = document.getElementById('commentsList');
    const countSpan = document.getElementById('commentCount');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentRelatedId) return;

    try {
        const res = await fetch(`${API_BASE}/comments?type=${currentType}&id=${currentRelatedId}`);
        const comments = await res.json();

        if (list) list.innerHTML = "";
        if (countSpan) countSpan.innerText = comments.length;

        if (comments.length === 0 && list) {
            list.innerHTML = "<p style='color:#888; font-style:italic; text-align:center; padding: 20px;'>Henüz yorum yok. İlk yorumu sen yap! 👇</p>";
            return;
        }

        for (const c of comments) {
            const displayDate = new Date(c.date).toLocaleDateString('tr-TR') + ' • ' + new Date(c.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            let badgeHTML = (c.username === "Minemsi" || c.username === "OnurCy") ? `<span style="background:#ffd700; color:#000; font-size:0.7rem; padding:3px 8px; border-radius:6px; margin-left:5px; font-weight:bold;">👑 Yönetici</span>` : "";

            let deleteBtnHTML = "";
            const isOwner = currentUser && (currentUser.username === c.username);
            const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.username === 'OnurCy');
            if (isOwner || isAdmin) {
                deleteBtnHTML = `<button onclick="deleteComment('${c._id}')" style="background:none; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; margin-top:8px; padding:0; display:flex; align-items:center; gap:4px; opacity:0.8; transition:0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'"><i class="ph-bold ph-trash"></i> Sil</button>`;
            }

            if (list) list.innerHTML += `
                    <div class="single-comment" style="display:flex; gap:15px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
                        <a href="/profile.html?u=${c.username}" style="text-decoration:none;">
                            <img src="${c.avatar || defaultAvatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--accent); object-fit:cover;">
                        </a>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <a href="/profile.html?u=${c.username}" style="text-decoration:none;">
                                    <h4 style="color:var(--accent); font-size:0.95rem; margin:0; display:flex; align-items:center; flex-wrap:wrap; gap:5px;">
                                        ${c.username} ${badgeHTML}
                                    </h4>
                                </a>
                                <small style="color:var(--muted); font-size:0.7rem;">${displayDate}</small>
                            </div>
                            <p style="color:var(--ink); font-size:0.95rem; margin:5px 0 0 0; line-height:1.5; word-break: break-word;">${c.content}</p>
                            ${deleteBtnHTML}
                        </div>
                    </div>`;
        }
    } catch (err) { console.error(err); }
}

// Yorum sil
async function deleteComment(commentId) {
    if (!confirm("Bu yorumu gerçekten silmek istiyor musun?")) return;
    let token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return alert("Yetkin yok.");
    token = token.replace(/"/g, '').trim();

    try {
        const res = await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Yorum silindi! 🗑️");
            loadComments();
        }
    } catch (e) { console.error(e); }
}

// =========================================
// 5. BEĞENİ SİSTEMİ
// =========================================

// Beğeni durumunu kontrol et (sayfa açılınca)
async function checkLikeStatus() {
    const userString = localStorage.getItem('user');
    let currentUser = null;
    if (userString) currentUser = JSON.parse(userString);

    const icon = document.getElementById('likeIcon');
    const text = document.getElementById('likeText');
    const btn = document.getElementById('likeBtn');

    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}`);
        if (res.ok) {
            const book = await res.json();
            const likeCount = book.likes ? book.likes.length : 0;
            if (text) text.innerText = `${likeCount} Beğeni`;

            if (currentUser && book.likes && book.likes.includes(currentUser.username)) {
                if (icon) { icon.style.fill = "#e91e63"; icon.style.stroke = "#e91e63"; }
                if (btn) { btn.style.borderColor = "#e91e63"; btn.style.color = "#e91e63"; btn.style.background = "rgba(233, 30, 99, 0.08)"; }
            }
        }
    } catch (e) { console.error(e); }
}

// Beğen / Beğeniyi geri al
async function toggleLike() {
    const userString = localStorage.getItem('user');
    if (!userString) return alert("Beğenmek için giriş yapmalısın!");
    const user = JSON.parse(userString);

    const icon = document.getElementById('likeIcon');
    const text = document.getElementById('likeText');
    const btn = document.getElementById('likeBtn');

    if (icon) icon.style.transform = 'scale(0.8)';

    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username })
        });

        if (res.ok) {
            const data = await res.json();
            if (icon) { icon.style.transform = 'scale(1.2)'; setTimeout(() => icon.style.transform = 'scale(1)', 200); }

            if (data.hasLiked) {
                if (icon) { icon.style.fill = "#e91e63"; icon.style.stroke = "#e91e63"; }
                if (btn) { btn.style.borderColor = "#e91e63"; btn.style.color = "#e91e63"; btn.style.background = "rgba(233, 30, 99, 0.08)"; }
            } else {
                if (icon) { icon.style.fill = "none"; icon.style.stroke = "currentColor"; }
                if (btn) { btn.style.borderColor = "var(--line)"; btn.style.color = "var(--ink)"; btn.style.background = "transparent"; }
            }
            if (text) text.innerText = ` ${data.likesCount} Beğeni`;
        }
    } catch (e) { console.error(e); }
}

// Beğenenleri listele
async function showLikers() {
    const modal = document.getElementById('likersModal');
    const list = document.getElementById('likersList');
    list.innerHTML = '<li style="text-align:center; color:var(--muted); padding:20px 0;"><i class="ph-bold ph-spiral"></i> Yükleniyor...</li>';
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);

    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}`);
        if (res.ok) {
            const data = await res.json();
            list.innerHTML = '';
            if (!data.likes || data.likes.length === 0) {
                list.innerHTML = '<li style="text-align:center; color:var(--muted); padding:20px 0;">Henüz kimse beğenmemiş. İlk beğenen sen ol!</li>';
                return;
            }
            data.likes.forEach(user => {
                if (user == '0' || !user || String(user).trim() === '') return;
                list.innerHTML += `
                        <li style="padding:12px 0; border-bottom:1px solid var(--line); color:var(--ink); font-weight:600; display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:var(--accent); color:#111; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem;">
                                ${String(user).charAt(0).toUpperCase()}
                            </div>
                            ${user}
                        </li>`;
            });
        }
    } catch (err) {
        list.innerHTML = '<li style="text-align:center; color:#e91e63; padding:20px 0;">Bağlantı hatası!</li>';
    }
}

// Beğenenler modalını kapat
function closeLikersModal() {
    const modal = document.getElementById('likersModal');
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 300);
}

// =========================================
// 6. MÜZİK / AMBİYANS SİSTEMİ
// =========================================
let currentAudio = null;

// Paneli aç / kapat
function toggleAmbiancePanel() {
    document.getElementById('ambiancePanel').classList.toggle('active');
}

// Ses çal / durdur
function playAmbiance(type, element) {
    const audioElement = document.getElementById(`audio-${type}`);
    const volumeControl = document.getElementById('volumeControl');
    const toggleBtn = document.querySelector('.ambiance-toggle');

    if (currentAudio === audioElement && !audioElement.paused) {
        audioElement.pause(); element.classList.remove('active'); toggleBtn.classList.remove('playing');
        currentAudio = null; return;
    }
    stopAllSounds();
    if (audioElement) {
        audioElement.volume = volumeControl.value;
        audioElement.play().catch(e => console.log("Oynatma hatası:", e));
        currentAudio = audioElement;
        element.classList.add('active'); toggleBtn.classList.add('playing');
    }
}

// Tüm sesleri durdur
function stopAllSounds() {
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
    document.querySelectorAll('.sound-item').forEach(item => item.classList.remove('active'));
}

// Ses seviyesi kontrolü
const volSlider = document.getElementById('volumeControl');
if (volSlider) volSlider.addEventListener('input', (e) => { if (currentAudio) currentAudio.volume = e.target.value; });

// =========================================
// 7. GÖRÜNTÜLENME SAYACI
// =========================================
async function incrementView() {
    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}/view`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            const viewText = document.getElementById('viewCountText');
            if (viewText) viewText.innerText = `${data.views} Okunma`;
        }
    } catch (e) { console.error("Görüntülenme kaydedilemedi:", e); }
}

// =========================================
// 8. ADMIN — KİTAP DÜZENLEME MODALİ
// =========================================

// Önizleme resmini modal içinde göster
function setModalImagePreview(imageSrc) {
    const previewImg = document.getElementById('editImagePreview');
    const placeholder = document.getElementById('editImagePlaceholder');
    const previewArea = document.getElementById('editImagePreviewArea');
    if (!previewImg || !placeholder) return;

    if (imageSrc && imageSrc.length > 20 && imageSrc !== "null" && imageSrc !== "undefined") {
        previewImg.src = imageSrc;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        if (previewArea) previewArea.style.borderColor = "var(--accent)";
    } else {
        previewImg.src = "";
        previewImg.style.display = 'none';
        placeholder.style.display = 'block';
        if (previewArea) previewArea.style.borderColor = "var(--line)";
    }
}

// Modalı aç, mevcut kitap verilerini doldur
function openEditModal() {
    const title = document.querySelector('.book-title')?.innerText || '';
    const author = document.querySelector('.book-meta span:first-child')?.innerText.replace('✍️ ', '') || '';
    const content = document.querySelector('.book-desc p')?.innerText || '';
    const categoryInfo = Array.from(document.querySelectorAll('.book-meta li')).find(li => li.innerText.includes('Kategori'))?.innerText.split(':')[1]?.trim() || '';
    const publisherInfo = Array.from(document.querySelectorAll('.book-meta li')).find(li => li.innerText.includes('Yayınevi'))?.innerText.split(':')[1]?.trim() || '';
    const pagesInfo = Array.from(document.querySelectorAll('.book-meta li')).find(li => li.innerText.includes('Sayfa'))?.innerText.split(':')[1]?.replace(/[^0-9]/g, '') || '';
    const coverImg = document.querySelector('.book-cover-img');
    currentModalImageBase64 = coverImg ? coverImg.src : null;

    document.getElementById('editTitle').value = title;
    document.getElementById('editAuthor').value = author;
    document.getElementById('editCategory').value = categoryInfo;
    document.getElementById('editPublisher').value = publisherInfo;
    document.getElementById('editPages').value = pagesInfo;
    document.getElementById('editContent').value = content;
    setModalImagePreview(currentModalImageBase64);

    const modal = document.getElementById('editModal');
    modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
}

// Modalı kapat
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        const fileInput = document.getElementById('editImageInput');
        if (fileInput) fileInput.value = "";
    }, 300);
}

// Değişiklikleri backend'e gönder
async function submitEdit() {
    const newTitle = document.getElementById('editTitle').value.trim();
    const newAuthor = document.getElementById('editAuthor').value.trim();
    const newCategory = document.getElementById('editCategory').value.trim();
    const newPublisher = document.getElementById('editPublisher').value.trim();
    const newPages = document.getElementById('editPages').value.trim();
    const newContent = document.getElementById('editContent').value.trim();
    const btn = document.getElementById('editSubmitBtn');

    if (!newTitle) return alert("En azından kitap adını gir!");

    const oldBtnHTML = btn.innerHTML;
    btn.innerHTML = `⏳ Kaydediliyor...`;
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/books/${currentRelatedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                author: newAuthor,
                tag: newCategory,
                publisher: newPublisher,
                pages: parseInt(newPages) || 0,
                desc: newContent,
                cover: currentModalImageBase64
            })
        });

        if (res.ok) {
            btn.innerHTML = `<i class="ph-bold ph-check-circle"></i> TAMAMLANDI!`;
            setTimeout(() => location.reload(), 1000);
        } else {
            const errData = await res.text();
            console.error("Sunucu Cevabı:", errData);
            alert("Hata: Güncellenemedi. Lütfen konsola bak.");
            btn.innerHTML = oldBtnHTML; btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert("Bağlantı hatası!");
        btn.innerHTML = oldBtnHTML; btn.disabled = false;
    }
}