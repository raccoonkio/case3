(function () {
  "use strict";

  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRegion = document.getElementById("toast-region");

  const icons = {
    home: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg>',
    compass: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>',
    bookmark: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.6L6 21V4.5Z"/></svg>',
    user: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    plus: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></svg>',
    message: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a7.4 7.4 0 0 1-8 7.5 8.3 8.3 0 0 1-4-.9L4 20l1.6-3.4A7.2 7.2 0 0 1 4 11.5a7.4 7.4 0 0 1 8-7.5 7.4 7.4 0 0 1 8 7.5Z"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    unlock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-1.9"/></svg>',
    more: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>',
    send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'
  };

  let state = loadState();

  function loadState() {
    return { currentUserId: null, activeView: "home", activeFeed: "all", activeTag: "all", sort: "newest", search: "", commentsOpen: {}, csrf: document.querySelector('meta[name="csrf-token"]')?.content || "", users: [], posts: [], accessRequests: [] };
  }

  function persist() {}

  async function api(action, payload = {}) {
    const options = { credentials: "same-origin", headers: {} };
    const url = `/api?action=${encodeURIComponent(action)}`;
    if (action !== "state") {
      options.method = "POST";
      options.headers["Content-Type"] = "application/json";
      options.headers["X-CSRF-Token"] = state.csrf;
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Сервер временно недоступен.");
    if (data.csrf) state.csrf = data.csrf;
    return data;
  }

  async function refresh(shouldRender = true) {
    const data = await api("state");
    Object.assign(state, data);
    if (shouldRender) render();
  }

  function currentUser() { return state.users.find((user) => String(user.id) === String(state.currentUserId)) || null; }
  function getUser(id) { return state.users.find((user) => String(user.id) === String(id)) || null; }
  function initials(user) { return user ? user.avatar || user.name.slice(0, 1).toUpperCase() : "?"; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
  function formatDate(date) {
    const d = new Date(date);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d).replace(" г.", "");
  }
  function formatLongDate(date) {
    const d = new Date(date);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  function getAvatar(user, sizeClass = "") {
    return `<span class="avatar is-${escapeHtml(user?.tone || "yellow")} ${sizeClass}" aria-hidden="true">${escapeHtml(initials(user))}</span>`;
  }
  function toast(message, type = "success") {
    const node = document.createElement("div");
    node.className = `toast ${type === "error" ? "is-error" : ""}`;
    node.textContent = message;
    toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 3600);
  }
  function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

  function render() {
    const user = currentUser();
    const visibleRequests = state.accessRequests.filter((request) => request.status === "pending" && state.posts.some((post) => post.id === request.postId && post.authorId === user?.id));
    app.innerHTML = `
      <aside class="sidebar">
        <a class="brand" href="#" data-action="go-home"><span class="brand-mark">К</span><span class="brand-name">кейс</span></a>
        <p class="brand-note">Блог Twizzle &amp; Swizzle</p>
        <p class="sidebar-label">Навигация</p>
        <nav class="nav-list" aria-label="Основная навигация">
          ${navItem("home", "Лента", "home")}
          ${navItem("discover", "Обзор", "compass")}
          ${navItem("saved", "Мои публикации", "bookmark")}
          ${navItem("profile", "Профиль", "user")}
        </nav>
        <button class="sidebar-new-post" data-action="new-post">${icons.plus}<span>Новая запись</span></button>
        <div class="sidebar-foot">
          ${user ? `<div class="profile-mini">${getAvatar(user)}<div class="profile-mini-copy"><div class="profile-mini-name">${escapeHtml(user.name)}</div><div class="profile-mini-handle">@${escapeHtml(user.handle)}</div></div><button class="icon-button" data-action="logout" aria-label="Выйти">${icons.logout}</button></div>` : `<button class="sidebar-auth" data-action="auth">Войти в Кейс №3</button>`}
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div class="topbar-context"><span class="live-dot"></span><span>${state.activeView === "profile" ? "Ваше пространство" : state.activeView === "saved" ? "Ваши публикации" : "Лента обновилась"}</span></div>
          <div class="topbar-actions"><button class="icon-button" data-action="notifications" aria-label="Уведомления">${icons.bell}</button>${user ? `<div class="topbar-user">${getAvatar(user)}<span class="topbar-user-name">${escapeHtml(user.name.split(" ")[0])}</span></div>` : `<button class="button-secondary" data-action="auth">Войти</button>`}</div>
        </header>
        <div class="content-wrap">${renderMainContent(visibleRequests)}</div>
      </main>`;
    bindEvents();
  }

  function navItem(view, label, iconName) {
    return `<button class="nav-item ${state.activeView === view ? "is-active" : ""}" data-view="${view}">${icons[iconName]}<span>${label}</span></button>`;
  }

  function renderMainContent(visibleRequests) {
    if (state.activeView === "profile") return renderProfile();
    return `
      <section class="hero">
        <div><p class="eyebrow">${state.activeView === "discover" ? "Открытая полка" : state.activeView === "saved" ? "Ваши тексты" : "Среда для мыслей"}</p><h1>${state.activeView === "discover" ? "Найдите свой следующий <em>голос</em>." : state.activeView === "saved" ? "Ваши слова уже <em>здесь</em>." : "Мысль, которой стоит <em>поделиться.</em>"}</h1></div>
        <p class="hero-copy">Публикации о фигурном катании, тренировках и одежде для выхода на лёд.</p>
      </section>
      ${renderToolbar()}
      <div class="layout-grid"><section class="feed-list" aria-label="Публикации">${renderFeed()}</section><aside class="aside-column">${renderTrending()}${renderRequests(visibleRequests)}${renderTagCloud()}</aside></div>`;
  }

  function renderToolbar() {
    const isHome = state.activeView === "home";
    return `<div class="toolbar"><div class="feed-tabs">${isHome ? `<button class="tab-button ${state.activeFeed === "all" ? "is-active" : ""}" data-feed="all">Для вас</button><button class="tab-button ${state.activeFeed === "following" ? "is-active" : ""}" data-feed="following">Подписки</button>` : `<button class="tab-button is-active">${state.activeView === "discover" ? "Все публикации" : "Мои публикации"}</button>`}</div><div class="toolbar-tools"><label class="search-box" aria-label="Поиск по публикациям">${icons.search}<input type="search" data-search placeholder="Найти текст или тег" value="${escapeHtml(state.search)}" /></label><select class="select-control" data-sort aria-label="Сортировка"><option value="newest" ${state.sort === "newest" ? "selected" : ""}>Сначала новые</option><option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>Сначала старые</option><option value="comments" ${state.sort === "comments" ? "selected" : ""}>Больше обсуждений</option><option value="tags" ${state.sort === "tags" ? "selected" : ""}>По тегам</option></select></div></div>`;
  }

  function getFilteredPosts() {
    const user = currentUser();
    let posts = [...state.posts];
    if (state.activeView === "saved") posts = posts.filter((post) => String(post.authorId) === String(user?.id));
    if (state.activeFeed === "following" && state.activeView === "home") posts = posts.filter((post) => user && (user.following || []).map(String).includes(String(post.authorId)));
    if (state.activeTag !== "all") posts = posts.filter((post) => post.tags.includes(state.activeTag));
    if (state.search.trim()) {
      const query = state.search.trim().toLowerCase();
      posts = posts.filter((post) => `${post.title} ${post.body || ""} ${post.excerpt || ""} ${post.tags.join(" ")}`.toLowerCase().includes(query));
    }
    posts.sort((a, b) => {
      if (state.sort === "tags") {
        const tagsA = (a.tags || []).join(", ").toLocaleLowerCase("ru-RU");
        const tagsB = (b.tags || []).join(", ").toLocaleLowerCase("ru-RU");
        return tagsA.localeCompare(tagsB, "ru") || new Date(b.createdAt) - new Date(a.createdAt);
      }
      return state.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : state.sort === "comments" ? b.comments.length - a.comments.length : new Date(b.createdAt) - new Date(a.createdAt);
    });
    return posts;
  }

  function canReadPrivate(post) {
    return post.visibility !== "request" || post.canRead === true;
  }

  function requestStatus(postId) {
    return state.posts.find((post) => String(post.id) === String(postId))?.requestStatus || null;
  }

  function renderFeed() {
    const posts = getFilteredPosts();
    if (!posts.length) return `<div class="empty-state"><h2>Здесь пока тихо</h2><p>${state.activeView === "saved" ? "У вас ещё нет публикаций. Начните с небольшой заметки." : "Попробуйте изменить поиск, тег или подписаться на нового автора."}</p><button class="button-primary" data-action="new-post">Написать запись</button></div>`;
    return posts.map((post, index) => renderPost(post, index)).join("");
  }

  function renderPost(post, index) {
    const author = getUser(post.authorId);
    const user = currentUser();
    const isOwner = String(user?.id) === String(post.authorId);
    const readable = canReadPrivate(post);
    const status = requestStatus(post.id);
    const commentsOpen = !!state.commentsOpen[post.id];
    const title = escapeHtml(post.title);
    const body = escapeHtml(post.body || post.excerpt);
    const excerpt = escapeHtml(post.excerpt || post.body || "");
    return `<article class="post-card ${post.visibility === "request" ? "is-private" : ""} ${index === 0 && state.activeView === "home" ? "is-featured" : ""}" style="animation-delay:${Math.min(index * 70, 280)}ms" data-post-id="${post.id}">
      <div class="post-meta"><div class="author-line">${getAvatar(author)}<div class="author-copy"><div class="author-name">${escapeHtml(author?.name || "Автор")} ${isOwner ? `<span class="tag">вы</span>` : ""}</div><div class="author-handle">@${escapeHtml(author?.handle || "unknown")}</div></div></div><time class="post-date" datetime="${post.createdAt}">${formatDate(post.createdAt)}</time></div>
      <div class="post-kicker">${post.visibility === "request" ? icons.lock + " только по запросу" : "новая публикация"}</div>
      <h2>${title}</h2>
      ${readable ? `<p class="post-body">${body}</p>` : `<p class="post-excerpt">${excerpt}</p><div class="private-blur"><p>${body}</p><div class="private-lock">${icons.lock}<span>Автор откроет эту запись по запросу</span></div></div>${user ? status ? `<button class="request-button is-pending" disabled>${status === "approved" ? "Доступ открыт" : status === "rejected" ? "Запрос отклонён" : "Запрос отправлен"}</button>` : `<button class="request-button" data-action="request-access" data-post-id="${post.id}">Запросить доступ</button>` : `<button class="request-button" data-action="auth">Войти, чтобы запросить доступ</button>`}`}
      <div class="tag-row">${post.tags.map((tag) => `<button class="tag is-clickable ${state.activeTag === tag ? "is-active" : ""}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div>
      <div class="post-footer"><button class="post-action ${commentsOpen ? "is-accent" : ""}" data-action="toggle-comments" data-post-id="${post.id}">${icons.message}<span>${post.comments.length} ${plural(post.comments.length, "комментарий", "комментария", "комментариев")}</span></button><span class="post-action">${icons[post.visibility === "request" ? "lock" : "unlock"]}<span>${post.visibility === "request" ? "Приватная" : "Публичная"}</span></span><div class="post-actions-right">${isOwner ? `<div class="post-menu"><button class="icon-button" data-action="toggle-menu" data-post-id="${post.id}" aria-label="Действия с публикацией">${icons.more}</button><div class="menu-popover" data-menu-for="${post.id}"><button data-action="edit-post" data-post-id="${post.id}">Редактировать</button><button class="is-danger" data-action="delete-post" data-post-id="${post.id}">Удалить</button></div></div>` : `<button class="post-action" data-action="follow" data-user-id="${post.authorId}">${user?.following?.map(String).includes(String(post.authorId)) ? "Вы подписаны" : "+ Подписаться"}</button>`}</div></div>
      <div class="comments ${commentsOpen ? "is-open" : ""}"><div class="comment-list">${post.comments.length ? post.comments.map(renderComment).join("") : `<p class="aside-empty">Пока никто не комментировал. Будьте первым.</p>`}</div>${user ? `<form class="comment-form" data-comment-form data-post-id="${post.id}"><input required maxlength="240" name="comment" placeholder="Поделитесь мыслью" aria-label="Комментарий" /><button type="submit" aria-label="Отправить комментарий">${icons.send}</button></form>` : `<button class="button-secondary" data-action="auth">Войти, чтобы комментировать</button>`}</div>
    </article>`;
  }

  function renderComment(comment) {
    const author = getUser(comment.userId);
    return `<div class="comment">${getAvatar(author)}<div class="comment-copy"><div class="comment-author">${escapeHtml(author?.name || "Пользователь")} <span class="author-handle">@${escapeHtml(author?.handle || "")}</span></div><p class="comment-text">${escapeHtml(comment.text)}</p></div></div>`;
  }

  function renderTrending() {
    const trending = [...state.posts].sort((a, b) => b.comments.length - a.comments.length).slice(0, 3);
    return `<section class="aside-block"><div class="aside-title"><h3>Сейчас обсуждают</h3><span>топ 3</span></div><div class="trend-list">${trending.map((post, i) => `<div class="trend-item"><span class="trend-number">0${i + 1}</span><div><p>${escapeHtml(post.title)}</p><small>${post.comments.length} ${plural(post.comments.length, "ответ", "ответа", "ответов")}</small></div></div>`).join("")}</div></section>`;
  }

  function renderRequests(requests) {
    if (!currentUser()) return `<section class="aside-block is-coral"><div class="aside-title"><h3>Ваше пространство</h3></div><p class="aside-empty">Войдите, чтобы подписываться на авторов, писать и открывать личные заметки.</p><button class="button-primary" data-action="auth" style="margin-top:16px">Войти или создать аккаунт</button></section>`;
    return `<section class="aside-block is-coral"><div class="aside-title"><h3>Запросы доступа</h3><span>${requests.length || "нет"}</span></div>${requests.length ? `<div class="request-list">${requests.map(renderRequest).join("")}</div>` : `<p class="aside-empty">Новых запросов нет. Когда кто-то захочет прочитать закрытый текст, он появится здесь.</p>`}</section>`;
  }

  function renderRequest(request) {
    const requester = getUser(request.requesterId);
    const post = state.posts.find((item) => item.id === request.postId);
    return `<div class="request-item">${getAvatar(requester)}<div class="request-copy"><strong>${escapeHtml(requester?.name || "Пользователь")}</strong><span>просит открыть «${escapeHtml(post?.title || "пост").slice(0, 28)}»</span></div><div class="request-actions"><button data-action="approve-request" data-request-id="${request.id}" aria-label="Одобрить запрос">${icons.check}</button><button data-action="reject-request" data-request-id="${request.id}" aria-label="Отклонить запрос">${icons.x}</button></div></div>`;
  }

  function renderTagCloud() {
    const counts = {};
    state.posts.forEach((post) => post.tags.forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    const tags = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return `<section class="aside-block"><div class="aside-title"><h3>Темы</h3><span>по тегам</span></div><div class="tag-cloud"><button class="tag is-clickable ${state.activeTag === "all" ? "is-active" : ""}" data-tag="all">Все</button>${tags.map(([tag]) => `<button class="tag is-clickable ${state.activeTag === tag ? "is-active" : ""}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div></section>`;
  }

  function renderProfile() {
    const user = currentUser();
    if (!user) return `<section class="empty-state"><p class="eyebrow">Ваше пространство</p><h2>Профиль появляется после входа</h2><p>Создайте аккаунт, чтобы писать свои заметки, собирать ленту по подпискам и открывать личные публикации.</p><button class="button-primary" data-action="auth">Войти или зарегистрироваться</button></section>`;
    const ownPosts = state.posts.filter((post) => post.authorId === user.id);
    const followers = state.users.filter((person) => person.following.includes(user.id)).length;
    return `<section class="profile-panel"><div class="profile-hero">${getAvatar(user)}<div><h3>${escapeHtml(user.name)}</h3><p>@${escapeHtml(user.handle)} · ${escapeHtml(user.bio)}</p></div></div><div class="profile-stats"><div class="profile-stat"><strong>${ownPosts.length}</strong><span>публикаций</span></div><div class="profile-stat"><strong>${followers}</strong><span>подписчиков</span></div><div class="profile-stat"><strong>${user.following.length}</strong><span>подписок</span></div></div><div><p class="eyebrow">Настройки аккаунта</p><button class="button-secondary" data-action="logout">${icons.logout} Выйти из аккаунта</button></div></section>`;
  }

  function plural(number, one, few, many) {
    const n = Math.abs(number) % 100;
    if (n >= 11 && n <= 19) return many;
    const last = n % 10;
    return last === 1 ? one : last >= 2 && last <= 4 ? few : many;
  }

  function bindEvents() {
    app.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { state.activeView = button.dataset.view; state.activeTag = "all"; state.search = ""; persist(); render(); }));
    app.querySelectorAll("[data-feed]").forEach((button) => button.addEventListener("click", () => { state.activeFeed = button.dataset.feed; persist(); render(); }));
    app.querySelectorAll("[data-tag]").forEach((button) => button.addEventListener("click", () => { state.activeTag = button.dataset.tag; if (state.activeView === "profile") state.activeView = "home"; persist(); render(); }));
    app.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleAction));
    app.querySelectorAll("[data-search]").forEach((input) => input.addEventListener("input", (event) => { state.search = event.target.value; render(); const fresh = app.querySelector("[data-search]"); if (fresh) { fresh.focus(); fresh.setSelectionRange(fresh.value.length, fresh.value.length); } }));
    app.querySelectorAll("[data-sort]").forEach((select) => select.addEventListener("change", (event) => { state.sort = event.target.value; persist(); render(); }));
    app.querySelectorAll("[data-comment-form]").forEach((form) => form.addEventListener("submit", submitComment));
  }

  async function handleAction(event) {
    const button = event.currentTarget;
    const action = button.dataset.action;
    if (action === "go-home") { event.preventDefault(); state.activeView = "home"; persist(); render(); return; }
    if (action === "auth") { openAuthModal(); return; }
    if (action === "new-post") { if (!currentUser()) { openAuthModal(); return; } openPostModal(); return; }
    if (action === "logout") { try { const result = await api("logout"); Object.assign(state, result); toast(result.message); render(); } catch (error) { toast(error.message, "error"); } return; }
    if (action === "notifications") { toast("Уведомления пока пусты"); return; }
    if (action === "toggle-comments") { const id = button.dataset.postId; state.commentsOpen[id] = !state.commentsOpen[id]; persist(); render(); return; }
    if (action === "toggle-menu") { const menu = app.querySelector(`[data-menu-for="${button.dataset.postId}"]`); app.querySelectorAll(".menu-popover").forEach((item) => item.classList.remove("is-open")); menu?.classList.toggle("is-open"); return; }
    if (action === "follow") { await toggleFollow(button.dataset.userId); return; }
    if (action === "request-access") { await requestAccess(button.dataset.postId); return; }
    if (action === "approve-request" || action === "reject-request") { await updateRequest(button.dataset.requestId, action === "approve-request" ? "approved" : "rejected"); return; }
    if (action === "edit-post") { const post = state.posts.find((item) => item.id === button.dataset.postId); if (post) openPostModal(post); return; }
    if (action === "delete-post") { await deletePost(button.dataset.postId); return; }
  }

  async function toggleFollow(userId) {
    if (!currentUser()) { openAuthModal(); return; }
    try { const result = await api("follow", { user_id: Number(userId) }); Object.assign(state, result); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  async function requestAccess(postId) {
    if (!currentUser()) { openAuthModal(); return; }
    try { const result = await api("request_access", { post_id: Number(postId) }); Object.assign(state, result); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  async function updateRequest(requestId, status) {
    try { const result = await api("access_request", { request_id: Number(requestId), status }); Object.assign(state, result); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  async function submitComment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.comment;
    const text = input.value.trim();
    if (!text || !currentUser()) return;
    try { const result = await api("comment", { post_id: Number(form.dataset.postId), text }); Object.assign(state, result); state.commentsOpen[form.dataset.postId] = true; toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  async function deletePost(postId) {
    const post = state.posts.find((item) => item.id === postId);
    if (!post || String(post.authorId) !== String(state.currentUserId)) return;
    if (!window.confirm("Удалить эту публикацию? Действие нельзя отменить.")) return;
    try { const result = await api("delete_post", { id: Number(postId) }); Object.assign(state, result); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  function openAuthModal(mode = "login") {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div class="modal-header"><div><h2 id="auth-title">${mode === "login" ? "С возвращением." : "Начните с одной мысли."}</h2><p>${mode === "login" ? "Войдите, чтобы писать, подписываться и обсуждать." : "Создайте свой профиль."}</p></div><button class="modal-close" data-close-modal aria-label="Закрыть">${icons.x}</button></div><form class="form-grid" data-auth-form><div class="field"><label for="auth-login">${mode === "login" ? "Логин или email" : "Ваше имя"}</label><input id="auth-login" name="login" required autocomplete="${mode === "login" ? "username" : "name"}" /></div>${mode === "register" ? `<div class="field"><label for="auth-handle">Логин</label><input id="auth-handle" name="handle" required pattern="[A-Za-zА-Яа-я0-9_]{3,24}" placeholder="например, sveta" /><span class="field-hint">Только буквы, цифры и нижнее подчёркивание.</span></div>` : ""}${mode === "register" ? `<div class="field"><label for="auth-bio">Коротко о себе</label><input id="auth-bio" name="bio" maxlength="120" placeholder="Что вы любите замечать?" /></div>` : ""}<div class="field"><label for="auth-password">Пароль</label><input id="auth-password" name="password" type="password" required minlength="${mode === "login" ? "1" : "4"}" autocomplete="${mode === "login" ? "current-password" : "new-password"}" /></div><div class="modal-footer"><button class="button-primary" type="submit">${mode === "login" ? "Войти" : "Создать аккаунт"}</button></div></form>${mode === "login" ? `<div class="demo-note">Демо-доступ: логин <strong>sveta</strong>, пароль <strong>demo</strong>.</div>` : ""}<p class="auth-switch">${mode === "login" ? "Ещё нет аккаунта?" : "Уже зарегистрированы?"} <button type="button" data-auth-switch="${mode === "login" ? "register" : "login"}">${mode === "login" ? "Создать его" : "Войти"}</button></p></section></div>`;
    bindModalEvents();
  }

  function openPostModal(post = null) {
    const isEdit = !!post;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="post-title"><div class="modal-header"><div><h2 id="post-title">${isEdit ? "Редактировать запись" : "Новая запись"}</h2><p>${isEdit ? "Сохраните изменения — они появятся в ленте сразу." : "Дайте мысли место на странице."}</p></div><button class="modal-close" data-close-modal aria-label="Закрыть">${icons.x}</button></div><form class="form-grid" data-post-form data-edit-id="${post?.id || ""}"><div class="field"><label for="post-heading">Заголовок</label><input id="post-heading" name="title" required maxlength="120" value="${escapeHtml(post?.title || "")}" placeholder="Например, «Город как собеседник»" /></div><div class="field"><label for="post-body">Текст публикации</label><textarea id="post-body" name="body" required maxlength="5000" placeholder="Напишите то, чем хочется поделиться...">${escapeHtml(post?.body || "")}</textarea></div><div class="form-row"><div class="field"><label for="post-tags">Теги</label><input id="post-tags" name="tags" value="${escapeHtml(post?.tags?.join(", ") || "")}" placeholder="дизайн, заметки" /><span class="field-hint">Разделяйте теги запятыми.</span></div><div class="field"><label for="post-visibility">Видимость</label><select id="post-visibility" name="visibility"><option value="public" ${post?.visibility !== "request" ? "selected" : ""}>Публичная</option><option value="request" ${post?.visibility === "request" ? "selected" : ""}>Только по запросу</option></select></div></div><div class="modal-footer"><button class="button-secondary" type="button" data-close-modal>Отмена</button><button class="button-primary" type="submit">${isEdit ? "Сохранить изменения" : "Опубликовать"}</button></div></form></section></div>`;
    bindModalEvents();
  }

  function bindModalEvents() {
    modalRoot.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
    modalRoot.querySelector("[data-modal-backdrop]")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });
    modalRoot.querySelector("[data-auth-switch]")?.addEventListener("click", (event) => openAuthModal(event.currentTarget.dataset.authSwitch));
    modalRoot.querySelector("[data-auth-form]")?.addEventListener("submit", submitAuth);
    modalRoot.querySelector("[data-post-form]")?.addEventListener("submit", submitPost);
    const firstInput = modalRoot.querySelector("input, textarea");
    window.setTimeout(() => firstInput?.focus(), 40);
  }

  function closeModal() { modalRoot.innerHTML = ""; }

  async function submitAuth(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const register = !!form.querySelector("[name=handle]");
    const payload = register ? { name: String(data.get("login") || "").trim(), handle: String(data.get("handle") || "").trim(), bio: String(data.get("bio") || "").trim(), password: String(data.get("password") || "") } : { login: String(data.get("login") || "").trim(), password: String(data.get("password") || "") };
    try { const result = await api(register ? "register" : "login", payload); Object.assign(state, result); state.activeView = "home"; closeModal(); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  async function submitPost(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = { title: String(data.get("title") || "").trim(), body: String(data.get("body") || "").trim(), tags: String(data.get("tags") || "").split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 8), visibility: data.get("visibility") === "request" ? "request" : "public" };
    try { const action = form.dataset.editId ? "update_post" : "create_post"; const result = await api(action, form.dataset.editId ? { ...payload, id: Number(form.dataset.editId) } : payload); Object.assign(state, result); closeModal(); toast(result.message); render(); } catch (error) { toast(error.message, "error"); }
  }

  refresh().catch((error) => { app.innerHTML = `<section class="empty-state"><h2>Не удалось подключиться к серверу</h2><p>${escapeHtml(error.message)}</p></section>`; });
})();
