// ===== PARAÍSO ASTRAL - APP.JS =====

// Estado global: solo usuario logueado (si lo hay).
var AppState = {
  currentUser: null
};
window.AppState = AppState;

// ── PLAYER STATE ─────────────────────────────────────────────────────────────
var PlayerState = {
  trackUrl: null,
  artistName: null,
  artistPhoto: null,
  isPlaying: false,
  element: null  // referencia al <audio> DOM
};

function initPlayer() {
  // Inyectar keyframe para glow pulsante
  var style = document.createElement('style');
  style.textContent = '@keyframes player-glow{0%,100%{box-shadow:0 0 4px 1px rgba(209,37,244,0.4)}50%{box-shadow:0 0 12px 4px rgba(209,37,244,0.85)}}#header-player-avatar.playing{animation:player-glow 1.5s ease-in-out infinite}';
  document.head.appendChild(style);

  var audio = document.createElement('audio');
  audio.id = 'global-audio';
  audio.preload = 'none';
  audio.volume = 0.5;
  document.body.appendChild(audio);
  PlayerState.element = audio;

  audio.addEventListener('play', function () {
    PlayerState.isPlaying = true;
    var btn = document.getElementById('header-player-btn');
    if (btn) btn.textContent = '⏸';
    var avatar = document.getElementById('header-player-avatar');
    if (avatar) avatar.classList.add('playing');
  });

  audio.addEventListener('pause', function () {
    PlayerState.isPlaying = false;
    var btn = document.getElementById('header-player-btn');
    if (btn) btn.textContent = '▶';
    var avatar = document.getElementById('header-player-avatar');
    if (avatar) avatar.classList.remove('playing');
  });

  audio.addEventListener('ended', function () {
    PlayerState.isPlaying = false;
    var btn = document.getElementById('header-player-btn');
    if (btn) btn.textContent = '▶';
    var avatar = document.getElementById('header-player-avatar');
    if (avatar) avatar.classList.remove('playing');
  });
}

function playArtistTrack(trackUrl, artistName, artistPhoto) {
  var audio = PlayerState.element;
  if (!audio) return;

  var isSameTrack = PlayerState.trackUrl === trackUrl;

  // Si es el mismo track y está sonando, pausar (toggle)
  if (isSameTrack && !audio.paused) {
    audio.pause();
    return;
  }

  // Cargar nuevo track si cambió
  if (!isSameTrack) {
    audio.src = trackUrl;
    PlayerState.trackUrl = trackUrl;
    PlayerState.artistName = artistName;
    PlayerState.artistPhoto = artistPhoto;

    var avatar = document.getElementById('header-player-avatar');
    if (avatar) {
      if (artistPhoto) {
        avatar.innerHTML = '<img src="' + String(artistPhoto).replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover">';
      } else {
        avatar.innerHTML = '🎧';
      }
    }

    var nameEl = document.getElementById('header-player-name');
    if (nameEl) {
      var displayName = String(artistName || '');
      nameEl.textContent = displayName.length > 10 ? displayName.slice(0, 10) + '...' : displayName;
    }
  }

  // Mostrar controles en header
  var playerEl = document.getElementById('header-player');
  if (playerEl) playerEl.style.display = 'flex';

  audio.play().catch(function (err) {
    console.warn('[Player] No se pudo reproducir:', err);
  });
}

function togglePlay() {
  var audio = PlayerState.element;
  if (!audio || !PlayerState.trackUrl) return;
  if (audio.paused) {
    audio.play().catch(function (err) {
      console.warn('[Player] No se pudo reproducir:', err);
    });
  } else {
    audio.pause();
  }
}
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
  window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
  });
  window.addEventListener('error', function (event) {
    console.error('Global error:', event.error);
  });
}

// Helper global para escapar HTML (reemplaza el antiguo ApiClient.sanitizeHTML).
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  // Initialize global audio player (once, persists across navigation)
  initPlayer();

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
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
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

    const safe = escapeHtml;

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
  return '<div class="event-compact-card">'
    + '<div class="event-compact-thumb">' + thumb + '</div>'
    + '<div class="event-compact-info">'
    + '<div class="event-compact-name">' + title + '</div>'
    + '<div class="event-compact-meta">' + date + ' · ' + venue + '</div>'
    + '<div class="event-compact-actions">'
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
  renderEvents();
}

function filterEventsByDay(day) {
  renderEvents();
}

function filterEvents(query) {
  // This will be implemented with real API filtering
  // For now, just re-render events
  renderEvents();
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
        <div class="event-lineup">📍 ${e.venue || ''}</div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
          <button class="btn btn-primary" style="flex:1;padding:0.6rem;font-size:0.78rem;min-width:0" onclick="event.stopPropagation();navigate('event-detail', '${safeId}')">Ver detalle</button>
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
    // Edición ahora vive en el panel admin (tab Eventos). Sin botones de edit inline.
    var editImageBtn = '';
    var editEventBtn = '';
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

function shareEvent(id) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'Paraíso Astral', text: 'Mirá este evento', url: url }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () { toast('📋 Link copiado'); });
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

      ${a.trackUrl ? `
      <div style="margin-bottom:1.5rem;text-align:center">
        <button class="btn btn-primary" style="font-size:1rem;padding:0.65rem 1.5rem" onclick="playArtistTrack('${String(a.trackUrl).replace(/'/g, "\\'")}','${String(a.name).replace(/'/g, "\\'")}','${String(a.photo || '').replace(/'/g, "\\'")}')">
          ${(PlayerState.trackUrl === a.trackUrl && PlayerState.isPlaying) ? '⏸ Pausar' : '▶ Escuchar set'}
        </button>
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
    photo: '', bio: '', trackUrl: '', events: [], socials: { instagram: '', soundcloud: '', spotify: '' }
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
        <label>Track de muestra (MP3)</label>
        ${artist.trackUrl ? `<audio controls src="${safe(artist.trackUrl)}" style="width:100%;margin-bottom:0.5rem"></audio>` : ''}
        <input class="input" type="file" name="trackFile" accept="audio/*">
        <input type="hidden" name="trackUrl" value="${safe(artist.trackUrl)}">
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
  var trackFile = fd.get('trackFile');
  var trackUrl = fd.get('trackUrl') || '';

  if (photoFile && photoFile.size > 0) {
    toast('📤 Subiendo foto...');
    var up = await window.CloudinaryClient.upload(photoFile, 'paraiso-astral/artists');
    if (up.status !== 'success') {
      toast('❌ Error al subir foto: ' + (up.message || ''));
      return;
    }
    photo = up.data.url;
  }

  if (trackFile && trackFile.size > 0) {
    toast('📤 Subiendo track...');
    var upTrack = await window.CloudinaryClient.uploadAudio(trackFile, 'paraiso-astral/tracks');
    if (upTrack.status !== 'success') {
      toast('❌ Error al subir track: ' + (upTrack.message || ''));
      return;
    }
    trackUrl = upTrack.data.url;
  }

  var payload = {
    name: fd.get('name') || '',
    role: fd.get('role') || '',
    genre: fd.get('genre') || '',
    emoji: fd.get('emoji') || '🎧',
    photo: photo,
    bio: fd.get('bio') || '',
    trackUrl: trackUrl,
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

// ===== AUTHENTICATION =====


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
 * Handle logout
 */
async function handleLogout() {
  try {
    await window.Auth.logout();
    AppState.currentUser = null;
    toast('👋 Sesión cerrada');
    navigate('home');
  } catch (error) {
    toast('Error al cerrar sesión');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);


