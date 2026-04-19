// 1. STİLLER (CSS) - TAMİR EDİLMİŞ VERSİYON
const chatStyle = document.createElement('style');
chatStyle.innerHTML = `
    .chat-wrapper {
        width: 350px; height: 480px; background: #18181b; border: 1px solid #2e2e33;
        border-radius: 20px; display: flex; flex-direction: column;
        position: fixed; bottom: 85px; right: 20px; z-index: 9999;
        box-shadow: 0 15px 35px rgba(0,0,0,0.6); font-family: 'Outfit', sans-serif;
        overflow: hidden; /* KENARLARIN DIŞARI TAŞMASINI ENGELLER */
    }
    .chat-header {
        background: #202024; padding: 15px; border-bottom: 1px solid #2e2e33;
        display: flex; justify-content: space-between; align-items: center; color: #d4a373;
    }
    .chat-info { display: flex; align-items: center; gap: 10px; font-weight: 700; }
    .pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } }
    
    .chat-body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: #18181b; }
    
    .message-item {
        position: relative;
        padding: 8px 10px;
        transition: background 0.2s ease;
        border-radius: 12px;
    }
    .message-item:hover { background: rgba(255, 255, 255, 0.03); }

    /* AKSİYON MENÜSÜ - SAĞ ÜSTE VE YERİNE SABİTLENDİ */
    .msg-actions {
        position: absolute;
        right: 10px; /* SAĞA YANAŞTIRILDI */
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
        /* Mesaj Saati Stili */
    .msg-time {
        font-size: 0.65rem;
        color: #71717a;
        float: right;
        margin-top: 4px;
        margin-left: 8px;
        font-weight: 500;
    }

    /* Mesaj içeriğinin saati düzgün hizalaması için */
    .msg-content {
        display: flex;
        flex-direction: column;
        min-width: 60px; /* Çok kısa mesajlarda saat taşmasın */
    }
    .message-item:hover .msg-actions { display: flex; animation: fadeIn 0.2s ease; }

    .action-btn {
        background: none; border: none; color: #a1a1aa;
        cursor: pointer; font-size: 1rem; width: 28px; height: 28px;
        border-radius: 6px; display: flex; align-items: center; justify-content: center;
        transition: 0.2s;
    }
    .action-btn:hover { background: rgba(212, 163, 115, 0.1); color: #d4a373; }
    .delete-btn:hover { background: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; }

    .msg-content {
        background: #27272a;
        padding: 10px 14px;
        border-radius: 18px;
        border-top-left-radius: 4px;
        max-width: 85%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .msg-text { margin: 0; font-size: 0.9rem; color: #e4e4e7; line-height: 1.5; word-break: break-word; }
    .edited-mark { font-size: 0.65rem; color: #71717a; font-style: italic; margin-left: 5px; }
    
    .chat-footer { padding: 15px; border-top: 1px solid #2e2e33; display: flex; gap: 10px; background: #202024; }
    #chat-input { flex: 1; background: #27272a; border: 1px solid #2e2e33; border-radius: 10px; padding: 10px; color: white; outline: none; }
    #send-btn { background: #d4a373; border: none; border-radius: 10px; width: 45px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; }

    #chat-toggle-btn {
        position: fixed; bottom: 20px; right: 20px; z-index: 9998;
        background: #d4a373; border: none; width: 60px; height: 60px;
        border-radius: 50%; color: #18181b; cursor: pointer; font-size: 1.8rem;
        display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0,0,0,0.4);
    }
`;
document.head.appendChild(chatStyle);

