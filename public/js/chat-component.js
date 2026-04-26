// =========================================
// 1. STİLLER (CSS)
// =========================================
const chatStyle = document.createElement('style');
chatStyle.innerHTML = `

    /* ========= CHAT WRAPPER ========= */
    .chat-wrapper {
        width: 350px;
        height: 480px;
        background: #18181b;
        border: 1px solid #2e2e33;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 85px;
        right: 20px;
        z-index: 9999;
        box-shadow: 0 15px 35px rgba(0,0,0,0.6);
        font-family: 'Outfit', sans-serif;
        overflow: hidden;
    }

    /* ========= CHAT HEADER ========= */
    .chat-header {
        background: #202024;
        padding: 15px;
        border-bottom: 1px solid #2e2e33;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #d4a373;
    }

    .chat-info {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
    }

    /* Canlı gösterge noktası */
    .pulse-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: chatPulse 2s infinite;
    }

    @keyframes chatPulse {
        0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70%  { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* ========= CHAT BODY ========= */
    .chat-body {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #18181b;
    }

    /* ========= MESAJ SATIRI ========= */
    .message-item {
        position: relative;
        padding: 8px 10px;
        border-radius: 12px;
        transition: background 0.2s ease;
    }

    .message-item:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    /* ========= MESAJ İÇERİĞİ ========= */
    .msg-content {
        background: #27272a;
        padding: 10px 14px;
        border-radius: 18px;
        border-top-left-radius: 4px;
        max-width: 85%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        min-width: 60px;
    }

    .msg-text {
        margin: 0;
        font-size: 0.9rem;
        color: #e4e4e7;
        line-height: 1.5;
        word-break: break-word;
    }

    .edited-mark {
        font-size: 0.65rem;
        color: #71717a;
        font-style: italic;
        margin-left: 5px;
    }

    /* ========= MESAJ SAATİ ========= */
    .msg-time {
        font-size: 0.65rem;
        color: #71717a;
        float: right;
        margin-top: 4px;
        margin-left: 8px;
        font-weight: 500;
    }

    /* ========= AKSİYON MENÜSÜ (Düzenle / Sil) ========= */
    .msg-actions {
        position: absolute;
        right: 10px;
        top: 8px;
        display: none;
        gap: 5px;
        background: #202024;
        padding: 4px;
        border-radius: 8px;
        border: 1px solid #3f3f46;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        z-index: 10;
    }

    .message-item:hover .msg-actions {
        display: flex;
        animation: chatFadeIn 0.2s ease;
    }

    @keyframes chatFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
    }

    /* Aksiyon butonları — chat-action-btn (adminPanel ile çakışmayı önler) */
    .chat-action-btn {
        background: none;
        border: none;
        color: #a1a1aa;
        cursor: pointer;
        font-size: 1rem;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s;
    }

    .chat-action-btn:hover {
        background: rgba(212, 163, 115, 0.1);
        color: #d4a373;
    }

    .chat-delete-btn:hover {
        background: rgba(239, 68, 68, 0.1) !important;
        color: #ef4444 !important;
    }

    /* ========= CHAT FOOTER ========= */
    .chat-footer {
        padding: 15px;
        border-top: 1px solid #2e2e33;
        display: flex;
        gap: 10px;
        background: #202024;
    }

    #chat-input {
        flex: 1;
        background: #27272a;
        border: 1px solid #2e2e33;
        border-radius: 10px;
        padding: 10px;
        color: white;
        outline: none;
        font-family: inherit;
    }

    #chat-input:focus {
        border-color: #d4a373;
    }

    #chat-send-btn {
        background: #d4a373;
        border: none;
        border-radius: 10px;
        width: 45px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.3s;
        color: #18181b;
        font-size: 1.1rem;
    }

    #chat-send-btn:hover {
        background: #eac094;
        transform: scale(1.05);
    }

    /* ========= CHAT AÇ/KAPA BUTONU ========= */
    #chat-toggle-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9998;
        background: #d4a373;
        border: none;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        color: #18181b;
        cursor: pointer;
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        transition: transform 0.3s, background 0.3s;
    }

    #chat-toggle-btn:hover {
        background: #eac094;
        transform: scale(1.1);
    }
`;
document.head.appendChild(chatStyle);

// =========================================
// 2. HTML YAPISI
// =========================================
const chatHTML = `
<div id="chat-container" class="chat-wrapper" style="display:none;">

    <!-- ========= Başlık ========= -->
    <div class="chat-header">
        <div class="chat-info">
            <div class="pulse-dot"></div>
            <i class="ph-bold ph-chats"></i>
            <span>CANLI SOHBET</span>
        </div>
        <button onclick="toggleChat()" style="background:none; border:none; color:#71717a; cursor:pointer; font-size:1.2rem;">
            <i class="ph-bold ph-x"></i>
        </button>
    </div>

    <!-- ========= Mesaj Listesi ========= -->
    <div id="chat-messages" class="chat-body"></div>

    <!-- ========= Mesaj Gönder ========= -->
    <div class="chat-footer">
        <input type="text" id="chat-input" placeholder="Mesajını yaz...">
        <button id="chat-send-btn"><i class="ph-bold ph-paper-plane-right"></i></button>
    </div>

</div>

<!-- ========= Aç/Kapa Butonu ========= -->
<button id="chat-toggle-btn" onclick="toggleChat()">
    <i class="ph-bold ph-chat-circle-dots"></i>
</button>
`;
document.body.insertAdjacentHTML('beforeend', chatHTML);

