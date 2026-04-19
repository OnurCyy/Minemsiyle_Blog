// =========================================
// GLOBAL AYARLAR VE URL PARÇALAMA
// =========================================
const API_BASE = "/api";
let contentId = null;
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
const currentType = 'blog';

// URL'den ID okuma — hem ?id=X hem /blog/X formatını destekler
let currentRelatedId = null;
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('id')) {
    currentRelatedId = urlParams.get('id');
} else {
    const pathArr = window.location.pathname.split('/');
    currentRelatedId = pathArr[pathArr.length - 1];
}
// Güvenlik: yanlışlıkla sayfa adı alındıysa temizle
if (currentRelatedId === "blog" || currentRelatedId === "post" || currentRelatedId === "post.html") {
    currentRelatedId = null;
}

// Resim modalı için global değişken
let currentModalImageBase64 = null;

// =========================================
// 1. SAYFA YÜKLENİNCE — Yazıyı Getir
// =========================================
document.addEventListener("DOMContentLoaded", async () => {

    // Yorum kutusunu kullanıcı durumuna göre ayarla
    checkUserLoginForComments();

    // ID yoksa hata göster
    if (!currentRelatedId) {
        document.getElementById("articleArea").innerHTML = "<p style='text-align:center; margin-top:50px; color:var(--danger); font-size:20px;'>😔 Ops! Link hatalı veya yazı bulunamadı.</p>";
        return;
    }

    // Backend'den yazıyı çek
    try {
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}`);
        if (!res.ok) throw new Error("Yazı bulunamadı");
        const item = await res.json();

        contentId = item._id || currentRelatedId;
        const contentCategory = item.category || item.tag || 'Genel';
        const date = new Date(item.createdAt || item.date || Date.now()).toLocaleDateString('tr-TR');
        document.title = `${item.title} | Minemsiyle`;

        const realImage = item.image || item.cover || "";
        let imgHTML = realImage.length > 5 ? `<img src="${realImage}" class="article-cover" alt="${item.title}">` : '';

        document.getElementById("articleArea").innerHTML = `
                    <div class="article-header">
                        <div class="article-meta">${contentCategory} • ${date}</div>
                        <h1 class="article-title">${item.title}</h1>
                    </div>
                    ${imgHTML}
                    <div class="article-content">${formatContent(item.content || item.desc)}</div>
                `;

        // Durum kontrollerini başlat
        checkSaveStatus();
        checkLikeStatus();
        loadComments();
        incrementView();
        loadSeriesNavigation();

        // Admin düzenleme butonunu göster
        const currentUserForEdit = JSON.parse(localStorage.getItem('user'));
        if (currentUserForEdit && (currentUserForEdit.username === 'OnurCy' || currentUserForEdit.username === 'Minemsi' || currentUserForEdit.role === 'admin')) {
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
                            const MAX_WIDTH = 800;
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
        console.error("Hata:", err);
        document.getElementById("articleArea").innerHTML = "<h3 style='text-align:center; margin-top:50px;'>😔 Yazı yüklenemedi.</h3>";
    }
});

// =========================================
// 2. YORUM SİSTEMİ
// =========================================

// Kullanıcı giriş yapmamışsa yorum kutusunu değiştir
function checkUserLoginForComments() {
    const user = JSON.parse(localStorage.getItem('user'));
    const commentBox = document.querySelector('.blog-comment-box');
    if (!commentBox) return;
    if (!user) {
        commentBox.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 120px;">
                    <i class="ph-duotone ph-lock-key" style="font-size: 2rem; color: var(--accent);"></i>
                    <span>Yorum yapmak için <a href="/login.html" style="color: var(--accent); font-weight: bold;">giriş yapmalısın</a>.</span>
                </div>`;
    }
}

