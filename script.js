// Supabase configuration
const SUPABASE_URL = 'https://jhfgxdjkoiayifljhcfk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZmd4ZGprb2lheWlmbGpoY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDc4MjgsImV4cCI6MjA4NjU4MzgyOH0.9-KE1rWCykQ0v-VmnE0d2syyjmfWedIfM9ZTsS5UWG4';

// Initialize Supabase client
const supabase = supabase.create({
    url: SUPABASE_URL,
    key: SUPABASE_KEY
});

// DOM Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Real-time subscription
let subscription = null;

// Initialize the chat
async function initChat() {
    // Load existing messages
    await loadMessages();
    
    // Subscribe to real-time updates
    subscribeToMessages();
    
    // Setup event listeners
    setupEventListeners();
}

// Load messages from database
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            displayMessages(data);
        } else {
            messagesContainer.innerHTML = '<div class="loading">Пока нет сообщений. Будь первым!</div>';
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Не удалось загрузить сообщения. Попробуйте позже.');
    }
}

// Subscribe to real-time message updates
function subscribeToMessages() {
  // Удали старую подписку, если она есть
  if (subscription) {
    supabase.removeChannel(subscription);
  }
.subscribe((status) => {
  console.log('Подписка статус:', status);
  if (status === 'SUBSCRIBED') {
    console.log('Успешно подписано на сообщения!');
  }
});
  subscription = supabase
    .channel('messages') // Просто имя канала, не нужно public:messages
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, (payload) => {
      console.log('Получено новое сообщение:', payload);
      addMessageToDOM(payload.new);
    })
    .subscribe((status) => {
      console.log('Статус подписки:', status);
    });
}

// Display messages in the chat
function displayMessages(messages) {
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        addMessageToDOM(message);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Add single message to DOM
function addMessageToDOM(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageElement.innerHTML = `
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="message-meta">
            <span class="message-user">${escapeHtml(message.username || 'Аноним')}</span>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Send message
async function sendMessage() {
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    console.log('Отправляю сообщение:', { content, username });
    sendButton.disabled = true;
    sendButton.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
    
    try {
        // Generate random username
        const username = generateRandomUsername();
        
        const { data, error } = await supabase
            .from('messages')
            .insert([
                { 
                    content: content,
                    username: username
                }
            ])
            .select();
        
        if (error) throw error;
        
        // Clear input
        messageInput.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Не удалось отправить сообщение. Попробуйте еще раз.');
    } finally {
        // Re-enable button
        sendButton.disabled = false;
        sendButton.innerHTML = '<span class="send-icon">➤</span>';
    }
}

// Generate random username
function generateRandomUsername() {
    const adjectives = ['Быстрый', 'Умный', 'Веселый', 'Тихий', 'Громкий', 'Смелый', 'Хитрый', 'Добрый'];
    const nouns = ['Пингвин', 'Кот', 'Слон', 'Лиса', 'Волк', 'Медведь', 'Заяц', 'Енот'];
    const numbers = Math.floor(Math.random() * 900) + 100;
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}${numbers}`;
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Auto-resize textarea (optional enhancement)
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    });
}

// Scroll to bottom of messages
function scrollToBottom() {
    setTimeout(() => {
        const wrapper = document.querySelector('.messages-wrapper');
        wrapper.scrollTop = wrapper.scrollHeight;
    }, 100);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    messagesContainer.insertBefore(errorDiv, messagesContainer.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize chat on page load
document.addEventListener('DOMContentLoaded', initChat);

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    if (subscription) {
        subscription.unsubscribe();
    }
});
