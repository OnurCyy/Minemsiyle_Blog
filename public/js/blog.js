// =========================================
// GLOBAL AYARLAR
// =========================================
const API_URL = "/api/posts";
let allPostsData = [];
let discoveredSeries = new Set();

// =========================================
// 1. TEMA SİSTEMİ
// =========================================
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
if (toggleSwitch) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') toggleSwitch.checked = true;

    toggleSwitch.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}

// =========================================
// 2. YAZILARI ÇEK VE SERİLERİ KEŞFET
// =========================================
async function loadPosts() {
    const grid = document.getElementById("blogGrid");
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        allPostsData = posts.reverse();

        // Gelen yazılardaki serileri keşfet
        allPostsData.forEach(post => {
            if (post.seriesName && post.seriesName.trim() !== "") {
                discoveredSeries.add(post.seriesName.trim());
            }
        });

        // Bulunan serileri filtre çubuğuna buton olarak ekle
        injectSeriesButtons();

        renderPosts(allPostsData);
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="text-align:center; color:red; grid-column:1/-1;">Sunucuya bağlanılamadı. (Server Kapalı)</p>';
    }
}

// =========================================
// 3. OTOMATİK SERİ BUTON EKLEYİCİ
// =========================================
function injectSeriesButtons() {
    const filterBar = document.querySelector('.filter-bar');
    if (!filterBar) return;

    discoveredSeries.forEach(seriesName => {
        // Aynı isimde buton zaten varsa ekleme
        const existingBtns = Array.from(filterBar.children).map(btn => btn.innerText.trim());
        if (existingBtns.includes(seriesName)) return;

        const newBtn = document.createElement('button');
        newBtn.className = 'filter-btn';
        newBtn.onclick = function () { filterPosts(seriesName, this, true); };
        newBtn.innerHTML = `📚 ${seriesName}`;
        filterBar.appendChild(newBtn);
    });
}

// =========================================
// 4. BLOG KARTLARINI EKRANA BAS
// =========================================
function renderPosts(posts) {
    const grid = document.getElementById("blogGrid");

    if (posts.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#888; grid-column:1/-1;">Bu kategoride yazı bulunamadı.</p>';
        return;
    }

    grid.innerHTML = posts.map(post => {
        const date = new Date(post.createdAt || post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const imgUrl = post.cover || post.image || "https://via.placeholder.com/600x400?text=Minemsiyle";

        let excerpt = post.excerpt;
        if (!excerpt || excerpt === "...") {
            excerpt = post.content ? post.content.substring(0, 110) + "..." : "";
        }

        // Serisi varsa kategori yerine seri adını göster
        let catText = post.category || 'Genel';
        if (post.seriesName) {
            catText = `📚 ${post.seriesName} (Bölüm ${post.seriesOrder || 1})`;
        }

        return `
                <article class="blog-card">
                    <a href="/blog/${post._id}" style="text-decoration:none; color:inherit; height:100%; display:flex; flex-direction:column;">
                        <div class="blog-img-wrapper">
                            <img src="${imgUrl}" alt="${post.title}" class="blog-img" onerror="this.src='https://via.placeholder.com/600x400?text=Resim+Yok'">
                        </div>
                        <div class="blog-content">
                            <div style="font-size:0.75rem; color:var(--accent); font-weight:bold; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">
                                ${catText} • ${date}
                            </div>
                            <h3 style="font-size:1.4rem; margin-bottom:12px; line-height:1.3; color:var(--ink); font-weight:700;">${post.title}</h3>
                            <p style="font-size:0.95rem; color:var(--muted); line-height:1.6; margin-bottom:20px; flex:1;">
                                ${excerpt}
                            </p>
                            <span style="font-weight:bold; font-size:0.9rem; color:var(--accent); display:flex; align-items:center; gap:6px;">
                                Okumaya Başla <i class="ph-bold ph-arrow-right"></i>
                            </span>
                        </div>
                    </a>
                </article>`;
    }).join('');
}

// =========================================
// 5. FİLTRELEME (Kategori ve Seri)
// =========================================
function filterPosts(keyword, btn, isSeries = false) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (keyword === 'all') {
        renderPosts(allPostsData);
        return;
    }

    const filtered = allPostsData.filter(post => {
        if (isSeries) {
            // Seri butonuna tıklandıysa sadece o serideki yazıları getir
            return (post.seriesName || "").toLowerCase() === keyword.toLowerCase();
        } else {
            // Normal kategori butonuna tıklandıysa kategoride ara
            return (post.category || "").toLowerCase() === keyword.toLowerCase();
        }
    });

    // Seri filtrelemesinde bölümleri sıraya diz
    if (isSeries) {
        filtered.sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
    }

    renderPosts(filtered);
}

// Sayfa yüklenince yazıları çek
document.addEventListener("DOMContentLoaded", loadPosts);

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
        audioElement.pause();
        element.classList.remove('active');
        toggleBtn.classList.remove('playing');
        currentAudio = null;
        return;
    }

    stopAllSounds();

    if (audioElement) {
        audioElement.volume = volumeControl.value;
        audioElement.play().catch(e => console.log("Oynatma hatası:", e));
        currentAudio = audioElement;
        element.classList.add('active');
        toggleBtn.classList.add('playing');
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
const volCtrl = document.getElementById('volumeControl');
if (volCtrl) volCtrl.addEventListener('input', (e) => {
    if (currentAudio) currentAudio.volume = e.target.value;
});