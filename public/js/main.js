/* public/js/main.js */

console.log("🚀 Main.js Devrede!");

const API_URL = "https://minemsiyle.com/api";

// 1. SİDEBAR VERİLERİ 
let SIDEBAR_DATA = null;
let ROTATION_TIMER = null;
let BOOKS = [];

/* 2. VERİTABANI BAĞLANTISI */
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
        console.log("Kitaplar çekilemedi.");
    }
}

/* 3. KİTAPLARI ÇİZ (GÜNCELLENMİŞ) */
function renderBooks() {
    const grid = document.getElementById("booksGrid");
    if (!grid) return;

    if (BOOKS.length === 0) {
        grid.innerHTML = "<p style='text-align:center; color:#888; width:100%;'>Henüz kitap eklenmemiş.</p>";
        return;
    }

    grid.innerHTML = BOOKS.map(b => `
       <a href="book.html?id=${b.id}" data-category="${b.tag}" class="book card" style="text-decoration:none; color:inherit; display:flex;">
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
// 🔍 DÜZELTİLMİŞ FİLTRELEME MOTORU
function filterBooks(category) {
    // 1. Butonların rengini ayarla
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === category || (category === 'all' && btn.innerText === 'Tümü')) {
            btn.classList.add('active');
        }
    });

    // 2. Kitapları bul ve filtrele
    // 👇 DİKKAT: Senin kodunda class="book card" olduğu için '.book' olarak aratıyoruz
    const allBooks = document.querySelectorAll('.book');

    allBooks.forEach(card => {
        // HTML'e eklediğimiz o gizli etiketi oku
        const cardCategory = card.getAttribute('data-category');

        // Kategori eşleşiyor mu? (Boşlukları temizleyerek kontrol et)
        if (category === 'all' || (cardCategory && cardCategory.trim() === category.trim())) {
            card.style.display = 'flex'; // Senin kartların flex yapısında
            card.style.animation = 'fadeIn 0.5s ease';
        } else {
            card.style.display = 'none'; // Gizle
        }
    });
}

// ==========================================
// 🧩 SIDEBAR (YAN MENÜ) KODLARI
// ==========================================


/* 1. SIDEBAR VERİLERİNİ ÇEK */
async function fetchSidebarData() {
    try {
        // API_URL yukarıdan (globalden) geliyor, tekrar tanımlamıyoruz
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();

        // Veriyi Hazırla
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

        // Ekrana Bas ve Döndür
        renderSidebar();
        startQuoteRotation();

    } catch (error) {
        console.log("Sidebar Hatası:", error);
    }
}

/* 2. SIDEBAR ÇİZİMİ */
function renderSidebar() {
    if (!SIDEBAR_DATA) return;

    // A. ŞU AN MASAMDA
    const readingEl = document.getElementById("readingNow");
    if (readingEl) {
        const { book } = SIDEBAR_DATA;
        let p = 0;
        if (book.totalPage > 0) p = Math.round((book.currentPage / book.totalPage) * 100);

        readingEl.innerHTML = `
            <div style="display:flex; gap:15px; align-items:start;">
                <img src="${book.cover}" style="width:70px; border-radius:6px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" onerror="this.src='https://placehold.co/150?text=Kapak'">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:14px; color:var(--ink); line-height:1.4;">${book.title}</h4>
                    <p style="margin:2px 0 6px 0; font-size:12px; color:var(--muted);">${book.author}</p>
                    <div class="progress-track" style="width:100%; height:6px; background:#eee; border-radius:4px;">
                        <div class="progress-fill" style="width:${p}%; height:100%; background-color:var(--accent); border-radius:4px;"></div>
                    </div>
                    <small style="display:block; margin-top:4px; font-size:11px; color:var(--muted);">%${p} tamamlandı</small>
                </div>
            </div>`;
    }

    // B. HEDEF
    const challengeEl = document.getElementById("readingChallenge");
    if (challengeEl) {
        const { goal } = SIDEBAR_DATA;
        let p = 0;
        if (goal.target > 0) p = Math.round((goal.completed / goal.target) * 100);

        challengeEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:5px;">
                <div style="font-size:24px; font-weight:800; color:var(--accent); line-height:1;">${goal.completed}</div>
                <div style="font-size:12px; color:var(--muted); padding-bottom:4px;">/ ${goal.target} Kitap</div>
            </div>
            <div class="progress-track" style="width:100%; height:10px; background:#eee; border-radius:5px;">
                <div class="progress-fill" style="width:${p}%; height:100%; background-color:var(--accent); border-radius:5px;"></div>
            </div>
        `;
    }
}

