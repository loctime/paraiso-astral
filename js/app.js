// ===== PARAÍSO ASTRAL - APP.JS =====

// Estado global: solo usuario (GET /api/me) y UI de tickets. Sin DATABASE ni Firestore.
var AppState = {
  currentUser: null,
  selectedEventId: null,
  selectedTicketType: 'general'
};
window.AppState = AppState;
var pendingReturnTo = null;

// ── ROUTE GUARD ──────────────────────────────────────────────────────────────────
/**
 * Check if current route requires authentication
 * @param {string} pageId - Current page ID
 * @returns {boolean} True if route is protected
 */
function isProtectedRoute(pageId) {
  return window.CONFIG.PROTECTED_ROUTES.includes(pageId);
}

/**
 * Check if user can access current route
 * @param {string} pageId - Current page ID
 * @returns {boolean} True if user can access route
 */
function canAccessRoute(pageId) {
  if (window.CONFIG.PUBLIC_ROUTES.includes(pageId)) {
    return true;
  }
  if (isProtectedRoute(pageId)) {
    return window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated();
  }
  return true;
}

/**
 * Enhanced navigate function with route protection
 * @param {string} pageId - Target page ID
 * @param {any} data - Optional data for page
 */
function navigate(pageId, data) {
  // Check route protection: si no puede acceder, guardar destino y mostrar login
  if (!canAccessRoute(pageId)) {
    pendingReturnTo = pageId;
    pageId = 'login';
  }

  // Al ir al detalle del evento, guardar desde qué página venimos para el botón Volver
  if (pageId === 'event-detail') {
    var fromEl = document.querySelector('.page.active');
    var fromId = fromEl ? fromEl.id.replace('page-', '') : '';
    if (fromId && fromId !== 'event-detail' && fromId !== 'login') {
      if (!window.AppState) window.AppState = {};
      window.AppState.eventDetailReturnTo = fromId;
    }
  }

  // Update UI
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) { 
    page.classList.add('active'); 
    const content = page.querySelector('.page-content');
    if (content) content.scrollTop = 0; 
  }
  
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-nav="${pageId}"]`);
  if (navItem) navItem.classList.add('active');
  
  // Render page-specific content
  if (data) {
    if (pageId === 'event-detail') { renderEventDetail(data); }
    if (pageId === 'artist-detail') { renderArtistDetail(data); }
    if (pageId === 'rrpp-detail') { renderRRPPDetail(data); }
    if (pageId === 'tickets') { renderTicketsPage(data); }
  }
  
  // Render page content based on pageId
  if (pageId === 'home') { renderHome(); }
  if (pageId === 'events') { renderEvents(); }
  if (pageId === 'artists') { renderArtists(); }
  if (pageId === 'admin') { renderAdmin(); }
  if (pageId === 'rrpp') { renderRRPP(); }
  if (pageId === 'news') { renderNews(); }
  if (pageId === 'notifications') { renderNotifications(); }
}

// ── ERROR HANDLING ──────────────────────────────────────────────────────────────────
/**
 * App-level error handler (evita conflicto con variable globalErrorHandler en apiClient.js)
 * @param {string} message - Error message
 * @param {string} type - Error type
 */
function handleAppError(message, type) {
  type = type || 'error';
  if (message == null || message === '') message = 'Error inesperado en la aplicación';
  var icons = { error: '❌', warning: '⚠️', info: 'ℹ️' };
  var icon = icons[type] || icons.error;
  toast(icon + ' ' + message);
}

/**
 * Initialize error handling
 */
function initializeErrorHandling() {
  if (window.ApiClient && window.ApiClient.setErrorHandler) {
    window.ApiClient.setErrorHandler(handleAppError);
  }
  window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
    handleAppError('Error inesperado en la aplicación', 'error');
  });
  window.addEventListener('error', function (event) {
    console.error('Global error:', event.error);
    handleAppError('Error inesperado en la aplicación', 'error');
  });
}

// ── LOADING STATES ──────────────────────────────────────────────────────────────────
/**
 * Show loading state for a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 */
function showLoading(container, message = 'Cargando...') {
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align:center;padding:2rem">
      <div style="font-size:2rem;animation:spin 1s linear infinite">🔄</div>
      <div style="margin-top:1rem;color:var(--text-muted)">${message}</div>
    </div>
  `;
}

/**
 * Show error state for a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @param {string|Function} retryCallback - Optional retry callback name or function
 * @param {{ label: string, onclick: string }} actionButton - Optional extra button (e.g. "Nuevo Evento")
 */
