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
    sortable: null,
    // Ignore status polls until this timestamp (ms) to avoid clobbering an
    // optimistic reorder/remove before the server has committed it.
    suppressPollUntil: 0,

    initApp() {
      tg.ready();
      tg.expand();

      if (tg.colorScheme === 'light') {
        document.body.classList.add('light-theme');
      }

      tg.onEvent('themeChanged', () => {
        this.isLightTheme = tg.colorScheme === 'light';
        document.body.classList.toggle('light-theme', this.isLightTheme);
      });

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
        this.chatId = -100123456789;
        this.groupName = 'Demo Group';
      }

      tg.enableClosingConfirmation();

      this.fetchStatus();
      this.pollingInterval = setInterval(() => this.fetchStatus(), 3000);
    },

    switchTab(tab) {
      this.activeTab = tab;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      }
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

    initSortable() {
      const el = this.$refs.queueContainer;
      if (!el || typeof Sortable === 'undefined') return;
      this.sortable = Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: (evt) => {
          if (evt.oldIndex === evt.newIndex) return;
          // Read the dropped order from the DOM.
          const ids = Array.from(el.querySelectorAll('[data-id]'))
            .map((node) => Number(node.getAttribute('data-id')));
          // Revert Sortable's DOM mutation so Alpine stays the single source of
          // truth — it will re-render the new order from queueList below.
          const moved = evt.item;
          const ref = el.children[evt.oldIndex > evt.newIndex ? evt.oldIndex + 1 : evt.oldIndex];
          el.insertBefore(moved, ref || null);
          this.reorderQueue(ids);
        }
      });
    },

    reorderQueue(orderedIds) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      // Optimistically reorder the local list to match the dropped order.
      const byId = new Map(this.queueList.map((t) => [t.id, t]));
      this.queueList = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction('/api/queue/reorder', { orderedIds }, 'Queue reordered');
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
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': tg.initData || ''
          },
          body: JSON.stringify({ chatId: this.chatId, ...extraBody })
        });
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
        const res = await fetch('/api/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': tg.initData || ''
          },
          body: JSON.stringify({ chatId: this.chatId, action })
        });
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
        const res = await fetch('/api/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': tg.initData || ''
          },
          body: JSON.stringify({ chatId: this.chatId, action })
        });
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
        const res = await fetch('/api/queue/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': tg.initData || ''
          },
          body: JSON.stringify({
            chatId: this.chatId,
            songId: song.id,
            provider: this.searchProvider
          })
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
    },

    promptChatId() {
      const newId = prompt('Enter Telegram Group Chat ID (e.g. -100123456789):', this.chatId);
      if (newId) {
        const numId = Number(newId.trim());
        if (!isNaN(numId)) {
          this.chatId = numId;
          this.groupName = 'Custom Chat (' + numId + ')';
          this.fetchStatus();
          this.triggerToast('Chat ID updated to ' + numId);
        } else {
          alert('Invalid number format for Chat ID.');
        }
      }
    }
  };
}