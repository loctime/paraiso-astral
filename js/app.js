// ===== PARAÍSO ASTRAL - APP.JS =====

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
  // Public routes are always accessible
  if (window.CONFIG.PUBLIC_ROUTES.includes(pageId)) {
    return true;
  }
  
  // Protected routes require authentication
  if (isProtectedRoute(pageId)) {
    return window.Auth.isAuthenticated();
  }
  
  return true;
}

/**
 * Enhanced navigate function with route protection
 * @param {string} pageId - Target page ID
 * @param {any} data - Optional data for page
 */
function navigate(pageId, data) {
  // Check route protection
  if (!canAccessRoute(pageId)) {
    // Redirect to login with return URL
    window.location.hash = `#login?return=${encodeURIComponent(pageId)}`;
    return;
  }
  
  // Original navigation logic
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
 * Global error handler
 * @param {string} message - Error message
 * @param {string} type - Error type
 */
function globalErrorHandler(message, type = 'error') {
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const icon = icons[type] || icons.error;
  toast(`${icon} ${message}`);
}

/**
 * Initialize error handling
 */
function initializeErrorHandling() {
  // Set global error handler in ApiClient
  if (window.ApiClient && window.ApiClient.setErrorHandler) {
    window.ApiClient.setErrorHandler(globalErrorHandler);
  }
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    globalErrorHandler('Error inesperado en la aplicación', 'error');
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    globalErrorHandler('Error inesperado en la aplicación', 'error');
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
 * @param {Function} retryCallback - Optional retry callback
 */
function showErrorState(container, message, retryCallback = null) {
  if (!container) return;
  
  const retryButton = retryCallback ? 
    `<button class="btn btn-primary" style="margin-top:1.5rem" onclick="(${retryCallback})()">🔄 Reintentar</button>` : '';
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">${message}</div>
      ${retryButton}
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
  
  // Check auth state after a short delay
  setTimeout(async () => {
    if (!window.Auth.isAuthenticated()) {
      navigate('login');
    } else {
      // User is authenticated, check role and redirect appropriately
      try {
        const response = await window.ApiClient.get('/me');
        const user = response.data;
        
        if (user.role === 'ADMIN') {
          navigate('admin');
        } else if (user.role === 'ARTIST') {
          navigate('profile'); // TODO: create artist view
        } else if (user.role === 'PR') {
          navigate('rrpp'); // TODO: create PR view
        } else {
          navigate('home');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        navigate('home');
      }
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
    // Handle return URL from login redirect
    if (page === 'login' && queryParams) {
      const urlParams = new URLSearchParams(queryParams);
      const returnTo = urlParams.get('return');
      if (returnTo) {
        // Store return URL for after login
        sessionStorage.setItem('returnTo', returnTo);
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
  
  // Show loading state
  showLoading(content, 'Cargando eventos...');
  
  try {
    // Fetch events from backend
    const response = await window.ApiClient.get('/api/events');
    const events = response.data || [];
    
    if (!events || events.length === 0) {
      showErrorState(content, 'No hay eventos disponibles');
      return;
    }
    
    // Find featured, live, and upcoming events
    const featured = events.find(e => e.isFeatured) || events[0];
    const liveEvent = events.find(e => e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date()));
    const upcomingEvents = events.filter(e => e.status === 'PUBLISHED' && new Date(e.startAt) > new Date()).slice(0, 3);
    
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

    ${featured ? `
    <div class="hero fade-in" onclick="navigate('event-detail', '${featured.id}')">
      <div class="hero-placeholder star-bg">${window.ApiClient.sanitizeHTML(featured.coverImage || '🌌')}</div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="badge badge-primary" style="margin-bottom:0.5rem">Evento Destacado</span>
        <h2 class="hero-title">${window.ApiClient.sanitizeHTML(featured.title)}</h2>
        <p class="hero-sub">${new Date(featured.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} • ${window.ApiClient.sanitizeHTML(featured.venue || 'Venue')}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem">
          <div class="avatar-row">
            ${featured ? featured.title.substring(0, 3).split('').map((c,i) => `<div class="avatar" style="background:hsl(${280+i*30},60%,40%);font-size:0.7rem;display:flex;align-items:center;justify-content:center">${c}</div>`).join('') : ''}
            <div class="avatar avatar-count">+${Math.max(0, (featured ? featured.title.length : 0) - 3)}</div>
          </div>
          <button class="btn btn-primary" style="padding:0.6rem 1.2rem;font-size:0.8rem" onclick="event.stopPropagation();navigate('tickets','${featured.id}')">🎫 Entradas</button>
        </div>
      </div>
    </div>` : ''}

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

    <div class="section-header">
      <span class="section-title">Próximos Eventos</span>
      <a class="section-link" onclick="navigate('events')">Ver todos</a>
    </div>
    ${upcomingEvents.map(e => renderEventCardMini(e)).join('')}

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

function renderEventCardMini(e) {
  return `
    <div class="event-card" onclick="navigate('event-detail', ${e.id})">
      <div class="event-img-placeholder star-bg">${e.coverImage || '🌌'}</div>
      <div class="event-body">
        <div class="event-meta">
          <div><div class="event-name">${e.title}</div><div class="event-venue">${e.venue}</div></div>
          <div class="event-date-badge"><div class="event-date-month">${new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</div><div class="event-date-day">${new Date(e.startAt).getDate()}</div></div>
        </div>
        ${e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date()) ? '<span class="badge badge-live" style="margin-top:0.5rem">🔴 LIVE</span>' : ''}
        <div class="event-lineup">� ${e.city || e.venue}</div>
      </div>
    </div>`;
}

// ── EVENTS PAGE ──────────────────────────────────────────────────────────────
async function renderEvents(filter = 'upcoming') {
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
    // Fetch events from backend
    const response = await window.ApiClient.get('/api/events');
    const events = response.data || [];
    
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
  return `
    <div class="event-card" onclick="navigate('event-detail', ${e.id})">
      <div class="event-img-placeholder star-bg" style="height:160px">${e.coverImage || '🌌'}</div>
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
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
          <button class="btn btn-primary" style="flex:1;padding:0.6rem;font-size:0.78rem" onclick="event.stopPropagation();navigate('tickets',${e.id})">🎫 Comprar</button>
          <button class="btn btn-outline" style="padding:0.6rem 0.8rem;font-size:0.78rem" onclick="event.stopPropagation();navigate('event-detail',${e.id})">Ver más</button>
        </div>
      </div>
    </div>`;
}

// ── EVENT DETAIL ─────────────────────────────────────────────────────────────
async function renderEventDetail(eventId) {
  const el = document.getElementById('page-event-detail');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  content.innerHTML = `
    <button onclick="navigate('events')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
    <div style="text-align:center;padding:2rem">
      <div style="font-size:2rem">🔄</div>
      <div style="margin-top:0.5rem;color:var(--text-muted)">Cargando evento...</div>
    </div>
  `;
  
  try {
    // Fetch event from backend
    const response = await window.ApiClient.get('/api/events');
    const events = response.data || [];
    const e = events.find(event => event.id === eventId);
    
    if (!e) {
      content.innerHTML = `
        <button onclick="navigate('events')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
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

    content.innerHTML = `
    <button onclick="navigate('events')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
    <div style="border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--border);margin-bottom:1.2rem">
      <div style="height:220px;background:linear-gradient(135deg,#1a0820,#3d0055,#1a0820);display:flex;align-items:center;justify-content:center;font-size:6rem;position:relative">
        ${e.coverImage || '🌌'}
        ${e.status === 'PUBLISHED' && new Date(e.startAt) <= new Date() && (!e.endAt || new Date(e.endAt) > new Date()) ? '<span class="badge badge-live" style="position:absolute;top:1rem;left:1rem">🔴 LIVE</span>' : '<span class="badge badge-primary" style="position:absolute;top:1rem;left:1rem">'+new Date(e.startAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })+'</span>'}
      </div>
      <div style="padding:1.2rem">
        <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:0.3rem">${e.title}</h2>
        <div style="color:var(--primary);font-weight:600;margin-bottom:0.5rem">📍 ${e.venue || 'Venue'}</div>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem">🕐 ${new Date(e.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        <p style="font-size:0.9rem;line-height:1.6;color:rgba(240,230,255,0.8)">${e.description || 'Una experiencia cósmica única te espera.'}</p>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
          <span class="badge badge-glass">${e.status}</span>
          <span class="badge badge-glass">📍 ${e.city || 'Sin ciudad'}</span>
        </div>
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
      <button class="btn btn-outline" onclick="navigate('events')">← Ver Todos</button>
    </div>}

    <div style="margin-top:1.5rem">
      <button class="btn btn-primary btn-full" onclick="navigate('tickets','${e.id}')">🎫 Comprar Entradas</button>
      <button class="btn btn-outline btn-full" style="margin-top:0.5rem" onclick="shareEvent('${e.id}')">📤 Compartir Evento</button>
    </div>
  `;
    
  } catch (error) {
    console.error('Error loading event detail:', error);
    content.innerHTML = `
      <button onclick="navigate('events')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Volver</button>
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error al cargar evento</div>
        <button class="btn btn-primary" style="margin-top:1.5rem" onclick="renderEventDetail('${eventId}')">🔄 Reintentar</button>
      </div>
    `;
  }
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
function renderTicketsPage(eventId) {
  const e = DATABASE.events.find(x => x.id === eventId) || DATABASE.events[0];
  const el = document.getElementById('page-tickets');
  const content = el.querySelector('.page-content');

  content.innerHTML = `
    <button onclick="navigate('events')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Eventos</button>
    
    <div style="border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--border);margin-bottom:1.5rem">
      <div style="height:160px;background:linear-gradient(135deg,#1a0820,#3d0055);display:flex;align-items:center;justify-content:center;font-size:5rem;position:relative">
        ${e.flyer}
        <span class="badge badge-primary" style="position:absolute;top:0.75rem;left:0.75rem">Evento Destacado</span>
      </div>
      <div style="padding:1rem">
        <h2 style="font-size:1.3rem;font-weight:900">${e.title}</h2>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-top:0.3rem">📅 ${e.month} ${e.day} · ${e.time}</div>
        <div style="color:var(--primary);font-size:0.85rem;font-weight:600">📍 ${e.venue}</div>
      </div>
    </div>

    <h3 style="font-family:var(--font-display);font-size:0.85rem;font-weight:700;margin-bottom:1rem">Seleccionar Tipo de Acceso</h3>
    
    ${[
      { type: 'general', label: 'Acceso General', desc: 'Acceso completo al Main Stage y Chill Zone', price: e.ticketGeneral, avail: 'Disponible', remaining: e.capacity - e.soldGeneral - e.soldVIP - e.soldBackstage },
      { type: 'vip', label: 'VIP Astral Pass ✦', desc: 'Acceso backstage, VIP lounge & Fast track', price: e.ticketVIP, avail: 'Limitado', remaining: Math.max(0, 200 - e.soldVIP) },
      { type: 'backstage', label: 'Backstage Pass 👑', desc: 'Acceso total + meet & greet artistas', price: e.ticketBackstage, avail: 'Exclusivo', remaining: Math.max(0, 50 - e.soldBackstage) },
    ].map(t => `
      <div class="ticket ${DATABASE.state.selectedTicketType === t.type ? 'selected' : ''}" onclick="selectTicket('${t.type}')" style="margin-bottom:0.75rem">
        <div class="ticket-inner">
          <div>
            <div style="font-weight:800;font-size:1rem">${t.label}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem">${t.desc}</div>
            <div style="font-size:0.7rem;margin-top:0.3rem;color:${t.remaining < 30 ? 'var(--pink)' : 'var(--green)'}">${t.remaining} disponibles</div>
          </div>
          <div style="text-align:right">
            <div style="color:var(--primary);font-family:var(--font-display);font-size:1.1rem;font-weight:700">$${t.price}</div>
            <div style="font-size:0.65rem;text-transform:uppercase;font-weight:700;color:var(--text-muted)">${t.avail}</div>
          </div>
        </div>
      </div>`).join('')}

    <div class="glass-card" style="padding:1.5rem;margin:1.5rem 0;text-align:center">
      <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--primary);font-weight:700;margin-bottom:1rem">Pase Digital de Entrada</div>
      <div style="background:white;border-radius:var(--radius-lg);padding:1rem;display:inline-block;position:relative">
        ${generateQR()}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <div style="width:36px;height:36px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:1rem">🚀</div>
        </div>
      </div>
      <div style="margin-top:1rem">
        <div style="font-family:var(--font-display);font-size:1rem;font-weight:700">AX-${Math.floor(Math.random()*999)+100}-PARAISO</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.3rem">Escanear en la puerta de entrada</div>
      </div>
    </div>

    <button class="btn btn-primary btn-full" style="font-size:1rem;padding:1rem" onclick="purchaseTicket(${e.id})">🛍️ Comprar con Seguridad</button>
    <div style="text-align:center;margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted)">🔒 Pago seguro · SSL encriptado</div>
  `;
}

function selectTicket(type) {
  DATABASE.state.selectedTicketType = type;
  const eventId = DATABASE.state.selectedEvent;
  renderTicketsPage(eventId);
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
function renderPaymentModal() {
  const e = DATABASE.events.find(x => x.id === DATABASE.state.selectedEvent) || DATABASE.events[0];
  const typeMap = { general: { label: 'Acceso General', price: e.ticketGeneral }, vip: { label: 'VIP Astral Pass', price: e.ticketVIP }, backstage: { label: 'Backstage Pass', price: e.ticketBackstage } };
  const t = typeMap[DATABASE.state.selectedTicketType] || typeMap.general;
  const modal = document.getElementById('modal-payment');
  modal.querySelector('.bottom-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">💳 Finalizar Compra</div>
    <div class="glass-card" style="padding:0.75rem 1rem;margin-bottom:1.2rem;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:700">${e.title}</div><div style="font-size:0.8rem;color:var(--text-muted)">${t.label}</div></div>
      <div style="font-family:var(--font-display);color:var(--primary);font-size:1.1rem;font-weight:700">$${t.price}</div>
    </div>
    <div class="form-group"><label>Nombre completo</label><input class="input" type="text" placeholder="Tu nombre" id="pay-name" /></div>
    <div class="form-group"><label>Email</label><input class="input" type="email" placeholder="tu@email.com" id="pay-email" /></div>
    <div class="form-group"><label>Número de tarjeta</label><input class="input" type="text" placeholder="1234 5678 9012 3456" maxlength="19" /></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem">
      <div class="form-group" style="margin-bottom:0"><label>Vencimiento</label><input class="input" type="text" placeholder="MM/AA" /></div>
      <div class="form-group" style="margin-bottom:0"><label>CVV</label><input class="input" type="text" placeholder="123" maxlength="3" /></div>
    </div>
    <button class="btn btn-primary btn-full" style="font-size:1rem;padding:1rem;margin-top:0.5rem" onclick="confirmPayment()">🔐 Confirmar Pago · $${t.price}</button>
    <button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="closeModal('modal-payment')">Cancelar</button>
  `;
}

function confirmPayment() {
  closeModal('modal-payment');
  toast('🎉 ¡Entrada comprada exitosamente!');
  // Note: Payment processing would go here with real backend integration
}

function filterNews(q) {
  const filtered = DATABASE.news.filter(n => n.title.toLowerCase().includes(q.toLowerCase()) || n.category.toLowerCase().includes(q.toLowerCase()));
  const list = document.getElementById('news-list');
  if (list) list.innerHTML = filtered.map(n => `<div class="list-item" onclick="navigate('news-detail',${n.id})"><div class="list-icon" style="font-size:1.5rem">${n.emoji}</div><div class="list-body"><div style="font-size:0.6rem;color:var(--primary);text-transform:uppercase;font-weight:700">${n.category}</div><div class="list-title">${n.title}</div></div></div>`).join('');
}

function renderNewsDetail(newsId) {
  const n = DATABASE.news.find(x => x.id === newsId);
  if (!n) return;
  const el = document.getElementById('page-news-detail');
  const content = el.querySelector('.page-content');
  content.innerHTML = `
    <button onclick="navigate('news')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← Noticias</button>
    <div style="text-align:center;font-size:5rem;margin:1.5rem 0">${n.emoji}</div>
    <span class="badge badge-glass">${n.category}</span>
    <h2 style="font-size:1.4rem;font-weight:900;margin:0.75rem 0">${n.title}</h2>
    <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:1.2rem">📅 ${n.date}</div>
    <div class="divider"></div>
    <p style="font-size:0.95rem;line-height:1.8;margin-top:1rem;color:rgba(240,230,255,0.85)">${n.body} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <p style="font-size:0.95rem;line-height:1.8;margin-top:1rem;color:rgba(240,230,255,0.85)">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    <div style="margin-top:1.5rem">
      <button class="btn btn-outline btn-full" onclick="toast('📤 Compartido!')">📤 Compartir</button>
    </div>
  `;
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function renderNotifications() {
  const el = document.getElementById('page-notifications');
  const content = el.querySelector('.page-content');
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <span style="font-size:0.8rem;color:var(--text-muted)">${DATABASE.notifications.filter(n=>n.unread).length} sin leer</span>
      <button class="btn btn-ghost" style="font-size:0.75rem;padding:0.3rem 0.75rem" onclick="markAllRead()">Marcar todo</button>
    </div>
    <div id="notif-list">
      ${DATABASE.notifications.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markRead(${n.id})">
          ${n.unread ? '<div class="notif-dot-badge"></div>' : '<div style="width:8px;flex-shrink:0"></div>'}
          <div class="notif-body">
            <div class="notif-text">${n.text}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function markRead(id) {
  const n = DATABASE.notifications.find(x => x.id === id);
  if (n) { n.unread = false; }
  updateNotifBadge();
  renderNotifications();
}

function markAllRead() {
  DATABASE.notifications.forEach(n => n.unread = false);
  updateNotifBadge();
  renderNotifications();
}

function updateNotifBadge() {
  const count = DATABASE.notifications.filter(n => n.unread).length;
  DATABASE.state.unreadNotifs = count;
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
async function renderAdmin() {
  const el = document.getElementById('page-admin');
  const content = el.querySelector('.page-content');
  
  // Show loading state
  showLoading(content, 'Cargando panel administrativo...');
  
  try {
    // Get current user info
    const userResponse = await window.ApiClient.get('/me');
    const user = userResponse.data;
    
    // Get events for admin stats
    const eventsResponse = await window.ApiClient.get('/api/events');
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
        <button class="btn btn-primary" onclick="openModal('modal-add-event')">
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
function renderRRPP() {
  const el = document.getElementById('page-rrpp');
  const content = el.querySelector('.page-content');
  const totalRev = DATABASE.rrpp.reduce((s, r) => s + r.revenue, 0);
  const totalComm = DATABASE.rrpp.reduce((s, r) => s + r.earned, 0);
  const totalSold = DATABASE.rrpp.reduce((s, r) => s + r.sold, 0);

  content.innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="stat-card"><div class="stat-label">Revenue RRPP</div><div class="stat-value" style="font-size:1.1rem">$${(totalRev/1000).toFixed(1)}k</div></div>
      <div class="stat-card"><div class="stat-label">Comisiones</div><div class="stat-value" style="font-size:1.1rem;color:var(--green)">$${totalComm.toFixed(0)}</div></div>
      <div class="stat-card"><div class="stat-label">Entradas</div><div class="stat-value" style="font-size:1.1rem">${totalSold}</div></div>
      <div class="stat-card"><div class="stat-label">RRPP Activos</div><div class="stat-value" style="font-size:1.1rem">${DATABASE.rrpp.filter(r=>r.active).length}</div></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div class="section-title font-display">Equipo RRPP</div>
      <button class="btn btn-primary" style="padding:0.4rem 0.9rem;font-size:0.8rem" onclick="openModal('modal-add-rrpp')">+ Agregar</button>
    </div>

    ${DATABASE.rrpp.map(r => `
      <div class="rrpp-card" onclick="navigate('rrpp-detail',${r.id})">
        <div class="rrpp-avatar" style="opacity:${r.active?1:0.5}">${r.name[0]}</div>
        <div class="rrpp-info">
          <div class="rrpp-name">${r.name} ${r.active ? '' : '<span style="font-size:0.65rem;color:var(--text-muted)">(Inactivo)</span>'}</div>
          <div class="rrpp-stats">🎫 ${r.sold} vendidas · 📧 ${r.email}</div>
          <div class="rrpp-stats">💰 Com: ${(r.commission*100).toFixed(0)}%</div>
        </div>
        <div class="rrpp-revenue">
          <div class="rrpp-amount">$${(r.revenue/1000).toFixed(1)}k</div>
          <div class="rrpp-comm">Com: $${r.earned.toFixed(0)}</div>
        </div>
      </div>`).join('')}

    <div style="margin-top:1rem">
      <button class="btn btn-outline btn-full" onclick="exportData()">📊 Exportar reporte RRPP</button>
    </div>
  `;
}

function renderRRPPDetail(rrppId) {
  const r = DATABASE.rrpp.find(x => x.id === rrppId);
  if (!r) return;
  const el = document.getElementById('page-rrpp-detail');
  const content = el.querySelector('.page-content');

  content.innerHTML = `
    <button onclick="navigate('rrpp')" style="display:flex;align-items:center;gap:0.5rem;color:var(--primary);background:none;border:none;cursor:pointer;font-size:0.9rem;font-weight:600;margin-bottom:1rem">← RRPP</button>
    <div style="text-align:center;margin-bottom:1.5rem">
      <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;box-shadow:0 0 20px var(--primary-glow)">${r.name[0]}</div>
      <h2 style="font-size:1.5rem;font-weight:900">${r.name}</h2>
      <div style="color:var(--text-muted);font-size:0.85rem;margin:0.3rem 0">${r.email} · ${r.phone}</div>
      <span class="badge ${r.active?'badge-cyan':'badge-glass'}">${r.active?'✅ Activo':'❌ Inactivo'}</span>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">$${(r.revenue/1000).toFixed(1)}k</div><div class="stat-change stat-up">📈</div></div>
      <div class="stat-card"><div class="stat-label">Comisión</div><div class="stat-value" style="color:var(--green)">$${r.earned.toFixed(0)}</div><div class="stat-change">💰 Listo</div></div>
      <div class="stat-card"><div class="stat-label">Entradas</div><div class="stat-value">${r.sold}</div></div>
      <div class="stat-card"><div class="stat-label">% Comisión</div><div class="stat-value">${(r.commission*100).toFixed(0)}%</div></div>
    </div>

    <div class="section-header"><span class="section-title">Ventas Recientes</span></div>
    ${r.sales.length === 0 ? '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Sin ventas recientes</div></div>' :
      r.sales.map(s => `
        <div class="list-item">
          <div class="list-icon">🎫</div>
          <div class="list-body"><div class="list-title">${s.buyer}</div><div class="list-subtitle">${s.ticket} · ${s.time}</div></div>
          <div class="list-right"><div style="color:var(--green);font-weight:700">+$${s.amount}</div><div style="font-size:0.65rem;color:var(--text-muted)">Com: $${(s.amount*r.commission).toFixed(2)}</div></div>
        </div>`).join('')}

    <div style="margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <button class="btn btn-primary" onclick="toast('📋 Link copiado!')">📤 Copiar Link</button>
      <button class="btn btn-outline" onclick="toggleRRPP(${r.id})">${r.active?'❌ Desactivar':'✅ Activar'}</button>
    </div>
  `;
}

function toggleRRPP(id) {
  const r = DATABASE.rrpp.find(x => x.id === id);
  if (r) { r.active = !r.active; toast(r.active ? '✅ RRPP activado' : '❌ RRPP desactivado'); renderRRPPDetail(id); }
}

// ── ADD RRPP MODAL ─────────────────────────────────────────────────────────────
function renderAddRRPPModal() {
  const modal = document.getElementById('modal-add-rrpp');
  modal.querySelector('.bottom-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">👥 Nuevo RRPP</div>
    <div class="form-group"><label>Nombre completo</label><input class="input" type="text" placeholder="Nombre" id="rrpp-name" /></div>
    <div class="form-group"><label>Email</label><input class="input" type="email" placeholder="email@ejemplo.com" id="rrpp-email" /></div>
    <div class="form-group"><label>Teléfono</label><input class="input" type="tel" placeholder="+54 911..." id="rrpp-phone" /></div>
    <div class="form-group"><label>Comisión (%)</label><input class="input" type="number" placeholder="15" value="15" min="5" max="30" id="rrpp-comm" /></div>
    <button class="btn btn-primary btn-full" style="margin-top:0.5rem" onclick="addRRPP()">✅ Agregar RRPP</button>
    <button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="closeModal('modal-add-rrpp')">Cancelar</button>
  `;
}

function addRRPP() {
  const name = document.getElementById('rrpp-name').value.trim();
  const email = document.getElementById('rrpp-email').value.trim();
  const phone = document.getElementById('rrpp-phone').value.trim();
  const comm = parseFloat(document.getElementById('rrpp-comm').value) / 100;
  if (!name || !email) { toast('⚠️ Completa nombre y email'); return; }
  DATABASE.rrpp.push({ id: Date.now(), name, email, phone, commission: comm || 0.15, sold: 0, revenue: 0, earned: 0, joinDate: new Date().toISOString().slice(0,10), active: true, sales: [] });
  closeModal('modal-add-rrpp');
  toast(`✅ ${name} agregado como RRPP!`);
  renderRRPP();
}

// ── PROFILE PAGE ─────────────────────────────────────────────────────────────
function renderProfile() {
  const el = document.getElementById('page-profile');
  const content = el.querySelector('.page-content');
  content.innerHTML = `
    <div style="margin:-0.5rem -1rem 1.5rem;background:linear-gradient(135deg,#1a0820,#3d0055,#1a0820);height:140px;display:flex;align-items:center;justify-content:center;font-size:4rem;position:relative">
      🌌
    </div>
    <div style="text-align:center;margin-top:-50px;position:relative;z-index:1;margin-bottom:1.5rem">
      <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6b1a8a);border:3px solid var(--primary);margin:0 auto 0.75rem;display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 0 20px var(--primary-glow)">👤</div>
      <h2 style="font-size:1.3rem;font-weight:900">Admin Cósmico</h2>
      <div style="color:var(--primary);font-size:0.85rem;font-weight:600">Paraíso Astral · Administrador</div>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="stat-card" style="text-align:center"><div class="stat-label">Eventos</div><div class="stat-value">${DATABASE.events.length}</div></div>
      <div class="stat-card" style="text-align:center"><div class="stat-label">Artistas</div><div class="stat-value">${DATABASE.artists.length}</div></div>
      <div class="stat-card" style="text-align:center"><div class="stat-label">RRPP</div><div class="stat-value">${DATABASE.rrpp.length}</div></div>
      <div class="stat-card" style="text-align:center"><div class="stat-label">Noticias</div><div class="stat-value">${DATABASE.news.length}</div></div>
    </div>

    <div class="section-title font-display" style="margin-bottom:0.75rem">Configuración</div>
    ${[
      { icon: '🔔', label: 'Notificaciones', action: "navigate('notifications')" },
      { icon: '👥', label: 'Gestionar RRPP', action: "navigate('rrpp')" },
      { icon: '📊', label: 'Panel Admin', action: "navigate('admin')" },
      { icon: '📤', label: 'Exportar Datos', action: "exportData()" },
      { icon: '📱', label: 'Instalar App (PWA)', action: "installPWA()" },
      { icon: '🌙', label: 'Modo oscuro', action: "toast('🌙 Ya estás en modo oscuro!')" },
    ].map(item => `
      <div class="list-item" onclick="${item.action}" style="margin-bottom:0.5rem">
        <div class="list-icon">${item.icon}</div>
        <div class="list-body"><div class="list-title">${item.label}</div></div>
        <span style="color:var(--primary)">›</span>
      </div>`).join('')}
  `;
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function installPWA() {
  if (deferredPrompt) { deferredPrompt.prompt(); }
  else { toast('📱 Abre este sitio en Chrome y usa "Añadir a pantalla de inicio"'); }
}

// ── ADD EVENT MODAL ─────────────────────────────────────────────────────────
function renderAddEventModal() {
  const modal = document.getElementById('modal-add-event');
  modal.querySelector('.bottom-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">🎉 Nuevo Evento</div>
    <div class="form-group"><label>Nombre del evento</label><input class="input" type="text" placeholder="Ej: Cosmic Rave Vol. 3" id="ev-title" /></div>
    <div class="form-group"><label>Venue / Lugar</label><input class="input" type="text" placeholder="Nombre del lugar" id="ev-venue" /></div>
    <div class="form-group"><label>Fecha</label><input class="input" type="date" id="ev-date" /></div>
    <div class="form-group"><label>Horario</label><input class="input" type="text" placeholder="22:00 - 06:00" id="ev-time" /></div>
    <div class="form-group"><label>Lineup (separado por comas)</label><input class="input" type="text" placeholder="DJ1, DJ2, DJ3" id="ev-lineup" /></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1rem">
      <div class="form-group" style="margin-bottom:0"><label>General $</label><input class="input" type="number" placeholder="45" id="ev-gen" /></div>
      <div class="form-group" style="margin-bottom:0"><label>VIP $</label><input class="input" type="number" placeholder="120" id="ev-vip" /></div>
      <div class="form-group" style="margin-bottom:0"><label>Backstage $</label><input class="input" type="number" placeholder="200" id="ev-back" /></div>
    </div>
    <button class="btn btn-primary btn-full" onclick="addEvent()">✅ Crear Evento</button>
    <button class="btn btn-ghost btn-full" style="margin-top:0.5rem" onclick="closeModal('modal-add-event')">Cancelar</button>
  `;
}

function addEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const venue = document.getElementById('ev-venue').value.trim();
  const date = document.getElementById('ev-date').value;
  if (!title || !venue || !date) { toast('⚠️ Completa los campos requeridos'); return; }
  const d = new Date(date);
  const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  DATABASE.events.push({
    id: Date.now(), title, venue, date,
    time: document.getElementById('ev-time').value || "22:00 - 06:00",
    month: months[d.getMonth()], day: String(d.getDate()).padStart(2,'0'),
    status: "upcoming",
    lineup: (document.getElementById('ev-lineup').value || "TBA").split(',').map(s=>s.trim()),
    flyer: "🎵", description: "Nuevo evento de Paraíso Astral.",
    ticketGeneral: parseFloat(document.getElementById('ev-gen').value)||45,
    ticketVIP: parseFloat(document.getElementById('ev-vip').value)||120,
    ticketBackstage: parseFloat(document.getElementById('ev-back').value)||200,
    soldGeneral: 0, soldVIP: 0, soldBackstage: 0,
    capacity: 1000, attendance: 0, tags: []
  });
  closeModal('modal-add-event');
  toast(`🎉 Evento "${title}" creado!`);
  renderEvents();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Pequeño retraso para asegurar que todos los scripts estén cargados
  setTimeout(() => {
    // Inicializar componentes en orden correcto
    if (typeof DATABASE !== 'undefined') {
      console.log('DATABASE cargado');
    }
    
    // Store eliminado, usando DATABASE directamente
    console.log('Usando DATABASE directamente');
    
    // DATABASE ya está disponible, no se necesita inicialización
    console.log('DATABASE cargado:', DATABASE.events.length + ' eventos disponibles');
    
    // Renderizar páginas iniciales
    renderHome();
    renderEvents();
    renderArtists();
    renderAdmin();
    renderRRPP();
    renderNews();
    renderNotifications();
    renderProfile();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const loading = document.getElementById('login-loading');
  
  // Show loading state
  btnText.style.display = 'none';
  loading.style.display = 'inline';
  errorDiv.style.display = 'none';
  
  try {
    // 1️⃣ Login con Firebase
    const result = await window.Auth.login(email, password);
    
    if (!result.success) {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
      return;
    }
    
    // 2️⃣ Obtener ID token de Firebase
    const token = await window.Auth.getIdToken();
    if (!token) {
      errorDiv.textContent = 'Error al obtener token de autenticación';
      errorDiv.style.display = 'block';
      return;
    }
    
    // 3️⃣ Guardar token en memoria (el Auth module ya lo maneja)
    
    // 4️⃣ Hacer request al backend para validar y obtener datos del usuario
    const response = await window.ApiClient.get('/me');
    
    if (response.status === 'success') {
      const userData = response.data;
      
      // 5️⃣ Renderizar según rol
      toast(`🚀 ¡Bienvenido ${userData.displayName || userData.email}!`);
      
      // Handle return URL if exists
      const returnTo = sessionStorage.getItem('returnTo');
      sessionStorage.removeItem('returnTo');
      
      // Navigate según rol
      if (userData.role === 'ADMIN') {
        navigate(returnTo || 'admin');
      } else if (userData.role === 'ARTIST') {
        navigate(returnTo || 'profile'); // TODO: crear vista artista
      } else if (userData.role === 'PR') {
        navigate(returnTo || 'rrpp'); // TODO: crear vista PR
      } else {
        navigate(returnTo || 'home');
      }
    } else {
      errorDiv.textContent = 'Error al validar usuario con el servidor';
      errorDiv.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'Authentication required') {
      errorDiv.textContent = 'Error de autenticación. Por favor intenta nuevamente.';
    } else if (error.message === 'Access denied') {
      errorDiv.textContent = 'No tienes permisos para acceder al sistema.';
    } else if (error.message === 'User not found in database') {
      errorDiv.textContent = 'Usuario no encontrado en el sistema. Contacta al administrador.';
    } else {
      errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
    }
    errorDiv.style.display = 'block';
  } finally {
    // Hide loading state
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
  const user = window.Auth.getCurrentUser();
  if (!user) {
    // User not logged in, show login
    navigate('login');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
