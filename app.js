(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#0b0e12"); tg.setBackgroundColor("#0b0e12"); } catch (_) {}
  }

  const AUTH_URL = "https://mklvipfzcgfzhfzbpzii.supabase.co/functions/v1/miniapp-auth";
  const MARKETPLACE_API = "https://mklvipfzcgfzhfzbpzii.supabase.co/functions/v1/marketplace-api";

  function startOnlinePresence() {
    const countNode = document.getElementById("online-count");
    const indicator = document.getElementById("online-indicator");
    const supabaseLib = window.supabase;
    if (!countNode || !indicator || !supabaseLib?.createClient) return;

    try {
      const client = supabaseLib.createClient(
        "https://mklvipfzcgfzhfzbpzii.supabase.co",
        "sb_publishable_EQ6nIiLpL1Q9UsIF5rROHQ_KugmUfb9",
        { realtime: { params: { eventsPerSecond: 5 } } }
      );
      const sessionKey = window.crypto?.randomUUID?.()
        || "visitor-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      const channel = client.channel("t2-gb-market-online", {
        config: { presence: { key: sessionKey } }
      });

      const renderOnlineCount = () => {
        const state = channel.presenceState();
        const online = Object.keys(state).length;
        countNode.textContent = new Intl.NumberFormat("ru-RU").format(online);
        indicator.classList.add("is-live");
        indicator.setAttribute("aria-label", "Соединение активно");
      };

      channel
        .on("presence", { event: "sync" }, renderOnlineCount)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ online_at: new Date().toISOString() });
            renderOnlineCount();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            indicator.classList.remove("is-live");
            indicator.setAttribute("aria-label", "Нет соединения");
            countNode.textContent = "—";
          }
        });
    } catch (_) {
      countNode.textContent = "—";
      indicator.classList.remove("is-live");
    }
  }
  startOnlinePresence();
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = {
    buy: document.getElementById("buy-panel"),
    sell: document.getElementById("sell-panel"),
    requests: document.getElementById("requests-panel"),
    profile: document.getElementById("profile-panel"),
  };
  function openTab(target) {
    tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === target));
    const navItems = [...document.querySelectorAll(".bottom-nav .nav-item")];
    const activeIndex = navItems.findIndex((tab) => tab.dataset.tab === target);
    navItems.forEach((tab) => {
      const active = tab.dataset.tab === target;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav && activeIndex >= 0) {
      bottomNav.style.setProperty("--nav-index", activeIndex);
      bottomNav.dataset.activeTab = target;
      const activeItem = navItems[activeIndex];
      activeItem.classList.remove("is-bouncing");
      void activeItem.offsetWidth;
      activeItem.classList.add("is-bouncing");
      window.setTimeout(() => activeItem.classList.remove("is-bouncing"), 900);
    }
    Object.entries(panels).forEach(([name, panel]) => {
      if (!panel) return;
      const isTarget = name === target;
      panel.classList.toggle("is-hidden", !isTarget);
      if (isTarget) {
        panel.classList.remove("tab-panel-enter");
        void panel.offsetWidth;
        panel.classList.add("tab-panel-enter");
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => openTab(tab.dataset.tab)));

  const tactileNav = document.querySelector(".bottom-nav");
  if (tactileNav) {
    const releaseNav = () => tactileNav.classList.remove("is-pressed");
    tactileNav.addEventListener("pointerdown", () => tactileNav.classList.add("is-pressed"), { passive: true });
    window.addEventListener("pointerup", releaseNav, { passive: true });
    window.addEventListener("pointercancel", releaseNav, { passive: true });
    tactileNav.addEventListener("pointerleave", releaseNav, { passive: true });
  }

  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.openTab));
  });

  const profileName = document.getElementById("profile-name");
  const profileUsername = document.getElementById("profile-username");
  const avatar = document.getElementById("avatar");
  const verifiedDot = document.querySelector(".verified-dot");
  const toast = document.getElementById("toast");
  let toastTimer;
  let dashboardData = null;
  let catalogItems = [];

  const DEMO_LISTINGS = [
    { id: "demo-1", demo: true, volume_gb: 1, price_kopecks: 1200, status: "active", created_at: "2026-11-17T00:00:00Z", seller: { first_name: "Алексей" }, popularity_count: 20 },
    { id: "demo-2", demo: true, volume_gb: 2, price_kopecks: 2200, status: "active", created_at: "2026-11-17T00:01:00Z", seller: { first_name: "Мария" }, popularity_count: 19 },
    { id: "demo-3", demo: true, volume_gb: 3, price_kopecks: 3000, status: "active", created_at: "2026-11-17T00:02:00Z", seller: { first_name: "Денис" }, popularity_count: 18 },
    { id: "demo-4", demo: true, volume_gb: 4, price_kopecks: 3800, status: "active", created_at: "2026-11-17T00:03:00Z", seller: { first_name: "Ирина" }, popularity_count: 17 },
    { id: "demo-5", demo: true, volume_gb: 5, price_kopecks: 4750, status: "active", created_at: "2026-11-17T00:04:00Z", seller: { first_name: "Максим" }, popularity_count: 16 },
    { id: "demo-6", demo: true, volume_gb: 6, price_kopecks: 5400, status: "active", created_at: "2026-11-17T00:05:00Z", seller: { first_name: "Анна" }, popularity_count: 15 },
    { id: "demo-7", demo: true, volume_gb: 7, price_kopecks: 6300, status: "active", created_at: "2026-11-17T00:06:00Z", seller: { first_name: "Артём" }, popularity_count: 14 },
    { id: "demo-8", demo: true, volume_gb: 8, price_kopecks: 7200, status: "active", created_at: "2026-11-17T00:07:00Z", seller: { first_name: "Екатерина" }, popularity_count: 13 },
    { id: "demo-9", demo: true, volume_gb: 9, price_kopecks: 7650, status: "active", created_at: "2026-11-17T00:08:00Z", seller: { first_name: "Илья" }, popularity_count: 12 },
    { id: "demo-10", demo: true, volume_gb: 10, price_kopecks: 8500, status: "active", created_at: "2026-11-17T00:09:00Z", seller: { first_name: "София" }, popularity_count: 11 },
    { id: "demo-11", demo: true, volume_gb: 11, price_kopecks: 9350, status: "active", created_at: "2026-11-17T00:10:00Z", seller: { first_name: "Дмитрий" }, popularity_count: 10 },
    { id: "demo-12", demo: true, volume_gb: 12, price_kopecks: 9600, status: "active", created_at: "2026-11-17T00:11:00Z", seller: { first_name: "Полина" }, popularity_count: 9 },
    { id: "demo-13", demo: true, volume_gb: 13, price_kopecks: 10400, status: "active", created_at: "2026-11-17T00:12:00Z", seller: { first_name: "Кирилл" }, popularity_count: 8 },
    { id: "demo-14", demo: true, volume_gb: 14, price_kopecks: 11200, status: "active", created_at: "2026-11-17T00:13:00Z", seller: { first_name: "Алина" }, popularity_count: 7 },
    { id: "demo-15", demo: true, volume_gb: 15, price_kopecks: 12000, status: "active", created_at: "2026-11-17T00:14:00Z", seller: { first_name: "Михаил" }, popularity_count: 6 },
    { id: "demo-16", demo: true, volume_gb: 16, price_kopecks: 12480, status: "active", created_at: "2026-11-17T00:15:00Z", seller: { first_name: "Дарья" }, popularity_count: 5 },
    { id: "demo-17", demo: true, volume_gb: 17, price_kopecks: 13260, status: "active", created_at: "2026-11-17T00:16:00Z", seller: { first_name: "Никита" }, popularity_count: 4 },
    { id: "demo-18", demo: true, volume_gb: 18, price_kopecks: 14040, status: "active", created_at: "2026-11-17T00:17:00Z", seller: { first_name: "Виктория" }, popularity_count: 3 },
    { id: "demo-19", demo: true, volume_gb: 19, price_kopecks: 14440, status: "active", created_at: "2026-11-17T00:18:00Z", seller: { first_name: "Егор" }, popularity_count: 2 },
    { id: "demo-20", demo: true, volume_gb: 20, price_kopecks: 15400, status: "active", created_at: "2026-11-17T00:19:00Z", seller: { first_name: "Ольга" }, popularity_count: 1 }
  ];

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function moneyFromKopecks(value) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format((Number(value) || 0) / 100) + " ₽";
  }
  function unitPrice(price, volume) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format((Number(price) || 0) / 100 / Math.max(1, Number(volume) || 1)) + " ₽ за 1 ГБ";
  }
  async function callMarketplaceApi(action, payload = {}) {
    const initData = tg?.initData || "";
    if (!initData) throw new Error("Откройте приложение через Telegram");
    const response = await fetch(MARKETPLACE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, action, payload }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        marketplace_trading_disabled: "Покупка и публикация пока недоступны.",
        dashboard_load_failed: "Не удалось загрузить данные маркетплейса",
        draft_save_failed: "Не удалось сохранить черновик. Попробуйте ещё раз.",
      };
      throw new Error(messages[result.error] || "Не удалось выполнить запрос");
    }
    return result;
  }

  function createEmptyState(text) {
    const el = document.createElement("div");
    el.className = "listing-empty";
    el.textContent = text;
    return el;
  }
  function createListingCard(item, own = false) {
    const card = document.createElement("article");
    card.className = own ? "listing-row" : "listing-row catalog-offer-card";
    const top = document.createElement("div");
    top.className = "listing-row-top";
    const volume = document.createElement("strong");
    volume.textContent = new Intl.NumberFormat("ru-RU").format(item.volume_gb) + " ГБ";
    const status = document.createElement("span");
    status.className = "listing-state";
    const labels = { draft: "Черновик", active: "Опубликовано", paused: "На паузе", reserved: "В сделке", sold: "Продано", cancelled: "Снято", moderation: "Проверка" };
    status.textContent = item.demo ? "Предложение" : (labels[item.status] || "Предложение");
    const price = document.createElement("div");
    price.className = "listing-row-price";
    price.textContent = moneyFromKopecks(item.price_kopecks);
    const bottom = document.createElement("div");
    bottom.className = "listing-row-bottom";
    const detail = document.createElement("span");
    if (own) detail.textContent = item.description ? item.description.slice(0, 72) : "Только вам";
    else {
      const seller = item.seller || {};
      detail.textContent = seller.username ? "@" + seller.username :
        [seller.first_name, seller.last_name].filter(Boolean).join(" ") || "Продавец T2";
    }
    if (!own) {
      const info = document.createElement("div");
      info.className = "listing-offer-info";
      const seller = item.seller || {};
      detail.textContent = "ДЕМО · " + (seller.username ? "@" + seller.username :
        [seller.first_name, seller.last_name].filter(Boolean).join(" ") || "Продавец T2");
      bottom.append(price, detail);
      info.append(volume, bottom);
      const buyButton = document.createElement("button");
      buyButton.type = "button";
      buyButton.className = "listing-buy-button";
      buyButton.textContent = "Купить";
      if (item.demo) {
        buyButton.disabled = true;
        buyButton.setAttribute("aria-label", "Демонстрационное предложение, покупка пока недоступна");
        buyButton.title = "Покупка станет доступна после запуска сделок";
      } else {
        buyButton.addEventListener("click", () => showToast("Покупки откроются после подключения пополнения и безопасной оплаты."));
      }
      card.append(info, buyButton);
    } else {
      top.append(volume, status);
      bottom.append(detail);
      card.append(top, price, bottom);
    }
    return card;
  }

  function renderDashboard(data) {
    dashboardData = data;
    const available = document.getElementById("wallet-available");
    const reserved = document.getElementById("wallet-reserved");
    const catalog = document.getElementById("catalog-list");
    const catalogEmpty = document.getElementById("catalog-empty");
    const catalogCount = document.getElementById("catalog-count");
    const myListings = document.getElementById("my-listings");
    const myListingsEmpty = document.getElementById("my-listings-empty");
    const orders = document.getElementById("requests-list");
    const ordersEmpty = document.getElementById("requests-empty");

    if (available) available.textContent = moneyFromKopecks(data.wallet?.available_kopecks);
    if (reserved) reserved.textContent = moneyFromKopecks(data.wallet?.reserved_kopecks);

    const stats = data.market_stats || {};
    const averagePrice = document.getElementById("market-average-price");
    const activeCount = document.getElementById("market-active-count");
    const soldYesterday = document.getElementById("market-sold-yesterday");
    const liveCatalog = (data.catalog || []).filter((item) =>
      item.seller_telegram_user_id !== data.user.id &&
      Number(item.volume_gb) >= 1 && Number(item.volume_gb) <= 20
    );
    const usingDemoListings = liveCatalog.length === 0;
    if (averagePrice) averagePrice.textContent = usingDemoListings ? "9,60 ₽" : moneyFromKopecks(stats.average_price_per_gb_kopecks || 0);
    if (activeCount) activeCount.textContent = new Intl.NumberFormat("ru-RU").format(usingDemoListings ? DEMO_LISTINGS.length : (stats.active_listings_count || liveCatalog.length));
    if (soldYesterday) soldYesterday.textContent = new Intl.NumberFormat("ru-RU").format(stats.sold_yesterday_gb || 0) + " ГБ";

    catalogItems = usingDemoListings ? DEMO_LISTINGS.slice() : liveCatalog;
    renderCatalog();

    if (myListings) {
      myListings.replaceChildren();
      (data.my_listings || []).forEach((item) => myListings.append(createListingCard(item, true)));
      myListings.classList.toggle("is-hidden", (data.my_listings || []).length === 0);
    }
    if (myListingsEmpty) myListingsEmpty.classList.toggle("is-hidden", (data.my_listings || []).length > 0);

    if (orders) {
      orders.replaceChildren();
      const statusLabels = {
        awaiting_seller: "Ожидает продавца", accepted: "Продавец принял",
        transfer_reported: "Ожидает подтверждения", completed: "Завершена",
        cancelled: "Отменена", disputed: "Спор", expired: "Истекла", refunded: "Возврат",
      };
      (data.orders || []).forEach((order) => {
        const item = document.createElement("article");
        item.className = "listing-row";
        const top = document.createElement("div");
        top.className = "listing-row-top";
        const label = document.createElement("strong");
        label.textContent = (order.buyer_telegram_user_id === data.user.id ? "Покупка · " : "Продажа · ") + order.volume_gb + " ГБ";
        const status = document.createElement("span");
        status.className = "listing-state";
        status.textContent = statusLabels[order.status] || order.status;
        top.append(label, status);
        const price = document.createElement("div");
        price.className = "listing-row-price";
        price.textContent = moneyFromKopecks(order.price_kopecks);
        item.append(top, price);
        orders.append(item);
      });
      orders.classList.toggle("is-hidden", (data.orders || []).length === 0);
    }
    if (ordersEmpty) ordersEmpty.classList.toggle("is-hidden", (data.orders || []).length > 0);
  }

  let selectedVolume = "all";
  function renderCatalog() {
    const catalog = document.getElementById("catalog-list");
    const empty = document.getElementById("catalog-empty");
    if (!catalog || !empty) return;
    const sort = document.getElementById("catalog-sort")?.value || "recommended";
    let items = catalogItems.filter((item) =>
      selectedVolume === "all" || Number(item.volume_gb) === Number(selectedVolume)
    );
    const totalPrice = (item) => Number(item.price_kopecks) || 0;
    const newestFirst = (a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sort === "total_asc") items.sort((a,b) => totalPrice(a)-totalPrice(b) || Number(a.volume_gb)-Number(b.volume_gb) || newestFirst(a,b));
    else if (sort === "total_desc") items.sort((a,b) => totalPrice(b)-totalPrice(a) || Number(b.volume_gb)-Number(a.volume_gb) || newestFirst(a,b));
    else items.sort((a,b) => (Number(b.popularity_count)||0)-(Number(a.popularity_count)||0) || newestFirst(a,b) || Number(a.volume_gb)-Number(b.volume_gb));
    catalog.replaceChildren();
    items.forEach((item) => catalog.append(createListingCard(item, false)));
    catalog.classList.toggle("is-hidden", items.length === 0);
    empty.classList.toggle("is-hidden", items.length > 0);
  }
  const volumeFilter = document.getElementById("volume-filter");
  let volumeScrollTimer = null;
  function setSelectedVolume(button, shouldRender = true) {
    if (!button) return;
    selectedVolume = button.dataset.volume;
    const currentLabel = document.getElementById("volume-current");
    if (currentLabel) currentLabel.textContent = selectedVolume === "all"
      ? "Все объёмы"
      : selectedVolume + " ГБ выбрано";
    volumeFilter?.querySelectorAll("[data-volume]").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    if (shouldRender) renderCatalog();
  }
  function updateVolumeWheelScale() {
    if (!volumeFilter) return;
    const center = volumeFilter.getBoundingClientRect().left + volumeFilter.clientWidth / 2;
    let nearest = null;
    let nearestDistance = Infinity;
    volumeFilter.querySelectorAll("[data-volume]").forEach((item) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs((rect.left + rect.width / 2) - center);
      const normalized = Math.min(1, distance / Math.max(1, volumeFilter.clientWidth * .42));
      const scale = 1.34 - normalized * .34;
      item.style.setProperty("--wheel-scale", scale.toFixed(3));
      item.style.setProperty("--wheel-opacity", (1 - normalized * .52).toFixed(3));
      if (distance < nearestDistance) { nearestDistance = distance; nearest = item; }
    });
    if (nearest) setSelectedVolume(nearest, false);
    clearTimeout(volumeScrollTimer);
    volumeScrollTimer = window.setTimeout(() => renderCatalog(), 150);
  }
  volumeFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-volume]");
    if (!button) return;
    setSelectedVolume(button);
    volumeFilter.scrollTo({
      left: button.offsetLeft + button.offsetWidth / 2 - volumeFilter.clientWidth / 2,
      behavior: "smooth"
    });
  });
  volumeFilter?.addEventListener("scroll", updateVolumeWheelScale, { passive: true });
  window.addEventListener("resize", updateVolumeWheelScale, { passive: true });
  window.requestAnimationFrame(updateVolumeWheelScale);
  document.getElementById("catalog-sort")?.addEventListener("change", renderCatalog);

  async function loadDashboard() {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const data = await callMarketplaceApi("dashboard");
        renderDashboard(data);
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await sleep([700, 1400, 2600][attempt]);
      }
    }
    showToast(lastError?.message || "Не удалось загрузить данные. Нажмите, чтобы повторить.");
    return false;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function renderTelegramAvatar(photoUrl, fallbackName) {
    if (!avatar) return;
    avatar.replaceChildren();
    avatar.classList.toggle("has-photo", Boolean(photoUrl));
    if (photoUrl && /^https:\/\//i.test(photoUrl)) {
      const image = document.createElement("img");
      image.src = photoUrl;
      image.alt = "Фото профиля Telegram";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => {
        avatar.classList.remove("has-photo");
        image.remove();
        avatar.textContent = (fallbackName || "T2").slice(0, 2).toUpperCase();
      };
      avatar.append(image);
    } else {
      avatar.textContent = (fallbackName || "T2").slice(0, 2).toUpperCase();
    }
  }

  let authInFlight = null;

  async function waitForTelegramInitData(maxWaitMs = 12000) {
    const started = Date.now();
    while (Date.now() - started < maxWaitMs) {
      const initData = window.Telegram?.WebApp?.initData || "";
      if (initData) return initData;
      await sleep(250);
    }
    return window.Telegram?.WebApp?.initData || "";
  }

  async function authenticateTelegramUser() {
    if (authInFlight) return authInFlight;
    authInFlight = (async () => {
      const retryButton = document.getElementById("profile-retry");
      if (retryButton) {
        retryButton.classList.add("is-hidden");
        retryButton.disabled = true;
        retryButton.textContent = "Подключаем…";
      }
      document.documentElement.dataset.telegramAuth = "pending";
      if (profileUsername) profileUsername.textContent = "Подключаем профиль Telegram…";

      let previewUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
      if (previewUser && profileName) {
        const fullName = [previewUser.first_name, previewUser.last_name].filter(Boolean).join(" ");
        const username = typeof previewUser.username === "string" && previewUser.username ? "@" + previewUser.username : "";
        profileName.textContent = username || fullName || "Пользователь Telegram";
        if (profileUsername) profileUsername.textContent = "Подтверждаем аккаунт…";
        renderTelegramAvatar(previewUser.photo_url, previewUser.first_name || previewUser.username);
      }

      let lastError = null;
      const initData = await waitForTelegramInitData();
      if (!initData) {
        lastError = new Error("telegram_init_data_not_ready");
      } else {
        for (let attempt = 0; attempt < 5; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          try {
            const response = await fetch(AUTH_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ initData }),
              cache: "no-store",
              signal: controller.signal,
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.ok !== true || result.authenticated !== true || !result.user) {
              const error = new Error(result.error || "authentication_failed");
              if (response.status >= 400 && response.status < 500) throw error;
              throw error;
            }

            const user = result.user;
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
            const username = typeof user.username === "string" && user.username ? "@" + user.username : "";
            if (profileName) profileName.textContent = username || fullName || "Пользователь Telegram";
            if (profileUsername) profileUsername.textContent = username && fullName
              ? fullName + " · Аккаунт подтверждён"
              : "Аккаунт Telegram подтверждён";
            renderTelegramAvatar(user.photo_url || previewUser?.photo_url, user.first_name || user.username);
            if (verifiedDot) {
              verifiedDot.style.background = "#6b9bff";
              verifiedDot.setAttribute("aria-label", "Аккаунт подтверждён сервером");
            }
            document.documentElement.dataset.telegramAuth = "verified";
            if (retryButton) retryButton.classList.add("is-hidden");
            await loadDashboard();
            return true;
          } catch (error) {
            lastError = error;
            const permanent = ["invalid_signature", "auth_data_expired", "invalid_user", "origin_not_allowed", "invalid_init_data"];
            if (permanent.includes(error.message)) break;
            if (attempt < 4) await sleep([800, 1600, 3000, 5000][attempt]);
          } finally {
            clearTimeout(timeoutId);
          }
        }
      }

      const detail = lastError?.message === "auth_data_expired"
        ? "Данные запуска Telegram устарели."
        : lastError?.message === "invalid_signature"
          ? "Не удалось проверить подпись Telegram."
          : "Временная ошибка соединения с сервером.";
      if (profileUsername) profileUsername.textContent = detail + " Можно повторить подключение.";
      if (verifiedDot) verifiedDot.style.background = "#d94b4b";
      document.documentElement.dataset.telegramAuth = "failed";
      if (retryButton) {
        retryButton.classList.remove("is-hidden");
        retryButton.disabled = false;
        retryButton.textContent = "Повторить подключение";
      }
      return false;
    })().finally(() => { authInFlight = null; });
    return authInFlight;
  }

  document.getElementById("profile-retry")?.addEventListener("click", () => authenticateTelegramUser());

  const listingForm = document.getElementById("listing-form");
  const listingDescription = document.getElementById("listing-description");
  const descriptionCount = document.getElementById("description-count");
  const listingPreview = document.getElementById("listing-preview");
  const editListingButton = document.getElementById("edit-listing");
  const saveListingButton = listingForm?.querySelector('button[type="submit"]');

  if (listingDescription && descriptionCount) {
    listingDescription.addEventListener("input", () => {
      descriptionCount.textContent = listingDescription.value.length + " / 160";
    });
  }

  if (listingForm) {
    listingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!listingForm.reportValidity()) return;

      const volume = Number(document.getElementById("listing-volume").value);
      const price = Number(document.getElementById("listing-price").value);
      const description = listingDescription.value.trim();

      if (!Number.isInteger(volume) || volume < 1 || volume > 20 || !Number.isInteger(price) || price < 1 || price > 1000000) {
        showToast("Проверьте объём и стоимость предложения");
        return;
      }

      if (saveListingButton) {
        saveListingButton.disabled = true;
        saveListingButton.textContent = "Сохраняем черновик…";
      }
      try {
        const result = await callMarketplaceApi("create_draft", {
          volume_gb: volume,
          price_rub: price,
          description,
        });
        const listing = result.listing;
        document.getElementById("preview-volume").textContent = new Intl.NumberFormat("ru-RU").format(listing.volume_gb) + " ГБ";
        document.getElementById("preview-price").textContent = moneyFromKopecks(listing.price_kopecks);
        document.getElementById("preview-unit-price").textContent = unitPrice(listing.price_kopecks, listing.volume_gb);
        const previewDescription = document.getElementById("preview-description");
        previewDescription.textContent = listing.description || "";
        previewDescription.classList.toggle("is-hidden", !listing.description);
        const previewStatus = listingPreview.querySelector(".offer-status");
        if (previewStatus) previewStatus.textContent = "Сохранено · не опубликовано";
        listingPreview.dataset.listingId = listing.id;
        listingPreview.classList.remove("is-hidden");
        showToast("Черновик сохранён в вашем профиле");
        listingPreview.scrollIntoView({ behavior: "smooth", block: "start" });
        await loadDashboard();
      } catch (error) {
        showToast(error.message || "Не удалось сохранить черновик");
      } finally {
        if (saveListingButton) {
          saveListingButton.disabled = false;
          saveListingButton.textContent = "Сохранить черновик";
        }
      }
    });
  }

  if (editListingButton) {
    editListingButton.addEventListener("click", () => {
      listingPreview.classList.add("is-hidden");
      listingForm.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("listing-volume").focus({ preventScroll: true });
    });
  }

  authenticateTelegramUser();
  document.querySelector(".brand")?.addEventListener("click", (event) => {
    event.preventDefault();
    openTab("buy");
    showToast("Каталог T2 GB MARKET");
  });
})();