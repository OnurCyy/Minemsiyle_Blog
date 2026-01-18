/* js/about.js - Sadece Hakkında Sayfası Animasyonları */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Logoya tıklayınca yukarı çıkma
    const logoBtn = document.querySelector('.brand__logo'); // veya .brand
    if (logoBtn) {
        logoBtn.addEventListener('click', (e) => {
            if (logoBtn.getAttribute('href').includes('#top')) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // 2. Fotoğraf Animasyonu (Mümine Hanım'ın fotosu)
    const profileImg = document.querySelector('.profile-frame');
    if (profileImg) {
        profileImg.style.opacity = "0";
        profileImg.style.transform = "translateY(20px)";
        profileImg.style.transition = "all 0.8s ease";

        setTimeout(() => {
            profileImg.style.opacity = "1";
            profileImg.style.transform = "translateY(0)";
        }, 100);
    }
});
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