(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#0b0e12"); tg.setBackgroundColor("#0b0e12"); } catch (_) {}
  }

  const AUTH_URL = "https://mklvipfzcgfzhfzbpzii.supabase.co/functions/v1/miniapp-auth";
  const MARKETPLACE_API = "https://mklvipfzcgfzhfzbpzii.supabase.co/functions/v1/marketplace-api";
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
    navItems.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === target));
    const bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav && activeIndex >= 0) {
      bottomNav.style.setProperty("--nav-index", activeIndex);
      bottomNav.dataset.activeTab = target;
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
    { id: "demo-1", demo: true, volume_gb: 1, price_kopecks: 1200, status: "active", created_at: "2026-11-17T00:01:00Z", seller: { first_name: "Алексей" }, popularity_count: 7 },
    { id: "demo-2", demo: true, volume_gb: 2, price_kopecks: 2200, status: "active", created_at: "2026-11-17T00:02:00Z", seller: { first_name: "Мария" }, popularity_count: 6 },
    { id: "demo-3", demo: true, volume_gb: 3, price_kopecks: 3000, status: "active", created_at: "2026-11-17T00:03:00Z", seller: { first_name: "Денис" }, popularity_count: 5 },
    { id: "demo-4", demo: true, volume_gb: 5, price_kopecks: 4750, status: "active", created_at: "2026-11-17T00:04:00Z", seller: { first_name: "Ирина" }, popularity_count: 4 },
    { id: "demo-5", demo: true, volume_gb: 8, price_kopecks: 7200, status: "active", created_at: "2026-11-17T00:05:00Z", seller: { first_name: "Максим" }, popularity_count: 3 },
    { id: "demo-6", demo: true, volume_gb: 12, price_kopecks: 9600, status: "active", created_at: "2026-11-17T00:06:00Z", seller: { first_name: "Анна" }, popularity_count: 2 },
    { id: "demo-7", demo: true, volume_gb: 20, price_kopecks: 15400, status: "active", created_at: "2026-11-17T00:07:00Z", seller: { first_name: "Артём" }, popularity_count: 1 },
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
    card.className = "listing-row";

    const top = document.createElement("div");
    top.className = "listing-row-top";
    const volume = document.createElement("strong");
    volume.textContent = new Intl.NumberFormat("ru-RU").format(item.volume_gb) + " ГБ";
    const status = document.createElement("span");
    status.className = "listing-state";
    const labels = { draft: "Черновик", active: "Опубликовано", paused: "На паузе", reserved: "В сделке", sold: "Продано", cancelled: "Снято", moderation: "Проверка" };
    status.textContent = item.demo ? "Демо-лот" : (labels[item.status] || "Предложение");
    top.append(volume, status);

    const price = document.createElement("div");
    price.className = "listing-row-price";
    price.textContent = moneyFromKopecks(item.price_kopecks);

    const bottom = document.createElement("div");
    bottom.className = "listing-row-bottom";
    const unit = document.createElement("span");
    unit.textContent = unitPrice(item.price_kopecks, item.volume_gb);
    const detail = document.createElement("span");
    if (own) {
      detail.textContent = item.description ? item.description.slice(0, 72) : "Только вам";
    } else {
      const seller = item.seller || {};
      detail.textContent = seller.username ? "@" + seller.username :
        [seller.first_name, seller.last_name].filter(Boolean).join(" ") || "Продавец T2";
    }
    bottom.append(unit, detail);

    if (!own) {
      const buyButton = document.createElement("button");
      buyButton.type = "button";
      buyButton.className = "listing-buy-button";
      buyButton.textContent = item.demo ? "Демо" : "Купить";
      if (item.demo) {
        buyButton.disabled = true;
        buyButton.setAttribute("aria-label", "Демонстрационный лот, покупка недоступна");
        buyButton.title = "Это демонстрационное предложение";
      } else {
        buyButton.addEventListener("click", () => showToast("Покупки откроются после подключения пополнения и безопасной оплаты."));
      }
      const buyRow = document.createElement("div");
      buyRow.className = "listing-buy-row";
      buyRow.append(buyButton);
      card.append(top, price, bottom, buyRow);
    } else {
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

  function renderCatalog() {
    const catalog = document.getElementById("catalog-list");
    const empty = document.getElementById("catalog-empty");
    const count = document.getElementById("catalog-count");
    if (!catalog || !empty) return;

    const query = (document.getElementById("catalog-search")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("catalog-sort")?.value || "popular";
    let items = catalogItems.filter((item) => {
      const seller = item.seller || {};
      const sellerName = [seller.username, seller.first_name, seller.last_name].filter(Boolean).join(" ").toLowerCase();
      return !query || sellerName.includes(query) || String(item.volume_gb).includes(query) ||
        moneyFromKopecks(item.price_kopecks).toLowerCase().includes(query);
    });
    if (sort === "price_asc") items.sort((a,b) => a.price_kopecks / a.volume_gb - b.price_kopecks / b.volume_gb);
    if (sort === "price_desc") items.sort((a,b) => b.price_kopecks / b.volume_gb - a.price_kopecks / a.volume_gb);
    if (sort === "popular") items.sort((a,b) =>
      (Number(b.popularity_count) || 0) - (Number(a.popularity_count) || 0) ||
      new Date(b.created_at) - new Date(a.created_at)
    );

    catalog.replaceChildren();
    items.forEach((item) => catalog.append(createListingCard(item, false)));
    catalog.classList.toggle("is-hidden", items.length === 0);
    empty.classList.toggle("is-hidden", items.length > 0);
    if (count) count.textContent = items.length + (items.length === 1 ? " предложение" : items.length < 5 ? " предложения" : " предложений");
  }

  document.getElementById("catalog-search")?.addEventListener("input", renderCatalog);
  document.getElementById("catalog-sort")?.addEventListener("change", renderCatalog);

  async function loadDashboard() {
    try {
      const data = await callMarketplaceApi("dashboard");
      renderDashboard(data);
    } catch (error) {
      showToast(error.message || "Не удалось загрузить маркетплейс");
    }
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

  async function authenticateTelegramUser() {
    let previewUser = tg?.initDataUnsafe?.user || null;
    if (previewUser) {
      const previewFullName = [previewUser.first_name, previewUser.last_name].filter(Boolean).join(" ");
      const previewUsername = typeof previewUser.username === "string" && previewUser.username ? "@" + previewUser.username : "";
      profileName.textContent = previewUsername || previewFullName || "Пользователь Telegram";
      profileUsername.textContent = "Подтверждаем аккаунт…";
      renderTelegramAvatar(previewUser.photo_url, previewUser.first_name || previewUser.username);
    } else {
      profileUsername.textContent = "Подключаем профиль Telegram…";
    }

    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      // Telegram may finish populating WebApp launch data just after the page script starts.
      const initData = tg?.initData || "";
      if (!initData) {
        lastError = new Error("telegram_init_data_not_ready");
        await sleep(250 * (attempt + 1));
        previewUser = tg?.initDataUnsafe?.user || previewUser;
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        clearTimeout(timeoutId);
        if (!response.ok || result.ok !== true || result.authenticated !== true || !result.user) {
          const error = new Error(result.error || "authentication_failed");
          // Invalid signatures or expired launch data cannot be fixed by repeating the same request.
          if (response.status >= 400 && response.status < 500) throw error;
          lastError = error;
          await sleep(350 * (attempt + 1));
          continue;
        }

        const user = result.user;
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
        const username = typeof user.username === "string" && user.username ? "@" + user.username : "";
        profileName.textContent = username || fullName || "Пользователь Telegram";
        profileUsername.textContent = username && fullName
          ? fullName + " · Аккаунт подтверждён"
          : "Аккаунт Telegram подтверждён";
        renderTelegramAvatar(user.photo_url || previewUser?.photo_url, user.first_name || user.username);
        if (verifiedDot) {
          verifiedDot.style.background = "#6b9bff";
          verifiedDot.setAttribute("aria-label", "Аккаунт подтверждён сервером");
        }
        document.documentElement.dataset.telegramAuth = "verified";
        await loadDashboard();
        return;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        if (error.message === "invalid_signature" || error.message === "auth_data_expired" ||
            error.message === "invalid_user" || error.message === "origin_not_allowed") break;
        if (attempt < 3) await sleep(350 * (attempt + 1));
      }
    }

    profileUsername.textContent = lastError?.message === "auth_data_expired"
      ? "Сессия Telegram устарела. Закройте и снова откройте приложение."
      : "Не удалось подключить профиль. Повторяемое открытие обычно не требуется — попробуйте обновить экран.";
    if (verifiedDot) verifiedDot.style.background = "#d94b4b";
    document.documentElement.dataset.telegramAuth = "failed";
  }

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