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
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      Object.entries(panels).forEach(([name, panel]) => panel.classList.toggle("is-hidden", name !== target));
    });
  });

  const profileName = document.getElementById("profile-name");
  const profileUsername = document.getElementById("profile-username");
  const avatar = document.getElementById("avatar");
  const verifiedDot = document.querySelector(".verified-dot");
  const roleButtons = [...document.querySelectorAll("[data-role]")];
  const roleSave = document.getElementById("role-save");
  const roleStatus = document.getElementById("role-status");
  const roleSummary = document.getElementById("role-summary");
  const toast = document.getElementById("toast");
  let toastTimer;
  let initData = "";
  let authenticated = false;
  let selectedRoles = [];
  let savedRoles = [];

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function labels(roles) {
    return roles.map((role) => role === "buyer" ? "Покупатель" : "Продавец");
  }

  function renderRoles() {
    roleButtons.forEach((button) => {
      const selected = selectedRoles.includes(button.dataset.role);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = !authenticated;
    });
    if (roleSummary) roleSummary.textContent = selectedRoles.length ? labels(selectedRoles).join(" · ") : "Не выбрана";
    const unchanged = selectedRoles.length === savedRoles.length &&
      selectedRoles.every((role) => savedRoles.includes(role));
    if (roleSave) roleSave.disabled = !authenticated || selectedRoles.length === 0 || unchanged;
  }

  async function requestProfile(action = "get_profile", roles) {
    if (!initData) throw new Error("Откройте приложение через Telegram");
    const payload = { initData, action };
    if (Array.isArray(roles)) payload.roles = roles;
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true || result.authenticated !== true || !result.user) {
      throw new Error(result.error || "profile_request_failed");
    }
    return result.user;
  }

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!authenticated) return;
      const role = button.dataset.role;
      selectedRoles = selectedRoles.includes(role)
        ? selectedRoles.filter((item) => item !== role)
        : [...selectedRoles, role];
      renderRoles();
      if (roleStatus) roleStatus.textContent = "Изменения ещё не сохранены";
    });
  });

  if (roleSave) {
    roleSave.addEventListener("click", async () => {
      if (!authenticated || !selectedRoles.length) return;
      roleSave.disabled = true;
      roleSave.textContent = "Сохраняем…";
      if (roleStatus) roleStatus.textContent = "Сохраняем выбор…";
      try {
        const user = await requestProfile("save_roles", selectedRoles);
        savedRoles = Array.isArray(user.roles) ? user.roles : [];
        selectedRoles = [...savedRoles];
        if (roleStatus) roleStatus.textContent = "Выбор сохранён в вашем профиле";
        renderRoles();
        showToast("Настройки профиля сохранены");
      } catch (_) {
        if (roleStatus) roleStatus.textContent = "Не удалось сохранить. Попробуйте ещё раз.";
        renderRoles();
      } finally {
        roleSave.textContent = "Сохранить выбор";
      }
    });
  }

  async function authenticateTelegramUser() {
    initData = tg?.initData || "";
    if (!initData) {
      profileUsername.textContent = "Откройте приложение через Telegram";
      if (verifiedDot) verifiedDot.style.background = "#e6a62e";
      if (roleStatus) roleStatus.textContent = "Для настройки профиля откройте Mini App из Telegram";
      renderRoles();
      return;
    }
    profileUsername.textContent = "Проверяем аккаунт Telegram…";
    if (roleStatus) roleStatus.textContent = "Загружаем настройки профиля…";
    try {
      const user = await requestProfile();
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
      authenticated = true;
      savedRoles = Array.isArray(user.roles) ? user.roles : [];
      selectedRoles = [...savedRoles];
      if (roleStatus) roleStatus.textContent = savedRoles.length
        ? "Ваш выбор сохранён в профиле"
        : "Выберите одну или обе роли";
      renderRoles();
    } catch (_) {
      profileUsername.textContent = "Не удалось подтвердить аккаунт. Перезапустите приложение.";
      if (verifiedDot) verifiedDot.style.background = "#d94b4b";
      document.documentElement.dataset.telegramAuth = "failed";
      authenticated = false;
      if (roleStatus) roleStatus.textContent = "Не удалось загрузить профиль. Перезапустите приложение.";
      renderRoles();
    }
  }

  renderRoles();
  authenticateTelegramUser();

  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    tabs[0].click();
    showToast("Вы на главной странице T2 GB MARKET");
  });
})();