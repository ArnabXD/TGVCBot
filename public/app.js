function app() {
  const tg = window.Telegram.WebApp;

  return {
    isLightTheme: tg.colorScheme === 'light',
    groupName: 'Group Voice Chat',
    chatId: null,
    activeTab: 'player',

    active: false,
    isPlaying: false,
    currentTrack: null,
    queueList: [],

    searchQuery: '',
    searchProvider: 'youtube',
    searching: false,
    searchResults: [],

    showToast: false,
    toastMessage: '',

    pollingInterval: null,
    // Ignore status polls until this timestamp (ms) to avoid clobbering an
    // optimistic reorder/remove before the server has committed it.
    suppressPollUntil: 0,

    initApp() {
      tg.ready();
      tg.expand();

      this.applyTheme();
      tg.onEvent('themeChanged', () => this.applyTheme());

      const urlParams = new URLSearchParams(window.location.search);
      let cid = urlParams.get('chatId');

      if (!cid && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          cid = hashParams.get('tgWebAppStartParam') || hashParams.get('chatId');
        } catch (e) {
          // ignore
        }
      }

      if (!cid) {
        cid = urlParams.get('tgWebAppStartParam');
      }

      if (!cid && tg.initDataUnsafe && tg.initDataUnsafe.chat) {
        cid = tg.initDataUnsafe.chat.id;
        this.groupName = tg.initDataUnsafe.chat.title || 'Group Stream';
      }

      if (!cid && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        cid = tg.initDataUnsafe.start_param;
      }

      if (cid) {
        let normalizedCid = String(cid);
        if (normalizedCid.startsWith('g')) {
          normalizedCid = '-' + normalizedCid.slice(1);
        }
        this.chatId = Number(normalizedCid);
      } else {
        // Opened outside a Telegram Mini App deep link (no chat to control) —
        // send the visitor to the project's GitHub repo instead.
        window.location.replace('https://github.com/ArnabXD/TGVCBot');
        return;
      }

      tg.enableClosingConfirmation();

      this.fetchStatus();
      this.pollingInterval = setInterval(() => this.fetchStatus(), 3000);
    },

    // Map every Telegram theme param onto a --tg-theme-* CSS variable so the
    // app follows the user's actual Telegram theme (not just our dark default),
    // and sync the native header/background so they match the webview.
    applyTheme() {
      this.isLightTheme = tg.colorScheme === 'light';
      document.body.classList.toggle('light-theme', this.isLightTheme);

      const params = tg.themeParams || {};
      const root = document.documentElement;
      for (const [key, value] of Object.entries(params)) {
        if (!value) continue;
        // secondary_bg_color -> --tg-theme-secondary-bg-color
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
      }

      // Sync Telegram's native chrome with the app background.
      const bg = params.bg_color;
      try {
        if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('bg_color');
        if (bg && typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(bg);
      } catch {
        // older clients may not support these — safe to ignore
      }

      // Keep the browser/OS chrome (e.g. address bar) in step too.
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      if (bg) meta.setAttribute('content', bg);
    },

    switchTab(tab) {
      this.activeTab = tab;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      }
    },

    // Shared JSON POST to the API — always carries the auth header and chatId.
    apiPost(url, body = {}) {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': tg.initData || ''
        },
        body: JSON.stringify({ chatId: this.chatId, ...body })
      });
    },

    async fetchStatus() {
      if (!this.chatId) return;
      try {
        const res = await fetch(`/api/status?chatId=${this.chatId}`, {
          headers: { 'Authorization': tg.initData || '' }
        });
        if (res.ok) {
          const data = await res.json();
          this.active = data.active;
          this.currentTrack = data.current;
          if (data.chatName) this.groupName = data.chatName;
          this.isPlaying = this.active && !!this.currentTrack;
          // Skip overwriting the queue while an optimistic update is settling,
          // so a poll mid-drag doesn't snap the list back to the old order.
          if (Date.now() >= this.suppressPollUntil) {
            this.queueList = data.queue || [];
          }
        }
      } catch (err) {
        console.error('Status check failed', err);
      }
    },

    // Called by the @alpinejs/sort plugin on drop: `item` is the dragged
    // track id, `position` its new 0-based index. Mirror the move into the
    // local list (the render source) and persist the new order.
    reorderQueue(item, position) {
      if (!this.chatId) return;
      const id = Number(item);
      const from = this.queueList.findIndex((t) => t.id === id);
      if (from === -1 || from === position) return;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

      const next = this.queueList.slice();
      const [moved] = next.splice(from, 1);
      next.splice(position, 0, moved);
      this.queueList = next;

      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction(
        '/api/queue/reorder',
        { orderedIds: next.map((t) => t.id) },
        'Queue reordered',
      );
    },

    removeFromQueue(id) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      // Optimistically drop it from the local list.
      this.queueList = this.queueList.filter((t) => t.id !== id);
      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction('/api/queue/remove', { id }, 'Removed from queue');
    },

    async clearQueue() {
      if (!this.chatId) return;
      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
      this.queueList = [];
      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction('/api/queue/clear', {}, 'Queue cleared');
    },

    async persistQueueAction(url, extraBody, successMsg) {
      try {
        const res = await this.apiPost(url, extraBody);
        if (res.ok) {
          const data = await res.json();
          // Trust the server's authoritative queue and release the poll lock.
          if (Array.isArray(data.queue)) this.queueList = data.queue;
          this.suppressPollUntil = 0;
          if (data.success !== false) this.triggerToast(successMsg);
        } else {
          this.suppressPollUntil = 0;
          this.triggerToast('Action failed.');
          this.fetchStatus();
        }
      } catch {
        this.suppressPollUntil = 0;
        this.triggerToast('Network error.');
        this.fetchStatus();
      }
    },

    async controlAction(action) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(action === 'stop' ? 'warning' : 'success');
      }
      try {
        const res = await this.apiPost('/api/control', { action });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.triggerToast(action.charAt(0).toUpperCase() + action.slice(1) + ' triggered!');
            setTimeout(() => this.fetchStatus(), 500);
          } else {
            this.triggerToast('Action failed or not running.');
          }
        }
      } catch {
        this.triggerToast('Network error.');
      }
    },

    async togglePlay() {
      if (!this.active || !this.currentTrack) {
        this.triggerToast('Nothing is streaming.');
        return;
      }
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
      }
      const action = this.isPlaying ? 'pause' : 'resume';
      try {
        const res = await this.apiPost('/api/control', { action });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.isPlaying = !this.isPlaying;
            this.triggerToast(action === 'pause' ? 'Stream Paused' : 'Stream Resumed');
          }
        }
      } catch (err) {
        console.error(err);
      }
    },

    async performSearch() {
      if (!this.searchQuery.trim()) {
        this.searchResults = [];
        return;
      }
      this.searching = true;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(this.searchQuery)}&provider=${this.searchProvider}`,
          { headers: { 'Authorization': tg.initData || '' } }
        );
        if (res.ok) {
          this.searchResults = await res.json();
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        this.searching = false;
      }
    },

    async queueSong(song) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
      }
      this.triggerToast(`Queuing "${song.title}"...`);
      try {
        const res = await this.apiPost('/api/queue/add', {
          songId: song.id,
          provider: this.searchProvider
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.triggerToast(`Queued: ${song.title}`);
            setTimeout(() => this.fetchStatus(), 1000);
          } else {
            this.triggerToast('Queue failed.');
          }
        } else {
          this.triggerToast('Unauthorized or server error.');
        }
      } catch {
        this.triggerToast('Failed to queue track.');
      }
    },

    triggerToast(msg) {
      this.toastMessage = msg;
      this.showToast = true;
      setTimeout(() => { this.showToast = false; }, 2000);
    }
  };
}