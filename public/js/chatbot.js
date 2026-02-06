document.addEventListener('DOMContentLoaded', () => {
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');

    chatIcon.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
    });

    closeChat.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // Display user's message
        appendMessage(userMessage, 'sent');
        chatInput.value = '';

        // Show typing indicator
        const typingIndicator = appendMessage('...', 'received', true);

        try {
            // Send message to the backend
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: userMessage }),
            });

            if (!res.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await res.json();
            
            // Remove typing indicator and show AI response
            typingIndicator.remove();
            appendMessage(data.reply, 'received');

        } catch (error) {
            typingIndicator.remove();
            appendMessage('Sorry, I seem to be having trouble right now. Please try again later.', 'received');
            console.error('Chatbot fetch error:', error);
        }
    });

    function appendMessage(text, type, isTyping = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        
        const p = document.createElement('p');
        p.textContent = text;
        if(isTyping) p.classList.add('typing');

        messageDiv.appendChild(p);
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
        return messageDiv;
    }
});