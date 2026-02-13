// Получаем ссылки на элементы
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');
const imageUpload = document.getElementById('imageUpload');

// Контекстное меню
const contextMenu = document.getElementById('contextMenu');
const contextEdit = document.getElementById('contextEdit');
const contextDelete = document.getElementById('contextDelete');

// Модальное окно
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const editMessageText = document.getElementById('editMessageText');

// Инициализация Firebase
const database = firebase.database();
const storage = firebase.storage();
const messagesRef = database.ref('messages');

let currentEditMessageId = null;
let contextMenuMessageId = null;

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

// Обработчик отправки сообщения
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Обработчик загрузки изображения
imageUpload.addEventListener('change', handleImageUpload);

// Обработчики контекстного меню
contextEdit.addEventListener('click', () => {
    if (contextMenuMessageId) {
        editMessage(contextMenuMessageId);
        hideContextMenu();
    }
});

contextDelete.addEventListener('click', () => {
    if (contextMenuMessageId) {
        deleteMessage(contextMenuMessageId);
        hideContextMenu();
    }
});

// Обработчики модального окна
closeModal.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);
saveEdit.addEventListener('click', saveEditedMessage);

// Закрытие контекстного меню при клике вне его
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && e.target !== contextMenu) {
        hideContextMenu();
    }
});

// Предотвращение стандартного контекстного меню на сообщениях
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.message')) {
        e.preventDefault();
        const messageElement = e.target.closest('.message');
        const messageId = messageElement.dataset.messageId;
        
        if (messageId) {
            showContextMenu(e.clientX, e.clientY, messageId);
        }
    }
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        userId: userId,
        text: text,
        timestamp: Date.now(),
        type: 'text'
    };
    
    messagesRef.push(message);
    messageInput.value = '';
    messageInput.focus();
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const loadingMessage = {
        userId: userId,
        text: 'Загрузка изображения...',
        timestamp: Date.now(),
        type: 'loading'
    };
    
    const loadingKey = messagesRef.push(loadingMessage).key;
    
    const storageRef = storage.ref('images/' + Date.now() + '_' + file.name);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        null,
        (error) => {
            console.error('Ошибка загрузки:', error);
            messagesRef.child(loadingKey).remove();
            alert('Ошибка загрузки изображения');
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                const imageMessage = {
                    userId: userId,
                    imageUrl: downloadURL,
                    timestamp: Date.now(),
                    type: 'image'
                };
                messagesRef.child(loadingKey).set(imageMessage);
            });
        }
    );
    
    e.target.value = '';
}

function addMessageToDOM(message, messageId) {
    const messageElement = document.createElement('div');
    messageElement.className = message.userId === userId ? 'message message-user' : 'message message-other';
    messageElement.dataset.messageId = messageId;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let messageContent = '';
    
    if (message.type === 'text') {
        messageContent = `
            <div class="message-text">${escapeHtml(message.text)}</div>
            <div class="message-time">${timeString}</div>
        `;
    } else if (message.type === 'image') {
        messageContent = `
            <img src="${escapeHtml(message.imageUrl)}" class="message-image" alt="Изображение">
            <div class="message-time">${timeString}</div>
        `;
    } else if (message.type === 'loading') {
        messageContent = `
            <div class="message-text">
                <span class="loading"></span>${escapeHtml(message.text)}
            </div>
        `;
    }
    
    // Добавляем кнопку меню для всех сообщений
    const menuButton = `
        <button class="menu-btn" onclick="showMessageMenu(event, '${messageId}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
            </svg>
        </button>
    `;
    
    messageElement.innerHTML = messageContent + menuButton;
    messagesDiv.appendChild(messageElement);
}

function updateMessageInDOM(messageId, message) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const parent = messageElement.parentNode;
        const newElement = document.createElement('div');
        newElement.className = messageElement.className;
        newElement.dataset.messageId = messageId;
        
        const time = new Date(message.timestamp);
        const timeString = time.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let messageContent = '';
        
        if (message.type === 'text') {
            messageContent = `
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time">${timeString}</div>
            `;
        } else if (message.type === 'image') {
            messageContent = `
                <img src="${escapeHtml(message.imageUrl)}" class="message-image" alt="Изображение">
                <div class="message-time">${timeString}</div>
            `;
        }
        
        const menuButton = `
            <button class="menu-btn" onclick="showMessageMenu(event, '${messageId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>
        `;
        
        newElement.innerHTML = messageContent + menuButton;
        parent.replaceChild(newElement, messageElement);
    }
}

function removeMessageFromDOM(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

function showMessageMenu(event, messageId) {
    event.stopPropagation();
    showContextMenu(event.clientX, event.clientY, messageId);
}

function showContextMenu(x, y, messageId) {
    contextMenuMessageId = messageId;
    contextMenu.style.display = 'block';
    contextMenu.style.left = (x + 5) + 'px';
    contextMenu.style.top = (y + 5) + 'px';
    
    // Проверка выхода за границы экрана
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
    contextMenuMessageId = null;
}

function editMessage(messageId) {
    currentEditMessageId = messageId;
    
    messagesRef.child(messageId).once('value', (snapshot) => {
        const message = snapshot.val();
        
        if (message && message.type === 'text') {
            editMessageText.value = message.text;
            editModal.classList.add('show');
            editMessageText.focus();
        } else if (message && message.type === 'image') {
            const newDescription = prompt('Введите новое описание для изображения:', message.text || '');
            if (newDescription !== null) {
                messagesRef.child(messageId).update({
                    text: newDescription
                });
            }
        }
    });
}

function deleteMessage(messageId) {
    if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        messagesRef.child(messageId).remove();
    }
}

function saveEditedMessage() {
    const newText = editMessageText.value.trim();
    if (!newText) return;
    
    if (currentEditMessageId) {
        messagesRef.child(currentEditMessageId).update({
            text: newText,
            edited: true
        });
    }
    
    closeEditModal();
}

function closeEditModal() {
    editModal.classList.remove('show');
    editMessageText.value = '';
    currentEditMessageId = null;
}

function loadMessages() {
    messagesRef.limitToLast(50).once('value', (snapshot) => {
        messagesDiv.innerHTML = '<div class="message-system">Загрузка сообщений...</div>';
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            addMessageToDOM(message, childSnapshot.key);
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

messageInput.focus();

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});
