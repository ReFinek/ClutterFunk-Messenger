// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyCL0lOM0vTuNzC6UOcSOvMrtHaxvafkgdA",
  authDomain: "clutterfunk-87ef9.firebaseapp.com",
  databaseURL: "https://clutterfunk-87ef9-default-rtdb.firebaseio.com",
  projectId: "clutterfunk-87ef9",
  storageBucket: "clutterfunk-87ef9.firebasestorage.app",
  messagingSenderId: "758463626255",
  appId: "1:758463626255:web:58bc383b86ab2a9c3e377a",
  measurementId: "G-JXD5TWH6YF"
};

// Imgur Client ID (публичный, не требует авторизации)
const IMGUR_CLIENT_ID = '28aaa2e823b03b1';

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('messages');

// DOM элементы
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messages');
const imageButton = document.getElementById('imageButton');
const imageInput = document.getElementById('imageInput');

// Флаг для отслеживания позиции прокрутки
let isUserAtBottom = true;

// Загрузка сообщений при старте
loadMessages();

// Отслеживание прокрутки
messagesContainer.addEventListener('scroll', () => {
    const scrollPosition = messagesContainer.scrollTop + messagesContainer.clientHeight;
    const scrollHeight = messagesContainer.scrollHeight;
    isUserAtBottom = scrollHeight - scrollPosition <= 50;
});

// Отправка сообщения
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Обработка изображений
imageButton.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type.match('image.*')) {
        const uploadButton = document.getElementById('sendButton');
        const originalText = uploadButton.textContent;
        
        uploadButton.textContent = 'Загрузка...';
        uploadButton.disabled = true;
        
        try {
            const imageUrl = await uploadToImgur(file);
            await sendMessageAsImage(imageUrl);
        } catch (error) {
            alert('Ошибка загрузки: ' + error.message);
        } finally {
            uploadButton.textContent = originalText;
            uploadButton.disabled = false;
            imageInput.value = '';
        }
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
        type: 'text',
        text: messageText,
        timestamp: timestamp
    });
    
    // Очистка поля ввода
    messageInput.value = '';
    messageInput.focus();
}

async function sendMessageAsImage(imageUrl) {
    const messageId = Date.now().toString();
    const timestamp = Date.now();
    
    // Сохранение изображения в Firebase
    messagesRef.child(messageId).set({
        type: 'image',
        imageUrl: imageUrl,
        timestamp: timestamp
    });
}

function loadMessages() {
    // Загрузка последних 50 сообщений
    messagesRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
        const messageData = snapshot.val();
        addMessageToDOM(messageData);
    });
}

function addMessageToDOM(messageData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageData.type === 'image' ? 'image-message' : ''}`;
    
    // Форматирование времени
    const date = new Date(messageData.timestamp);
    const timeString = date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (messageData.type === 'text') {
        messageDiv.innerHTML = `
            <div class="message-content">${escapeHtml(messageData.text)}</div>
            <div class="message-time">${timeString}</div>
        `;
    } else if (messageData.type === 'image') {
        messageDiv.innerHTML = `
            <img src="${messageData.imageUrl}" class="message-image" alt="Сообщение с изображением" 
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'message-error\'>Изображение недоступно</div><div class=\'message-time\'>${timeString}</div>'">
            <div class="message-time">${timeString}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    
    // Автоматическая прокрутка, если пользователь был внизу
    if (isUserAtBottom) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
    }
}

// Загрузка изображения на Imgur
async function uploadToImgur(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const base64Image = event.target.result.split(',')[1]; // Убираем префикс 
            
            try {
                const response = await fetch('https://api.imgur.com/3/image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: base64Image,
                        type: 'base64'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resolve(data.data.link);
                } else {
                    reject(new Error(data.data.error || 'Неизвестная ошибка'));
                }
            } catch (error) {
                reject(new Error('Ошибка сети: ' + error.message));
            }
        };
        
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
    });
}

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
