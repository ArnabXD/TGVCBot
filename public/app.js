function app() {
  const tg = window.Telegram.WebApp;

  return {
    isLightTheme: tg.colorScheme === "light",
    groupName: "Group Voice Chat",
    chatId: null,
    activeTab: "player",

    active: false,
    isPlaying: false,
    currentTrack: null,
    queueList: [],

    searchQuery: "",
    searchProvider: "youtube",
    searching: false,
    searchResults: [],

    showToast: false,
    toastMessage: "",

    pollingInterval: null,
    suppressPollUntil: 0,
    dragging: false,

    initApp() {
      tg.ready();
      tg.expand();

      this.applyTheme();
      tg.onEvent("themeChanged", () => this.applyTheme());

      const urlParams = new URLSearchParams(window.location.search);
      let cid = urlParams.get("chatId");

      if (!cid && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1),
          );
          cid =
            hashParams.get("tgWebAppStartParam") || hashParams.get("chatId");
        } catch (e) {
          // ignore
        }
      }

      if (!cid) {
        cid = urlParams.get("tgWebAppStartParam");
      }

      if (!cid && tg.initDataUnsafe && tg.initDataUnsafe.chat) {
        cid = tg.initDataUnsafe.chat.id;
        this.groupName = tg.initDataUnsafe.chat.title || "Group Stream";
      }

      if (!cid && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        cid = tg.initDataUnsafe.start_param;
      }

      if (cid) {
        let normalizedCid = String(cid);
        if (normalizedCid.startsWith("g")) {
          normalizedCid = "-" + normalizedCid.slice(1);
        }
        this.chatId = Number(normalizedCid);
      } else {
        // Opened outside a Telegram Mini App deep link (no chat to control) —
        // send the visitor to the project's GitHub repo instead.
        window.location.replace("https://github.com/ArnabXD/TGVCBot");
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
      this.isLightTheme = tg.colorScheme === "light";
      document.body.classList.toggle("light-theme", this.isLightTheme);

      const params = tg.themeParams || {};
      const root = document.documentElement;
      for (const [key, value] of Object.entries(params)) {
        if (!value) continue;
        // secondary_bg_color -> --tg-theme-secondary-bg-color
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, "-")}`, value);
      }

      // Sync Telegram's native chrome with the app background.
      const bg = params.bg_color;
      try {
        if (typeof tg.setHeaderColor === "function")
          tg.setHeaderColor("bg_color");
        if (bg && typeof tg.setBackgroundColor === "function")
          tg.setBackgroundColor(bg);
      } catch {
        // older clients may not support these — safe to ignore
      }

      // Keep the browser/OS chrome (e.g. address bar) in step too.
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      if (bg) meta.setAttribute("content", bg);
    },

    switchTab(tab) {
      this.activeTab = tab;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("light");
      }
    },

    // Shared JSON POST to the API — always carries the auth header and chatId.
    apiPost(url, body = {}) {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tg.initData || "",
        },
        body: JSON.stringify({ chatId: this.chatId, ...body }),
      });
    },

    async fetchStatus() {
      if (!this.chatId) return;
      try {
        const res = await fetch(`/api/status?chatId=${this.chatId}`, {
          headers: { Authorization: tg.initData || "" },
        });
        if (res.ok) {
          const data = await res.json();
          this.active = data.active;
          this.currentTrack = data.current;
          if (data.chatName) this.groupName = data.chatName;
          this.isPlaying = this.active && !!this.currentTrack;
          if (!this.dragging && Date.now() >= this.suppressPollUntil) {
            this.queueList = data.queue || [];
          }
        }
      } catch (err) {
        console.error("Status check failed", err);
      }
    },

    renderQueue(el, list) {
      if (this.dragging) return;
      const fallback = "https://telegra.ph/file/6b07279fd80ef2b844ed0.png";
      const esc = (s) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const dragIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg>`;
      const removeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      el.innerHTML = list
        .map(
          (t) => `
        <div class="track-row" x-sort:item="${esc(t.id)}" data-id="${esc(t.id)}">
          <span class="drag-handle" title="Drag to reorder">${dragIcon}</span>
          <img src="${esc(t.image || fallback)}" onerror="this.onerror=null;this.src='${fallback}'" draggable="false" alt="" />
          <div class="track-row-info">
            <div class="track-row-title">${esc(t.title)}</div>
            <div class="track-row-artist">${esc(t.artist)}</div>
          </div>
          <div class="track-row-meta">
            <span class="track-row-dur">${esc(t.duration)}</span>
            <span class="track-row-req">${esc(t.requestedBy?.first_name)}</span>
          </div>
          <button class="btn-remove" title="Remove from queue" x-sort:ignore data-remove-id="${esc(t.id)}">${removeIcon}</button>
        </div>`,
        )
        .join("");
      el.onclick = (e) => {
        const btn = e.target.closest(".btn-remove");
        if (btn) this.removeFromQueue(Number(btn.dataset.removeId));
      };
    },

    reorderQueue(item, position) {
      if (!this.chatId || item === undefined) return;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");

      const ids = this.queueList.map((t) => t.id);
      const id = Number(item);
      const from = ids.indexOf(id);
      if (from === -1 || from === position) return;
      ids.splice(from, 1);
      ids.splice(position, 0, id);

      const byId = Object.fromEntries(this.queueList.map((t) => [t.id, t]));
      this.queueList = ids.map((i) => byId[i]);

      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction(
        "/api/queue/reorder",
        { orderedIds: ids },
        "Queue reordered",
      );
    },

    removeFromQueue(id) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
      // Optimistically drop it from the local list.
      this.queueList = this.queueList.filter((t) => t.id !== id);
      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction(
        "/api/queue/remove",
        { id },
        "Removed from queue",
      );
    },

    async clearQueue() {
      if (!this.chatId) return;
      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("warning");
      this.queueList = [];
      this.suppressPollUntil = Date.now() + 4000;
      this.persistQueueAction("/api/queue/clear", {}, "Queue cleared");
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
          this.triggerToast("Action failed.");
          this.fetchStatus();
        }
      } catch {
        this.suppressPollUntil = 0;
        this.triggerToast("Network error.");
        this.fetchStatus();
      }
    },

    async controlAction(action) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(
          action === "stop" ? "warning" : "success",
        );
      }
      try {
        const res = await this.apiPost("/api/control", { action });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.triggerToast(
              action.charAt(0).toUpperCase() + action.slice(1) + " triggered!",
            );
            setTimeout(() => this.fetchStatus(), 500);
          } else {
            this.triggerToast("Action failed or not running.");
          }
        }
      } catch {
        this.triggerToast("Network error.");
      }
    },

    async togglePlay() {
      if (!this.active || !this.currentTrack) {
        this.triggerToast("Nothing is streaming.");
        return;
      }
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("medium");
      }
      const action = this.isPlaying ? "pause" : "resume";
      try {
        const res = await this.apiPost("/api/control", { action });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.isPlaying = !this.isPlaying;
            this.triggerToast(
              action === "pause" ? "Stream Paused" : "Stream Resumed",
            );
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
          { headers: { Authorization: tg.initData || "" } },
        );
        if (res.ok) {
          this.searchResults = await res.json();
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        this.searching = false;
      }
    },

    async queueSong(song) {
      if (!this.chatId) return;
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("heavy");
      }
      this.triggerToast(`Queuing "${song.title}"...`);
      try {
        const res = await this.apiPost("/api/queue/add", {
          songId: song.id,
          provider: this.searchProvider,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.triggerToast(`Queued: ${song.title}`);
            setTimeout(() => this.fetchStatus(), 1000);
          } else {
            this.triggerToast("Queue failed.");
          }
        } else {
          this.triggerToast("Unauthorized or server error.");
        }
      } catch {
        this.triggerToast("Failed to queue track.");
      }
    },

    triggerToast(msg) {
      this.toastMessage = msg;
      this.showToast = true;
      setTimeout(() => {
        this.showToast = false;
      }, 2000);
    },
  };
}
