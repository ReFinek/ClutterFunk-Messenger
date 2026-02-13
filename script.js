// Получаем ссылки на элементы
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');
const imageUpload = document.getElementById('imageUpload');

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

// Обработчики модального окна
closeModal.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);
saveEdit.addEventListener('click', saveEditedMessage);

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        userId: userId,
        text: text,
        timestamp: Date.now(),
        type: 'text'
    };
    
    // Добавляем сообщение в базу данных
    messagesRef.push(message);
    
    // Очищаем поле ввода
    messageInput.value = '';
    messageInput.focus();
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Показываем сообщение о загрузке
    const loadingMessage = {
        userId: userId,
        text: 'Загрузка изображения...',
        timestamp: Date.now(),
        type: 'loading'
    };
    
    const loadingKey = messagesRef.push(loadingMessage).key;
    
    // Загружаем изображение в Firebase Storage
    const storageRef = storage.ref('images/' + Date.now() + '_' + file.name);
    
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Прогресс загрузки
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Можно показать прогресс если нужно
        },
        (error) => {
            console.error('Ошибка загрузки:', error);
            // Удаляем сообщение о загрузке
            messagesRef.child(loadingKey).remove();
            alert('Ошибка загрузки изображения');
        },
        () => {
            // Загрузка завершена
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Создаем сообщение с изображением
                const imageMessage = {
                    userId: userId,
                    imageUrl: downloadURL,
                    timestamp: Date.now(),
                    type: 'image'
                };
                
                // Обновляем сообщение в базе данных
                messagesRef.child(loadingKey).set(imageMessage);
            });
        }
    );
    
    // Очищаем инпут
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
            <div class="message-actions">
                <button class="btn-edit" onclick="editMessage('${messageId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Редактировать
                </button>
                <button class="btn-delete" onclick="deleteMessage('${messageId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Удалить
                </button>
            </div>
        `;
    } else if (message.type === 'image') {
        messageContent = `
            <img src="${escapeHtml(message.imageUrl)}" class="message-image" alt="Изображение">
            <div class="message-time">${timeString}</div>
            <div class="message-actions">
                <button class="btn-edit" onclick="editMessage('${messageId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Редактировать
                </button>
                <button class="btn-delete" onclick="deleteMessage('${messageId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Удалить
                </button>
            </div>
        `;
    } else if (message.type === 'loading') {
        messageContent = `
            <div class="message-text">
                <span class="loading"></span>${escapeHtml(message.text)}
            </div>
        `;
    }
    
    messageElement.innerHTML = messageContent;
    messagesDiv.appendChild(messageElement);
}

function updateMessageInDOM(messageId, message) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        // Удаляем старый контент и добавляем новый
        messageElement.innerHTML = '';
        addMessageToDOM(message, messageId);
        // Заменяем элемент
        const parent = messageElement.parentNode;
        const newElement = parent.lastChild;
        parent.replaceChild(newElement, messageElement);
    }
}

function removeMessageFromDOM(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

function editMessage(messageId) {
    currentEditMessageId = messageId;
    
    // Получаем текущее сообщение
    messagesRef.child(messageId).once('value', (snapshot) => {
        const message = snapshot.val();
        
        if (message && message.type === 'text') {
            editMessageText.value = message.text;
            editModal.classList.add('show');
            editMessageText.focus();
        } else if (message && message.type === 'image') {
            // Для изображения открываем диалог редактирования описания
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

// Защита от XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Автофокус на поле ввода
messageInput.focus();

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});
