let ws;
let typingTimeout;
let isTyping = false;

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const userCount = document.getElementById('userCount');
const connectionStatus = document.getElementById('connectionStatus');
const typingIndicator = document.getElementById('typingIndicator');

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'system':
          addSystemMessage(data.message, data.timestamp);
          break;
        case 'chat':
          addChatMessage(data.sender, data.message, data.timestamp);
          break;
        case 'userCount':
          updateUserCount(data.count);
          break;
        case 'typing':
          handleTypingIndicator(data.sender, data.isTyping);
          break;
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'chat',
      message: message
    }));
    
    messageInput.value = '';
    stopTyping();
  }
}

function addSystemMessage(message, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system';
  messageDiv.textContent = message;
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

function addChatMessage(sender, message, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message chat';
  
  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  messageDiv.innerHTML = `
    <div class="message-header">${escapeHtml(sender)}</div>
    <div class="message-content">${escapeHtml(message)}</div>
    <div class="message-time">${time}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

function updateUserCount(count) {
  userCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
}

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.classList.remove('disconnected');
  } else {
    connectionStatus.classList.add('disconnected');
    userCount.textContent = 'Disconnected';
  }
}

let typingUsers = new Set();

function handleTypingIndicator(sender, typing) {
  if (typing) {
    typingUsers.add(sender);
  } else {
    typingUsers.delete(sender);
  }
  
  if (typingUsers.size > 0) {
    const users = Array.from(typingUsers);
    if (users.length === 1) {
      typingIndicator.textContent = `${users[0]} is typing...`;
    } else if (users.length === 2) {
      typingIndicator.textContent = `${users[0]} and ${users[1]} are typing...`;
    } else {
      typingIndicator.textContent = `${users.length} people are typing...`;
    }
  } else {
    typingIndicator.textContent = '';
  }
}

function startTyping() {
  if (!isTyping && ws.readyState === WebSocket.OPEN) {
    isTyping = true;
    ws.send(JSON.stringify({
      type: 'typing',
      isTyping: true
    }));
  }
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
}

function stopTyping() {
  if (isTyping && ws.readyState === WebSocket.OPEN) {
    isTyping = false;
    ws.send(JSON.stringify({
      type: 'typing',
      isTyping: false
    }));
  }
  clearTimeout(typingTimeout);
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  if (messageInput.value.trim()) {
    startTyping();
  } else {
    stopTyping();
  }
});

messageInput.addEventListener('blur', stopTyping);

// Connect on load
connect();