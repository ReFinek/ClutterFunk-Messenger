// Элементы
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');
const actionsMenu = document.getElementById('actionsMenu');
const actionEdit = document.getElementById('actionEdit');
const actionDelete = document.getElementById('actionDelete');

// Создаем оверлей
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

// Firebase
const database = firebase.database();
const messagesRef = database.ref('messages');

let selectedMessageId = null;
let editingMessageId = null;

// Генерируем уникальный идентификатор пользователя
const userId = localStorage.getItem('userId') || 
               'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('userId', userId);

// Статус подключения
database.ref('.info/connected').on('value', (snapshot) => {
    statusDiv.textContent = snapshot.val() ? 'Онлайн' : 'Оффлайн';
    statusDiv.classList.toggle('connected', snapshot.val());
});

// Загрузка сообщений
loadMessages();

// Слушатели новых сообщений
messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    addMessageToDOM(message, snapshot.key);
    scrollToBottom();
});

messagesRef.on('child_changed', (snapshot) => {
    const messageId = snapshot.key;
    const message = snapshot.val();
    updateMessageInDOM(messageId, message);
});

messagesRef.on('child_removed', (snapshot) => {
    const messageId = snapshot.key;
    removeMessageFromDOM(messageId);
});

// Отправка сообщения
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Меню действий
overlay.addEventListener('click', hideActionsMenu);
actionEdit.addEventListener('click', handleEdit);
actionDelete.addEventListener('click', handleDelete);

// Запрет стандартного контекстного меню на сообщениях
messagesDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    if (editingMessageId) {
        // Режим редактирования
        messagesRef.child(editingMessageId).update({
            text: text,
            edited: true,
            editedAt: Date.now()
        });
        editingMessageId = null;
        sendButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        `;
    } else {
        // Новое сообщение
        const message = {
            userId: userId,
            text: text,
            timestamp: Date.now(),
            type: 'text'
        };
        messagesRef.push(message);
    }
    
    messageInput.value = '';
    messageInput.placeholder = 'Сообщение';
    messageInput.focus();
}

function addMessageToDOM(message, messageId) {
    const messageElement = document.createElement('div');
    messageElement.className = message.userId === userId ? 'message message-user' : 'message message-other';
    messageElement.dataset.messageId = messageId;
    
    // Обработчик клика на сообщение
    messageElement.addEventListener('click', (e) => {
        if (editingMessageId) return;
        showActionsMenu(messageId, e);
    });
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let timeDisplay = timeString;
    if (message.edited) {
        timeDisplay += ' ✏️';
    }
    
    messageElement.innerHTML = `
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-time">${timeDisplay}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
}

function updateMessageInDOM(messageId, message) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let timeDisplay = timeString;
    if (message.edited) {
        timeDisplay += ' ✏️';
    }
    
    messageElement.querySelector('.message-text').textContent = message.text;
    messageElement.querySelector('.message-time').textContent = timeDisplay;
}

function removeMessageFromDOM(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

function showActionsMenu(messageId, event) {
    selectedMessageId = messageId;
    
    // Позиционируем меню рядом с сообщением
    const messageElement = event.currentTarget;
    const rect = messageElement.getBoundingClientRect();
    
    actionsMenu.style.left = '50%';
    actionsMenu.style.transform = 'translateX(-50%)';
    actionsMenu.classList.add('show');
    overlay.classList.add('show');
}

function hideActionsMenu() {
    actionsMenu.classList.remove('show');
    overlay.classList.remove('show');
    selectedMessageId = null;
}

function handleEdit() {
    if (!selectedMessageId) return;
    
    messagesRef.child(selectedMessageId).once('value', (snapshot) => {
        const message = snapshot.val();
        
        if (message && message.type === 'text') {
            // Входим в режим редактирования
            editingMessageId = selectedMessageId;
            messageInput.value = message.text;
            messageInput.placeholder = 'Редактирование...';
            messageInput.focus();
            
            // Меняем иконку кнопки
            sendButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            
            hideActionsMenu();
        }
    });
}

function handleDelete() {
    if (!selectedMessageId) return;
    
    if (confirm('Удалить сообщение?')) {
        messagesRef.child(selectedMessageId).remove();
    }
    
    hideActionsMenu();
}

function loadMessages() {
    messagesRef.limitToLast(50).once('value', (snapshot) => {
        messagesDiv.innerHTML = '<div class="message-system">Загрузка...</div>';
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            addMessageToDOM(message, childSnapshot.key);
        });
        
        if (messagesDiv.children.length === 1) {
            messagesDiv.innerHTML = '<div class="message-system">Добро пожаловать в Clutterfunk! Напишите первое сообщение 👋</div>';
        }
        
        scrollToBottom();
    });
}

function scrollToBottom() {
    setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 50);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Фокус на поле ввода при загрузке
setTimeout(() => {
    messageInput.focus();
}, 100);
