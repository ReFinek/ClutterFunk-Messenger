// Firebase конфигурация - ЗАМЕНИ НА СВОИ ДАННЫЕ
const firebaseConfig = {
    apiKey: "AIzaSyCL0lOM0vTuNzC6UOcSOvMrtHaxvafkgdA",
    authDomain: "clutterfunk-87ef9.firebaseapp.com",
    databaseURL: "https://clutterfunk-87ef9-default-rtdb.firebaseio.com",
    projectId: "clutterfunk-87ef9",
    storageBucket: "clutterfunk-87ef9.firebasestorage.app",
    messagingSenderId: "758463626255",
    appId: "1:758463626255:web:58bc383b86ab2a9c3e377a"
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
