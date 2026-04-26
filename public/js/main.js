// =========================================
// GLOBAL AYARLAR
// =========================================
console.log("🚀 Main.js Devrede!");

const API_URL = "/api";

// Sidebar için global değişkenler
let SIDEBAR_DATA = null;
let ROTATION_TIMER = null;
let BOOKS = [];
let currentAudio = null;

// =========================================
// 1. BAKIM MODU KONTROLÜ (Sayfa yüklenmeden önce çalışır)
// =========================================
(async function checkMaintenance() {
    // Bakım ve admin sayfasındaysak dur, siteyi göster
    if (
        window.location.pathname.includes("maintenance.html") ||
        window.location.pathname.includes("adminPanel.html")
    ) {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        });
        return;
    }

    try {
        const res = await fetch(`${API_URL}/settings`);
        const settings = await res.json();
        const userRole = localStorage.getItem('userRole');

        if (settings.maintenance === true && userRole !== 'admin') {
            window.location.href = "/maintenance.html";
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.style.visibility = "visible";
                document.body.style.opacity = "1";
            });
        }
    } catch (error) {
        // API hatası varsa siteyi aç
        console.warn("Bakım kontrolü yapılamadı, devam ediliyor:", error);
        document.addEventListener('DOMContentLoaded', () => {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        });
    }
})();

// =========================================
// 2. KİTAP SİSTEMİ
// =========================================

// Kitapları backend'den çek
async function fetchBooksFromDB() {
    try {
        const res = await fetch(`${API_URL}/books`);
        if (!res.ok) throw new Error("Veri yok");
        const data = await res.json();

        BOOKS = data.map(item => ({
            id: item._id,
            title: item.title,
            author: item.author,
            tag: item.tag || "Genel",
            rating: item.rating || 0,
            cover: item.cover || "https://placehold.co/150?text=Kitap",
            year: new Date(item.createdAt).getFullYear(),
            desc: item.desc
        }));

        renderBooks();
    } catch (error) {
        console.warn("Kitaplar çekilemedi:", error);
    }
}

// Kitapları ekrana çiz
function renderBooks() {
    const grid = document.getElementById("booksGrid");
    if (!grid) return;

    if (BOOKS.length === 0) {
        grid.innerHTML = "<p style='text-align:center; color:#888; width:100%;'>Henüz kitap eklenmemiş.</p>";
        return;
    }

    grid.innerHTML = BOOKS.map(b => `
        <a href="/kitap/${b.id}" data-category="${b.tag}" class="book card" style="text-decoration:none; color:inherit; display:flex;">
            <img src="${b.cover}" class="book__cover-art" onerror="this.src='https://placehold.co/150?text=Kapak+Yok'">
            <div class="book__info">
                <div>
                    <span class="tag">${b.tag}</span>
                    <h3 class="book__title">${b.title}</h3>
                    <p class="book__author">${b.author}</p>
                </div>
            </div>
        </a>
    `).join('');
}

// Kitapları kategoriye göre filtrele
function filterBooks(category) {
    // Aktif butonu güncelle
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === category || (category === 'all' && btn.innerText === 'Tümü')) {
            btn.classList.add('active');
        }
    });

    // Kartları göster / gizle
    document.querySelectorAll('.book').forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || (cardCategory && cardCategory.trim() === category.trim())) {
            card.style.display = 'flex';
            card.style.animation = 'fadeIn 0.5s ease';
        } else {
            card.style.display = 'none';
        }
    });
}

// Kitap adına göre arama
function searchBooks() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const filter = input.value.toLocaleLowerCase('tr');

    document.querySelectorAll('.book').forEach(card => {
        const titleElement = card.querySelector('h3');
        if (titleElement) {
            const titleText = titleElement.innerText.toLocaleLowerCase('tr');
            card.style.display = titleText.includes(filter) ? "flex" : "none";
        }
    });
}

// =========================================
// 3. BLOG YAZILARI (Ana Sayfa)
// =========================================

