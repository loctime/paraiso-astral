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
  if (pageId === 'contact') { renderContact(); }
  if (pageId === 'admin') { renderAdmin(); }
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
function renderPortalLoader(message = 'Sintonizando frecuencia astral...') {
  const safeMessage = String(message).replace(/</g, '&lt;');
  return `
    <div class="psy-loader" role="status" aria-live="polite" aria-busy="true">
      <div class="psy-loader-bg"></div>
      <div class="psy-loader-orbit"></div>
      <div class="psy-loader-ring"></div>
      <div class="psy-loader-core"></div>
      <div class="psy-loader-text">${safeMessage}</div>
    </div>
  `;
}

function showLoading(container, message = 'Cargando...') {
  if (!container) return;
  container.innerHTML = renderPortalLoader(message);
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

  // Setup form listeners
  setupFormListeners();

  // Público por defecto: arrancamos en home, sin backend /api/me.
  // El hash de URL (#events, #artists, etc.) sigue respetándose.
  // Solo /admin pide login (lo maneja navigate() con canAccessRoute).
  AppState.currentUser = null;

  setTimeout(function () {
    var hash = window.location.hash.slice(1);
    if (hash) {
      handleInitialRoute();
    } else {
      navigate('home');
    }
  }, 50);
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
async function renderHome() {
  const el = document.getElementById('page-home');
  const content = el.querySelector('.page-content');
  showLoading(content, 'Sintonizando frecuencia astral...');

  try {
    // Fetch site config, events y artists en paralelo desde DataSource.
    const [cfgRes, evRes, arRes] = await Promise.all([
      window.DataSource.getSiteConfig(),
      window.DataSource.getEvents(),
      window.DataSource.getArtists()
    ]);

    const cfg = cfgRes.data || {};
    const allEvents = Array.isArray(evRes.data) ? evRes.data : [];
    const artists = Array.isArray(arRes.data) ? arRes.data : [];

    // Solo eventos publicados, ordenados por fecha ascendente.
    const now = new Date();
    const upcoming = allEvents
      .filter(e => e.status === 'PUBLISHED')
      .filter(e => !e.startAt || new Date(e.startAt) >= now)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    const featured = upcoming[0] || null;
    const nextEvents = upcoming.slice(featured ? 1 : 0, featured ? 5 : 4);
    const topArtists = artists.slice(0, 6);

    const safe = (window.ApiClient && window.ApiClient.sanitizeHTML)
      ? window.ApiClient.sanitizeHTML
      : function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

    const heroStyle = cfg.heroImage
      ? 'background-image:linear-gradient(180deg,rgba(10,0,20,0.35),rgba(10,0,20,0.85)),url(' + String(cfg.heroImage).replace(/"/g, '') + ');background-size:cover;background-position:center'
      : 'background:linear-gradient(135deg,#1a0820,#2d0040 50%,#0a0012)';

    content.innerHTML = `
      <!-- HERO -->
      <div class="hero" style="${heroStyle};border-radius:var(--radius-lg);padding:2.5rem 1rem;margin-bottom:1.5rem;text-align:center;border:1px solid var(--border);overflow:hidden">
        <div style="font-size:3rem;margin-bottom:0.5rem">🌌</div>
        <h1 style="font-family:var(--font-display);font-size:clamp(1.1rem, 5.5vw, 1.75rem);font-weight:900;margin:0;letter-spacing:0;line-height:1.15;word-break:break-word;overflow-wrap:break-word;max-width:100%">${safe(cfg.name || 'PARAÍSO ASTRAL')}</h1>
        <p style="color:var(--text-muted);margin:0.5rem 0 0;font-size:0.95rem">${safe(cfg.tagline || 'Electronic Universe')}</p>
        ${cfg.bio ? `<p style="color:var(--text-muted);margin:1rem auto 0;font-size:0.85rem;max-width:480px">${safe(cfg.bio)}</p>` : ''}
      </div>

      <!-- FEATURED EVENT -->
      ${featured ? `
        <div class="section-header"><span class="section-title">Próximo evento</span></div>
        <div class="card" style="cursor:pointer;margin-bottom:1.5rem" onclick="navigate('event-detail','${featured.id}')">
          ${featured.coverImage ? `<img src="${String(featured.coverImage).replace(/"/g, '&quot;')}" alt="" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0">` : '<div style="height:160px;background:linear-gradient(135deg,#1a0820,#2d0040);display:flex;align-items:center;justify-content:center;font-size:3.5rem;border-radius:var(--radius) var(--radius) 0 0">🌌</div>'}
          <div style="padding:1rem">
            <div style="font-weight:800;font-size:1.15rem;margin-bottom:0.3rem">${safe(featured.title)}</div>
            <div style="color:var(--text-muted);font-size:0.85rem">${new Date(featured.startAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · ${safe(featured.venue || '')}</div>
          </div>
        </div>
      ` : ''}

      <!-- NEXT EVENTS -->
      ${nextEvents.length ? `
        <div class="section-header">
          <span class="section-title">${featured ? 'Más eventos' : 'Próximos eventos'}</span>
          <a class="section-link" onclick="navigate('events')">Ver todos</a>
        </div>
        <div style="display:grid;gap:0.75rem;margin-bottom:1.5rem">
          ${nextEvents.map(e => `
            <div class="card" style="padding:0.85rem 1rem;cursor:pointer;display:flex;align-items:center;gap:0.9rem" onclick="navigate('event-detail','${e.id}')">
              <div style="width:52px;height:52px;border-radius:var(--radius);background:linear-gradient(135deg,#1a0820,#2d0040);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">${e.coverImage ? `<img src="${String(e.coverImage).replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)">` : '🌌'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe(e.title)}</div>
                <div style="color:var(--text-muted);font-size:0.78rem">${new Date(e.startAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${safe(e.venue || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- ARTISTS PREVIEW -->
      ${topArtists.length ? `
        <div class="section-header">
          <span class="section-title">Artistas</span>
          <a class="section-link" onclick="navigate('artists')">Ver todos</a>
        </div>
        <div class="h-scroll" style="margin-bottom:1.5rem">
          ${topArtists.map(a => `
            <div style="min-width:100px;text-align:center;cursor:pointer" onclick="navigate('artist-detail','${a.id}')">
              <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 0.4rem;overflow:hidden">${a.photo ? `<img src="${String(a.photo).replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover">` : (a.emoji || '🎧')}</div>
              <div style="font-size:0.78rem;font-weight:700">${safe(a.name)}</div>
              <div style="font-size:0.68rem;color:var(--text-muted)">${safe(a.genre || '')}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- FOOTER CTA -->
      <div class="card" style="padding:1.25rem;text-align:center;margin-bottom:1rem">
        <div style="font-weight:700;margin-bottom:0.25rem">¿Querés contactarnos?</div>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem">Booking, prensa, colaboraciones</div>
        <button class="btn btn-primary" onclick="navigate('contact')">✉️ Contacto</button>
      </div>

      <div style="text-align:center;margin-bottom:1rem">
        <a onclick="navigate('admin')" style="color:var(--text-muted);font-size:0.7rem;text-decoration:none;cursor:pointer;opacity:0.5">🔐 Admin</a>
      </div>
    `;
  } catch (error) {
    console.error('Error loading home:', error);
    showErrorState(content, 'Error al cargar la página', 'renderHome');
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
    + '<button type="button" class="btn btn-primary event-compact-btn-vermas" onclick="navigate(\'event-detail\',\'' + safeId + '\')">Ver más</button>'
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
            <button type="button" class="btn btn-primary" style="padding:0.5rem 0.9rem;font-size:0.8rem" onclick="event.stopPropagation();navigate('event-detail','${safeId}')">Ver detalle</button>
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

    <div id="events-list">${renderPortalLoader('Sintonizando cartelera astral...')}</div>
  `;
  
  try {
    // Data desde DataSource (mock hoy, Firestore en Fase 2)
    const response = await window.DataSource.getEvents();
    var events = response.data || [];
    if (!events || events.length === 0) {
      document.getElementById('events-list').innerHTML = '<div class="empty-state"><div class="empty-icon">🌌</div><div class="empty-title">Sin eventos cargados todavía</div><div style="color:var(--text-muted);margin-top:0.5rem;font-size:0.85rem">Cargá el primero desde el panel Admin</div></div>';
      return;
    }

    // Filtro por tipo (próximos / pasados). Live se trata como próximo que ya arrancó.
    const now = new Date();
    const filteredEvents = events.filter(e => {
      if (e.status !== 'PUBLISHED') return false;
      const start = new Date(e.startAt);
      if (filter === 'past') return start < now;
      if (filter === 'live') return start <= now && (!e.endAt || new Date(e.endAt) > now);
      return start >= now;
    });

    document.getElementById('events-list').innerHTML = filteredEvents.length === 0
      ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos en esta sección</div></div>'
      : filteredEvents.map(e => renderEventCardFull(e)).join('');

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
  // Calendario dinámico: mes/año actuales
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-day other-month">${new Date(year, month, -firstDay + i + 1).getDate()}</div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today;
    cells += `<div class="cal-day ${isToday ? 'active' : ''}">${d}</div>`;
  }

  return `
    <div class="glass-card" style="padding:1rem;margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <span class="font-display" style="font-size:0.85rem;font-weight:700">${monthNames[month]} ${year}</span>
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

// ── EVENT DETAIL (dominant + regional colors) ──────────────────────────────────
var EVENT_DETAIL_DEFAULT_GLOW = '209, 37, 244';

/** Helper: from RGBA data and index, return "r,g,b" skipping dark pixels; optional bestS ref for vibrant. */
function sampleRegionColor(data, indices, outBest) {
  var r = 0, g = 0, b = 0, count = 0, bestS = 0, bestR = 0, bestG = 0, bestB = 0;
  for (var k = 0; k < indices.length; k++) {
    var i = indices[k];
    var pr = data[i], pg = data[i + 1], pb = data[i + 2];
    if (pr + pg + pb < 120) continue;
    var max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
    if ((max + min) / 2 / 255 > 0.92) continue;
    r += pr; g += pg; b += pb; count++;
    var l = (max + min) / 2 / 255;
    var s = max === min ? 0 : (max - min) / (l < 0.5 ? max + min : 2 - max - min);
    if (s > bestS) { bestS = s; bestR = pr; bestG = pg; bestB = pb; }
  }
  if (count === 0) return null;
  if (outBest && bestS >= 0.1) return Math.round(bestR) + ', ' + Math.round(bestG) + ', ' + Math.round(bestB);
  return Math.round(r / count) + ', ' + Math.round(g / count) + ', ' + Math.round(b / count);
}

/**
 * Extract one dominant color (full image) for the hero glow. Uses 48×48 canvas. Returns "r,g,b" or null.
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
    var indices = [];
    for (var i = 0; i < data.length; i += 4) indices.push(i);
    return sampleRegionColor(data, indices, true);
  } catch (err) {
    return null;
  }
}

/**
 * Extract colors from 4 regions (top, bottom, left, right) for directional page gradient.
 * Single 64×64 canvas pass. Returns { top, bottom, left, right } as "r,g,b" or fallback.
 */
function getRegionalColorsFromImage(img) {
  var fallback = EVENT_DETAIL_DEFAULT_GLOW;
  try {
    if (!img || !img.complete || img.naturalWidth === 0) {
      return { top: fallback, bottom: fallback, left: fallback, right: fallback };
    }
    var w = 64, h = 64;
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return { top: fallback, bottom: fallback, left: fallback, right: fallback };
    ctx.drawImage(img, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data;
    var topIdx = [], bottomIdx = [], leftIdx = [], rightIdx = [];
    var edge = 16;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (y < edge) topIdx.push(i);
        if (y >= h - edge) bottomIdx.push(i);
        if (x < edge) leftIdx.push(i);
        if (x >= w - edge) rightIdx.push(i);
      }
    }
    return {
      top: sampleRegionColor(data, topIdx, true) || fallback,
      bottom: sampleRegionColor(data, bottomIdx, true) || fallback,
      left: sampleRegionColor(data, leftIdx, true) || fallback,
      right: sampleRegionColor(data, rightIdx, true) || fallback
    };
  } catch (err) {
    return { top: fallback, bottom: fallback, left: fallback, right: fallback };
  }
}

function applyEventDetailGlow(content, rgbString, regional) {
  var color = rgbString || EVENT_DETAIL_DEFAULT_GLOW;
  var page = content && content.closest && content.closest('.page');
  if (page) {
    page.style.setProperty('--event-detail-dominant', color);
    if (regional) {
      page.style.setProperty('--event-color-top', regional.top);
      page.style.setProperty('--event-color-bottom', regional.bottom);
      page.style.setProperty('--event-color-left', regional.left);
      page.style.setProperty('--event-color-right', regional.right);
      page.classList.add('event-detail-page--regional');
    }
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
    ${renderPortalLoader('Abriendo portal del evento...')}
  `;
  
  try {
    var eventRes = await window.DataSource.getEvent(eventId);
    var e = eventRes && eventRes.data ? eventRes.data : null;
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
      ${Array.isArray(e.tags) && e.tags.length ? `<div style="display:flex;gap:0.5rem;flex-wrap:wrap">${e.tags.map(function(t){return '<span class="badge badge-glass">'+String(t).replace(/</g,'&lt;')+'</span>';}).join('')}</div>` : ''}
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
        ${e.venue ? `
        <div style="grid-column:1/-1">
          <div style="color:var(--text-muted);font-size:0.75rem;margin-bottom:0.25rem">Lugar</div>
          <div style="font-weight:600">${String(e.venue).replace(/</g,'&lt;')}</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${Array.isArray(e.lineup) && e.lineup.length ? `
    <div class="section-header"><span class="section-title">Lineup</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem">
      ${e.lineup.map(function(artist) { return '<span class="badge badge-glass" style="padding:0.5rem 0.85rem">🎧 ' + String(artist).replace(/</g, '&lt;') + '</span>'; }).join('')}
    </div>
    ` : ''}

    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1.5rem">
      <button class="btn btn-primary btn-full" onclick="navigate('contact')">✉️ Consultar por este evento</button>
      <button class="btn btn-outline btn-full" onclick="shareEvent('${e.id}')">📤 Compartir evento</button>
      <button class="btn btn-ghost btn-full" onclick="navigate('` + returnTo + `')">← Ver todos los eventos</button>
      ${editEventBtn}
    </div>
  `;

    applyEventDetailGlow(content, null);
    var heroImg = content.querySelector('.event-detail-hero__bg');
    if (heroImg && heroImg.tagName === 'IMG') {
      function applyGlowFromImage() {
        var rgb = getDominantColorFromImage(heroImg);
        var regional = getRegionalColorsFromImage(heroImg);
        applyEventDetailGlow(content, rgb, regional);
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
async function renderArtists(filter) {
  if (typeof filter !== 'string') filter = 'all';
  const el = document.getElementById('page-artists');
  const content = el.querySelector('.page-content');
  content.innerHTML = renderPortalLoader('Invocando artistas...');

  try {
    const response = await window.DataSource.getArtists();
    const artists = Array.isArray(response.data) ? response.data : [];

    if (artists.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎧</div>
          <div class="empty-title">Sin artistas cargados todavía</div>
          <div style="color:var(--text-muted);margin-top:0.5rem;font-size:0.85rem">Cargá el primero desde el panel Admin</div>
        </div>`;
      return;
    }

    // Géneros dinámicos a partir de la data real
    const genreSet = {};
    artists.forEach(function (a) { if (a.genre) genreSet[a.genre] = true; });
    const genres = ['all'].concat(Object.keys(genreSet));

    const filteredArtists = filter === 'all'
      ? artists
      : artists.filter(function (a) { return (a.genre || '').toLowerCase().indexOf(filter.toLowerCase()) !== -1; });

    const safe = function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };

    content.innerHTML = `
      <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1.2rem;padding-bottom:0.3rem">
        ${genres.map(function (g) { return '<button class="btn ' + (filter === g ? 'btn-primary' : 'btn-ghost') + '" style="flex-shrink:0;padding:0.4rem 1rem;font-size:0.8rem" onclick="renderArtists(\'' + g.replace(/'/g, "\\'") + '\')">' + (g === 'all' ? 'Todos' : safe(g)) + '</button>'; }).join('')}
      </div>

      <div class="artist-grid">
        ${filteredArtists.map(function (a) {
          const img = a.photo
            ? '<img src="' + String(a.photo).replace(/"/g, '&quot;') + '" alt="" style="width:100%;height:100%;object-fit:cover">'
            : (a.emoji || '🎧');
          return '<div class="artist-card" onclick="navigate(\'artist-detail\',\'' + String(a.id).replace(/'/g, "\\'") + '\')">'
            + '<div class="artist-img-placeholder">' + img + '</div>'
            + '<div class="artist-overlay">'
            + '<div class="artist-role">' + safe(a.role || '') + '</div>'
            + '<div class="artist-name">' + safe(a.name) + '</div>'
            + '<div class="artist-genre">🎵 ' + safe(a.genre || '') + '</div>'
            + '</div></div>';
        }).join('')}
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
  content.innerHTML = renderPortalLoader('Cargando artista...');

  try {
    const res = await window.DataSource.getArtist(artistId);
    const a = res && res.data;

    if (!a) {
      content.innerHTML = `
        <button onclick="navigate('artists')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
        <div class="empty-state">
          <div class="empty-icon">🎧</div>
          <div class="empty-title">Artista no encontrado</div>
        </div>`;
      return;
    }

    // Eventos donde toca este artista: cruzamos con la lista de eventos.
    const evRes = await window.DataSource.getEvents();
    const allEvents = Array.isArray(evRes.data) ? evRes.data : [];
    const artistEventIds = Array.isArray(a.events) ? a.events.map(String) : [];
    const artistEvents = allEvents.filter(function (e) {
      if (e.status !== 'PUBLISHED') return false;
      if (artistEventIds.indexOf(String(e.id)) !== -1) return true;
      // Fallback: si el lineup incluye el nombre.
      return Array.isArray(e.lineup) && e.lineup.some(function (l) { return String(l).toLowerCase() === String(a.name).toLowerCase(); });
    });

    const safe = function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };
    const socials = a.socials || {};
    const avatarContent = a.photo
      ? '<img src="' + String(a.photo).replace(/"/g, '&quot;') + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : (a.emoji || '🎧');

    const socialLinks = [
      { key: 'instagram', label: 'Instagram', icon: '📷' },
      { key: 'soundcloud', label: 'SoundCloud', icon: '☁️' },
      { key: 'spotify', label: 'Spotify', icon: '🎶' }
    ]
      .filter(function (s) { return socials[s.key]; })
      .map(function (s) {
        return '<a href="' + String(socials[s.key]).replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:0.8rem;padding:0.5rem 0.85rem">' + s.icon + ' ' + s.label + '</a>';
      }).join('');

    content.innerHTML = `
      <button onclick="navigate('artists')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);border:3px solid var(--primary);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:3.5rem;overflow:hidden;box-shadow:0 0 30px var(--primary-glow)">${avatarContent}</div>
        ${a.role ? `<span class="badge badge-glass" style="margin-bottom:0.5rem">${safe(a.role)}</span>` : ''}
        <h2 style="font-size:1.8rem;font-weight:900;margin:0.5rem 0 0.3rem">${safe(a.name)}</h2>
        ${a.genre ? `<div style="color:var(--primary);font-size:0.9rem;font-weight:600">🎵 ${safe(a.genre)}</div>` : ''}
      </div>

      ${a.bio ? `
      <div class="glass-card" style="padding:1.2rem;margin-bottom:1.5rem">
        <h3 style="font-family:var(--font-display);font-size:0.8rem;margin-bottom:0.5rem;color:var(--primary)">BIO</h3>
        <p style="font-size:0.9rem;line-height:1.7;color:rgba(240,230,255,0.8)">${safe(a.bio)}</p>
      </div>` : ''}

      ${socialLinks ? `
      <div class="section-header"><span class="section-title">Redes</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem">${socialLinks}</div>
      ` : ''}

      <div class="section-header"><span class="section-title">Próximas actuaciones</span></div>
      ${artistEvents.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos próximos</div></div>'
        : artistEvents.map(function (e) {
            return '<div class="list-item" onclick="navigate(\'event-detail\',\'' + String(e.id).replace(/'/g, "\\'") + '\')">'
              + '<div style="background:rgba(209,37,244,0.15);border:1px solid var(--border);border-radius:var(--radius);padding:0.4rem 0.6rem;text-align:center;flex-shrink:0">'
              + '<div style="font-size:0.55rem;text-transform:uppercase;color:var(--primary);font-weight:700">' + new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short' }) + '</div>'
              + '<div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;line-height:1">' + new Date(e.startAt).getDate() + '</div>'
              + '</div>'
              + '<div class="list-body"><div class="list-title">' + safe(e.title) + '</div><div class="list-subtitle">' + safe(e.venue || '') + '</div></div>'
              + '<span style="color:var(--primary)">›</span>'
              + '</div>';
          }).join('')}
    `;
  } catch (error) {
    console.error('Error loading artist detail:', error);
    content.innerHTML = `
      <button onclick="navigate('artists')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar artista</div>
      </div>`;
  }
}

// ── CONTACT PAGE ─────────────────────────────────────────────────────────────
async function renderContact() {
  const el = document.getElementById('page-contact');
  const content = el.querySelector('.page-content');
  content.innerHTML = renderPortalLoader('Abriendo canal de contacto...');

  try {
    const res = await window.DataSource.getSiteConfig();
    const cfg = (res && res.data) || {};
    const contact = cfg.contact || {};
    const socials = cfg.socials || {};
    const safe = function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };

    const contactRows = [];
    if (contact.email) {
      contactRows.push(
        '<a class="list-item" href="mailto:' + String(contact.email).replace(/"/g, '&quot;') + '" style="text-decoration:none;color:inherit">'
        + '<div style="font-size:1.5rem;flex-shrink:0">✉️</div>'
        + '<div class="list-body"><div class="list-title">Email</div><div class="list-subtitle">' + safe(contact.email) + '</div></div>'
        + '<span style="color:var(--primary)">›</span></a>'
      );
    }
    if (contact.whatsapp) {
      const waRaw = String(contact.whatsapp).replace(/[^0-9]/g, '');
      contactRows.push(
        '<a class="list-item" href="https://wa.me/' + waRaw + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">'
        + '<div style="font-size:1.5rem;flex-shrink:0">💬</div>'
        + '<div class="list-body"><div class="list-title">WhatsApp</div><div class="list-subtitle">' + safe(contact.whatsapp) + '</div></div>'
        + '<span style="color:var(--primary)">›</span></a>'
      );
    }
    if (contact.phone) {
      contactRows.push(
        '<a class="list-item" href="tel:' + String(contact.phone).replace(/[^0-9+]/g, '') + '" style="text-decoration:none;color:inherit">'
        + '<div style="font-size:1.5rem;flex-shrink:0">📞</div>'
        + '<div class="list-body"><div class="list-title">Teléfono</div><div class="list-subtitle">' + safe(contact.phone) + '</div></div>'
        + '<span style="color:var(--primary)">›</span></a>'
      );
    }

    const socialDefs = [
      { key: 'instagram', label: 'Instagram', icon: '📷' },
      { key: 'facebook', label: 'Facebook', icon: '📘' },
      { key: 'soundcloud', label: 'SoundCloud', icon: '☁️' },
      { key: 'spotify', label: 'Spotify', icon: '🎶' },
      { key: 'youtube', label: 'YouTube', icon: '▶️' }
    ];
    const socialBtns = socialDefs
      .filter(function (s) { return socials[s.key]; })
      .map(function (s) {
        return '<a href="' + String(socials[s.key]).replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:0.85rem;padding:0.6rem 1rem">' + s.icon + ' ' + s.label + '</a>';
      }).join('');

    const hasAnyContact = contactRows.length > 0;
    const hasAnySocial = socialBtns.length > 0;

    content.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:3rem;margin-bottom:0.5rem">✉️</div>
        <h1 style="font-family:var(--font-display);font-size:1.6rem;font-weight:900;margin:0">Contacto</h1>
        <p style="color:var(--text-muted);margin:0.5rem 0 0;font-size:0.9rem">Booking, prensa, colaboraciones</p>
      </div>

      ${hasAnyContact ? `
      <div class="section-header"><span class="section-title">Directo</span></div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.5rem">
        ${contactRows.join('')}
      </div>
      ` : `
      <div class="empty-state" style="margin-bottom:1.5rem">
        <div class="empty-icon">📮</div>
        <div class="empty-title">Configurá tus datos de contacto</div>
        <div style="color:var(--text-muted);margin-top:0.5rem;font-size:0.85rem">Desde el panel Admin → Configuración</div>
      </div>
      `}

      ${hasAnySocial ? `
      <div class="section-header"><span class="section-title">Redes</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem">
        ${socialBtns}
      </div>
      ` : ''}
    `;
  } catch (error) {
    console.error('Error loading contact:', error);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar contacto</div>
      </div>`;
  }
}

// ── TICKETS PAGE ──────────────────────────────────────────────────────────────
// Evento desde backend GET /api/events (skipAuth). Sin DATABASE.
async function renderTicketsPage(eventId) {
  AppState.selectedEventId = eventId;
  var el = document.getElementById('page-tickets');
  var content = el.querySelector('.page-content');
  content.innerHTML = renderPortalLoader('Sincronizando accesos...');

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
// Shell del panel admin + tabs Eventos / Artistas / Config.
// Los writes van contra FirestoreClient (requiere custom claim admin:true).

var AdminState = { tab: 'dashboard' };

async function renderAdmin() {
  const el = document.getElementById('page-admin');
  const content = el.querySelector('.page-content');
  showLoading(content, 'Cargando panel administrativo...');

  try {
    const [evRes, arRes, cfgRes] = await Promise.all([
      window.DataSource.getEvents(),
      window.DataSource.getArtists(),
      window.DataSource.getSiteConfig()
    ]);
    const events = Array.isArray(evRes.data) ? evRes.data : [];
    const artists = Array.isArray(arRes.data) ? arRes.data : [];
    const cfg = cfgRes.data || {};

    // Usuario desde Firebase Auth
    var user = null;
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      user = window.firebaseAuth.currentUser;
    }
    const displayName = user ? (user.displayName || user.email || 'Admin') : 'Admin';
    const firestoreOk = window.FirestoreClient && window.FirestoreClient.isAvailable && window.FirestoreClient.isAvailable();
    const safe = function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };

    // Tabs
    const tabs = [
      { id: 'dashboard', label: 'Resumen', icon: '📊' },
      { id: 'events', label: 'Eventos', icon: '📅' },
      { id: 'artists', label: 'Artistas', icon: '🎵' },
      { id: 'config', label: 'Configuración', icon: '⚙️' }
    ];
    const activeTab = AdminState.tab || 'dashboard';

    const tabsHtml = `
      <div style="display:flex;gap:0.4rem;overflow-x:auto;margin-bottom:1.2rem;padding-bottom:0.3rem">
        ${tabs.map(function (t) {
          return '<button class="btn ' + (activeTab === t.id ? 'btn-primary' : 'btn-ghost') + '" style="flex-shrink:0;padding:0.5rem 0.85rem;font-size:0.8rem" onclick="adminSwitchTab(\'' + t.id + '\')">' + t.icon + ' ' + t.label + '</button>';
        }).join('')}
      </div>
    `;

    // Contenido del tab
    var tabContent = '';
    if (activeTab === 'dashboard') {
      const publishedEvents = events.filter(function (e) { return e.status === 'PUBLISHED'; }).length;
      const now = new Date();
      const upcomingEvents = events.filter(function (e) { return new Date(e.startAt) > now; }).length;
      tabContent = `
        ${!firestoreOk ? `
        <div class="card" style="padding:0.85rem 1rem;margin-bottom:1rem;border-color:var(--pink);background:rgba(255,0,64,0.1)">
          <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.25rem">⚠️ Firestore no disponible</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">Los datos que ves son mock. Verificá que Firebase esté configurado correctamente en .env y recargá.</div>
        </div>
        ` : ''}
        <div class="stats-grid" style="margin-bottom:1.5rem">
          <div class="stat-card glow-card">
            <div class="stat-label">Eventos</div>
            <div class="stat-value">${events.length}</div>
            <div class="stat-change stat-up">${publishedEvents} publicados</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Próximos</div>
            <div class="stat-value">${upcomingEvents}</div>
            <div class="stat-change stat-up">Por venir</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Artistas</div>
            <div class="stat-value">${artists.length}</div>
            <div class="stat-change stat-up">Cargados</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Estado</div>
            <div class="stat-value" style="font-size:1rem">${firestoreOk ? '🟢 Firestore' : '🟡 Mock'}</div>
          </div>
        </div>
        <div class="glass-card" style="padding:1.2rem">
          <div style="display:grid;grid-template-columns:1fr;gap:0.5rem">
            <button class="btn btn-primary" onclick="adminSwitchTab('events')">📅 Gestionar eventos</button>
            <button class="btn btn-primary" onclick="adminSwitchTab('artists')">🎵 Gestionar artistas</button>
            <button class="btn btn-primary" onclick="adminSwitchTab('config')">⚙️ Configuración del sitio</button>
            <button class="btn btn-ghost" onclick="navigate('home')">🏠 Volver al sitio</button>
          </div>
        </div>
      `;
    } else if (activeTab === 'events') {
      tabContent = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <div style="font-weight:700">${events.length} evento${events.length === 1 ? '' : 's'}</div>
          <button class="btn btn-primary" style="padding:0.5rem 0.85rem;font-size:0.85rem" onclick="adminEditEvent(null)">➕ Nuevo</button>
        </div>
        ${events.length === 0 ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos cargados</div></div>' :
          '<div style="display:flex;flex-direction:column;gap:0.5rem">' +
          events.map(function (e) {
            return '<div class="card" style="padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem">'
              + '<div style="width:48px;height:48px;border-radius:var(--radius);background:linear-gradient(135deg,#1a0820,#2d0040);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;overflow:hidden">'
              + (e.coverImage ? '<img src="' + String(e.coverImage).replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover">' : '🌌')
              + '</div>'
              + '<div style="flex:1;min-width:0">'
              + '<div style="font-weight:700;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + safe(e.title) + '</div>'
              + '<div style="color:var(--text-muted);font-size:0.75rem">' + (e.startAt ? new Date(e.startAt).toLocaleDateString('es-ES') : '') + ' · ' + safe(e.venue || '') + '</div>'
              + '<span class="badge badge-glass" style="margin-top:0.2rem;font-size:0.65rem">' + safe(e.status) + '</span>'
              + '</div>'
              + '<button class="btn btn-ghost" style="padding:0.4rem 0.55rem;font-size:0.75rem" onclick="adminEditEvent(\'' + String(e.id).replace(/'/g, "\\'") + '\')">✏️</button>'
              + '<button class="btn btn-ghost" style="padding:0.4rem 0.55rem;font-size:0.75rem;color:var(--pink)" onclick="adminDeleteEvent(\'' + String(e.id).replace(/'/g, "\\'") + '\')">🗑️</button>'
              + '</div>';
          }).join('') + '</div>'}
      `;
    } else if (activeTab === 'artists') {
      tabContent = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <div style="font-weight:700">${artists.length} artista${artists.length === 1 ? '' : 's'}</div>
          <button class="btn btn-primary" style="padding:0.5rem 0.85rem;font-size:0.85rem" onclick="adminEditArtist(null)">➕ Nuevo</button>
        </div>
        ${artists.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎧</div><div class="empty-title">Sin artistas cargados</div></div>' :
          '<div style="display:flex;flex-direction:column;gap:0.5rem">' +
          artists.map(function (a) {
            return '<div class="card" style="padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem">'
              + '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;overflow:hidden">'
              + (a.photo ? '<img src="' + String(a.photo).replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover">' : (a.emoji || '🎧'))
              + '</div>'
              + '<div style="flex:1;min-width:0">'
              + '<div style="font-weight:700;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + safe(a.name) + '</div>'
              + '<div style="color:var(--text-muted);font-size:0.75rem">' + safe(a.role || '') + ' · ' + safe(a.genre || '') + '</div>'
              + '</div>'
              + '<button class="btn btn-ghost" style="padding:0.4rem 0.55rem;font-size:0.75rem" onclick="adminEditArtist(\'' + String(a.id).replace(/'/g, "\\'") + '\')">✏️</button>'
              + '<button class="btn btn-ghost" style="padding:0.4rem 0.55rem;font-size:0.75rem;color:var(--pink)" onclick="adminDeleteArtist(\'' + String(a.id).replace(/'/g, "\\'") + '\')">🗑️</button>'
              + '</div>';
          }).join('') + '</div>'}
      `;
    } else if (activeTab === 'config') {
      tabContent = adminRenderConfigForm(cfg);
    }

    content.innerHTML = `
      <div class="admin-header-card">
        <div style="position:relative;z-index:1">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;opacity:0.8;margin-bottom:0.3rem">Panel Administrativo</div>
          <h2 style="font-size:1.2rem;font-weight:900;word-break:break-word">👋 ${safe(displayName)}</h2>
          <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;flex-wrap:wrap">
            <span class="badge" style="background:rgba(255,255,255,0.2);color:white">🔴 ADMIN</span>
            <button class="btn btn-ghost" style="padding:0.3rem 0.6rem;font-size:0.72rem" onclick="handleLogout()">🚪 Salir</button>
          </div>
        </div>
      </div>

      ${tabsHtml}
      ${tabContent}
    `;
  } catch (error) {
    console.error('Error loading admin panel:', error);
    showErrorState(content, 'Error al cargar panel administrativo', 'renderAdmin');
  }
}

function adminSwitchTab(tab) {
  AdminState.tab = tab;
  renderAdmin();
}

// ── Admin: Event form ────────────────────────────────────────────────────────
async function adminEditEvent(eventId) {
  var content = document.querySelector('#page-admin .page-content');
  showLoading(content, eventId ? 'Cargando evento...' : 'Nuevo evento...');

  var event = {
    id: null, title: '', venue: '', startAt: '', endAt: '',
    status: 'DRAFT', coverImage: '', description: '', lineup: [], tags: []
  };
  if (eventId) {
    var res = await window.DataSource.getEvent(eventId);
    if (res && res.data) {
      event = Object.assign(event, res.data);
      event.id = eventId;
    }
  }

  var safe = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
  var toDtLocal = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  content.innerHTML = `
    <button class="btn btn-ghost" style="margin-bottom:1rem" onclick="adminSwitchTab('events')">← Volver</button>
    <h2 style="font-weight:900;margin-bottom:1rem">${eventId ? 'Editar evento' : 'Nuevo evento'}</h2>

    <form id="event-form" style="display:flex;flex-direction:column;gap:0.85rem">
      <div class="form-group">
        <label>Título *</label>
        <input class="input" name="title" required value="${safe(event.title)}" placeholder="Ej: Neon Nebula Rave">
      </div>

      <div class="form-group">
        <label>Venue / Lugar</label>
        <input class="input" name="venue" value="${safe(event.venue)}" placeholder="Nombre del club / venue">
      </div>

      <div class="form-group">
        <label>Fecha y hora de inicio *</label>
        <input class="input" type="datetime-local" name="startAt" required value="${toDtLocal(event.startAt)}">
      </div>

      <div class="form-group">
        <label>Fecha y hora de fin (opcional)</label>
        <input class="input" type="datetime-local" name="endAt" value="${toDtLocal(event.endAt)}">
      </div>

      <div class="form-group">
        <label>Estado</label>
        <select class="input" name="status">
          <option value="DRAFT" ${event.status === 'DRAFT' ? 'selected' : ''}>Borrador (no público)</option>
          <option value="PUBLISHED" ${event.status === 'PUBLISHED' ? 'selected' : ''}>Publicado</option>
        </select>
      </div>

      <div class="form-group">
        <label>Flyer (imagen)</label>
        ${event.coverImage ? `<img src="${safe(event.coverImage)}" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:0.5rem">` : ''}
        <input class="input" type="file" name="coverFile" accept="image/*">
        <input type="hidden" name="coverImage" value="${safe(event.coverImage)}">
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">Se sube a Cloudinary al guardar.</div>
      </div>

      <div class="form-group">
        <label>Descripción</label>
        <textarea class="input" name="description" rows="4" placeholder="Contanos de qué va el evento...">${safe(event.description)}</textarea>
      </div>

      <div class="form-group">
        <label>Lineup (un artista por línea)</label>
        <textarea class="input" name="lineup" rows="4" placeholder="Nebula Flux\nCosmic Ray\n...">${safe((event.lineup || []).join('\n'))}</textarea>
      </div>

      <div class="form-group">
        <label>Tags (separados por coma)</label>
        <input class="input" name="tags" value="${safe((event.tags || []).join(', '))}" placeholder="Techno, Open Air">
      </div>

      <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
        <button class="btn btn-primary" type="submit" style="flex:1">💾 Guardar</button>
        <button class="btn btn-ghost" type="button" onclick="adminSwitchTab('events')">Cancelar</button>
      </div>
    </form>
  `;

  document.getElementById('event-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    adminSaveEvent(eventId, ev.target);
  });
}

async function adminSaveEvent(eventId, form) {
  var fd = new FormData(form);
  var coverFile = fd.get('coverFile');
  var coverImage = fd.get('coverImage') || '';

  // Si hay archivo, subimos a Cloudinary primero
  if (coverFile && coverFile.size > 0) {
    toast('📤 Subiendo imagen...');
    var up = await window.CloudinaryClient.upload(coverFile, 'paraiso-astral/events');
    if (up.status !== 'success') {
      toast('❌ Error al subir imagen: ' + (up.message || ''));
      return;
    }
    coverImage = up.data.url;
  }

  var payload = {
    title: fd.get('title') || '',
    venue: fd.get('venue') || '',
    startAt: fd.get('startAt') ? new Date(fd.get('startAt')).toISOString() : null,
    endAt: fd.get('endAt') ? new Date(fd.get('endAt')).toISOString() : null,
    status: fd.get('status') || 'DRAFT',
    coverImage: coverImage,
    description: fd.get('description') || '',
    lineup: (fd.get('lineup') || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
    tags: (fd.get('tags') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
  };

  toast('💾 Guardando evento...');
  var res = await window.FirestoreClient.saveEvent(eventId, payload);
  if (res.status !== 'success') {
    toast('❌ ' + (res.message || 'Error al guardar'));
    return;
  }
  toast('✅ Evento guardado');
  AdminState.tab = 'events';
  renderAdmin();
}

async function adminDeleteEvent(eventId) {
  if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
  toast('🗑️ Eliminando...');
  var res = await window.FirestoreClient.deleteEvent(eventId);
  if (res.status !== 'success') {
    toast('❌ ' + (res.message || 'Error al eliminar'));
    return;
  }
  toast('✅ Evento eliminado');
  renderAdmin();
}

// ── Admin: Artist form ───────────────────────────────────────────────────────
async function adminEditArtist(artistId) {
  var content = document.querySelector('#page-admin .page-content');
  showLoading(content, artistId ? 'Cargando artista...' : 'Nuevo artista...');

  var artist = {
    id: null, name: '', role: '', genre: '', emoji: '🎧',
    photo: '', bio: '', events: [], socials: { instagram: '', soundcloud: '', spotify: '' }
  };
  if (artistId) {
    var res = await window.DataSource.getArtist(artistId);
    if (res && res.data) {
      artist = Object.assign(artist, res.data);
      artist.socials = artist.socials || { instagram: '', soundcloud: '', spotify: '' };
      artist.id = artistId;
    }
  }

  var safe = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); };

  content.innerHTML = `
    <button class="btn btn-ghost" style="margin-bottom:1rem" onclick="adminSwitchTab('artists')">← Volver</button>
    <h2 style="font-weight:900;margin-bottom:1rem">${artistId ? 'Editar artista' : 'Nuevo artista'}</h2>

    <form id="artist-form" style="display:flex;flex-direction:column;gap:0.85rem">
      <div class="form-group">
        <label>Nombre *</label>
        <input class="input" name="name" required value="${safe(artist.name)}">
      </div>

      <div class="form-group">
        <label>Rol</label>
        <input class="input" name="role" value="${safe(artist.role)}" placeholder="Headliner / Resident / Guest">
      </div>

      <div class="form-group">
        <label>Género</label>
        <input class="input" name="genre" value="${safe(artist.genre)}" placeholder="Techno / House / Psytrance">
      </div>

      <div class="form-group">
        <label>Emoji (si no hay foto)</label>
        <input class="input" name="emoji" value="${safe(artist.emoji)}" maxlength="4">
      </div>

      <div class="form-group">
        <label>Foto</label>
        ${artist.photo ? `<img src="${safe(artist.photo)}" style="width:120px;height:120px;object-fit:cover;border-radius:50%;margin-bottom:0.5rem">` : ''}
        <input class="input" type="file" name="photoFile" accept="image/*">
        <input type="hidden" name="photo" value="${safe(artist.photo)}">
      </div>

      <div class="form-group">
        <label>Bio</label>
        <textarea class="input" name="bio" rows="4">${safe(artist.bio)}</textarea>
      </div>

      <div class="form-group">
        <label>Instagram</label>
        <input class="input" name="instagram" value="${safe(artist.socials.instagram || '')}" placeholder="https://instagram.com/...">
      </div>

      <div class="form-group">
        <label>SoundCloud</label>
        <input class="input" name="soundcloud" value="${safe(artist.socials.soundcloud || '')}" placeholder="https://soundcloud.com/...">
      </div>

      <div class="form-group">
        <label>Spotify</label>
        <input class="input" name="spotify" value="${safe(artist.socials.spotify || '')}" placeholder="https://open.spotify.com/...">
      </div>

      <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
        <button class="btn btn-primary" type="submit" style="flex:1">💾 Guardar</button>
        <button class="btn btn-ghost" type="button" onclick="adminSwitchTab('artists')">Cancelar</button>
      </div>
    </form>
  `;

  document.getElementById('artist-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    adminSaveArtist(artistId, ev.target);
  });
}

async function adminSaveArtist(artistId, form) {
  var fd = new FormData(form);
  var photoFile = fd.get('photoFile');
  var photo = fd.get('photo') || '';

  if (photoFile && photoFile.size > 0) {
    toast('📤 Subiendo foto...');
    var up = await window.CloudinaryClient.upload(photoFile, 'paraiso-astral/artists');
    if (up.status !== 'success') {
      toast('❌ Error al subir foto: ' + (up.message || ''));
      return;
    }
    photo = up.data.url;
  }

  var payload = {
    name: fd.get('name') || '',
    role: fd.get('role') || '',
    genre: fd.get('genre') || '',
    emoji: fd.get('emoji') || '🎧',
    photo: photo,
    bio: fd.get('bio') || '',
    events: [],
    socials: {
      instagram: fd.get('instagram') || '',
      soundcloud: fd.get('soundcloud') || '',
      spotify: fd.get('spotify') || ''
    }
  };

  toast('💾 Guardando...');
  var res = await window.FirestoreClient.saveArtist(artistId, payload);
  if (res.status !== 'success') {
    toast('❌ ' + (res.message || 'Error al guardar'));
    return;
  }
  toast('✅ Artista guardado');
  AdminState.tab = 'artists';
  renderAdmin();
}

async function adminDeleteArtist(artistId) {
  if (!confirm('¿Eliminar este artista?')) return;
  var res = await window.FirestoreClient.deleteArtist(artistId);
  if (res.status !== 'success') {
    toast('❌ ' + (res.message || 'Error al eliminar'));
    return;
  }
  toast('✅ Artista eliminado');
  renderAdmin();
}

// ── Admin: Site Config ───────────────────────────────────────────────────────
function adminRenderConfigForm(cfg) {
  var safe = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
  var c = cfg.contact || {};
  var s = cfg.socials || {};

  return `
    <form id="config-form" style="display:flex;flex-direction:column;gap:0.85rem">
      <div class="card" style="padding:1rem">
        <h3 style="font-size:0.85rem;margin-bottom:0.75rem;color:var(--primary)">PRODUCTORA</h3>
        <div class="form-group">
          <label>Nombre</label>
          <input class="input" name="name" value="${safe(cfg.name || 'Paraíso Astral')}">
        </div>
        <div class="form-group">
          <label>Tagline</label>
          <input class="input" name="tagline" value="${safe(cfg.tagline || 'Electronic Universe')}">
        </div>
        <div class="form-group">
          <label>Bio corta</label>
          <textarea class="input" name="bio" rows="3">${safe(cfg.bio || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Hero image (URL de Cloudinary)</label>
          ${cfg.heroImage ? `<img src="${safe(cfg.heroImage)}" style="width:100%;max-height:150px;object-fit:cover;border-radius:var(--radius);margin-bottom:0.5rem">` : ''}
          <input class="input" type="file" name="heroFile" accept="image/*">
          <input type="hidden" name="heroImage" value="${safe(cfg.heroImage || '')}">
        </div>
      </div>

      <div class="card" style="padding:1rem">
        <h3 style="font-size:0.85rem;margin-bottom:0.75rem;color:var(--primary)">CONTACTO</h3>
        <div class="form-group">
          <label>Email</label>
          <input class="input" type="email" name="email" value="${safe(c.email || '')}">
        </div>
        <div class="form-group">
          <label>WhatsApp (con código de país)</label>
          <input class="input" name="whatsapp" value="${safe(c.whatsapp || '')}" placeholder="+54 9 11 1234-5678">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input class="input" name="phone" value="${safe(c.phone || '')}">
        </div>
      </div>

      <div class="card" style="padding:1rem">
        <h3 style="font-size:0.85rem;margin-bottom:0.75rem;color:var(--primary)">REDES</h3>
        <div class="form-group"><label>Instagram</label><input class="input" name="instagram" value="${safe(s.instagram || '')}"></div>
        <div class="form-group"><label>Facebook</label><input class="input" name="facebook" value="${safe(s.facebook || '')}"></div>
        <div class="form-group"><label>SoundCloud</label><input class="input" name="soundcloud" value="${safe(s.soundcloud || '')}"></div>
        <div class="form-group"><label>Spotify</label><input class="input" name="spotify" value="${safe(s.spotify || '')}"></div>
        <div class="form-group"><label>YouTube</label><input class="input" name="youtube" value="${safe(s.youtube || '')}"></div>
      </div>

      <button class="btn btn-primary btn-full" type="submit" onclick="event.preventDefault();adminSaveConfig(document.getElementById('config-form'))">💾 Guardar configuración</button>
    </form>
  `;
}

async function adminSaveConfig(form) {
  var fd = new FormData(form);
  var heroFile = fd.get('heroFile');
  var heroImage = fd.get('heroImage') || '';

  if (heroFile && heroFile.size > 0) {
    toast('📤 Subiendo hero image...');
    var up = await window.CloudinaryClient.upload(heroFile, 'paraiso-astral/config');
    if (up.status !== 'success') {
      toast('❌ Error al subir: ' + (up.message || ''));
      return;
    }
    heroImage = up.data.url;
  }

  var payload = {
    name: fd.get('name') || 'Paraíso Astral',
    tagline: fd.get('tagline') || '',
    bio: fd.get('bio') || '',
    logo: '',
    heroImage: heroImage,
    contact: {
      email: fd.get('email') || '',
      whatsapp: fd.get('whatsapp') || '',
      phone: fd.get('phone') || ''
    },
    socials: {
      instagram: fd.get('instagram') || '',
      facebook: fd.get('facebook') || '',
      soundcloud: fd.get('soundcloud') || '',
      spotify: fd.get('spotify') || '',
      youtube: fd.get('youtube') || ''
    }
  };

  toast('💾 Guardando...');
  var res = await window.FirestoreClient.saveSiteConfig(payload);
  if (res.status !== 'success') {
    toast('❌ ' + (res.message || 'Error al guardar'));
    return;
  }
  toast('✅ Configuración guardada');
  renderAdmin();
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
  var descVal = '';
  var lineupVal = '';
  var coverPreviewHtml = '';
  var coverUrlAttr = '';
  if (isEdit && editing) {
    titleVal = (editing.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    venueVal = (editing.venue || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    descVal = (editing.description || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    lineupVal = ''; // lineup no se persiste por separado en el backend
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
    <div class="form-group"><label>Descripción</label><textarea class="input" id="ev-desc" rows="3" placeholder="Describe el evento, ambiente, qué esperar...">${descVal}</textarea></div>
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
  var descEl = document.getElementById('ev-desc');
  var title = titleEl ? titleEl.value.trim() : '';
  var venue = venueEl ? venueEl.value.trim() : '';
  var date = dateEl ? dateEl.value : '';
  if (!title || !venue || !date) { toast('⚠️ Completa nombre, lugar y fecha'); return; }

  var timeStr = (timeEl && timeEl.value.trim()) || '20:00';
  var timePart = (timeStr.split(/\s+-\s+/)[0] || timeStr.split(/\s+/)[0] || '20:00').trim();
  if (!/^\d{1,2}:\d{2}/.test(timePart)) timePart += ':00';
  var startAt = date + 'T' + timePart + ':00';

  var lineupStr = (lineupEl && lineupEl.value.trim()) || '';
  var descStr = (descEl && descEl.value.trim()) || '';
  var description = [lineupStr ? 'Lineup: ' + lineupStr : '', descStr].filter(Boolean).join('\n\n') || undefined;
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
 * Sólo Firebase Auth. El rol/admin se gestiona con custom claims (Fase 4);
 * por ahora cualquier usuario autenticado ve el panel admin.
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
    var result = await window.Auth.login(email, password);
    if (!result.success) {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
      return;
    }

    // Guardamos una representación mínima del usuario desde Firebase Auth.
    var fbUser = (window.firebaseAuth && window.firebaseAuth.currentUser) || null;
    AppState.currentUser = fbUser
      ? { id: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName || fbUser.email }
      : { email: email, displayName: email };

    toast('¡Bienvenido ' + (AppState.currentUser.displayName || email) + '!');

    var returnTo = pendingReturnTo;
    pendingReturnTo = null;
    navigate(returnTo || 'admin');
  } catch (error) {
    try { await window.Auth.logout(); } catch (_) {}
    AppState.currentUser = null;
    errorDiv.textContent = (error && error.message) ? error.message : 'Error al iniciar sesión. Intentá de nuevo.';
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


