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
          this.queueList = data.queue || [];
          if (data.chatName) this.groupName = data.chatName;
          this.isPlaying = this.active && !!this.currentTrack;
        }
      } catch (err) {
        console.error('Status check failed', err);
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