// Son 6 blog yazısını çek ve göster
async function fetchPosts() {
    const grid = document.getElementById("blogGrid");
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();

        if (posts.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:#888;">Henüz yazı yok.</p>';
            return;
        }

        const latestPosts = posts.reverse().slice(0, 6);

        grid.innerHTML = latestPosts.map(post => {
            const date = new Date(post.createdAt || post.date).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const rawImage = post.image || post.cover || "https://via.placeholder.com/800x400?text=Resim+Yok";
            let desc = post.excerpt || post.desc || post.content || 'İçeriği okumak için tıklayın...';
            desc = desc.replace(/<[^>]*>?/gm, ''); // HTML etiketleri temizle

            return `
            <article class="premium-blog-card" style="background:var(--panel); border-radius:16px; border:1px solid var(--line); overflow:hidden; transition:all 0.3s; cursor:pointer; display:flex; flex-direction:column;"
                onmouseover="this.style.transform='translateY(-6px)'; this.style.borderColor='var(--accent)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.1)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--line)'; this.style.boxShadow='none';">
                <a href="/blog/${post._id}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
                    <div style="width:100%; height:220px; overflow:hidden; position:relative; background:var(--line);">
                        <img src="${rawImage}" alt="${post.title}"
                            style="width:100%; height:100%; object-fit:cover; transition:transform 0.6s ease;"
                            onmouseover="this.style.transform='scale(1.08)'"
                            onmouseout="this.style.transform='scale(1)'"
                            onerror="this.src='https://via.placeholder.com/800x400?text=Resim+Yok'">
                    </div>
                    <div style="padding:24px; flex:1; display:flex; flex-direction:column;">
                        <div style="font-size:0.75rem; color:var(--accent); font-weight:bold; letter-spacing:1.5px; margin-bottom:12px; text-transform:uppercase;">
                            ${post.category || 'GENEL'} • ${date}
                        </div>
                        <h3 style="margin:0 0 12px 0; font-family: Merriweather, serif; font-size:1.4rem; color:var(--ink); line-height:1.4;">
                            ${post.title}
                        </h3>
                        <p style="color:var(--muted); font-size:0.95rem; line-height:1.6; margin-bottom:20px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                            ${desc}
                        </p>
                        <div style="margin-top:auto;">
                            <span style="color:var(--ink); font-weight:bold; display:inline-flex; align-items:center; gap:6px; transition:0.3s;"
                               onmouseover="this.style.color='var(--accent)'"
                               onmouseout="this.style.color='var(--ink)'">
                                Devamını Oku →
                            </span>
                        </div>
                    </div>
                </a>
            </article>`;
        }).join('');

    } catch (err) {
        console.error("Yazılar yüklenemedi:", err);
        grid.innerHTML = '<p>Yazılar yüklenemedi.</p>';
    }
}

// =========================================
// 4. SIDEBAR SİSTEMİ
// =========================================

// Sidebar verilerini backend'den çek
async function fetchSidebarData() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();

        SIDEBAR_DATA = {
            book: {
                title: data.currentBook?.title || "Kitap Seçilmedi",
                author: data.currentBook?.author || "-",
                cover: data.currentBook?.cover || "https://placehold.co/150?text=Kitap",
                totalPage: data.currentBook?.totalPage || 100,
                currentPage: data.currentBook?.currentPage || 0
            },
            quotes: data.quotes || [],
            goal: {
                target: data.goal?.target || 50,
                completed: data.goal?.current || 0
            }
        };

        renderSidebar();
        startQuoteRotation();

    } catch (error) {
        console.warn("Sidebar yüklenemedi:", error);
    }
}

