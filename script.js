// Firebase конфигурация - ЗАМЕНИ НА СВОИ ДАННЫЕ
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('messages');

// DOM элементы
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');

// Загрузка сообщений при старте
loadMessages();

// Отправка сообщения
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText === '') return;
    
    // Генерация уникального ID для сообщения
    const messageId = Date.now().toString();
    const timestamp = Date.now();
    
    // Сохранение сообщения в Firebase
    messagesRef.child(messageId).set({
        text: messageText,
        timestamp: timestamp
    });
    
    // Очистка поля ввода
    messageInput.value = '';
    messageInput.focus();
}

function loadMessages() {
    // Загрузка последних 50 сообщений
    messagesRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
        const messageData = snapshot.val();
        addMessageToDOM(messageData.text, messageData.timestamp);
    });
}

function addMessageToDOM(text, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Форматирование времени
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