// Yorum gönder
async function postComment() {
    const textArea = document.getElementById('commentText');
    if (!textArea) return;
    const text = textArea.value.trim();
    if (!text) return alert("Boş yorum olmaz.");

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("Giriş yapmalısın!");

    const pageTitle = document.querySelector('h1') ? document.querySelector('h1').innerText : document.title;
    const btn = document.querySelector('.blog-send-btn');
    if (btn) { btn.innerText = "Yükleniyor..."; btn.disabled = true; }

    try {
        const res = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user._id,
                username: user.username,
                avatar: user.avatar,
                content: text,
                contentType: currentType,
                relatedId: currentRelatedId,
                title: pageTitle
            })
        });
        if (res.ok) {
            textArea.value = "";
            loadComments();
        } else {
            alert("Yorum gönderilemedi.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (btn) { btn.innerText = "Yorumu Yayınla"; btn.disabled = false; }
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
            list.innerHTML = "<p style='color:#888; font-style:italic; text-align:center;'>Henüz yorum yok.</p>";
            return;
        }

        for (const c of comments) {
            const displayDate = new Date(c.date).toLocaleDateString('tr-TR');
            let badgeHTML = (c.username === "Minemsi" || c.username === "OnurCy") ? `<span style="background:#ffd700; color:#000; font-size:0.7rem; padding:3px 8px; border-radius:6px; margin-left:5px; font-weight:bold;">👑 Yönetici</span>` : "";

            let deleteBtnHTML = "";
            const isOwner = currentUser && (currentUser.username === c.username);
            const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.username === 'OnurCy');
            if (isOwner || isAdmin) {
                deleteBtnHTML = `<button onclick="deleteComment('${c._id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="ph-bold ph-trash"></i> Sil</button>`;
            }

            if (list) list.innerHTML += `
                    <div class="single-comment" style="display:flex; gap:15px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px;">
                        <img src="${c.avatar || defaultAvatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                        <div style="flex:1;">
                            <h4 style="margin:0; display:flex; align-items:center;">${c.username} ${badgeHTML}</h4>
                            <small style="color:#888;">${displayDate}</small>
                            <p style="margin:5px 0 0 0;">${c.content}</p>
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
        if (res.ok) loadComments();
    } catch (e) { console.error(e); }
}

// =========================================
// 3. KAYDETME SİSTEMİ
// =========================================

// Kaydetme durumunu kontrol et (sayfa açılınca)
async function checkSaveStatus() {
    const userString = localStorage.getItem('user');
    if (!userString || !document.getElementById('saveBtn')) return;
    const user = JSON.parse(userString);

    try {
        const res = await fetch(`${API_BASE}/profile/saved/${user.username}`);
        if (res.ok) {
            const savedItems = await res.json();
            if (savedItems && savedItems.some(item => item.itemId === currentRelatedId)) {
                const icon = document.getElementById('saveIcon');
                const text = document.getElementById('saveText');
                const btn = document.getElementById('saveBtn');
                if (icon) { icon.style.fill = "var(--accent)"; icon.style.stroke = "var(--accent)"; }
                if (text) { text.innerText = "Kaydedildi"; text.style.color = "var(--accent)"; }
                if (btn) btn.style.borderColor = "var(--accent)";
            }
        }
    } catch (e) { console.error(e); }
}

// Kaydet / Kayıttan çıkar
async function toggleSave() {
    const userString = localStorage.getItem('user');
    if (!userString) return alert("Giriş yapmalısın!");
    const user = JSON.parse(userString);

    const icon = document.getElementById('saveIcon');
    const text = document.getElementById('saveText');
    const btn = document.getElementById('saveBtn');
    const pageTitle = document.querySelector('h1') ? document.querySelector('h1').innerText : document.title;
    const isSaved = icon.style.fill !== "none" && icon.style.fill !== "";

    if (!isSaved) {
        icon.style.fill = "var(--accent)"; icon.style.stroke = "var(--accent)";
        if (text) { text.innerText = "Kaydedildi"; text.style.color = "var(--accent)"; }
        if (btn) btn.style.borderColor = "var(--accent)";
    } else {
        icon.style.fill = "none"; icon.style.stroke = "currentColor";
        if (text) { text.innerText = "Kaydet"; text.style.color = "var(--ink)"; }
        if (btn) btn.style.borderColor = "var(--line)";
    }

    try {
        await fetch(`${API_BASE}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, itemId: currentRelatedId, title: pageTitle, type: currentType })
        });
    } catch (e) { console.error(e); }
}