// Sidebar'ı ekrana çiz
function renderSidebar() {
    if (!SIDEBAR_DATA) return;

    // Şu An Masamda
    const readingEl = document.getElementById("readingNow");
    if (readingEl) {
        const { book } = SIDEBAR_DATA;
        const p = book.totalPage > 0 ? Math.round((book.currentPage / book.totalPage) * 100) : 0;

        readingEl.innerHTML = `
            <div style="display:flex; gap:15px; align-items:start;">
                <img src="${book.cover}" style="width:70px; border-radius:6px; box-shadow:0 4px 10px rgba(0,0,0,0.3);" onerror="this.src='https://placehold.co/150?text=Kapak'">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:14px; color:var(--ink); line-height:1.4;">${book.title}</h4>
                    <p style="margin:2px 0 6px 0; font-size:12px; color:var(--muted);">${book.author}</p>
                    <div class="progress-track" style="width:100%; height:6px; background:var(--line); border-radius:4px;">
                        <div class="progress-fill" style="width:${p}%; height:100%; background-color:var(--accent); border-radius:4px;"></div>
                    </div>
                    <small style="display:block; margin-top:4px; font-size:11px; color:var(--muted);">%${p} tamamlandı</small>
                </div>
            </div>`;
    }

    // 2026 Okuma Hedefi
    const challengeEl = document.getElementById("readingChallenge");
    if (challengeEl) {
        const { goal } = SIDEBAR_DATA;
        const p = goal.target > 0 ? Math.round((goal.completed / goal.target) * 100) : 0;

        challengeEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:5px;">
                <div style="font-size:24px; font-weight:800; color:var(--accent); line-height:1;">${goal.completed}</div>
                <div style="font-size:12px; color:var(--muted); padding-bottom:4px;">/ ${goal.target} Kitap</div>
            </div>
            <div class="progress-track" style="width:100%; height:10px; background:var(--line); border-radius:5px;">
                <div class="progress-fill" style="width:${p}%; height:100%; background-color:var(--accent); border-radius:5px;"></div>
            </div>`;
    }
}

// Söz döngüsünü başlat
function startQuoteRotation() {
    const quotes = SIDEBAR_DATA?.quotes;
    const qBox = document.getElementById("quoteBox");

    if (!quotes || quotes.length === 0) {
        if (qBox) qBox.innerHTML = "<p style='color:gray; font-size:0.9rem'>Henüz söz eklenmedi.</p>";
        return;
    }

    changeQuote();
    if (ROTATION_TIMER) clearInterval(ROTATION_TIMER);
    ROTATION_TIMER = setInterval(changeQuote, 15000);
}

// Animasyonlu söz değiştir
function changeQuote() {
    const quoteBox = document.getElementById("quoteBox");
    if (!quoteBox || !SIDEBAR_DATA?.quotes?.length) return;

    const quotes = SIDEBAR_DATA.quotes;
    const q = quotes[Math.floor(Math.random() * quotes.length)];

    quoteBox.style.transition = "opacity 0.5s ease";
    quoteBox.style.opacity = 0;

    setTimeout(() => {
        quoteBox.innerHTML = `
            <div style="text-align:center; padding:0 10px;">
                <p style="font-size:1.1rem; font-style:italic; margin-bottom:10px; line-height:1.5; color:var(--ink);">
                    "${q.text}"
                </p>
                <footer style="font-weight:bold; color:var(--accent); font-size:0.9rem;">
                    — ${q.author}
                </footer>
            </div>`;
        quoteBox.style.opacity = 1;
    }, 500);
}

// =========================================
// 5. AMBİYANS MÜZİK SİSTEMİ
// =========================================

// Paneli aç / kapat
function toggleAmbiancePanel() {
    const panel = document.getElementById('ambiancePanel');
    if (panel) panel.classList.toggle('active');
}

// Ses çal / durdur
function playAmbiance(type, element) {
    const audioElement = document.getElementById(`audio-${type}`);
    const volumeControl = document.getElementById('volumeControl');
    const toggleBtn = document.querySelector('.ambiance-toggle');

    if (currentAudio === audioElement && !audioElement.paused) {
        audioElement.pause();
        element.classList.remove('active');
        if (toggleBtn) toggleBtn.classList.remove('playing');
        currentAudio = null;
        return;
    }

    stopAllSounds();

    if (audioElement) {
        audioElement.volume = volumeControl ? volumeControl.value : 0.5;
        audioElement.play().catch(e => console.warn("Oynatma hatası:", e));
        currentAudio = audioElement;
        element.classList.add('active');
        if (toggleBtn) toggleBtn.classList.add('playing');
    }
}

// Tüm sesleri durdur
function stopAllSounds() {
    document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    document.querySelectorAll('.sound-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Ses seviyesi kontrolü
const volSlider = document.getElementById('volumeControl');
if (volSlider) {
    volSlider.addEventListener('input', (e) => {
        if (currentAudio) currentAudio.volume = e.target.value;
    });
}

// =========================================
// 6. HEADER: PROFİL VE ADMIN BUTONU
// =========================================

// Header'daki profil linkini güncelle
function updateHeaderProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    const profileLink = document.getElementById('headerProfileLink');
    if (!profileLink) return;

    if (user) {
        const avatar = user.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        profileLink.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
                <span>${user.username}</span>
            </div>`;
        profileLink.href = "/profile.html";
    }
}