/* 3. DÖNGÜ MOTORU */
function startQuoteRotation() {
    const quotes = SIDEBAR_DATA.quotes;

    // Eğer hiç söz yoksa
    if (!quotes || quotes.length === 0) {
        const qBox = document.getElementById("quoteBox");
        if (qBox) qBox.innerHTML = "<p style='color:gray; font-size:0.9rem'>Henüz söz eklenmedi.</p>";
        return;
    }

    changeQuote(); // İlkini hemen göster

    if (ROTATION_TIMER) clearInterval(ROTATION_TIMER);
    ROTATION_TIMER = setInterval(changeQuote, 15000); // 15 Saniyede bir
}

/* 4. ANİMASYONLU DEĞİŞİM */
function changeQuote() {
    const quoteBox = document.getElementById("quoteBox");
    if (!quoteBox) return;

    const quotes = SIDEBAR_DATA.quotes;
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const q = quotes[randomIndex];

    // Efekt: Soluklaş
    quoteBox.style.transition = "opacity 0.5s ease";
    quoteBox.style.opacity = 0;

    // Efekt: Değiştir ve Parlat
    setTimeout(() => {
        quoteBox.innerHTML = `
            <div style="text-align: center; padding: 0 10px;">
                <p style="font-size: 1.1rem; font-style: italic; margin-bottom: 10px; line-height: 1.5; color:var(--ink);">
                    “${q.text}”
                </p>
                <footer style="font-weight: bold; color: var(--accent); font-size: 0.9rem;">
                    — ${q.author}
                </footer>
            </div>
        `;
        quoteBox.style.opacity = 1;
    }, 500);
}
/* 5. BAŞLAT */
document.addEventListener("DOMContentLoaded", async () => {
    fetchBooksFromDB();
    fetchSidebarData();
    fetchPosts();

    // ==========================================
    // 🚧 BAKIM MODU KONTROLÜ (BURAYA EKLENDİ)
    // ==========================================
    try {
        const checkRes = await fetch(`${API_URL}/settings`);
        const checkData = await checkRes.json();

        // Bakım AÇIKSA ve Admin DEĞİLSEN (Token yoksa)
        if (checkData.maintenance === true && !localStorage.getItem('userToken')) {
            // Eğer zaten bakım sayfasında değilsek oraya gönder
            if (!window.location.href.includes("maintenance.html")) {
                window.location.href = "maintenance.html";
                return; // 🛑 Kodun geri kalanını (kitapları vs.) yükleme!
            }
        }
    } catch (e) {
        console.log("Bakım kontrolü yapılamadı, devam ediliyor...");
    }

    // Takip Et
    const subBtn = document.getElementById("subscribeBtn");
    const subModal = document.getElementById("newsletter-modal");
    if (subBtn && subModal) subBtn.addEventListener('click', () => subModal.showModal());

    // Modal Kapat
    const closeBtn = document.getElementById("closeModal");
    if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById("bookModal").close());

    // ==========================================
    // 🛝 PROFESYONEL YUMUŞAK KAYDIRMA (CUSTOM SMOOTH SCROLL)
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Eğer link boşsa veya sadece # ise çalışma
            if (!href || href === '#' || !href.startsWith('#')) return;

            e.preventDefault(); // Standart atlamayı engelle

            const targetElement = document.querySelector(href);
            if (!targetElement) return;

            // 👇 AYARLAR BURADA KRAL 👇
            const headerOffset = 165;  // DURACAĞI YER (Menü yüksekliği kadar pay bırak)
            const duration = 1000;     // HIZ (Milisaniye cinsinden. 1000 = 1 saniye. Arttırırsan yavaşlar)
            // 👆 AYARLAR BURADA 👆

            const elementPosition = targetElement.getBoundingClientRect().top;
            const startPosition = window.scrollY;
            const offsetPosition = elementPosition + startPosition - headerOffset;
            let startTime = null;

            // Matematiksel animasyon fonksiyonu (Ease-in-out)
            function animation(currentTime) {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;

                // Bu formül hareketin "yumuşak" başlamasını ve bitmesini sağlar
                const ease = (t, b, c, d) => {
                    t /= d / 2;
                    if (t < 1) return c / 2 * t * t + b;
                    t--;
                    return -c / 2 * (t * (t - 2) - 1) + b;
                };

                const run = ease(timeElapsed, startPosition, offsetPosition - startPosition, duration);
                window.scrollTo(0, run);

                if (timeElapsed < duration) requestAnimationFrame(animation);
            }

            requestAnimationFrame(animation);
        });
    });

    // --- ANA SAYFA BLOGLARI ÇEKME (DÜZELTİLMİŞ) ---
    async function fetchPosts() {
        const grid = document.getElementById("blogGrid");
        if (!grid) return;

        try {
            const res = await fetch('https://minemsiyle.com/api/posts');
            const posts = await res.json();

            if (posts.length === 0) {
                grid.innerHTML = '<p style="text-align:center; color:#888;">Henüz yazı yok.</p>';
                return;
            }

            // Son 6 yazıyı göster
            const latestPosts = posts.reverse().slice(0, 6);

            grid.innerHTML = latestPosts.map(post => {
                // 1. TARİH DÜZELTME
                const date = new Date(post.createdAt || post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

                // 2. RESİM SEÇİMİ (Kritik Nokta 📸)
                // Veritabanında bazen 'cover', bazen 'image' dolu oluyor.
                const rawImage = post.cover || post.image || "";
                // Resim varsa göster, yoksa gri kutu göster
                const imgHTML = rawImage.length > 5
                    ? `<img src="${rawImage}" alt="${post.title}" style="width:100%; height:200px; object-fit:cover; border-radius:12px 12px 0 0;" onerror="this.src='https://via.placeholder.com/800x400?text=Resim+Kirik'">`
                    : `<div style="width:100%; height:200px; background:#222; display:flex; align-items:center; justify-content:center; color:#555; border-radius:12px 12px 0 0;">Resim Yok</div>`;

                // 3. ÖZET METNİ (Sen ne yazdıysan o)
                // Eğer özet boşsa "..." yazmasın, boş kalsın.
                const desc = post.excerpt ? post.excerpt : "";

                return `
            <article class="blog-card" style="background:var(--bg-card); border-radius:12px; border:1px solid var(--border); overflow:hidden; display:flex; flex-direction:column;">
                <a href="post.html?id=${post._id}" style="text-decoration:none; color:inherit;">
                    ${imgHTML}
                    <div class="blog-card-content" style="padding:20px;">
                        <span style="font-size:0.75rem; color:var(--accent); font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${post.category || 'GENEL'} • ${date}</span>
                        <h3 style="margin:10px 0; font-size:1.2rem; line-height:1.4;">${post.title}</h3>
                        <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.6; margin-bottom:15px;">
                            ${desc}
                        </p>
                        <span style="font-size:0.9rem; font-weight:bold; color:var(--ink);">Devamını Oku →</span>
                    </div>
                </a>
            </article>
            `;
            }).join('');

        } catch (err) {
            console.error(err);
            grid.innerHTML = '<p>Yazılar yüklenemedi.</p>';
        }
    }

    document.addEventListener('DOMContentLoaded', fetchPosts);
});