// =========================================
// 3. SOCKET BAĞLANTISI
// =========================================
const socket = io();

// =========================================
// 4. PANEL AÇ / KAPA
// =========================================
window.toggleChat = () => {
    const chat = document.getElementById('chat-container');
    const btn = document.getElementById('chat-toggle-btn');
    if (!chat || !btn) return;

    if (chat.style.display === 'none') {
        chat.style.display = 'flex';
        btn.style.display = 'none';
    } else {
        chat.style.display = 'none';
        btn.style.display = 'flex';
    }
};

// =========================================
// 5. MESAJ GÖNDERME
// =========================================

// Gönder butonuna tıklayınca
document.getElementById('chat-send-btn').onclick = () => sendChatMessage();

// Enter tuşuna basınca
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// Mesaj gönder
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const userData = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');

    // Avatar belirle
    const finalAvatar = userData?.avatar || userData?.profileImage ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.username || 'Misafir')}`;

    socket.emit('sendMessage', {
        sender: userData ? userData.username : 'Misafir',
        profilePic: finalAvatar,
        text: text,
        token: token || null
    });

    input.value = '';
}

// =========================================
// 6. MESAJ EKRANA BASMA
// =========================================
function displayMessage(data) {
    const chatBody = document.getElementById('chat-messages');
    if (!chatBody) return;

    const userData = JSON.parse(localStorage.getItem('user'));
    const isMine = userData && userData.username === data.sender;

    // Mesaj saatini formatla
    const time = data.date
        ? new Date(data.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // Mesaj ID'si — yeni mesajda _id gelmeyebilir, geçici ID kullan
    const msgId = data._id || data.id || `temp-${Date.now()}`;

    // Aksiyon menüsü sadece kendi mesajlarında gösterilir
    const actionMenu = isMine ? `
        <div class="msg-actions">
            <button class="chat-action-btn" onclick="editMsg('${msgId}')" title="Düzenle">
                <i class="ph ph-pencil-simple"></i>
            </button>
            <button class="chat-action-btn chat-delete-btn" onclick="deleteMsg('${msgId}')" title="Sil">
                <i class="ph ph-trash"></i>
            </button>
        </div>` : '';

    chatBody.innerHTML += `
        <div class="message-item" id="msg-${msgId}">
            <div style="display:flex; gap:12px; align-items:flex-start;">
                <img src="${data.profilePic}"
                    style="width:36px; height:36px; border-radius:10px; border:1.5px solid rgba(212,163,115,0.3); object-fit:cover;"
                    onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.sender || 'U')}'">
                <div class="msg-content">
                    <span style="font-size:0.75rem; font-weight:800; color:#d4a373;">${data.sender}</span>
                    <p class="msg-text" id="text-${msgId}">${data.text}</p>
                    <div style="width:100%; overflow:hidden;">
                        <span class="msg-time">${time}</span>
                    </div>
                </div>
            </div>
            ${actionMenu}
        </div>`;

    chatBody.scrollTop = chatBody.scrollHeight;
}

// =========================================
// 7. SOCKET OLAYLARI
// =========================================

// Önceki mesajları yükle
socket.on('previousMessages', (messages) => {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    messages.forEach(msg => displayMessage(msg));
});

// Yeni mesaj geldi
socket.on('receiveMessage', (data) => displayMessage(data));

// Mesaj silindi
socket.on('messageDeleted', (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.remove();
});

// Mesaj düzenlendi
socket.on('messageEdited', (data) => {
    const el = document.getElementById(`text-${data.id}`);
    if (el) {
        el.innerText = data.newText;
        if (!el.innerHTML.includes('edited-mark')) {
            el.innerHTML += ' <span class="edited-mark">(düzenlendi)</span>';
        }
    }
});

// =========================================
// 8. MESAJ İŞLEMLERİ (Sil / Düzenle)
// =========================================

// Mesaj sil
window.deleteMsg = (id) => {
    if (confirm("Bu mesajı silmek istediğine emin misin?")) {
        socket.emit('deleteMessage', id);
    }
};

// Mesaj düzenle
window.editMsg = (id) => {
    const textEl = document.getElementById(`text-${id}`);
    if (!textEl) return;
    const oldText = textEl.innerText.replace('(düzenlendi)', '').trim();
    const newText = prompt("Mesajı düzenle:", oldText);
    if (newText && newText.trim() !== oldText) {
        socket.emit('editMessage', { id: id, newText: newText.trim() });
    }
};