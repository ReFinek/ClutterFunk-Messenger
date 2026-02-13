// Получаем ссылки на элементы
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');

// Инициализация Firebase
const database = firebase.database();
const messagesRef = database.ref('messages');

// Генерируем уникальный идентификатор для пользователя
const userId = localStorage.getItem('userId') || 
               'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('userId', userId);

// Отслеживаем статус подключения
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val()) {
        statusDiv.textContent = 'Подключено';
        statusDiv.classList.add('connected');
    } else {
        statusDiv.textContent = 'Отключено';
        statusDiv.classList.remove('connected');
    }
});

// Загружаем историю сообщений
loadMessages();

// Слушаем новые сообщения
messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    addMessageToDOM(message);
    scrollToBottom();
});

// Обработчик отправки сообщения
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        userId: userId,
        text: text,
        timestamp: Date.now(),
        username: 'Пользователь'
    };
    
    // Добавляем сообщение в базу данных
    messagesRef.push(message);
    
    // Очищаем поле ввода
    messageInput.value = '';
    messageInput.focus();
}

function addMessageToDOM(message) {
    const messageElement = document.createElement('div');
    messageElement.className = message.userId === userId ? 'message message-user' : 'message message-other';
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageElement.innerHTML = `
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
}

function loadMessages() {
    messagesRef.limitToLast(50).once('value', (snapshot) => {
        messagesDiv.innerHTML = '<div class="message-system">Загрузка сообщений...</div>';
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            addMessageToDOM(message);
        });
        
        if (messagesDiv.children.length === 1) {
            messagesDiv.innerHTML = '<div class="message-system">Добро пожаловать в Clutterfunk! Начните общение...</div>';
        }
        
        scrollToBottom();
    });
}

function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Автофокус на поле ввода
messageInput.focus();