// 🔍 SADECE KİTAP ADINA BAKAN ARAMA (Yazarı Önemsemez)
function searchBooks() {
    const input = document.getElementById('searchInput');
    const filter = input.value.toLocaleLowerCase('tr');
    const books = document.querySelectorAll('.book');

    books.forEach(card => {
        const titleElement = card.querySelector('h3');
        // Yazar elementini sildik, sadece başlığa bakıyoruz 👇

        if (titleElement) {
            const titleText = titleElement.innerText.toLocaleLowerCase('tr');

            // Sadece başlıkta eşleşme arıyoruz
            if (titleText.indexOf(filter) > -1) {
                card.style.display = "flex";
            } else {
                card.style.display = "none";
            }
        }
    });
}
// --- HEADER PROFİL GÜNCELLEME (Gelişmiş Versiyon) ---
function updateHeaderProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    const profileLink = document.getElementById('headerProfileLink');

    if (user && user.avatar && profileLink) {
        // 1. Resmi Koy
        profileLink.innerHTML = `<img src="${user.avatar}" class="header-avatar-img" alt="Profil">`;

        // 2. Linki 'Profil' sayfasına yönlendir (Giriş sayfasına gitmesin)
        profileLink.href = "profile.html";
    }
}
// --- ADMIN BUTONU KONTROLÜ ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Giriş yapan kullanıcıyı bul
    const user = JSON.parse(localStorage.getItem("user"));
    const adminContainer = document.getElementById("adminPanelContainer");

    // 2. Kullanıcı var mı ve adı 'Admin' mi?
    // (Büyük/küçük harf duyarlı, 'Admin' tam olarak tutmalı)
    if (user && user.username === "Admin") {

        // 3. Evet Admin! Butonu oluştur ve bas
        adminContainer.innerHTML = `
            <a href="admin.html" class="admin-btn-link">
                ⚙️ <span>Yönetim Paneli</span>
            </a>
        `;
    }
    // Admin değilse hiçbir şey yapmıyoruz, orası boş kalıyor.
});
/* --- HEADER KİMLİK KONTROLÜ --- */
document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
});

