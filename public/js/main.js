/* =========================================
   1. VERİLER & SABİTLER (DATA)
   ========================================= */
const QUOTES = [
    { t: "Okumak, insanın kendine açtığı en sakin kapıdır.", a: "Seçki" },
    { t: "İyi bir cümle, kalabalıkta bile insanı yalnız bırakmaz.", a: "Seçki" },
    { t: "Bazı kitaplar bitmez; sadece rafa geri döner.", a: "Seçki" },
    { t: "Hikâye, okurun zihninde tamamlanır.", a: "Seçki" },
    { t: "Sade tasarım, metne saygıdır.", a: "Seçki" },
];

let BOOKS = [];

/* SIDEBAR VERİLERİ */
const currentBook = {
    title: "Kürk Mantolu Madonna",
    author: "Sabahattin Ali",
    cover: "https://www.istanbook.com.tr/shop/sr/57/myassets/products/475/tk-kurk-mantolu-madonna.jpg?revision=1716464396",
    currentPage: 84,
    totalPage: 160
};

const readingGoal = {
    target: 50,
    completed: 12
};

/* =========================================
   2. AYARLAR & STATE
   ========================================= */
const $ = (sel) => document.querySelector(sel);

const state = {
    tag: "Tümü",
    q: "",
    sort: "new",
    activeBook: null
};

/* =========================================
   3. RENDER İŞLEMLERİ (KİTAPLARI ÇİZME)
   ========================================= */
const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);

const getStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return "★".repeat(full) + (half ? "⯪" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
};

/* =========================================
   KİTAPLARI LİSTELEME (SIRALAMA DAHİL)
   ========================================= */
function renderBooks() {
    const grid = document.querySelector("#booksGrid");
    if (!grid) return;

    // 1. Önce Filtrele (Kategoriye göre)
    let list = BOOKS.filter(b => state.tag === "Tümü" || b.tag === state.tag);

    // 2. Arama Yapıldıysa Filtrele
    if (state.q.trim()) {
        const q = state.q.toLowerCase();
        list = list.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }

    // 3. VE ŞİMDİ SIRALA! (Burayı ekledik)
    if (state.sort === "title") {
        // A'dan Z'ye sırala
        list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sort === "rating") {
        // Puana göre (Yüksekten düşüğe)
        list.sort((a, b) => b.rating - a.rating);
    } else {
        // Varsayılan: En Yeni (Yıla göre veya ID'ye göre)
        // Eğer ID'leri sayısal verirse ID'ye göre, yoksa Yıla göre yapalım:
        list.sort((a, b) => b.year - a.year);
    }

    // 4. Ekrana Bas
    grid.innerHTML = list.map(b => `
        <article class="book card">
            <img src="${b.cover}" class="book__cover-art" onerror="this.src='https://via.placeholder.com/90x135?text=Kitap'">
            <div class="book__info">
                <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span class="tag">${b.tag}</span>
                        <span class="muted small">${b.year}</span>
                    </div>
                    <h3 class="book__title">${b.title}</h3>
                    <p class="book__author">${b.author}</p>
                    <p class="book__desc">${b.desc}</p>
                </div>
                <div class="book__footer">
                    <button class="book__btn" onclick="openModal('${b.id}')">İncele →</button>
                    <span class="muted small">${getStars(b.rating)} <strong>${b.rating}</strong></span>
                </div>
            </div>
        </article>
    `).join('');
}
// Filtre Butonları (Chips)
// Filtre Butonları (Chips) - SENİN İSTEDİĞİN LİSTE
function renderChips() {
    const row = document.getElementById("chipRow");
    if (!row) return;

    // ESKİ KOD BUYDU (Otomatik Taramayı İptal Ettik):
    // const uniqueTags = ["Tümü", ...new Set(BOOKS.map(b => b.tag))];

    // YENİ KOD (Manuel Kontrol):
    // Buraya ne yazarsan ekranda o buton çıkar, sırası da bu olur.
    const uniqueTags = ["Tümü", "Roman", "Deneme", "Notlar", "Alıntılar", "Öykü"];

    row.innerHTML = uniqueTags.map(tag => {
        // Hangi buton aktifse ona 'is-active' sınıfı ekle
        const activeClass = state.tag === tag ? 'is-active' : '';

        return `<button class="chip ${activeClass}" 
                        onclick="setFilter('${tag}')">
                    ${tag}
                </button>`;
    }).join('');
}

