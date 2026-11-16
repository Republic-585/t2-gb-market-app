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

  authenticateTelegramUser();
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    openTab("profile");
    showToast("Ваш профиль T2 GB MARKET");
  });
})();