function checkLoginStatus() {
    const user = JSON.parse(localStorage.getItem("user"));
    const authLink = document.getElementById("headerProfileLink");

    if (user && authLink) {
        // Kullanıcı giriş yapmış! Linki değiştiriyoruz.
        // "Giriş Yap" yerine kullanıcının Avatarı ve Adı gelsin

        // Varsayılan avatar yoksa bunu kullan
        const avatar = user.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

        authLink.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${avatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
                <span>${user.username}</span>
            </div>
        `;

        // Tıklayınca Profil sayfasına gitsin (veya çıkış yapsın)
        authLink.href = "profile.html";


    }
}

/* --- BÜLTEN ABONELİĞİ (FİNAL VERSİYON) --- */
async function aboneOl() {
    // 1. Yeni ID'yi yakala (modalEmail)
    const emailInput = document.getElementById("modalEmail");

    // Eğer input bulunamazsa hata vermesin diye kontrol
    if (!emailInput) {
        console.error("Input bulunamadı!");
        return;
    }

    const email = emailInput.value.trim();

    if (!email) {
        alert("Lütfen bir mail adresi yaz! 📧");
        return;
    }

    try {
        const API_URL = "https://minemsiyle.com/api";

        const res = await fetch(`${API_URL}/subs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Harika! Aramıza hoş geldin! 🎉");
            emailInput.value = ""; // Kutuyu temizle

            // ✅ İŞLEM BAŞARILIYSA PENCEREYİ KAPAT
            const modal = document.getElementById('newsletter-modal');
            if (modal) modal.close();

        } else {
            alert("Hata: " + data);
        }

    } catch (err) {
        console.error(err);
        alert("Sunucuya ulaşılamadı! Backend açık mı?");
    }
}
(async function () {
    // Eğer zaten bakım sayfasındaysak veya Admin panelindeysek dur, sayfayı göster.
    if (window.location.pathname.includes("maintenance.html") ||
        window.location.pathname.includes("admin.html")) {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        });
        return;
    }

    try {
        // Backend adresin (Seninki farklıysa burayı düzelt!)
        const API_URL = "https://minemsiyle.com/api";

        const res = await fetch(`${API_URL}/settings`);
        const settings = await res.json();
        const userRole = localStorage.getItem('userRole');

        // BAKIM VARSA VE ADMİN DEĞİLSE -> YALLAH BAKIMA!
        if (settings.maintenance === true && userRole !== 'admin') {
            window.location.href = "maintenance.html";
        }
        // SORUN YOKSA -> SAYFAYI GÖSTER
        else {
            // Sayfa yüklenince görünür yap
            window.addEventListener('DOMContentLoaded', () => {
                document.body.style.visibility = "visible";
                document.body.style.opacity = "1";
                console.log("✅ Giriş izni verildi.");
            });
        }
    } catch (error) {
        console.error("Bakım kontrolü yapılamadı, site açılıyor:", error);
        // API hatası varsa siteyi açalım ki kullanıcı boş ekrana bakmasın
        window.addEventListener('DOMContentLoaded', () => {
            document.body.style.visibility = "visible";
            document.body.style.opacity = "1";
        });
    }
})();
// --- BÜLTEN ABONELİĞİ (TAKİP ET) ---
async function handleSubscribe() {
    const emailInput = document.getElementById('newsletterEmail');
    const btn = document.getElementById('subscribeBtn');
    const email = emailInput.value;

    // 1. Boş mu diye bak
    if (!email) {
        alert("E-posta yazmadın Kral! ✍️");
        return;
    }

    // 2. Butonu kilitle (Çift tıklamasınlar)
    const originalText = btn.innerText;
    btn.innerText = "Ekleniyor...";
    btn.disabled = true;

    try {
        // Backend'e gönder
        const res = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Harika! Aramıza hoş geldin. 🎉");
            emailInput.value = ""; // Kutuyu temizle
        } else {
            alert("Hata: " + data.message);
        }

    } catch (error) {
        console.error(error);
        alert("Sunucuya ulaşılamadı!");
    } finally {
        // 3. Butonu eski haline getir
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- BÜLTEN PENCERESİNİ AÇMA ---
function openNewsletterModal() {
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        // Önceki kapanıştan kalan 'display: none' varsa temizle
        modal.style.display = '';

        // Diyalog zaten açık değilse aç
        if (!modal.open) {
            modal.showModal();
        }
    }
}

