// Конфигурация Firebase – замените на свои данные из консоли Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "clutterfunk-chat.firebaseapp.com",
    projectId: "clutterfunk-chat",
    storageBucket: "clutterfunk-chat.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Элементы DOM
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userNameInput = document.getElementById('user-name');

// Вспомогательная функция для форматирования времени
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate(); // Firestore Timestamp -> Date
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Создание HTML элемента сообщения
function createMessageElement(doc) {
    const data = doc.data();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.dataset.id = doc.id;

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('meta');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = data.userName?.trim() || 'Аноним';

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('time');
    timeSpan.textContent = formatTime(data.createdAt);

    metaDiv.appendChild(nameSpan);
    metaDiv.appendChild(timeSpan);

    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    textDiv.textContent = data.text;

    messageDiv.appendChild(metaDiv);
    messageDiv.appendChild(textDiv);

    return messageDiv;
}

// Загружаем сообщения в реальном времени (последние 50, сортировка по дате)
const messagesQuery = db.collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(50);

messagesQuery.onSnapshot((snapshot) => {
    // Очищаем контейнер
    messagesContainer.innerHTML = '';

    // Перебираем документы (они идут от новых к старым)
    // Чтобы выводить в хронологическом порядке (сверху старые, снизу новые),
    // собираем массив и вставляем в обратном порядке.
    const docs = [];
    snapshot.forEach(doc => docs.push(doc));

    // Сортируем по возрастанию времени (старые сверху)
    docs.sort((a, b) => {
        const ta = a.data().createdAt;
        const tb = b.data().createdAt;
        if (!ta || !tb) return 0;
        return ta.toDate() - tb.toDate();
    });

    docs.forEach(doc => {
        messagesContainer.appendChild(createMessageElement(doc));
    });

    // Автоскролл вниз (к последнему сообщению)
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}, (error) => {
    console.error("Ошибка загрузки сообщений:", error);
});

// Отправка сообщения
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = messageInput.value.trim();
    if (!text) return;

    const userName = userNameInput.value.trim() || 'Аноним';

    try {
        await db.collection('messages').add({
            text: text,
            userName: userName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Очистить поле сообщения, имя оставляем (можно сохранять в localStorage при желании)
        messageInput.value = '';
        // Фокус остаётся на поле ввода для удобства
        messageInput.focus();
    } catch (error) {
        console.error("Ошибка отправки:", error);
        alert("Не удалось отправить сообщение. Попробуйте позже.");
    }
});