// =========================================
// 4. BEĞENİ SİSTEMİ
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
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}`);
        if (res.ok) {
            const post = await res.json();
            const likeCount = post.likes ? post.likes.length : 0;
            if (text) text.innerText = `${likeCount} Beğeni`;

            if (currentUser && post.likes && post.likes.includes(currentUser.username)) {
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
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}/like`, {
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
            if (text) text.innerText = `${data.likesCount} Beğeni`;
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
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}`);
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
// 5. PAYLAŞMA SİSTEMİ
// =========================================
async function shareContent() {
    try {
        await navigator.share({ title: document.title, url: window.location.href });
    } catch (e) {
        const btn = document.getElementById('shareText');
        if (btn) btn.innerText = "Link Kopyalandı!";
        navigator.clipboard.writeText(window.location.href);
        setTimeout(() => { if (btn) btn.innerText = "Paylaş"; }, 2000);
    }
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
        audioElement.play().catch(e => console.log(e));
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
const volCtrl = document.getElementById('volumeControl');
if (volCtrl) volCtrl.addEventListener('input', (e) => { if (currentAudio) currentAudio.volume = e.target.value; });

// =========================================
// 7. TEMA SİSTEMİ
// =========================================
const themeToggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
if (themeToggleSwitch) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark', 'dark-theme');
        themeToggleSwitch.checked = true;
    }
    themeToggleSwitch.addEventListener('change', (e) => {
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

// =========================================
// 8. GÖRÜNTÜLENME SAYACI
// =========================================
async function incrementView() {
    try {
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}/view`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            const viewText = document.getElementById('viewCountText');
            if (viewText) viewText.innerText = `${data.views} Okunma`;
        }
    } catch (e) { console.error("Görüntülenme kaydedilemedi:", e); }
}

// =========================================
// 9. SERİ NAVİGASYONU
// =========================================
async function loadSeriesNavigation() {
    try {
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}`);
        if (res.ok) {
            const data = await res.json();
            if (data.seriesName && data.seriesOrder > 0) {
                const container = document.getElementById('seriesNavContainer');
                const title = document.getElementById('seriesTitle');
                const prevBtn = document.getElementById('prevSeriesBtn');
                const nextBtn = document.getElementById('nextSeriesBtn');

                container.style.display = 'block';
                title.innerText = `📚 ${data.seriesName} (Bölüm ${data.seriesOrder})`;

                if (data.prevPost) {
                    prevBtn.style.display = 'inline-block';
                    prevBtn.href = `/blog/${data.prevPost._id}`;
                }
                if (data.nextPost) {
                    nextBtn.style.display = 'inline-block';
                    nextBtn.href = `/blog/${data.nextPost._id}`;
                }
            }
        }
    } catch (e) { console.error("Seri navigasyonu yüklenemedi:", e); }
}

// =========================================
// 10. ADMIN — YAZI DÜZENLEME MODALİ
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

// Modalı aç, mevcut yazı verilerini doldur
function openEditModal() {
    const currentTitle = document.querySelector('.article-title')?.innerText || '';
    const currentContent = document.querySelector('.article-content')?.innerText || '';
    const currentPostImg = document.querySelector('.article-cover');
    currentModalImageBase64 = currentPostImg ? currentPostImg.src : null;

    document.getElementById('editTitle').value = currentTitle;
    document.getElementById('editContent').value = currentContent;
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
    const newContent = document.getElementById('editContent').value.trim();
    const newSeriesName = document.getElementById('editSeriesName').value.trim();
    const newSeriesOrder = parseInt(document.getElementById('editSeriesOrder').value) || 0;
    const btn = document.getElementById('editSubmitBtn');

    if (!newTitle || !newContent) return alert("Boş alan bırakma!");

    const oldBtnHTML = btn.innerHTML;
    btn.innerHTML = `⏳ Kaydediliyor...`;
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/posts/${currentRelatedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                content: newContent,
                image: currentModalImageBase64,
                seriesName: newSeriesName,
                seriesOrder: newSeriesOrder
            })
        });

        if (res.ok) {
            btn.innerHTML = `<i class="ph-bold ph-check-circle"></i> TAMAMLANDI!`;
            setTimeout(() => location.reload(), 1000);
        } else {
            const data = await res.json();
            alert("Hata: " + (data.message || "Güncellenemedi."));
            btn.innerHTML = oldBtnHTML; btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert("Bağlantı hatası!");
        btn.innerHTML = oldBtnHTML; btn.disabled = false;
    }
}

// =========================================
// YARDIMCI FONKSİYONLAR
// =========================================

// Düz metni paragraflara böl
function formatContent(text) {
    if (!text) return "";
    if (!text.includes("<p>")) return text.split('\n').map(para => para.trim() ? `<p>${para}</p>` : "").join('');
    return text;
}