// --- BÜLTEN PENCERESİNİ KAPATMA (DÜZELTİLDİ) ---
function closeNewsletterModal() {
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        // 'display: none' YAPMA! Sadece kapat komutu ver.
        modal.close();
    }
}

// ==========================================
// 🎵 AMBİYANS SES SİSTEMİ
// ==========================================

let currentAudio = null; // Şu an çalan ses

function toggleAmbiancePanel() {
    const panel = document.getElementById('ambiancePanel');
    panel.classList.toggle('active');
}

function playAmbiance(type, element) {
    const audioId = `audio-${type}`;
    const audioElement = document.getElementById(audioId);
    const volumeControl = document.getElementById('volumeControl');
    const toggleBtn = document.querySelector('.ambiance-toggle');

    // 1. Eğer zaten bu ses çalıyorsa DURDUR
    if (currentAudio === audioElement && !audioElement.paused) {
        audioElement.pause();
        element.classList.remove('active');
        toggleBtn.classList.remove('playing');
        currentAudio = null;
        return;
    }

    // 2. Başka bir ses çalıyorsa önce onu sustur
    stopAllSounds();

    // 3. Yeni sesi ÇAL
    if (audioElement) {
        audioElement.volume = volumeControl.value; // Ses seviyesini ayarla
        audioElement.play().catch(e => console.log("Oynatma hatası:", e));

        currentAudio = audioElement;
        element.classList.add('active'); // Kutuyu boya
        toggleBtn.classList.add('playing'); // Ana butonu hareketlendir
    }
}

function stopAllSounds() {
    // Tüm sesleri durdur ve kutuların boyasını sil
    document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0; // Başa sar
    });
    document.querySelectorAll('.sound-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Ses Seviyesi Ayarı (Canlı)
document.getElementById('volumeControl').addEventListener('input', (e) => {
    if (currentAudio) {
        currentAudio.volume = e.target.value;
    }
});