// 2. YAPI (HTML)
const chatHTML = `
<div id="chat-container" class="chat-wrapper" style="display: none;">
    <div class="chat-header">
        <div class="chat-info">
            <div class="pulse-dot"></div> 
            <i class="ph-bold ph-chats"></i> 
            <span>CANLI SOHBET</span>
        </div>
        <button onclick="toggleChat()" style="background:none; border:none; color:#71717a; cursor:pointer;"><i class="ph-bold ph-x"></i></button>
    </div>
    <div id="chat-messages" class="chat-body"></div>
    <div class="chat-footer">
        <input type="text" id="chat-input" placeholder="Mesajını yaz...">
        <button id="send-btn"><i class="ph-bold ph-paper-plane-right"></i></button>
    </div>
</div>
<button id="chat-toggle-btn" onclick="toggleChat()">
    <i class="ph-bold ph-chat-circle-dots"></i>
</button>
`;
document.body.insertAdjacentHTML('beforeend', chatHTML);

// 3. JS MOTORU
const socket = io();

window.toggleChat = () => {
    const chat = document.getElementById('chat-container');
    const btn = document.getElementById('chat-toggle-btn');
    if (chat.style.display === 'none') {
        chat.style.display = 'flex';
        btn.style.display = 'none';
    } else {
        chat.style.display = 'none';
        btn.style.display = 'flex';
    }
};

document.getElementById('send-btn').onclick = () => {
    const input = document.getElementById('chat-input');
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!input.value.trim()) return;
    const finalAvatar = (userData && userData.avatar) ? userData.avatar :
        (userData && userData.profileImage ? userData.profileImage : 'https://ui-avatars.com/api/?name=User');
    socket.emit('sendMessage', { sender: userData ? userData.username : 'Misafir', profilePic: finalAvatar, text: input.value });
    input.value = '';
};

document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('send-btn').click(); });

function displayMessage(data) {
    const chatBody = document.getElementById('chat-messages');
    const userData = JSON.parse(localStorage.getItem('user'));
    const isMine = userData && userData.username === data.sender;

    // Tarih objesini saat:dakika formatına çevir (örn: 12:45)
    const time = data.date ? new Date(data.date).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    }) : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const actionMenu = isMine ? `
        <div class="msg-actions">
            <button class="action-btn" onclick="editMsg('${data._id}')" title="Düzenle"><i class="ph ph-pencil-simple"></i></button>
            <button class="action-btn delete-btn" onclick="deleteMsg('${data._id}')" title="Sil"><i class="ph ph-trash"></i></button>
        </div>` : '';

    chatBody.innerHTML += `
        <div class="message-item" id="msg-${data._id}">
            <div style="display:flex; gap:12px; align-items: flex-start;">
                <img src="${data.profilePic}" style="width:36px; height:36px; border-radius:10px; border: 1.5px solid rgba(212, 163, 115, 0.3); object-fit: cover;">
                <div class="msg-content">
                    <span class="msg-sender" style="font-size:0.75rem; font-weight:800; color:#d4a373;">${data.sender}</span>
                    <p class="msg-text" id="text-${data._id}">${data.text}</p>
                    <div style="width: 100%; overflow: hidden;">
                        <span class="msg-time">${time}</span>
                    </div>
                    ${actionMenu}
                </div>
            </div>
        </div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
}

socket.on('previousMessages', (messages) => { document.getElementById('chat-messages').innerHTML = ''; messages.forEach(msg => displayMessage(msg)); });
socket.on('receiveMessage', (data) => displayMessage(data));
socket.on('messageDeleted', (id) => { const el = document.getElementById(`msg-${id}`); if (el) el.remove(); });
socket.on('messageEdited', (data) => {
    const el = document.getElementById(`text-${data.id}`);
    if (el) { el.innerText = data.newText; if (!el.innerHTML.includes('edited-mark')) el.innerHTML += ' <span class="edited-mark">(düzenlendi)</span>'; }
});

window.deleteMsg = (id) => { if (confirm("Bu mesajı silmek istediğine emin misin?")) socket.emit('deleteMessage', id); };
window.editMsg = (id) => {
    const textEl = document.getElementById(`text-${id}`);
    const oldText = textEl.innerText.replace('(düzenlendi)', '').trim();
    const newText = prompt("Mesajı düzenle:", oldText);
    if (newText && newText !== oldText) socket.emit('editMessage', { id: id, newText: newText });
};