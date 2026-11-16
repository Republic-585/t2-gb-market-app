(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#f6f7f9"); tg.setBackgroundColor("#f6f7f9"); } catch (_) {}
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
      if (verifiedDot) verifiedDot.style.background = "#e6a62e";
      return;
    }
    profileUsername.textContent = "Проверяем аккаунт Telegram…";
    try {
      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        cache: "no-store",
      });
      const result = await response.json();
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
        verifiedDot.style.background = "#39b879";
        verifiedDot.setAttribute("aria-label", "Аккаунт подтверждён сервером");
      }
      document.documentElement.dataset.telegramAuth = "verified";
    } catch (_) {
      profileUsername.textContent = "Не удалось подтвердить аккаунт. Перезапустите приложение.";
      if (verifiedDot) verifiedDot.style.background = "#d94b4b";
      document.documentElement.dataset.telegramAuth = "failed";
    }
  }

  authenticateTelegramUser();
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    openTab("buy");
    showToast("Вы на главной странице T2 GB MARKET");
  });
})();