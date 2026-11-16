(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#f6f7f9"); tg.setBackgroundColor("#f6f7f9"); } catch (_) {}
  }

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
      Object.entries(panels).forEach(([name, panel]) => {
        panel.classList.toggle("is-hidden", name !== target);
      });
    });
  });

  // Telegram's client-side user object is used only for a cosmetic greeting.
  // It is not an authentication source; the server must validate initData.
  const user = tg?.initDataUnsafe?.user;
  if (user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    document.getElementById("profile-name").textContent = fullName || "Пользователь Telegram";
    document.getElementById("profile-username").textContent = user.username ? "@" + user.username : "Аккаунт Telegram подключён";
    document.getElementById("avatar").textContent = (user.first_name || "T2").slice(0, 2).toUpperCase();
  }

  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    tabs[0].click();
    showToast("Вы на главной странице T2 GB MARKET");
  });
})();