// Admin panel butonunu göster (sadece adminlere)
function updateAdminButton() {
    const user = JSON.parse(localStorage.getItem("user"));
    const adminContainer = document.getElementById("adminPanelContainer");
    if (!adminContainer) return;

    const isAdmin = user && (
        user.role === 'admin' ||
        user.username === 'OnurCy' ||
        user.username === 'Minemsi'
    );

    if (isAdmin) {
        adminContainer.innerHTML = `
            <a href="/adminPanel.html" class="admin-btn-link">
                ⚙️ <span>Yönetim Paneli</span>
            </a>`;
    }
}

// =========================================
// 7. BÜLTEN ABONELİĞİ
// =========================================

// Abone ol
async function handleSubscribe() {
    const emailInput = document.getElementById('newsletterEmail');
    const btn = document.getElementById('subscribeBtn');
    if (!emailInput || !btn) return;

    const email = emailInput.value.trim();
    if (!email) { alert("E-posta yazmadın! ✍️"); return; }

    const originalText = btn.innerText;
    btn.innerText = "Ekleniyor...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Harika! Aramıza hoş geldin. 🎉");
            emailInput.value = "";
        } else {
            alert("Hata: " + data.message);
        }
    } catch (error) {
        console.error(error);
        alert("Sunucuya ulaşılamadı!");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Bülten modalını aç
function openNewsletterModal() {
    const modal = document.getElementById('newsletter-modal');
    if (modal && !modal.open) {
        modal.style.display = '';
        modal.showModal();
    }
}

// Bülten modalını kapat
function closeNewsletterModal() {
    const modal = document.getElementById('newsletter-modal');
    if (modal) modal.close();
}

// =========================================
// 8. YUMUŞAK KAYDIRMA (Smooth Scroll)
// =========================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || !href.startsWith('#')) return;

            e.preventDefault();
            const targetElement = document.querySelector(href);
            if (!targetElement) return;

            const headerOffset = 165;
            const duration = 1000;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const startPosition = window.scrollY;
            const offsetPosition = elementPosition + startPosition - headerOffset;
            let startTime = null;

            function animation(currentTime) {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const ease = (t, b, c, d) => {
                    t /= d / 2;
                    if (t < 1) return c / 2 * t * t + b;
                    t--;
                    return -c / 2 * (t * (t - 2) - 1) + b;
                };
                window.scrollTo(0, ease(timeElapsed, startPosition, offsetPosition - startPosition, duration));
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }

            requestAnimationFrame(animation);
        });
    });
}

// =========================================
// SAYFA BAŞLARKEN ÇALIŞACAKLAR (TEK BLOK)
// =========================================
document.addEventListener("DOMContentLoaded", async () => {

    // Kitap ve blog verilerini yükle
    fetchBooksFromDB();
    fetchSidebarData();
    fetchPosts();

    // Header'ı güncelle
    updateHeaderProfile();
    updateAdminButton();

    // Yumuşak kaydırmayı başlat
    initSmoothScroll();

    // Bülten butonunu bağla
    const subBtn = document.getElementById("subscribeBtn");
    const subModal = document.getElementById("newsletter-modal");
    if (subBtn && subModal) subBtn.addEventListener('click', () => subModal.showModal());

    // Kitap modal kapatma butonunu bağla
    const closeModalBtn = document.getElementById("closeModal");
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
        const bookModal = document.getElementById("bookModal");
        if (bookModal) bookModal.close();
    });
});