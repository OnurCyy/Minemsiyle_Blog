/* =========================================
   thema.js - SADECE TIKLAMA VE SENKRONİZASYON
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const themeBtn = document.getElementById("themeToggle");

    // Eğer sayfada buton yoksa çık
    if (!themeBtn) return;

    // --- BUTON TIKLAMA OLAYI ---
    // (Clone işlemi event çakışmalarını temizler)
    const cleanBtn = themeBtn.cloneNode(true);
    themeBtn.parentNode.replaceChild(cleanBtn, themeBtn);

    cleanBtn.addEventListener("click", () => {
        // 1. Mevcut durum ne? (Sadece <html> etiketine bakıyoruz)
        const currentTheme = document.documentElement.getAttribute("data-theme");

        // 2. Yeni tema ne olacak?
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        // 3. HTML etiketine uygula (Görüntü değişsin)
        document.documentElement.setAttribute("data-theme", newTheme);

        // 4. Hafızaya yaz (Diğer sayfalar hatırlasın)
        localStorage.setItem("theme", newTheme);
    });
});