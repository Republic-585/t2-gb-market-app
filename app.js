(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#0b0e12"); tg.setBackgroundColor("#0b0e12"); } catch (_) {}
  }

  const AUTH_URL = "https://mklvipfzcgfzhfzbpzii.supabase.co/functions/v1/miniapp-auth";
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = {
    buy: document.getElementById("buy-panel"),
    sell: document.getElementById("sell-panel"),
    profile: document.getElementById("profile-panel"),
  };
  function openTab(target) {
    tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === target));
    Object.entries(panels).forEach(([name, panel]) => panel.classList.toggle("is-hidden", name !== target));
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

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  async function authenticateTelegramUser() {
    const initData = tg?.initData || "";
    if (!initData) {
      profileUsername.textContent = "Откройте приложение через Telegram";
      if (verifiedDot) verifiedDot.style.background = "#9aa4b2";
      return;
    }
    // Show Telegram-provided name immediately for display only.
    // Authentication is still established exclusively by the server response.
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

  if (listingDescription && descriptionCount) {
    listingDescription.addEventListener("input", () => {
      descriptionCount.textContent = listingDescription.value.length + " / 160";
    });
  }

  if (listingForm) {
    listingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!listingForm.reportValidity()) return;

      const volume = Number(document.getElementById("listing-volume").value);
      const price = Number(document.getElementById("listing-price").value);
      const description = listingDescription.value.trim();

      if (!Number.isInteger(volume) || volume < 1 || volume > 1000 || !Number.isFinite(price) || price < 1 || price > 100000) {
        showToast("Проверьте объём и стоимость предложения");
        return;
      }

      const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
      document.getElementById("preview-volume").innerHTML = money.format(volume) + " <small>ГБ</small>";
      document.getElementById("preview-price").textContent = money.format(price) + " ₽";
      document.getElementById("preview-unit-price").textContent =
        money.format(Math.round((price / volume) * 100) / 100) + " ₽ за 1 ГБ";

      const previewDescription = document.getElementById("preview-description");
      previewDescription.textContent = description;
      previewDescription.classList.toggle("is-hidden", !description);
      listingPreview.classList.remove("is-hidden");
      showToast("Предварительная карточка готова");
      listingPreview.scrollIntoView({ behavior: "smooth", block: "start" });
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
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    openTab("profile");
    showToast("Ваш профиль T2 GB MARKET");
  });
})();