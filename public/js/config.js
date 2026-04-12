// config.js
const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

// API_BASE_URL'yi herkesin (diğer dosyaların) erişebileceği şekilde global (window objesine) tanımlıyoruz
window.API_BASE_URL = isLocalhost ? 'http://localhost:5000' : 'https://api.minemsiyle.com';