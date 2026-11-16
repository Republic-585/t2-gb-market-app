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
    document.querySelectorAll(".nav-item").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === target));
    Object.entries(panels).forEach(([name, panel]) => panel?.classList.toggle("is-hidden", name !== target));
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
        marketplace_trading_disabled: "Покупка и публикация пока отключены. Сейчас доступен тестовый режим.",
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
    status.textContent = labels[item.status] || "Предложение";
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
    card.append(top, price, bottom);
    return card;
  }

  function renderDashboard(data) {
    dashboardData = data;
    const available = document.getElementById("wallet-available");
    const reserved = document.getElementById("wallet-reserved");
    const catalog = document.getElementById("catalog-list");
    const catalogEmpty = document.getElementById("catalog-empty");
    const catalogCount = document.getElementById("catalog-count");
    const headerBalance = document.getElementById("wallet-header-balance");
    const myListings = document.getElementById("my-listings");
    const myListingsEmpty = document.getElementById("my-listings-empty");
    const orders = document.getElementById("requests-list");
    const ordersEmpty = document.getElementById("requests-empty");

    if (available) available.textContent = moneyFromKopecks(data.wallet?.available_kopecks);
    if (reserved) reserved.textContent = moneyFromKopecks(data.wallet?.reserved_kopecks);
    if (headerBalance) headerBalance.textContent = moneyFromKopecks(data.wallet?.available_kopecks);

    catalogItems = (data.catalog || []).filter((item) => item.seller_telegram_user_id !== data.user.id);
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
    const sort = document.getElementById("catalog-sort")?.value || "recommended";
    let items = catalogItems.filter((item) => {
      const seller = item.seller || {};
      const sellerName = [seller.username, seller.first_name, seller.last_name].filter(Boolean).join(" ").toLowerCase();
      return !query || sellerName.includes(query) || String(item.volume_gb).includes(query) ||
        moneyFromKopecks(item.price_kopecks).toLowerCase().includes(query);
    });
    if (sort === "price_asc") items.sort((a,b) => a.price_kopecks - b.price_kopecks);
    if (sort === "price_desc") items.sort((a,b) => b.price_kopecks - a.price_kopecks);
    if (sort === "volume_desc") items.sort((a,b) => b.volume_gb - a.volume_gb);

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

  async function authenticateTelegramUser() {
    const initData = tg?.initData || "";
    if (!initData) {
      profileUsername.textContent = "Откройте приложение через Telegram";
      if (verifiedDot) verifiedDot.style.background = "#9aa4b2";
      return;
    }
    const previewUser = tg?.initDataUnsafe?.user;
    if (previewUser) {
      const previewFullName = [previewUser.first_name, previewUser.last_name].filter(Boolean).join(" ");
      const previewUsername = typeof previewUser.username === "string" && previewUser.username ? "@" + previewUser.username : "";
      profileName.textContent = previewUsername || previewFullName || "Пользователь Telegram";
      profileUsername.textContent = "Подтверждаем аккаунт…";
      avatar.textContent = (previewUser.first_name || previewUser.username || "T2").slice(0, 2).toUpperCase();
    } else {
      profileUsername.textContent = "Проверяем аккаунт Telegram…";
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();
      clearTimeout(timeoutId);
      if (!response.ok || result.ok !== true || result.authenticated !== true || !result.user) {
        throw new Error(result.error || "authentication_failed");
      }
      const user = result.user;
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      const username = typeof user.username === "string" && user.username ? "@" + user.username : "";
      profileName.textContent = username || fullName || "Пользователь Telegram";
      profileUsername.textContent = username && fullName
        ? fullName + " · Аккаунт подтверждён"
        : "Аккаунт Telegram подтверждён";
      avatar.textContent = (user.first_name || user.username || "T2").slice(0, 2).toUpperCase();
      if (verifiedDot) {
        verifiedDot.style.background = "#6b9bff";
        verifiedDot.setAttribute("aria-label", "Аккаунт подтверждён сервером");
      }
      document.documentElement.dataset.telegramAuth = "verified";
      await loadDashboard();
    } catch (_) {
      clearTimeout(timeoutId);
      profileUsername.textContent = "Не удалось подтвердить аккаунт. Проверьте соединение и повторите запуск.";
      if (verifiedDot) verifiedDot.style.background = "#d94b4b";
      document.documentElement.dataset.telegramAuth = "failed";
    }
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

      if (!Number.isInteger(volume) || volume < 1 || volume > 1000 || !Number.isInteger(price) || price < 1 || price > 1000000) {
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