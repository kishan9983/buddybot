// ── Chat Application Script ─────────────────────────────────────────────────
(function () {
  'use strict';

  // ── DOM references ────────────────────────────────────────
  const messagesArea  = document.getElementById('messages-area');
  const messageInput  = document.getElementById('message-input');
  const sendBtn       = document.getElementById('send-btn');
  const clearBtn      = document.getElementById('clear-btn');
  const downloadBtn   = document.getElementById('download-btn');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.querySelector('.sidebar');
  const welcomeMsg    = document.getElementById('welcome-msg');

  let isWaiting = false;
  let isDark = true;

  // ── Load history on page load ─────────────────────────────
  async function loadHistory() {
    try {
      const resp = await fetch('/chat/history');
      const data = await resp.json();
      if (data.success && data.messages.length > 0) {
        hideWelcome();
        data.messages.forEach(msg => appendMessage(msg.role, msg.content, msg.timestamp, false));
        scrollToBottom();
      }
    } catch (e) { /* silent */ }
  }

  // ── Send message ──────────────────────────────────────────
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isWaiting) return;

    hideWelcome();
    isWaiting = true;
    messageInput.value = '';
    messageInput.style.height = '24px';
    sendBtn.disabled = true;

    // Append user message
    appendMessage('user', text, formatTime(new Date()));

    // Show typing indicator
    const typingEl = showTyping();

    try {
      const resp = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await resp.json();
      typingEl.remove();

      if (data.success) {
        appendMessage('assistant', data.reply, data.timestamp);
        updateSidebarHistory(text);
      } else {
        appendMessage('assistant', `⚠️ ${data.message || 'Something went wrong.'}`, formatTime(new Date()));
        if (window.showToast) showToast(data.message || 'Error', 'error');
      }
    } catch (err) {
      typingEl.remove();
      appendMessage('assistant', '❌ Network error. Please check your connection.', formatTime(new Date()));
      if (window.showToast) showToast('Network error', 'error');
    } finally {
      isWaiting = false;
      sendBtn.disabled = false;
      scrollToBottom();
    }
  }

  // ── Append message to UI ──────────────────────────────────
  function appendMessage(role, content, time, animate = true) {
    const isUser = role === 'user';
    const initials = isUser
      ? (document.getElementById('user-name')?.textContent.trim()[0] || 'U')
      : '🤖';

    // Check if last message is same sender (for grouping)
    const lastMsg = messagesArea.querySelector('.message:last-child');
    const sameAsPrev = lastMsg && lastMsg.classList.contains(role);

    const div = document.createElement('div');
    div.className = `message ${role}`;
    if (!animate) div.style.animation = 'none';
    if (sameAsPrev) div.classList.add('grouped');

    const formattedContent = formatContent(content);

    // Hide avatar on grouped messages
    const avatarHtml = sameAsPrev
      ? `<div class="msg-avatar" style="visibility:hidden;">${initials}</div>`
      : `<div class="msg-avatar ${isUser ? 'avatar-user' : 'avatar-bot'}">${initials}</div>`;

    div.innerHTML = `
      ${avatarHtml}
      <div class="msg-body">
        <div class="msg-bubble">${formattedContent}</div>
        <div class="msg-meta">
          <span class="msg-time">${time || ''}</span>
          <button class="copy-btn" title="Copy message">📋 Copy</button>
        </div>
      </div>`;

    // Copy button
    div.querySelector('.copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        if (window.showToast) showToast('Copied to clipboard!', 'success', 2000);
      });
    });

    messagesArea.appendChild(div);
    if (animate) scrollToBottom();
  }

  // ── Format message content (basic markdown) ───────────────
  function formatContent(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // ── Typing indicator ──────────────────────────────────────
  function showTyping() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing-msg';
    div.innerHTML = `
      <div class="msg-avatar avatar-bot">🤖</div>
      <div class="msg-body">
        <div class="msg-bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>`;
    messagesArea.appendChild(div);
    scrollToBottom();
    return div;
  }

  // ── Helpers ───────────────────────────────────────────────
  function scrollToBottom() {
    messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
  }

  function hideWelcome() {
    if (welcomeMsg) welcomeMsg.style.display = 'none';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function updateSidebarHistory(text) {
    const list = document.getElementById('history-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `💬 ${text.slice(0, 35)}${text.length > 35 ? '…' : ''}`;
    list.prepend(item);
  }

  // ── Suggestion chips ──────────────────────────────────────
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      messageInput.value = chip.textContent.trim();
      messageInput.focus();
      sendMessage();
    });
  });

  // ── Auto-resize textarea ──────────────────────────────────
  messageInput.addEventListener('input', () => {
    messageInput.style.height = '24px';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
  });

  // ── Send on Enter (Shift+Enter for newline) ───────────────
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  const newChatBtn = document.getElementById('new-chat-btn');
  
  // ── New Conversation (Visual Clear Only) ───────────────────
  function startNewConversation() {
    if (messagesArea.querySelectorAll('.message').length === 0) return;
    messagesArea.querySelectorAll('.message').forEach(el => el.remove());
    if (welcomeMsg) welcomeMsg.style.display = 'block';
    if (window.showToast) showToast('Starting new chat...', 'info', 1000);
  }

  // ── Clear History (Wipe Database) ──────────────────────────
  async function performClearHistory() {
    if (!confirm('Permanently delete all chat history?')) return;
    try {
      const resp = await fetch('/chat/clear', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        messagesArea.querySelectorAll('.message').forEach(el => el.remove());
        if (welcomeMsg) welcomeMsg.style.display = 'block';
        const list = document.getElementById('history-list');
        if (list) list.innerHTML = '';
        if (window.showToast) showToast('History cleared', 'info');
      }
    } catch { if (window.showToast) showToast('Failed to clear history', 'error'); }
  }

  // ── Theme toggle logic ─────────────────────────────────────
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      isDark = !isDark;
      document.body.classList.toggle('light-mode', !isDark);
      themeBtn.textContent = isDark ? '☀️' : '🌙';
      if (window.showToast) showToast(isDark ? 'Dark mode' : 'Light mode', 'info', 1500);
    });
  }

  // ── Event Bindings ─────────────────────────────────────────
  if (clearBtn) clearBtn.addEventListener('click', performClearHistory);
  if (newChatBtn) newChatBtn.addEventListener('click', startNewConversation);

  // ── Download chat ─────────────────────────────────────────
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const messages = [...messagesArea.querySelectorAll('.message')];
      if (!messages.length) { if (window.showToast) showToast('No messages to download', 'warning'); return; }
      const lines = messages.map(m => {
        const role = m.classList.contains('user') ? 'You' : 'BuddyBot';
        const content = m.querySelector('.msg-bubble')?.innerText || '';
        const time = m.querySelector('.msg-time')?.textContent || '';
        return `[${time}] ${role}: ${content}`;
      });
      const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `buddybot-chat-${Date.now()}.txt`;
      a.click();
      if (window.showToast) showToast('Chat downloaded!', 'success');
    });
  }


  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // ── Sidebar toggle (mobile & desktop) ─────────────────────
  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      const isOpen = sidebar.classList.toggle('open');
      document.body.classList.toggle('sidebar-open', isOpen);
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', toggleSidebar);

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      });
    }

    // Close on mobile when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && e.target !== sidebarBackdrop) {
          sidebar.classList.remove('open');
          document.body.classList.remove('sidebar-open');
        }
      }
    });
  }

  // ── Page Transitions (Fade out on link click) ──────────────
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//') && !link.getAttribute('target')) {
        e.preventDefault();
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(-10px)';
        document.body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => { window.location.href = href; }, 300);
      }
    });
  });

  // ── Init ──────────────────────────────────────────────────
  loadHistory();
  messageInput.focus();

})();