window.setFilter = (tag) => {
    state.tag = tag;
    renderChips();
    // renderBooks(); // <-- Eğer blog kısmı statik HTML ise bu satırı silebilirsin, hata verdirmesin.

    // İŞTE EKSİK OLAN SATIR BU:
    filterStaticCards(tag);
};
/* --- SIDEBAR DOLDURMA (MASAMDA NE VAR) --- */
function renderSidebarWidgets() {
    const readingEl = document.getElementById("readingNow");
    if (readingEl) {
        const percent = Math.round((currentBook.currentPage / currentBook.totalPage) * 100);
        readingEl.innerHTML = `
            <div class="reading-card">
                <img src="${currentBook.cover}" alt="${currentBook.title}" class="reading-cover">
                <div class="reading-info">
                    <h4 class="reading-title">${currentBook.title}</h4>
                    <p class="reading-author">${currentBook.author}</p>
                    <div class="progress-wrapper">
                        <div class="progress-labels">
                            <span>Sayfa ${currentBook.currentPage}</span>
                            <span>%${percent}</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const challengeEl = document.getElementById("readingChallenge");
    if (challengeEl) {
        const goalPercent = Math.round((readingGoal.completed / readingGoal.target) * 100);
        challengeEl.innerHTML = `
            <span class="challenge-stat">${readingGoal.completed} / ${readingGoal.target}</span>
            <div class="progress-track">
                 <div class="progress-fill" style="width: ${goalPercent}%"></div>
            </div>
            <span class="challenge-note">Bu yılki hedefin %${goalPercent} kadarı tamamlandı.</span>
        `;
    }
}

/* =========================================
   4. MODAL & ETKİLEŞİMLER
   ========================================= */
window.openModal = (id) => {
    state.activeBook = BOOKS.find(b => b.id === id);
    if (!state.activeBook) return;
    const b = state.activeBook;

    const coverImg = document.querySelector("#mCover");
    if (coverImg) {
        coverImg.src = b.cover;
        coverImg.onerror = function () { this.src = 'https://via.placeholder.com/200x300?text=Kapak+Yok'; };
    }

    document.querySelector("#mTag").textContent = b.tag;
    document.querySelector("#mInfo").textContent = `• ${b.year} • ${b.minutes} dk`;
    document.querySelector("#mHeading").textContent = b.title;
    const authorEl = document.querySelector("#mAuthorModal");
    if (authorEl) authorEl.textContent = b.author;
    document.querySelector("#mDesc").textContent = b.desc;
    document.querySelector("#mStars").textContent = getStars(b.rating);
    document.querySelector("#mRating").textContent = b.rating.toFixed(1);

    const m = document.querySelector("#bookModal");
    if (m) m.showModal();
};

function updateQuote() {
    const box = $("#quoteBox");
    if (!box) return;
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    box.querySelector(".quote__text").textContent = `“${q.t}”`;
    box.querySelector(".quote__by").textContent = `— ${q.a}`;
}

function setupEventListeners() {
    const sort = $("#sortSelect");
    if (sort) sort.addEventListener("change", (e) => { state.sort = e.target.value; renderBooks(); });

    const closeBtn = $("#closeModal");
    if (closeBtn) closeBtn.addEventListener("click", () => $("#bookModal").close());

    const modal = $("#bookModal");
    if (modal) modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
    });

    const shuffle = $("#shuffleQuote");
    if (shuffle) shuffle.addEventListener("click", updateQuote);

    const subBtn = $("#subscribeBtn");
    const subModal = $("#subscribeModal"); // HTML'de bu ID'li dialog olmalı

    if (subBtn && subModal) {
        subBtn.addEventListener("click", () => {
            subModal.showModal();
        });
    }
}

/* =========================================
   5. BAŞLAT (INIT) - TEMA KODU BURADAN KALDIRILDI
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    // initTheme();  <--- BU SATIR ARTIK YOK (thema.js hallediyor)

    renderChips();
    renderBooks();       // Kitapları Çiz
    setupEventListeners();
    updateQuote();
    renderSidebarWidgets(); // Sidebar'ı Çiz

    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Link paylaşımı ile açılan modal
    const hash = window.location.hash;
    if (hash.startsWith("#book=")) {
        openModal(hash.replace("#book=", ""));
    }
});

/* =========================================
   YUMUŞAK KAYDIRMA (Linkler İçin)
   ========================================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // Eğer sadece '#' ise hiçbir şey yapma
        if (this.getAttribute('href') === '#') return;

        e.preventDefault();
        const targetId = this.getAttribute('href');

        if (targetId === '#top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const offset = 170;
            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
            const startPosition = window.scrollY;
            const distance = targetPosition - startPosition - offset;
            const duration = 1000;
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
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }
            requestAnimationFrame(animation);
        }
    });
});

/* =========================================
   CANLI ARAMA SİSTEMİ
   ========================================= */
const searchInp = document.getElementById("searchInput");
const resultBox = document.getElementById("searchResults");

if (searchInp && resultBox) {
    searchInp.addEventListener("input", (e) => {
        const val = e.target.value.toLowerCase().trim();

        // 1. Kutuyu temizle
        resultBox.innerHTML = "";

        // 2. Eğer yazı yoksa kutuyu gizle ve çık
        if (val.length === 0) {
            resultBox.classList.remove("active");
            return;
        }

        // 3. Kitapları Filtrele (BOOKS dizisi main.js'in başında tanımlı olmalı)
        // Eğer main.js'de BOOKS yoksa, admin paneline geçince düzelteceğiz.
        // Şimdilik varsayalım ki BOOKS var.
        const filtered = BOOKS.filter(book =>
            book.title.toLowerCase().includes(val) ||
            book.author.toLowerCase().includes(val) ||
            book.tag.toLowerCase().includes(val)
        );

        // 4. Sonuç Yoksa
        if (filtered.length === 0) {
            resultBox.innerHTML = `<div style="padding:12px; font-size:13px; color:var(--muted); text-align:center;">Sonuç bulunamadı...</div>`;
            resultBox.classList.add("active");
            return;
        }

        // 5. Sonuçları Bas
        filtered.forEach(b => {
            const item = document.createElement("a");
            item.className = "search-item";
            // Tıklayınca modalı aç (veya sayfaya git)
            item.href = `#book=${b.id}`;
            item.onclick = () => {
                openModal(b.id);
                resultBox.classList.remove("active"); // Kutuyu kapat
                searchInp.value = ""; // Inputu temizle
            };

            item.innerHTML = `
                <img src="${b.cover}" class="s-img">
                <div class="s-info">
                    <span class="s-title">${b.title}</span>
                    <span class="s-author">${b.author} • ${b.tag}</span>
                </div>
            `;
            resultBox.appendChild(item);
        });

        // Kutuyu göster
        resultBox.classList.add("active");
    });

    // Boşluğa tıklayınca aramayı kapat
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-wrapper")) {
            resultBox.classList.remove("active");
        }
    });
}
/* AUTH SEKMELERİ ARASI GEÇİŞ */
function switchAuth(type) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');

    if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginTab.classList.add('is-active');
        registerTab.classList.remove('is-active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginTab.classList.remove('is-active');
        registerTab.classList.add('is-active');
    }
}
/* =========================================
   MOBİL MENÜ (TEK VE GARANTİLİ ÇÖZÜM)
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {

    // Değişken isimlerini değiştirdim ki yukarıda unuttuğun varsa bile çakışmasın
    const hamburgerBtn = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('closeMenu');
    const mobilePanel = document.getElementById('mobileMenu');
    const panelOverlay = document.getElementById('mobileMenuOverlay');

    // Açma/Kapama Fonksiyonu
    function toggleMobileMenu() {
        if (!mobilePanel || !panelOverlay) return;

        mobilePanel.classList.toggle('is-open');
        panelOverlay.classList.toggle('is-active');
    }

    // Tıklamaları Dinle (Varsa çalıştır)
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMobileMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMobileMenu);
    if (panelOverlay) panelOverlay.addEventListener('click', toggleMobileMenu);

    // Menü içindeki linklere tıklayınca da kapansın
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', toggleMobileMenu);
    });

    console.log("Mobil menü sistemi hazır. 🚀");
});
/* GELİŞTİRİLMİŞ KART FİLTRELEME (Harf Duyarsız) */
function filterStaticCards(selectedTag) {
    // 1. Sayfadaki blog kartlarını bul
    const cards = document.querySelectorAll('.blog-card, .card');

    // Eğer hiç kart bulamazsa konsola uyarı ver (F12'de görürsün)
    if (cards.length === 0) console.log("Hata: Hiç kart bulunamadı!");

    // Seçilen etiketi temizle ve küçült (Örn: "Roman " -> "roman")
    const safeSelected = selectedTag.trim().toLowerCase();

    cards.forEach(card => {
        // Kartın içindeki etiketi bul (.tag, .blog-tag, veya .chip sınıfı olan)
        const tagSpan = card.querySelector('.tag, .blog-tag, .chip');

        // Etiket yoksa (belki yazar kutusudur) bu kartı geç
        if (!tagSpan) return;

        // Karttaki yazıyı al, temizle, küçült
        const cardTagText = tagSpan.textContent.trim().toLowerCase();

        // KONTROL ANI:
        // "tümü" seçiliyse YA DA etiketler eşleşiyorsa GÖSTER
        if (safeSelected === "tümü" || cardTagText === safeSelected) {
            card.style.display = "block"; // Veya 'flex' ise 'flex' yap
            card.style.opacity = "1";
        } else {
            card.style.display = "none"; // GİZLE
        }
    });
}
/* =========================================
   VERİTABANI BAĞLANTISI (MONGODB)
   ========================================= */
const API_URL = "http://localhost:5000/api"; // Sunucu adresi

async function fetchBooksFromDB() {
    try {
        // 1. Sunucudan verileri iste
        const response = await fetch(`${API_URL}/books`);
        const data = await response.json();

        // 2. Gelen veriyi senin sitenin anladığı formata çevirip BOOKS'a at
        BOOKS = data.map(item => ({
            id: item._id,        // MongoDB ID'si
            title: item.title,
            author: item.author,
            tag: item.tag,
            rating: item.rating,
            cover: item.cover || "assets/images/cover1.jpg", // Kapak yoksa varsayılan
            year: new Date(item.createdAt).getFullYear() // Tarih
        }));

        console.log("Kitaplar Yüklendi:", BOOKS);

        // 3. Ekrana Bas (Senin eski fonksiyonlarını tetikliyoruz)
        renderBooks(); // Kitapları diz
        renderChips(); // Filtre butonlarını güncelle (Önemli!)

    } catch (error) {
        console.error("Hata var Kral:", error);
    }
}

// Sayfa yüklenince çalıştır
document.addEventListener("DOMContentLoaded", fetchBooksFromDB);