function showErrorState(container, message, retryCallback = null, actionButton = null) {
  if (!container) return;
  
  const retryButton = retryCallback ? 
    `<button class="btn btn-primary" style="margin-top:1.5rem" onclick="(${retryCallback})()">🔄 Reintentar</button>` : '';
  const extraButton = actionButton ?
    `<button class="btn btn-primary" style="margin-top:1rem;margin-left:0.5rem" onclick="${actionButton.onclick}">${actionButton.label}</button>` : '';
  const buttonsWrap = (retryButton || extraButton) ?
    `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;margin-top:1.5rem">${retryButton}${extraButton}</div>` : '';
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">${message}</div>
      ${buttonsWrap}
    </div>
  `;
}

// ── INITIALIZATION ──────────────────────────────────────────────────────────────────
/**
 * Initialize application
 */
function initializeApp() {
  // Initialize error handling
  initializeErrorHandling();
  
  // Handle URL hash for initial navigation
  handleInitialRoute();
  
  // Setup form listeners
  setupFormListeners();
  
  setTimeout(async function () {
    if (!window.Auth || typeof window.Auth.isAuthenticated !== 'function' || !window.Auth.isAuthenticated()) {
      navigate('login');
      return;
    }
    try {
      var response = await window.ApiClient.get('/api/me');
      if (response.status !== 'success' || !response.data) {
        if (window.Auth.logout) await window.Auth.logout();
        AppState.currentUser = null;
        navigate('login');
        return;
      }
      AppState.currentUser = response.data;
      var user = response.data;
      if (user.role === 'ADMIN') {
        navigate('admin');
      } else if (user.role === 'ARTIST') {
        navigate('profile');
      } else if (user.role === 'PR') {
        navigate('rrpp');
      } else {
        navigate('home');
      }
    } catch (err) {
      if (window.Auth && window.Auth.logout) await window.Auth.logout();
      AppState.currentUser = null;
      navigate('login');
    }
  }, 100);
}

/**
 * Handle initial route from URL hash
 */
function handleInitialRoute() {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash) return;
  
  const [page, ...params] = hash.split('?');
  const queryParams = params.length > 0 ? params.join('?') : '';
  
  if (page) {
    // Handle return URL from login redirect (en memoria)
    if (page === 'login' && queryParams) {
      const urlParams = new URLSearchParams(queryParams);
      const returnTo = urlParams.get('return');
      if (returnTo) {
        pendingReturnTo = returnTo;
        return;
      }
    }
    
    navigate(page);
  }
}

/**
 * Setup form listeners
 */
function setupFormListeners() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ── HOME PAGE ────────────────────────────────────────────────────────────────
async function renderHome(prependEvents) {
  const el = document.getElementById('page-home');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  showLoading(content, 'Cargando eventos...');
  
  try {
    // Fetch events from backend (público, sin login)
    const response = await window.ApiClient.get('/api/events?_=' + Date.now(), { skipAuth: true });
    var events = response.data || [];
    if (Array.isArray(prependEvents) && prependEvents.length) {
      var ids = {};
      events.forEach(function (e) { ids[e.id] = true; });
      prependEvents.forEach(function (e) { if (!ids[e.id]) { events.unshift(e); ids[e.id] = true; } });
    }
    console.log('[renderHome] GET /api/events →', events.length, 'events', events.length ? events.map(function (e) { return { id: e.id, title: e.title, startAt: e.startAt }; }) : []);
    if (!events || events.length === 0) {
      showErrorState(content, 'No hay eventos disponibles', null, {
        label: '➕ Nuevo Evento',
        onclick: "if(window.AppState)window.AppState.editingEvent=null;openModal('modal-add-event')"
      });
      return;
    }
    
        // Find live and published events for home sections
    const liveEvent = events.find(e => e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date()));
    const homeEvents = events
      .filter(e => e.status === 'PUBLISHED')
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    
    // Mock news for now (can be replaced with real news API later)
    const recentNews = [
      { id: 1, emoji: '🎛️', category: 'Producción', title: 'Mastering para frecuencias cósmicas' },
      { id: 2, emoji: '⭐', category: 'Nuevo Artista', title: 'Introduciendo a Nebula Void' },
      { id: 3, emoji: '🌍', category: 'Tour', title: 'European Astral Tour 2025' },
      { id: 4, emoji: '🔊', category: 'Festival', title: 'Nuevo stage en Supernova Festival' }
    ].slice(0, 4);

    content.innerHTML = `
    ${liveEvent ? `
    <div style="background:rgba(255,0,64,0.1);border:1px solid rgba(255,0,64,0.3);border-radius:var(--radius-lg);padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;cursor:pointer;" onclick="navigate('event-detail', '${liveEvent.id}')">
      <span style="font-size:1.2rem;animation:pulse-live 1.5s infinite">🔴</span>
      <div style="flex:1"><div style="font-weight:700;font-size:0.85rem">${window.ApiClient.sanitizeHTML(liveEvent.title)}</div><div style="font-size:0.75rem;color:var(--text-muted)">${window.ApiClient.sanitizeHTML(liveEvent.venue || 'Venue')} · LIVE AHORA</div></div>
      <span class="badge badge-live">LIVE</span>
    </div>` : ''}

        <div class="events-dropdown card">
      <div class="events-dropdown-header">
        <button type="button" class="events-dropdown-toggle" onclick="toggleHomeEventsDropdown(this)" aria-expanded="false">
          <span class="events-dropdown-title">Eventos</span>
          <span class="events-dropdown-count">${homeEvents.length}</span>
        </button>
        <button type="button" class="events-dropdown-add" onclick="event.stopPropagation();if(window.AppState)window.AppState.editingEvent=null;openModal('modal-add-event')" aria-label="Agregar evento" title="Agregar evento">+</button>
      </div>
      <div class="events-dropdown-body" hidden>
        ${homeEvents.length
          ? homeEvents.map(e => renderEventCompactCard(e)).join('')
          : '<div class="empty-state" style="margin:0.5rem 0"><div class="empty-title">Sin eventos publicados</div></div>'}
      </div>
    </div>

    <div class="section-header">
      <span class="section-title">Noticias & Novedades</span>
      <a class="section-link" onclick="navigate('news')">Ver todo</a>
    </div>
    <div class="h-scroll">
      ${recentNews.map(n => `
        <div style="min-width:140px;cursor:pointer" onclick="navigate('news-detail','${n.id}')">
          <div style="height:160px;border-radius:var(--radius-lg);background:linear-gradient(135deg,#1a0820,#2d0040);display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:0.5rem;border:1px solid var(--border)">${window.ApiClient.sanitizeHTML(n.emoji)}</div>
          <div style="font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin-bottom:0.2rem">${window.ApiClient.sanitizeHTML(n.category)}</div>
          <div style="font-size:0.82rem;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${window.ApiClient.sanitizeHTML(n.title)}</div>
        </div>`).join('')}
    </div>

    <div class="section-header"><span class="section-title">Astral Radar</span></div>
    <div class="card" style="padding:1rem;display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
      <div style="width:56px;height:56px;border-radius:var(--radius);background:linear-gradient(135deg,var(--primary),#6b1a8a);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎵</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.65rem;color:var(--cyan);font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Now Playing</div>
        <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Star Dust Memories (Original Mix)</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">DJ Orion • Astral Records</div>
      </div>
      <button class="icon-btn" onclick="toast('▶️ Reproduciendo...')">▶️</button>
    </div>
  `;
  } catch (error) {
    console.error('Error loading home:', error);
    showErrorState(content, 'Error al cargar eventos', 'renderHome');
  }
}

function setupAccordionEventCards(container) {
  if (!container) return;
  container.onclick = function (ev) {
    var card = ev.target.closest && ev.target.closest('.event-card-accordion');
    if (!card) return;
    if (ev.target.closest && (ev.target.closest('button') || ev.target.closest('a'))) return;
    ev.preventDefault();
    var expanded = card.classList.contains('expanded');
    container.querySelectorAll('.event-card-accordion').forEach(function (c) { c.classList.remove('expanded'); });
    if (!expanded) card.classList.add('expanded');
  };
}

function isImageUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}
function toggleHeroExpand(ev) {
  if (ev.target.closest && (ev.target.closest('button') || ev.target.closest('a'))) return;
  ev.preventDefault();
  var hero = document.getElementById('hero-featured');
  if (hero) hero.classList.toggle('hero-collapsed');
}
function toggleHomeEventsDropdown(button) {
  if (!button) return;
  var wrapper = button.closest('.events-dropdown');
  if (!wrapper) return;
  var body = wrapper.querySelector('.events-dropdown-body');
  var isExpanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
  if (body) body.hidden = isExpanded;
}

function renderEventCompactCard(e) {
  var safeId = (e.id || '').replace(/'/g, "\\'");
  var thumb = isImageUrl(e.coverImage)
    ? '<img src="' + e.coverImage.replace(/"/g, '&quot;') + '" alt="">'
    : '🌌';
  var title = (e.title || '').replace(/</g, '&lt;');
  var venue = (e.venue || '').replace(/</g, '&lt;');
  var date = new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  var editBtn = (window.AppState && window.AppState.currentUser)
    ? '<button type="button" class="btn btn-ghost event-compact-btn-editar" style="font-size:0.75rem;padding:0.35rem 0.5rem" onclick="event.stopPropagation();openEditEventModal(\'' + safeId + '\')">✏️ Editar</button>'
    : '';
  return '<div class="event-compact-card">'
    + '<div class="event-compact-thumb">' + thumb + '</div>'
    + '<div class="event-compact-info">'
    + '<div class="event-compact-name">' + title + '</div>'
    + '<div class="event-compact-meta">' + date + ' · ' + venue + '</div>'
    + '<div class="event-compact-actions">'
    + editBtn
    + '<button type="button" class="btn btn-outline event-compact-btn-vermas" onclick="navigate(\'event-detail\',\'' + safeId + '\')">Ver más</button>'
    + '<button type="button" class="btn btn-primary event-compact-btn-comprar" onclick="navigate(\'tickets\',\'' + safeId + '\')">Comprar</button>'
    + '</div></div></div>';
}

function renderEventCardMini(e) {
  var safeId = (e.id || '').replace(/'/g, "\\'");
  var thumbBlock = isImageUrl(e.coverImage)
    ? '<img src="' + e.coverImage.replace(/"/g, '&quot;') + '" alt="">'
    : '🌌';
  var imgBlock = isImageUrl(e.coverImage)
    ? '<img class="event-card-img" src="' + e.coverImage.replace(/"/g, '&quot;') + '" alt="">'
    : '<div class="event-img-placeholder star-bg">🌌</div>';
  var dateStr = new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  return `
    <div class="event-card event-card-accordion" data-event-id="${safeId}">
      <div class="event-card-collapsed">
        <div class="event-card-thumb">${thumbBlock}</div>
        <div class="event-card-collapsed-info">
          <div class="event-name">${(e.title || '').replace(/</g, '&lt;')}</div>
          <div class="event-venue">${dateStr} • ${(e.venue || '').replace(/</g, '&lt;')}</div>
        </div>
      </div>
      <div class="event-card-expanded-wrap">
        <div class="event-image">${imgBlock}</div>
        <div class="event-body" style="padding:0.75rem 1rem">
          <div class="event-meta">
            <div><div class="event-name">${(e.title || '').replace(/</g, '&lt;')}</div><div class="event-venue">${(e.venue || '').replace(/</g, '&lt;')}</div></div>
            <div class="event-date-badge"><div class="event-date-month">${new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</div><div class="event-date-day">${new Date(e.startAt).getDate()}</div></div>
          </div>
          <div class="event-actions">
            ${(window.AppState && window.AppState.currentUser) ? '<button type="button" class="btn btn-ghost" style="padding:0.5rem 0.9rem;font-size:0.8rem" onclick="event.stopPropagation();openEditEventModal(\'' + safeId + '\')">✏️ Editar</button>' : ''}
            <button type="button" class="btn btn-outline" style="padding:0.5rem 0.9rem;font-size:0.8rem" onclick="event.stopPropagation();navigate('event-detail','${safeId}')">Ver detalle</button>
            <button type="button" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem" onclick="event.stopPropagation();navigate('tickets','${safeId}')">🎫 Entradas</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ── EVENTS PAGE ──────────────────────────────────────────────────────────────
async function renderEvents(filter, prependEvents) {
  if (typeof filter !== 'string') filter = 'upcoming';
  const el = document.getElementById('page-events');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  content.innerHTML = `
    <div class="tabs">
      <div class="tab ${filter === 'upcoming' ? 'active' : ''}" onclick="renderEvents('upcoming')">Próximos</div>
      <div class="tab ${filter === 'live' ? 'active' : ''}" onclick="renderEvents('live')">En Vivo</div>
      <div class="tab ${filter === 'past' ? 'active' : ''}" onclick="renderEvents('past')">Pasados</div>
    </div>

    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input class="input" type="text" placeholder="Buscar eventos..." id="search-events" oninput="filterEvents(this.value)" />
    </div>

    ${renderCalendar()}

    <div id="events-list">
      <div style="text-align:center;padding:2rem"><div style="font-size:2rem">🔄</div><div style="margin-top:1rem;color:var(--text-muted)">Cargando eventos...</div></div>
    </div>
  `;
  
  try {
    // Fetch events from backend (público, sin login)
    const response = await window.ApiClient.get('/api/events?_=' + Date.now(), { skipAuth: true });
    var events = response.data || [];
    if (Array.isArray(prependEvents) && prependEvents.length) {
      var ids = {};
      events.forEach(function (e) { ids[e.id] = true; });
      prependEvents.forEach(function (e) { if (!ids[e.id]) { events.unshift(e); ids[e.id] = true; } });
    }
    console.log('[renderEvents] GET /api/events filter=', filter, '→', events.length, 'events');
    if (!events || events.length === 0) {
      document.getElementById('events-list').innerHTML = '<div class="empty-state"><div class="empty-icon">🌌</div><div class="empty-title">Sin eventos</div></div>';
      return;
    }
    
    // Filter events based on status
    const filteredEvents = events.filter(e => {
      if (filter === 'past') return new Date(e.startAt) < new Date();
      if (filter === 'live') return e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date());
      return e.status === 'PUBLISHED' && new Date(e.startAt) > new Date();
    });
    console.log('[renderEvents] filtered →', filteredEvents.length, 'for', filter);

    document.getElementById('events-list').innerHTML = filteredEvents.length === 0 ? 
      '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos</div></div>' :
        filteredEvents.map(e => renderEventCardFull(e)).join('');
    
  } catch (error) {
    console.error('Error loading events:', error);
    document.getElementById('events-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar eventos</div>
        <button class="btn btn-primary" style="margin-top:1.5rem" onclick="renderEvents('${filter}')">🔄 Reintentar</button>
      </div>
    `;
  }
}

function renderCalendar() {
  // Simplified calendar without DATABASE dependency
  const year = 2024;
  const month = 9;
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-day other-month">${new Date(year, month, -firstDay + i + 1).getDate()}</div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === 4 && month === 9;
    cells += `<div class="cal-day ${isToday ? 'active' : ''}" onclick="renderEvents()">${d}</div>`;
  }

  return `
    <div class="glass-card" style="padding:1rem;margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <button class="icon-btn" style="width:32px;height:32px" onclick="renderEvents()">‹</button>
        <span class="font-display" style="font-size:0.85rem;font-weight:700">${monthNames[month]} ${year}</span>
        <button class="icon-btn" style="width:32px;height:32px" onclick="renderEvents()">›</button>
      </div>
      <div class="calendar-grid">
        ${['D','L','M','X','J','V','S'].map(d => `<div class="cal-day-header">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
}

function changeCalMonth(dir) {
  // Simplified month change without DATABASE dependency
  renderEvents();
}

function filterEventsByDay(day) {
  // Simplified day filtering without DATABASE dependency
  renderEvents();
}

function filterEvents(query) {
  // This will be implemented with real API filtering
  // For now, just re-render events
  renderEvents();
}

// ===== RBAC TEST FUNCTION =====

/**
 * Test protected RBAC endpoint
 */
async function testRBAC() {
  try {
    toast('🔄 Probando endpoint protegido...');
    
    // Test with a sample organization ID (you may need to adjust this)
    const orgId = 'sample-org-id';
    
    const result = await window.ApiClient.get(`/api/orgs/${orgId}/test`);
    
    toast('✅ Acceso concedido a endpoint protegido');
    
    // Show result in a modal or alert
    alert(`RBAC Test Exitoso:\n\nUsuario: ${result.user?.email || 'N/A'}\nOrganización: ${result.organization?.name || 'N/A'}\nRol: ${result.membership?.role || 'N/A'}`);
    
  } catch (error) {
    console.error('RBAC Test Error:', error);
    toast('❌ Error al acceder a endpoint protegido');
    
    if (error.status === 401) {
      toast('🔐 No autorizado - Redirigiendo a login...');
      navigate('login');
    } else if (error.status === 403) {
      alert('Acceso denegado: No tienes los permisos necesarios para esta organización');
    } else {
      alert(`Error: ${error.message || 'Error desconocido'}`);
    }
  }
}

function renderEventCardFull(e) {
  const isLive = e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date());
  const revenue = 0; // No ticket data available in new schema
  const safeId = (e.id || '').replace(/'/g, "\\'");
  var imgBlock = isImageUrl(e.coverImage)
    ? '<img class="event-card-img" src="' + (e.coverImage || '').replace(/"/g, '&quot;') + '" alt="" style="height:160px;object-fit:cover;width:100%">'
    : '<div class="event-img-placeholder star-bg" style="height:160px">🌌</div>';
  return `
    <div class="event-card" onclick="navigate('event-detail', '${safeId}')">
      <div class="event-card-img-wrap" style="height:160px">${imgBlock}</div>
      <div class="event-body">
        <div class="event-meta">
          <div>
            <div class="event-name">${e.title}</div>
            <div class="event-venue">${e.venue}</div>
            <div class="event-date">${new Date(e.startAt).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          </div>
          <div class="event-date-badge"><div class="event-date-month">${new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</div><div class="event-date-day">${new Date(e.startAt).getDate()}</div></div>
        </div>
        <div class="event-lineup" style="margin-top:0.5rem">🕐 ${new Date(e.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="event-lineup">📍 ${e.city || e.venue}</div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
          ${(window.AppState && window.AppState.currentUser) ? '<button class="btn btn-ghost" style="padding:0.6rem 0.8rem;font-size:0.78rem" onclick="event.stopPropagation();openEditEventModal(\'' + safeId + '\')">✏️ Editar</button>' : ''}
          <button class="btn btn-primary" style="flex:1;padding:0.6rem;font-size:0.78rem;min-width:0" onclick="event.stopPropagation();navigate('tickets','${safeId}')">🎫 Comprar</button>
          <button class="btn btn-outline" style="padding:0.6rem 0.8rem;font-size:0.78rem" onclick="event.stopPropagation();navigate('event-detail', '${safeId}')">Ver más</button>
        </div>
      </div>
    </div>`;
}

// ── EVENT DETAIL (dominant color glow) ────────────────────────────────────────
var EVENT_DETAIL_DEFAULT_GLOW = '209, 37, 244'; // theme primary RGB for fallback

/**
 * Extract a dominant/vibrant color from an image via canvas. Returns "r,g,b" or null.
 * Skips very dark pixels (r+g+b < 120) so the glow stays visible. Runs once per image load.
 */
function getDominantColorFromImage(img) {
  try {
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    var canvas = document.createElement('canvas');
    var size = 48;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    var data = ctx.getImageData(0, 0, size, size).data;
    var r = 0, g = 0, b = 0, count = 0;
    var bestS = 0, bestR = 0, bestG = 0, bestB = 0;
    for (var i = 0; i < data.length; i += 4) {
      var pr = data[i], pg = data[i + 1], pb = data[i + 2];
      var sum = pr + pg + pb;
      if (sum < 120) continue;
      var max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
      var l = (max + min) / 2 / 255;
      if (l > 0.92) continue;
      r += pr; g += pg; b += pb; count++;
      var s = max === min ? 0 : (max - min) / (l < 0.5 ? max + min : 2 - max - min);
      if (s > bestS) { bestS = s; bestR = pr; bestG = pg; bestB = pb; }
    }
    if (count > 0 && bestS < 0.1) {
      return Math.round(r / count) + ', ' + Math.round(g / count) + ', ' + Math.round(b / count);
    }
    if (bestS >= 0.1) return Math.round(bestR) + ', ' + Math.round(bestG) + ', ' + Math.round(bestB);
    if (count > 0) return Math.round(r / count) + ', ' + Math.round(g / count) + ', ' + Math.round(b / count);
    return null;
  } catch (err) {
    return null;
  }
}

function applyEventDetailGlow(content, rgbString) {
  var color = rgbString || EVENT_DETAIL_DEFAULT_GLOW;
  var page = content && content.closest && content.closest('.page');
  if (page) {
    page.style.setProperty('--event-detail-dominant', color);
    page.classList.add('event-detail-page--themed');
  }
  var wrap = content && content.querySelector('.event-detail-hero-wrap');
  var glow = wrap && wrap.querySelector('.event-detail-hero-glow');
  if (glow) {
    glow.style.setProperty('--event-detail-glow-color', color);
    glow.classList.add('event-detail-hero-glow--on');
  }
}

// ── EVENT DETAIL ─────────────────────────────────────────────────────────────
async function renderEventDetail(eventId) {
  const el = document.getElementById('page-event-detail');
  const content = el.querySelector('.page-content');
  
  var returnTo = (window.AppState && window.AppState.eventDetailReturnTo && window.AppState.eventDetailReturnTo !== 'event-detail') ? window.AppState.eventDetailReturnTo : 'events';
  // Show loading state
  content.innerHTML = `
    <button onclick="navigate('` + returnTo + `')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
    <div style="text-align:center;padding:2rem">
      <div style="font-size:2rem">🔄</div>
      <div style="margin-top:0.5rem;color:var(--text-muted)">Cargando evento...</div>
    </div>
  `;
  
  try {
    var e = null;
    var useAuth = !!window.AppState?.currentUser;
    try {
      e = await window.ApiClient.get('/api/events/' + eventId + '?_=' + Date.now(), { skipAuth: !useAuth });
    } catch (err) {
      if (useAuth) {
        try {
          e = await window.ApiClient.get('/api/events/' + eventId + '?_=' + Date.now(), { skipAuth: true });
        } catch (_) {}
      }
      if (!e) {
        var response = await window.ApiClient.get('/api/events?_=' + Date.now(), { skipAuth: true });
        var events = response.data || [];
        e = events.find(function (ev) { return ev.id === eventId; });
      }
    }
    if (useAuth && e && e.canEdit !== true) {
      try {
        var withAuth = await window.ApiClient.get('/api/events/' + eventId + '?_=' + Date.now(), { skipAuth: false });
        if (withAuth && withAuth.id === e.id) {
          e = withAuth;
        }
      } catch (_) {}
    }
    if (!e) {
      content.innerHTML = `
        <button onclick="navigate('` + returnTo + `')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">Evento no encontrado</div>
        </div>
      `;
      return;
    }

    // Calculate mock data for now (would come from backend in real implementation)
    const sold = 0; // No ticket data available in new schema
    const pct = 0; // No capacity data available in new schema

    var heroBg = isImageUrl(e.coverImage)
      ? '<img class="event-detail-hero__bg" src="' + e.coverImage.replace(/"/g, '&quot;') + '" alt="" crossorigin="anonymous">'
      : '<div class="event-detail-hero__bg-placeholder">🌌</div>';
    var bgBlurStyle = isImageUrl(e.coverImage)
      ? ' style="background-image:url(\'' + e.coverImage.replace(/'/g, "\\'").replace(/"/g, '&quot;') + '\')"'
      : '';
    var heroBadge = e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date())
      ? '<span class="badge badge-live event-detail-hero__badge">🔴 LIVE</span>'
      : '<span class="badge badge-primary event-detail-hero__badge">' + new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) + '</span>';
    var metaDate = new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    var metaTime = new Date(e.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var canEdit = e.canEdit === true;
    var editImageBtn = canEdit ? '<button type="button" class="btn btn-ghost" style="margin-bottom:0.75rem;font-size:0.8rem" onclick="editEventCover(\'' + e.id + '\')">📷 Editar imagen</button>' : '';
    var editEventBtn = canEdit ? '<button type="button" class="btn btn-outline btn-full" style="margin-top:0.5rem" onclick="openEditEventModal(\'' + e.id.replace(/'/g, "\\'") + '\')">✏️ Editar evento</button>' : '';
    content.innerHTML = `
    <button onclick="navigate('` + returnTo + `')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
    <div class="event-detail-hero-wrap">
      <div class="event-detail-bg-blur" aria-hidden="true"${bgBlurStyle}></div>
      <div class="event-detail-hero-glow" aria-hidden="true"></div>
      <div class="event-detail-hero">
        ${heroBg}
        <div class="event-detail-hero__overlay"></div>
        ${heroBadge}
        <div class="event-detail-hero__content">
          <h1 class="event-detail-hero__title">${(e.title || '').replace(/</g, '&lt;')}</h1>
          <div class="event-detail-hero__subtitle">${(e.venue || 'Lugar').replace(/</g, '&lt;')}</div>
          <div class="event-detail-hero__meta">
            <span>${metaDate}</span>
            <span>${metaTime}</span>
            <span>${(e.status || '').replace(/</g, '&lt;')}</span>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-bottom:1rem">
      ${editImageBtn}
      <p style="font-size:0.9rem;line-height:1.55;color:rgba(240,230,255,0.85);margin-bottom:0.75rem">${(e.description || 'Una experiencia cósmica única te espera.').replace(/</g, '&lt;')}</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <span class="badge badge-glass">${e.status}</span>
        <span class="badge badge-glass">📍 ${(e.city || 'Sin ciudad').replace(/</g, '&lt;')}</span>
      </div>
    </div>

    <div class="section-header"><span class="section-title">Información</span></div>
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1.2rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div>
          <div style="color:var(--text-muted);font-size:0.75rem;margin-bottom:0.25rem">Fecha</div>
          <div style="font-weight:600">${new Date(e.startAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:0.75rem;margin-bottom:0.25rem">Horario</div>
          <div style="font-weight:600">${new Date(e.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    </div>

    <div class="section-header"><span class="section-title">Organización</span></div>
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:1rem;margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:40px;height:40px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white">
          ${(e.organization?.name || 'O')[0].toUpperCase()}
        </div>
        <div>
          <div style="font-weight:600">${e.organization?.name || 'Organización'}</div>
          <div style="color:var(--text-muted);font-size:0.85rem">ID: ${e.organization?.id || 'N/A'}</div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:1rem;margin-top:2rem">
      <button class="btn btn-primary" style="flex:1" onclick="navigate('tickets','${e.id}')">🎫 Comprar Entradas</button>
      <button class="btn btn-outline" onclick="navigate('` + returnTo + `')">← Ver Todos</button>
    </div>

    <div style="margin-top:1.5rem">
      <button class="btn btn-primary btn-full" onclick="navigate('tickets','${e.id}')">🎫 Comprar Entradas</button>
      <button class="btn btn-outline btn-full" style="margin-top:0.5rem" onclick="shareEvent('${e.id}')">📤 Compartir Evento</button>
      ${editEventBtn}
    </div>
  `;

    applyEventDetailGlow(content, null);
    var heroImg = content.querySelector('.event-detail-hero__bg');
    if (heroImg && heroImg.tagName === 'IMG') {
      function applyGlowFromImage() {
        var rgb = getDominantColorFromImage(heroImg);
        applyEventDetailGlow(content, rgb);
      }
      heroImg.addEventListener('load', applyGlowFromImage);
      if (heroImg.complete) applyGlowFromImage();
    }
    
  } catch (error) {
    console.error('Error loading event detail:', error);
    var errReturnTo = (window.AppState && window.AppState.eventDetailReturnTo && window.AppState.eventDetailReturnTo !== 'event-detail') ? window.AppState.eventDetailReturnTo : 'events';
    content.innerHTML = `
      <button onclick="navigate('` + errReturnTo + `')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar evento</div>
        <button class="btn btn-primary" style="margin-top:1.5rem" onclick="renderEventDetail('${eventId}')">🔄 Reintentar</button>
      </div>
    `;
  }
}

function editEventCover(eventId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp,image/gif';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = function () {
    var file = input.files && input.files[0];
    if (!file) return;
    input.remove();
    toast('Subiendo imagen…');
    window.ApiClient.uploadFile('/api/upload/event-cover', file).then(function (r) {
      return window.ApiClient.request('/api/events/' + eventId, { method: 'PATCH', body: { coverImage: r.url } });
    }).then(function () {
      toast('Imagen actualizada.');
      renderEventDetail(eventId);
    }).catch(function (err) {
      toast('❌ ' + (err.message || 'Error al actualizar'));
    });
  };
  input.click();
}

function shareEvent(id) {
  // Simplified share function without DATABASE dependency
  if (navigator.share) {
    navigator.share({ title: 'Paraíso Astral Event', text: '¡Mira este evento increíble!', url: window.location.href });
  } else {
    navigator.clipboard.writeText('¡Mira este evento de Paraíso Astral!').then(() => toast('📋 Copiado al portapapeles!'));
  }
}

// ── ARTISTS PAGE ──────────────────────────────────────────────────────────────
async function renderArtists(filter = 'all') {
  const el = document.getElementById('page-artists');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  content.innerHTML = '<div style="text-align:center;padding:2rem"><div style="font-size:2rem">🔄</div><div style="margin-top:1rem;color:var(--text-muted)">Cargando artistas...</div></div>';
  
  try {
    // Mock artists data for now (would come from backend API)
    const artists = [
      { id: 1, name: "Nebula Flux", role: "Headliner", genre: "High Velocity Techno", emoji: "🎧" },
      { id: 2, name: "Cosmic Ray", role: "Resident", genre: "Psychedelic Dub", emoji: "🌀" },
      { id: 3, name: "Astral Void", role: "Special Guest", genre: "Ethereal Vocals", emoji: "🎤" },
      { id: 4, name: "Solar Flare", role: "Rising Star", genre: "Acid House", emoji: "⚡" },
      { id: 5, name: "Luna Edge", role: "Top Performer", genre: "Dark Techno", emoji: "🌙" }
    ];
    
    const genres = ['all', 'Techno', 'Psytrance', 'Ambient', 'House'];
    let filteredArtists = artists;
    if (filter !== 'all') filteredArtists = artists.filter(a => a.genre.toLowerCase().includes(filter.toLowerCase()));

    content.innerHTML = `
      <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1.2rem;padding-bottom:0.3rem">
        ${genres.map(g => `<button class="btn ${filter===g?'btn-primary':'btn-ghost'}" style="flex-shrink:0;padding:0.4rem 1rem;font-size:0.8rem" onclick="renderArtists('${g}')">${g==='all'?'Todos':g}</button>`).join('')}
      </div>

      <div class="section-header"><span class="section-title">Estrellas del Universo</span></div>
      <div class="artist-grid">
        ${filteredArtists.map(a => `
          <div class="artist-card" onclick="navigate('artist-detail', ${a.id})">
            <div class="artist-img-placeholder">${a.emoji}</div>
            <div class="artist-overlay">
              <div class="artist-role">${a.role}</div>
              <div class="artist-name">${a.name}</div>
              <div class="artist-genre">🎵 ${a.genre}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="section-header" style="margin-top:1.5rem"><span class="section-title">Top Performers</span></div>
      <div class="h-scroll">
        ${artists.sort((a,b) => Math.random() - 0.5).slice(0,6).map((a,i) => `
          <div class="circle-avatar" onclick="navigate('artist-detail',${a.id})">
            <div class="circle-avatar-img ${i===0?'active-border':''}">${a.emoji}</div>
            <div class="circle-avatar-name">${a.name.split(' ')[0]}</div>
          </div>`).join('')}
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading artists:', error);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar artistas</div>
      </div>
    `;
  }
}

// ── ARTIST DETAIL ─────────────────────────────────────────────────────────────
async function renderArtistDetail(artistId) {
  const el = document.getElementById('page-artist-detail');
  const content = el.querySelector('.page-content');
  
  // Mock artist data for now (would come from backend API)
  const artists = [
    { id: 1, name: "Nebula Flux", role: "Headliner", genre: "High Velocity Techno", emoji: "🎧", bio: "DJ referente del techno underground europeo. Conocido por sus sets de alta energía y técnica impecable." },
    { id: 2, name: "Cosmic Ray", role: "Resident", genre: "Psychedelic Dub", emoji: "🌀", bio: "Residente histórico de Paraíso Astral. Maestro del dub psicodélico y las texturas sonoras." },
    { id: 3, name: "Astral Void", role: "Special Guest", genre: "Ethereal Vocals", emoji: "🎤", bio: "Vocalista electrónica con presencia escénica única. Sus performances fusionan música y arte visual." },
    { id: 4, name: "Solar Flare", role: "Rising Star", genre: "Acid House", emoji: "⚡", bio: "La estrella emergente del circuito underground. Su sonido ácido y contundente está conquistando los clubs." },
    { id: 5, name: "Luna Edge", role: "Top Performer", genre: "Dark Techno", emoji: "🌙", bio: "Una de las artistas más versátiles de la escena. Sus sets nocturnos son experiencias transformadoras." }
  ];
  
  const a = artists.find(x => x.id === artistId);
  if (!a) return;
  
  // Mock events for this artist (would come from backend)
  const artistEvents = [
    { id: 1, title: "Neon Nebula Rave", venue: "Cosmic Dome, Sector 7", startAt: new Date('2024-10-04T22:00:00Z') },
    { id: 2, title: "Interstellar Rave 2024", venue: "Galactic Station V", startAt: new Date('2024-12-14T22:00:00Z') }
  ].filter(e => e.title.includes(a.name));

  content.innerHTML = `
    <button onclick="navigate('artists')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
    <div style="text-align:center;margin-bottom:1.5rem">
      <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);border:3px solid var(--primary);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:3.5rem;box-shadow:0 0 30px var(--primary-glow)">${a.emoji}</div>
      <span class="badge badge-glass" style="margin-bottom:0.5rem">${a.role}</span>
      <h2 style="font-size:1.8rem;font-weight:900;margin-bottom:0.3rem">${a.name}</h2>
      <div style="color:var(--primary);font-size:0.9rem;font-weight:600">🎵 ${a.genre}</div>
      <div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.3rem">👥 ${(Math.random() * 50 + 10).toFixed(1)}k seguidores</div>
    </div>
    <div class="glass-card" style="padding:1.2rem;margin-bottom:1.5rem">
      <h3 style="font-family:var(--font-display);font-size:0.8rem;margin-bottom:0.5rem;color:var(--primary)">BIO</h3>
      <p style="font-size:0.9rem;line-height:1.7;color:rgba(240,230,255,0.8)">${a.bio}</p>
    </div>
    <div class="section-header"><span class="section-title">Próximas Actuaciones</span></div>
    ${artistEvents.length === 0 ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos próximos</div></div>' :
      artistEvents.map(e => `
        <div class="list-item" onclick="navigate('event-detail','${e.id}')">
          <div style="background:rgba(209,37,244,0.15);border:1px solid var(--border);border-radius:var(--radius);padding:0.4rem 0.6rem;text-align:center;flex-shrink:0">
            <div style="font-size:0.55rem;text-transform:uppercase;color:var(--primary);font-weight:700">${new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short' })}</div>
            <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;line-height:1">${new Date(e.startAt).getDate()}</div>
          </div>
          <div class="list-body"><div class="list-title">${e.title}</div><div class="list-subtitle">${e.venue} · ${new Date(e.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div></div>
          <span style="color:var(--primary)">›</span>
        </div>`).join('')}
    <div style="margin-top:1.5rem">
      <button class="btn btn-primary btn-full" onclick="toast('📤 Perfil compartido!')">📤 Compartir Artista</button>
    </div>
  `;
}

// ── TICKETS PAGE ──────────────────────────────────────────────────────────────
// Evento desde backend GET /api/events (skipAuth). Sin DATABASE.
async function renderTicketsPage(eventId) {
  AppState.selectedEventId = eventId;
  var el = document.getElementById('page-tickets');
  var content = el.querySelector('.page-content');
  content.innerHTML = '<div style="text-align:center;padding:2rem"><div style="font-size:2rem">🔄</div><div style="margin-top:1rem;color:var(--text-muted)">Cargando...</div></div>';

  try {
    var res = await window.ApiClient.get('/api/events?_=' + Date.now(), { skipAuth: true });
    var events = res.data || [];
    var e = events.find(function (x) { return String(x.id) === String(eventId); }) || events[0];
    if (!e) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Evento no encontrado</div><button class="btn btn-primary" style="margin-top:1rem" onclick="navigate(\'events\')">← Eventos</button></div>';
      return;
    }
    var sel = AppState.selectedTicketType;
    content.innerHTML = ''
      + '<button onclick="navigate(\'events\')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Eventos</button>'
      + '<div style="border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--border);margin-bottom:1.5rem">'
      + '<div style="height:160px;background:linear-gradient(135deg,#1a0820,#3d0055);display:flex;align-items:center;justify-content:center;font-size:5rem;position:relative">'
      + (e.coverImage || '🌌')
      + '<span class="badge badge-primary" style="position:absolute;top:0.75rem;left:0.75rem">Evento</span></div>'
      + '<div style="padding:1rem"><h2 style="font-size:1.3rem;font-weight:900">' + (e.title || '') + '</h2>'
      + '<div style="color:var(--text-muted);font-size:0.85rem;margin-top:0.3rem">📅 ' + (e.startAt ? new Date(e.startAt).toLocaleDateString('es-ES') : '') + '</div>'
      + '<div style="color:var(--primary);font-size:0.85rem;font-weight:600">📍 ' + (e.venue || '') + '</div></div></div>'
      + '<h3 style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;margin-bottom:1rem">Seleccionar Tipo de Acceso</h3>'
      + [
        { type: 'general', label: 'Acceso General', desc: 'Acceso completo', price: 45, avail: 'Disponible', remaining: 500 },
        { type: 'vip', label: 'VIP Astral Pass ✦', desc: 'VIP lounge & Fast track', price: 120, avail: 'Limitado', remaining: 200 },
        { type: 'backstage', label: 'Backstage Pass 👑', desc: 'Meet & greet artistas', price: 200, avail: 'Exclusivo', remaining: 50 }
      ].map(function (t) {
        return '<div class="ticket ' + (sel === t.type ? 'selected' : '') + '" onclick="selectTicket(\'' + t.type + '\')" style="margin-bottom:0.75rem">'
          + '<div class="ticket-inner"><div><div style="font-weight:800;font-size:1rem">' + t.label + '</div>'
          + '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem">' + t.desc + '</div>'
          + '<div style="font-size:0.7rem;margin-top:0.3rem;color:var(--green)">' + t.remaining + ' disponibles</div></div>'
          + '<div style="text-align:right"><div style="color:var(--primary);font-family:var(--font-display);font-size:1.1rem;font-weight:700">$' + t.price + '</div>'
          + '<div style="font-size:0.65rem;text-transform:uppercase;font-weight:700;color:var(--text-muted)">' + t.avail + '</div></div></div></div>';
      }).join('')
      + '<div class="glass-card" style="padding:1.5rem;margin:1.5rem 0;text-align:center">'
      + '<div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--primary);font-weight:700;margin-bottom:1rem">Pase Digital de Entrada</div>'
      + '<div style="background:white;border-radius:var(--radius-lg);padding:1rem;display:inline-block;position:relative">' + generateQR() + '</div>'
      + '<div style="margin-top:1rem"><div style="font-family:var(--font-display);font-size:1rem;font-weight:700">AX-' + (100 + Math.floor(Math.random() * 899)) + '-PARAISO</div>'
      + '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem">Escanear en la puerta</div></div></div>'
      + '<button class="btn btn-primary btn-full" style="font-size:1rem;padding:1rem" onclick="purchaseTicket(\'' + e.id + '\')">🛍️ Comprar con Seguridad</button>'
      + '<div style="text-align:center;margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted)">🔒 Pago seguro</div>';
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar evento</div><button class="btn btn-primary" style="margin-top:1rem" onclick="navigate(\'events\')">← Eventos</button></div>';
  }
}

function selectTicket(type) {
  AppState.selectedTicketType = type;
  if (AppState.selectedEventId) renderTicketsPage(AppState.selectedEventId);
}

function generateQR() {
  const pattern = [1,0,1,1,0,1,0, 1,1,0,1,0,0,1, 0,1,1,0,1,1,0, 1,0,0,1,1,0,1, 0,1,0,1,0,1,1, 1,1,1,0,0,1,0, 0,1,1,0,1,0,1];
  return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;width:140px;height:140px;">
    ${pattern.map(b => `<div style="border-radius:2px;background:${b?'#1a0820':'white'}"></div>`).join('')}
  </div>`;
}

function purchaseTicket(eventId) {
  openModal('modal-payment');
}

// ── PAYMENT MODAL ─────────────────────────────────────────────────────────────
// Usa AppState.selectedEventId y selectedTicketType. Sin DATABASE.
function renderPaymentModal() {
  var typeMap = { general: { label: 'Acceso General', price: 45 }, vip: { label: 'VIP Astral Pass', price: 120 }, backstage: { label: 'Backstage Pass', price: 200 } };
  var t = typeMap[AppState.selectedTicketType] || typeMap.general;
  var modal = document.getElementById('modal-payment');
  var title = AppState.selectedEventId ? 'Evento' : 'Entrada';
  modal.querySelector('.bottom-sheet').innerHTML = ''
    + '<div class="sheet-handle"></div><div class="sheet-title">💳 Finalizar Compra</div>'
    + '<div class="glass-card" style="padding:0.75rem 1rem;margin-bottom:1.2rem;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-weight:700">' + title + '</div><div style="font-size:0.8rem;color:var(--text-muted)">' + t.label + '</div></div>'
    + '<div style="font-family:var(--font-display);color:var(--primary);font-size:1.1rem;font-weight:700">$' + t.price + '</div></div>'
    + '<div class="form-group"><label>Nombre completo</label><input class="input" type="text" placeholder="Tu nombre" id="pay-name" /></div>'
    + '<div class="form-group"><label>Email</label><input class="input" type="email" placeholder="tu@email.com" id="pay-email" /></div>'
    + '<div class="form-group"><label>Número de tarjeta</label><input class="input" type="text" placeholder="1234 5678 9012 3456" maxlength="19" /></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem">'
    + '<div class="form-group" style="margin-bottom:0"><label>Vencimiento</label><input class="input" type="text" placeholder="MM/AA" /></div>'
    + '<div class="form-group" style="margin-bottom:0"><label>CVV</label><input class="input" type="text" placeholder="123" maxlength="3" /></div></div>'
    + '<button class="btn btn-primary btn-full" style="font-size:1rem;padding:1rem;margin-top:0.5rem" onclick="confirmPayment()">🔐 Confirmar Pago · $' + t.price + '</button>'
    + '<button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="closeModal(\'modal-payment\')">Cancelar</button>';
}

function confirmPayment() {
  closeModal('modal-payment');
  toast('🎉 ¡Entrada comprada exitosamente!');
  // Note: Payment processing would go here with real backend integration
}

// Noticias: datos locales (sin backend ni DATABASE). Sustituir por GET /api/news cuando exista.
var NEWS_LIST = [];

function renderNews() {
  var el = document.getElementById('page-news');
  if (!el) return;
  var content = el.querySelector('.page-content');
  if (!content) return;
  content.innerHTML = '<div class="section-header"><span class="section-title">Noticias & Novedades</span></div>'
    + '<div class="search-bar" style="margin-bottom:1rem"><span class="search-icon">🔍</span>'
    + '<input class="input" type="text" placeholder="Buscar noticias..." id="search-news" oninput="filterNews(this.value)" /></div>'
    + '<div id="news-list">'
    + (NEWS_LIST.length === 0 ? '<div class="empty-state"><div class="empty-icon">📰</div><div class="empty-title">Sin noticias</div></div>' : NEWS_LIST.map(function (n) {
      return '<div class="list-item" onclick="navigate(\'news-detail\',' + n.id + ')"><div class="list-icon" style="font-size:1.5rem">' + (n.emoji || '📰') + '</div><div class="list-body"><div style="font-size:0.6rem;color:var(--primary);text-transform:uppercase;font-weight:700">' + (n.category || '') + '</div><div class="list-title">' + (n.title || '') + '</div></div></div>';
    }).join(''))
    + '</div>';
}

function filterNews(q) {
  var filtered = NEWS_LIST.filter(function (n) {
    return (n.title && n.title.toLowerCase().indexOf((q || '').toLowerCase()) !== -1) ||
      (n.category && n.category.toLowerCase().indexOf((q || '').toLowerCase()) !== -1);
  });
  var list = document.getElementById('news-list');
  if (list) list.innerHTML = filtered.map(function (n) {
    return '<div class="list-item" onclick="navigate(\'news-detail\',' + n.id + ')"><div class="list-icon" style="font-size:1.5rem">' + (n.emoji || '📰') + '</div><div class="list-body"><div style="font-size:0.6rem;color:var(--primary);text-transform:uppercase;font-weight:700">' + (n.category || '') + '</div><div class="list-title">' + (n.title || '') + '</div></div></div>';
  }).join('');
}

function renderNewsDetail(newsId) {
  var n = NEWS_LIST.find(function (x) { return x.id === newsId; });
  var el = document.getElementById('page-news-detail');
  var content = el.querySelector('.page-content');
  if (!n) {
    content.innerHTML = '<button onclick="navigate(\'news\')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Noticias</button><div class="empty-state"><div class="empty-icon">📰</div><div class="empty-title">Noticia no encontrada</div></div>';
    return;
  }
  content.innerHTML = '<button onclick="navigate(\'news\')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Noticias</button>'
    + '<div style="text-align:center;font-size:5rem;margin:1.5rem 0">' + (n.emoji || '📰') + '</div>'
    + '<span class="badge badge-glass">' + (n.category || '') + '</span>'
    + '<h2 style="font-size:1.4rem;font-weight:900;margin:0.75rem 0">' + (n.title || '') + '</h2>'
    + '<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:1.2rem">📅 ' + (n.date || '') + '</div><div class="divider"></div>'
    + '<p style="font-size:0.95rem;line-height:1.8;margin-top:1rem;color:rgba(240,230,255,0.85)">' + (n.body || '') + '</p>'
    + '<div style="margin-top:1.5rem"><button class="btn btn-outline btn-full" onclick="toast(\'📤 Compartido!\')">📤 Compartir</button></div>';
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
// Estado local (sin backend ni DATABASE). Sustituir por API cuando exista.
var NOTIFICATIONS_LIST = [];

function renderNotifications() {
  var el = document.getElementById('page-notifications');
  var content = el.querySelector('.page-content');
  var unreadCount = NOTIFICATIONS_LIST.filter(function (n) { return n.unread; }).length;
  content.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">'
    + '<span style="font-size:0.8rem;color:var(--text-muted)">' + unreadCount + ' sin leer</span>'
    + '<button class="btn btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.75rem" onclick="markAllRead()">Marcar todo</button></div>'
    + '<div id="notif-list">'
    + (NOTIFICATIONS_LIST.length === 0 ? '<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">Sin notificaciones</div></div>' : NOTIFICATIONS_LIST.map(function (n) {
      return '<div class="notif-item ' + (n.unread ? 'unread' : '') + '" onclick="markRead(' + n.id + ')">'
        + (n.unread ? '<div class="notif-dot-badge"></div>' : '<div style="width:8px;flex-shrink:0"></div>')
        + '<div class="notif-body"><div class="notif-text">' + (n.text || '') + '</div><div class="notif-time">' + (n.time || '') + '</div></div></div>';
    }).join(''))
    + '</div>';
}

function markRead(id) {
  var n = NOTIFICATIONS_LIST.find(function (x) { return x.id === id; });
  if (n) n.unread = false;
  updateNotifBadge();
  renderNotifications();
}

function markAllRead() {
  NOTIFICATIONS_LIST.forEach(function (n) { n.unread = false; });
  updateNotifBadge();
  renderNotifications();
}

function updateNotifBadge() {
  var count = NOTIFICATIONS_LIST.filter(function (n) { return n.unread; }).length;
  var dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
async function renderAdmin() {
  const el = document.getElementById('page-admin');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  showLoading(content, 'Cargando panel administrativo...');
  
  try {
    // Usar usuario de estado global o refrescar desde /api/me
    var user = AppState.currentUser;
    if (!user) {
      var userResponse = await window.ApiClient.get('/api/me');
      user = userResponse.data;
      AppState.currentUser = user;
    }

    // Get events for admin stats (público)
    const eventsResponse = await window.ApiClient.get('/api/events?_=' + Date.now(), { skipAuth: true });
    const events = eventsResponse.data || [];
    
    // Calculate stats from real data
    const totalEvents = events.length;
    const publishedEvents = events.filter(e => e.status === 'PUBLISHED').length;
    const upcomingEvents = events.filter(e => new Date(e.startAt) > new Date()).length;
    
    content.innerHTML = `
    <div class="admin-header-card">
      <div style="position:relative;z-index:1">
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;opacity:0.8;margin-bottom:0.3rem">Panel Administrativo</div>
        <h2 style="font-size:1.2rem;font-weight:900">👋 ${user.displayName || user.email}</h2>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem">
          <span class="badge" style="background:rgba(255,255,255,0.2);color:white">🔴 ADMIN</span>
          <span style="font-size:0.78rem;opacity:0.8">${new Date().toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'short'})}</span>
        </div>
      </div>
    </div>

    <div class="section-header"><span class="section-title">Métricas Clave</span><span class="badge badge-live">LIVE</span></div>
    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="stat-card glow-card">
        <div class="stat-label">Total Eventos</div>
        <div class="stat-value">${totalEvents}</div>
        <div class="stat-change stat-up">� ${publishedEvents} Publicados</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Próximos</div>
        <div class="stat-value">${upcomingEvents}</div>
        <div class="stat-change stat-up">� Por venir</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rol</div>
        <div class="stat-value">${user.role}</div>
        <div class="stat-change stat-up">� Administrador</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Estado</div>
        <div class="stat-value">${user.status}</div>
        <div class="stat-change stat-up">✅ Activo</div>
      </div>
    </div>

    <div class="section-header"><span class="section-title">Gestión de Eventos</span></div>
    <div class="glass-card" style="padding:1.2rem;margin-bottom:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
        <div>
          <div style="font-size:1.8rem;font-weight:900">${totalEvents}</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">Eventos totales</div>
        </div>
        <button class="btn btn-primary" onclick="if(window.AppState)window.AppState.editingEvent=null;openModal('modal-add-event')">
          ➕ Nuevo Evento
        </button>
      </div>
      
      <div style="margin-top:1rem">
        ${events.slice(0, 3).map(event => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600">${event.title}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${new Date(event.startAt).toLocaleDateString('es-ES')} • ${event.venue}</div>
            </div>
            <span class="badge ${event.status === 'PUBLISHED' ? 'badge-live' : 'badge-glass'}">
              ${event.status}
            </span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section-header"><span class="section-title">Acciones Rápidas</span></div>
    <div class="glass-card" style="padding:1.2rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <button class="btn btn-primary" onclick="navigate('events')">
          📅 Ver Eventos
        </button>
        <button class="btn btn-outline" onclick="navigate('rrpp')">
          👥 Gestión RRPP
        </button>
        <button class="btn btn-outline" onclick="testRBAC()">
          🔐 Test RBAC
        </button>
        <button class="btn btn-outline" onclick="handleLogout()">
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  `;
    
  } catch (error) {
    console.error('Error loading admin panel:', error);
    showErrorState(content, 'Error al cargar panel administrativo', 'renderAdmin');
  }
}

// ── RRPP PAGE ────────────────────────────────────────────────────────────────
// Sin backend RRPP ni DATABASE. Lista local vacía; sustituir por GET /api/rrpp cuando exista.
var RRPP_LIST = [];

function renderRRPP() {
  var el = document.getElementById('page-rrpp');
  var content = el.querySelector('.page-content');
  var totalRev = RRPP_LIST.reduce(function (s, r) { return s + (r.revenue || 0); }, 0);
  var totalComm = RRPP_LIST.reduce(function (s, r) { return s + (r.earned || 0); }, 0);
  var totalSold = RRPP_LIST.reduce(function (s, r) { return s + (r.sold || 0); }, 0);
  var activeCount = RRPP_LIST.filter(function (r) { return r.active; }).length;

  content.innerHTML = '<div class="stats-grid" style="margin-bottom:1.5rem">'
    + '<div class="stat-card"><div class="stat-label">Revenue RRPP</div><div class="stat-value" style="font-size:1.1rem">$' + (totalRev / 1000).toFixed(1) + 'k</div></div>'
    + '<div class="stat-card"><div class="stat-label">Comisiones</div><div class="stat-value" style="font-size:1.1rem;color:var(--green)">$' + totalComm.toFixed(0) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">Entradas</div><div class="stat-value" style="font-size:1.1rem">' + totalSold + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">RRPP Activos</div><div class="stat-value" style="font-size:1.1rem">' + activeCount + '</div></div></div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">'
    + '<div class="section-title font-display">Equipo RRPP</div>'
    + '<button class="btn btn-primary" style="padding:0.4rem 0.9rem;font-size:0.8rem" onclick="openModal(\'modal-add-rrpp\')">+ Agregar</button></div>'
    + (RRPP_LIST.length === 0 ? '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Sin datos RRPP</div><div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem">El backend puede exponer GET /api/rrpp en el futuro.</div></div>' : RRPP_LIST.map(function (r) {
      return '<div class="rrpp-card" onclick="navigate(\'rrpp-detail\',' + r.id + ')">'
        + '<div class="rrpp-avatar" style="opacity:' + (r.active ? 1 : 0.5) + '">' + (r.name ? r.name[0] : '?') + '</div>'
        + '<div class="rrpp-info"><div class="rrpp-name">' + (r.name || '') + '</div>'
        + '<div class="rrpp-stats">🎫 ' + (r.sold || 0) + ' vendidas · 📧 ' + (r.email || '') + '</div></div>'
        + '<div class="rrpp-revenue"><div class="rrpp-amount">$' + ((r.revenue || 0) / 1000).toFixed(1) + 'k</div></div></div>';
    }).join(''))
    + '<div style="margin-top:1rem"><button class="btn btn-outline btn-full" onclick="exportData()">📊 Exportar reporte RRPP</button></div>';
}

function renderRRPPDetail(rrppId) {
  var r = RRPP_LIST.find(function (x) { return x.id === rrppId; });
  var el = document.getElementById('page-rrpp-detail');
  var content = el.querySelector('.page-content');
  if (!r) {
    content.innerHTML = '<button onclick="navigate(\'rrpp\')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← RRPP</button><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">RRPP no encontrado</div></div>';
    return;
  }
  content.innerHTML = '<button onclick="navigate(\'rrpp\')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← RRPP</button>'
    + '<div style="text-align:center;margin-bottom:1.5rem"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700">' + (r.name ? r.name[0] : '?') + '</div>'
    + '<h2 style="font-size:1.5rem;font-weight:900">' + (r.name || '') + '</h2><div style="color:var(--text-muted);font-size:0.85rem">' + (r.email || '') + '</div></div>'
    + '<div class="stats-grid" style="margin-bottom:1.5rem">'
    + '<div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">$' + ((r.revenue || 0) / 1000).toFixed(1) + 'k</div></div>'
    + '<div class="stat-card"><div class="stat-label">Entradas</div><div class="stat-value">' + (r.sold || 0) + '</div></div></div>';
}

function toggleRRPP(id) {
  var r = RRPP_LIST.find(function (x) { return x.id === id; });
  if (r) { r.active = !r.active; toast(r.active ? '✅ RRPP activado' : '❌ RRPP desactivado'); renderRRPPDetail(id); }
}

function renderAddRRPPModal() {
  var modal = document.getElementById('modal-add-rrpp');
  modal.querySelector('.bottom-sheet').innerHTML = '<div class="sheet-handle"></div><div class="sheet-title">👥 Nuevo RRPP</div>'
    + '<div class="form-group"><label>Nombre completo</label><input class="input" type="text" placeholder="Nombre" id="rrpp-name" /></div>'
    + '<div class="form-group"><label>Email</label><input class="input" type="email" placeholder="email@ejemplo.com" id="rrpp-email" /></div>'
    + '<div class="form-group"><label>Teléfono</label><input class="input" type="tel" placeholder="+54 911..." id="rrpp-phone" /></div>'
    + '<div class="form-group"><label>Comisión (%)</label><input class="input" type="number" placeholder="15" value="15" min="5" max="30" id="rrpp-comm" /></div>'
    + '<button class="btn btn-primary btn-full" style="margin-top:0.5rem" onclick="addRRPP()">✅ Agregar RRPP</button>'
    + '<button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="closeModal(\'modal-add-rrpp\')">Cancelar</button>';
}

function addRRPP() {
  var name = document.getElementById('rrpp-name') && document.getElementById('rrpp-name').value.trim();
  var email = document.getElementById('rrpp-email') && document.getElementById('rrpp-email').value.trim();
  if (!name || !email) { toast('⚠️ Completa nombre y email'); return; }
  RRPP_LIST.push({ id: Date.now(), name: name, email: email, phone: '', commission: 0.15, sold: 0, revenue: 0, earned: 0, joinDate: new Date().toISOString().slice(0, 10), active: true, sales: [] });
  closeModal('modal-add-rrpp');
  toast('✅ ' + name + ' agregado como RRPP (local). Backend puede persistir en el futuro.');
  renderRRPP();
}

// ── PROFILE PAGE ─────────────────────────────────────────────────────────────
// Usa AppState.currentUser (GET /api/me). Sin DATABASE.
function renderProfile() {
  var user = AppState.currentUser;
  var displayName = (user && user.displayName) ? user.displayName : (user && user.email) ? user.email : 'Usuario';
  var roleLabel = (user && user.role) ? user.role : '—';
  var el = document.getElementById('page-profile');
  var content = el.querySelector('.page-content');
  content.innerHTML = '<div style="margin:-0.5rem -1rem 1.5rem;background:linear-gradient(135deg,#1a0820,#3d0055,#1a0820);height:140px;display:flex;align-items:center;justify-content:center;font-size:4rem;position:relative">🌌</div>'
    + '<div style="text-align:center;margin-top:-50px;position:relative;z-index:1;margin-bottom:1.5rem">'
    + '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);border:3px solid var(--primary);margin:0 auto 0.75rem;display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 0 20px var(--primary-glow)">👤</div>'
    + '<h2 style="font-size:1.3rem;font-weight:900">' + displayName + '</h2>'
    + '<div style="color:var(--primary);font-size:0.85rem;font-weight:600">Paraíso Astral · ' + roleLabel + '</div></div>'
    + '<div class="stats-grid" style="margin-bottom:1.5rem">'
    + '<div class="stat-card" style="text-align:center"><div class="stat-label">Eventos</div><div class="stat-value">—</div></div>'
    + '<div class="stat-card" style="text-align:center"><div class="stat-label">Artistas</div><div class="stat-value">—</div></div>'
    + '<div class="stat-card" style="text-align:center"><div class="stat-label">RRPP</div><div class="stat-value">' + RRPP_LIST.length + '</div></div>'
    + '<div class="stat-card" style="text-align:center"><div class="stat-label">Noticias</div><div class="stat-value">' + NEWS_LIST.length + '</div></div></div>'
    + '<div class="section-title font-display" style="margin-bottom:0.75rem">Configuración</div>'
    + [
      { icon: '🔔', label: 'Notificaciones', action: "navigate('notifications')" },
      { icon: '👥', label: 'Gestionar RRPP', action: "navigate('rrpp')" },
      { icon: '📊', label: 'Panel Admin', action: "navigate('admin')" },
      { icon: '📤', label: 'Exportar Datos', action: "exportData()" },
      { icon: '📱', label: 'Instalar App (PWA)', action: "installPWA()" },
      { icon: '🌙', label: 'Modo oscuro', action: "toast('🌙 Ya estás en modo oscuro!')" }
    ].map(function (item) {
      return '<div class="list-item" onclick="' + item.action + '" style="margin-bottom:0.5rem"><div class="list-icon">' + item.icon + '</div><div class="list-body"><div class="list-title">' + item.label + '</div></div><span style="color:var(--primary)">›</span></div>';
    }).join('');
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function installPWA() {
  if (deferredPrompt) { deferredPrompt.prompt(); }
  else { toast('📱 Abre este sitio en Chrome y usa "Añadir a pantalla de inicio"'); }
}

// ── ADD EVENT MODAL ─────────────────────────────────────────────────────────
function openEditEventModal(eventId) {
  window.ApiClient.get('/api/events/' + eventId).then(function (e) {
    if (!window.AppState) window.AppState = {};
    window.AppState.editingEvent = e;
    window.openModal('modal-add-event');
  }).catch(function (err) {
    toast('❌ No se pudo cargar el evento');
    console.error(err);
  });
}

function renderAddEventModal() {
  var editing = window.AppState && window.AppState.editingEvent;
  var isEdit = !!editing;
  var title = isEdit ? '✏️ Editar Evento' : '🎉 Nuevo Evento';
  var submitLabel = isEdit ? 'Guardar cambios' : '✅ Crear Evento';
  var dateVal = '';
  var timeVal = '20:00';
  var titleVal = '';
  var venueVal = '';
  var lineupVal = '';
  var coverPreviewHtml = '';
  var coverUrlAttr = '';
  if (isEdit && editing) {
    titleVal = (editing.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    venueVal = (editing.venue || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    lineupVal = (editing.description || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (editing.startAt) {
      var d = new Date(editing.startAt);
      dateVal = d.toISOString().slice(0, 10);
      var h = d.getHours();
      var m = d.getMinutes();
      timeVal = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    if (editing.coverImage) {
      var safeCover = String(editing.coverImage).replace(/"/g, '&quot;').replace(/</g, '&lt;');
      coverPreviewHtml = '<img src="' + safeCover + '" alt="" style="max-width:100%;max-height:120px;border-radius:var(--radius);border:1px solid var(--border)">';
      coverUrlAttr = ' data-cover-url="' + safeCover + '"';
    }
  }
  const modal = document.getElementById('modal-add-event');
  modal.querySelector('.bottom-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${title}</div>
    <div class="form-group"><label>Nombre del evento</label><input class="input" type="text" placeholder="Ej: Cosmic Rave Vol. 3" id="ev-title" value="${titleVal}" /></div>
    <div class="form-group"><label>Venue / Lugar</label><input class="input" type="text" placeholder="Nombre del lugar" id="ev-venue" value="${venueVal}" /></div>
    <div class="form-group"><label>Fecha</label><input class="input" type="date" id="ev-date" value="${dateVal}" /></div>
    <div class="form-group"><label>Horario</label>
      <div class="horario-buttons" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem">
        <button type="button" class="btn btn-ghost btn-sm ev-time-btn" data-time="20:00">20:00</button>
        <button type="button" class="btn btn-ghost btn-sm ev-time-btn" data-time="21:00">21:00</button>
        <button type="button" class="btn btn-ghost btn-sm ev-time-btn" data-time="22:00">22:00</button>
        <button type="button" class="btn btn-ghost btn-sm ev-time-btn" data-time="23:00">23:00</button>
        <button type="button" class="btn btn-ghost btn-sm ev-time-btn" data-time="00:00">00:00</button>
      </div>
      <input class="input" type="text" placeholder="22:00 - 06:00" id="ev-time" value="${timeVal}" />
    </div>
    <div class="form-group"><label>Lineup (separado por comas)</label><input class="input" type="text" placeholder="DJ1, DJ2, DJ3" id="ev-lineup" value="${lineupVal}" /></div>
    <div class="form-group"><label>Imagen de portada</label><input class="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" id="ev-cover" /><div id="ev-cover-preview" style="margin-top:0.5rem;min-height:0"${coverUrlAttr}>${coverPreviewHtml}</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1rem">
      <div class="form-group" style="margin-bottom:0"><label>General $</label><input class="input" type="number" placeholder="45" id="ev-gen" /></div>
      <div class="form-group" style="margin-bottom:0"><label>VIP $</label><input class="input" type="number" placeholder="120" id="ev-vip" /></div>
      <div class="form-group" style="margin-bottom:0"><label>Backstage $</label><input class="input" type="number" placeholder="200" id="ev-back" /></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="addEvent()">${submitLabel}</button>
    <button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="if(window.AppState)window.AppState.editingEvent=null;closeModal('modal-add-event')">Cancelar</button>
  `;
  modal.querySelectorAll('.ev-time-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById('ev-time');
      if (input) input.value = this.getAttribute('data-time');
    });
  });
  var coverInput = document.getElementById('ev-cover');
  if (coverInput) {
    coverInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      var preview = document.getElementById('ev-cover-preview');
      if (!preview) return;
      preview.innerHTML = '';
      if (!file) return;
      preview.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">Subiendo…</span>';
      window.ApiClient.uploadFile('/api/upload/event-cover', file).then(function (r) {
        preview.innerHTML = '<img src="' + r.url + '" alt="" style="max-width:100%;max-height:120px;border-radius:var(--radius);border:1px solid var(--border)">';
        preview.setAttribute('data-cover-url', r.url);
      }).catch(function (err) {
        preview.innerHTML = '<span style="color:var(--red, #f44);font-size:0.85rem">' + (err.message || 'Error al subir') + '</span>';
      });
    });
  }
}

async function addEvent() {
  var editing = window.AppState && window.AppState.editingEvent;
  var titleEl = document.getElementById('ev-title');
  var venueEl = document.getElementById('ev-venue');
  var dateEl = document.getElementById('ev-date');
  var timeEl = document.getElementById('ev-time');
  var lineupEl = document.getElementById('ev-lineup');
  var title = titleEl ? titleEl.value.trim() : '';
  var venue = venueEl ? venueEl.value.trim() : '';
  var date = dateEl ? dateEl.value : '';
  if (!title || !venue || !date) { toast('⚠️ Completa nombre, lugar y fecha'); return; }

  var timeStr = (timeEl && timeEl.value.trim()) || '20:00';
  var timePart = (timeStr.split(/\s+-\s+/)[0] || timeStr.split(/\s+/)[0] || '20:00').trim();
  if (!/^\d{1,2}:\d{2}/.test(timePart)) timePart += ':00';
  var startAt = date + 'T' + timePart + ':00';

  var description = (lineupEl && lineupEl.value.trim()) || '';
  var previewEl = document.getElementById('ev-cover-preview');
  var coverImage = (previewEl && previewEl.getAttribute('data-cover-url')) || undefined;

  if (editing && editing.id) {
    var payload = { title: title, venue: venue, startAt: startAt, description: description || undefined, coverImage: coverImage };
    closeModal('modal-add-event');
    try {
      await window.ApiClient.request('/api/events/' + editing.id, { method: 'PATCH', body: payload });
      if (window.AppState) window.AppState.editingEvent = null;
      toast('✅ Evento actualizado.');
      renderEventDetail(editing.id);
      var adminContent = document.querySelector('#page-admin .page-content');
      if (adminContent) renderAdmin();
    } catch (err) {
      console.error('[addEvent] PATCH error:', err);
      toast('❌ ' + (err && err.message ? err.message : 'Error al actualizar'));
    }
    return;
  }

  var payload = { title: title, venue: venue, startAt: startAt, description: description || undefined, coverImage: coverImage };
  console.log('[addEvent] POST /api/events payload:', payload);
  closeModal('modal-add-event');
  try {
    var res = await window.ApiClient.post('/api/events', payload);
    console.log('[addEvent] POST /api/events success:', res);
    toast('🎉 Evento creado correctamente.');
    var created = [res];
    renderHome(created);
    renderEvents('upcoming', created);
    var adminContent = document.querySelector('#page-admin .page-content');
    if (adminContent) renderAdmin();
  } catch (err) {
    console.error('[addEvent] POST /api/events error:', err);
    toast('❌ ' + (err && err.message ? err.message : 'Error al crear el evento'));
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
// Solo pre-render de páginas públicas. Admin/RRPP se renderan al navegar (requieren auth).
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    renderHome();
    renderEvents();
    renderArtists();
    renderNews();
    renderNotifications();
    renderProfile();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
    updateNotifBadge();
    navigate('home');
  }, 200);
});

// Handle nav-detail pages navigation
function navigateWithData(pageId, data) {
  if (pageId === 'news-detail') {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-news-detail');
    page.classList.add('active');
    renderNewsDetail(data);
    return;
  }
  navigate(pageId, data);
}
// Override navigate for news-detail
const _nav = navigate;
window.navigate = function(pageId, data) {
  if (pageId === 'news-detail') { renderNewsDetail(data); document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById('page-news-detail').classList.add('active'); return; }
  _nav(pageId, data);
};

// ===== AUTHENTICATION FUNCTIONS =====

/**
 * Show login page
 */
function showLogin() {
  navigate('login');
}

/**
 * Show register page
 */
function showRegister() {
  navigate('register');
}

/**
 * Handle login form submission
 * signInWithEmailAndPassword → getIdToken() → GET /api/me con Authorization Bearer → guardar usuario en AppState
 */
async function handleLogin(event) {
  event.preventDefault();

  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  var errorDiv = document.getElementById('login-error');
  var btnText = document.getElementById('login-btn-text');
  var loading = document.getElementById('login-loading');

  btnText.style.display = 'none';
  loading.style.display = 'inline';
  errorDiv.style.display = 'none';

  try {
    // 1) Login con Firebase (email + password)
    var result = await window.Auth.login(email, password);
    if (!result.success) {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
      return;
    }

    // 2) Obtener token con user.getIdToken()
    var token = await window.Auth.getIdToken();
    if (!token) {
      errorDiv.textContent = 'Error al obtener token de autenticación';
      errorDiv.style.display = 'block';
      return;
    }

    // 3) GET /api/me con header Authorization: Bearer <token>
    var response = await window.ApiClient.get('/api/me');

    // 4) Si response no es 200 / success → mostrar error y no permitir acceso
    if (response.status !== 'success' || !response.data) {
      await window.Auth.logout();
      AppState.currentUser = null;
      errorDiv.textContent = 'Error al validar usuario con el servidor';
      errorDiv.style.display = 'block';
      return;
    }

    // 5) Guardar en estado global (id, email, role, status, displayName, avatarUrl)
    AppState.currentUser = response.data;
    var userData = response.data;

    toast('¡Bienvenido ' + (userData.displayName || userData.email) + '!');

    var returnTo = pendingReturnTo;
    pendingReturnTo = null;

    // 6) Render según rol
    if (userData.role === 'ADMIN') {
      navigate(returnTo || 'admin');
    } else if (userData.role === 'ARTIST') {
      navigate(returnTo || 'profile');
    } else if (userData.role === 'PR') {
      navigate(returnTo || 'rrpp');
    } else {
      navigate(returnTo || 'home');
    }
  } catch (error) {
    await window.Auth.logout();
    AppState.currentUser = null;

    if (error.message === 'Authentication required') {
      errorDiv.textContent = 'Error de autenticación. Por favor intenta nuevamente.';
    } else if (error.message === 'Access denied') {
      errorDiv.textContent = 'No tienes permisos para acceder al sistema.';
    } else if (error.message && error.message.indexOf('User not found') !== -1) {
      errorDiv.textContent = 'Usuario no encontrado en el sistema. Contacta al administrador.';
    } else {
      errorDiv.textContent = error.message || 'Error de conexión. Intenta nuevamente.';
    }
    errorDiv.style.display = 'block';
  } finally {
    btnText.style.display = 'inline';
    loading.style.display = 'none';
  }
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
  event.preventDefault();
  
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const errorDiv = document.getElementById('register-error');
  const btnText = document.getElementById('register-btn-text');
  const loading = document.getElementById('register-loading');
  
  // Validate passwords match
  if (password !== confirm) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Show loading state
  btnText.style.display = 'none';
  loading.style.display = 'inline';
  errorDiv.style.display = 'none';
  
  try {
    const result = await window.Auth.register(email, password);
    
    if (result.success) {
      toast('🌟 ¡Cuenta creada exitosamente!');
      navigate('home');
    } else {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
    errorDiv.style.display = 'block';
  } finally {
    // Hide loading state
    btnText.style.display = 'inline';
    loading.style.display = 'none';
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    await window.Auth.logout();
    AppState.currentUser = null;
    toast('👋 Sesión cerrada');
    navigate('login');
  } catch (error) {
    toast('Error al cerrar sesión');
  }
}

/**
 * Check authentication state and redirect if needed
 */
function checkAuthState() {
  var user = window.Auth && typeof window.Auth.getCurrentUser === 'function' ? window.Auth.getCurrentUser() : null;
  if (!user) {
    navigate('login');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
