// ===== ROUTER PROFESIONAL - PARAÍSO ASTRAL =====

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.guards = new Map();
    this.notFoundRoute = null;
    
    this.setupDefaultRoutes();
    this.setupDefaultGuards();
    this.setupHistoryHandling();
  }

  // ===== CONFIGURACIÓN DE RUTAS =====
  setupDefaultRoutes() {
    // Rutas públicas
    this.addRoute('/', { component: 'home', title: 'Inicio' });
    this.addRoute('/events', { component: 'events', title: 'Eventos' });
    this.addRoute('/events/:id', { component: 'event-detail', title: 'Detalle Evento' });
    this.addRoute('/artists', { component: 'artists', title: 'Artistas' });
    this.addRoute('/artists/:id', { component: 'artist-detail', title: 'Detalle Artista' });
    this.addRoute('/tickets', { component: 'tickets', title: 'Tickets' });
    this.addRoute('/tickets/:eventId', { component: 'tickets', title: 'Tickets Evento' });
    this.addRoute('/news', { component: 'news', title: 'Noticias' });
    this.addRoute('/news/:id', { component: 'news-detail', title: 'Detalle Noticia' });
    
    // Rutas protegidas
    this.addRoute('/notifications', { component: 'notifications', title: 'Notificaciones', guard: 'auth' });
    this.addRoute('/profile', { component: 'profile', title: 'Perfil', guard: 'auth' });
    
    // Rutas admin
    this.addRoute('/admin', { component: 'admin', title: 'Admin', guard: 'admin' });
    this.addRoute('/admin/rrpp', { component: 'rrpp', title: 'RRPP', guard: 'admin' });
    this.addRoute('/admin/rrpp/:id', { component: 'rrpp-detail', title: 'Detalle RRPP', guard: 'admin' });
    
    // Ruta 404
    this.addRoute('/404', { component: '404', title: 'Página no encontrada' });
    this.setNotFoundRoute('/404');
  }

  setupDefaultGuards() {
    // Guard de autenticación
    this.addGuard('auth', () => {
      if (typeof Auth !== 'undefined') {
        return Auth.isLoggedIn();
      }
      return false;
    });

    // Guard de administrador
    this.addGuard('admin', () => {
      if (typeof Auth !== 'undefined') {
        return Auth.isAdmin();
      }
      return false;
    });
  }

  // ===== MANEJO DE HISTORIAL =====
  setupHistoryHandling() {
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', () => {
        // Pequeño retraso para asegurar que todos los módulos estén cargados
        setTimeout(() => {
          // Inicializar router
          if (typeof window !== 'undefined') {
            window.Router = router;
            router.init();
          }
        }, 100);
      });
    }
  }

  // ===== REGISTRO DE RUTAS =====
  addRoute(path, config) {
    // Convertir ruta a expresión regular para parámetros dinámicos
    const regex = this.pathToRegex(path);
    const paramNames = this.extractParamNames(path);
    
    this.routes.set(path, {
      ...config,
      regex,
      paramNames
    });
  }

  // ===== GUARDS =====
  addGuard(name, guardFn) {
    this.guards.set(name, guardFn);
  }

  // ===== NAVEGACIÓN =====
  navigate(path, updateHistory = true) {
    const route = this.matchRoute(path);
    
    if (!route) {
      return this.navigateToNotFound();
    }

    // Verificar guards
    if (route.guard && !this.checkGuard(route.guard)) {
      return this.handleGuardFailure(route.guard);
    }

    // Extraer parámetros
    const params = this.extractParams(path, route);
    
    // Actualizar estado
    this.currentRoute = { ...route, params, path };
    
    // Actualizar historial
    if (updateHistory) {
      window.history.pushState(
        { route: path }, 
        route.title, 
        path
      );
    }

    // Actualizar título
    document.title = `${route.title} - Paraíso Astral`;

    // Navegar a la página
    this.navigateToPage(route.component, params);
  }

  push(path, params = {}) {
    // Construir URL con parámetros
    let finalPath = path;
    
    // Reemplazar parámetros en la ruta
    Object.keys(params).forEach(key => {
      finalPath = finalPath.replace(`:${key}`, params[key]);
    });

    this.navigate(finalPath);
  }

  // ===== MATCHING DE RUTAS =====
  matchRoute(path) {
    for (const [routePath, route] of this.routes) {
      if (route.regex.test(path)) {
        return route;
      }
    }
    return null;
  }

  // ===== UTILIDADES DE RUTAS =====
  pathToRegex(path) {
    // Convertir :param a regex capturante
    const regexPath = path.replace(/:([^\/]+)/g, '([^/]+)');
    return new RegExp(`^${regexPath}$`);
  }

  extractParamNames(path) {
    const paramNames = [];
    const matches = path.match(/:([^\/]+)/g);
    if (matches) {
      matches.forEach(match => {
        paramNames.push(match.substring(1)); // Quitar el ':'
      });
    }
    return paramNames;
  }

  extractParams(path, route) {
    const matches = path.match(route.regex);
    if (!matches) return {};
    
    const params = {};
    route.paramNames.forEach((paramName, index) => {
      params[paramName] = matches[index + 1];
    });
    
    return params;
  }

  // ===== GUARDS =====
  checkGuard(guardName) {
    const guard = this.guards.get(guardName);
    if (!guard) return true;
    return guard();
  }

  handleGuardFailure(guardName) {
    switch (guardName) {
      case 'auth':
        toast('🔐 Debes iniciar sesión para acceder');
        this.push('/');
        break;
      case 'admin':
        toast('⚠️ No tienes permisos de administrador');
        this.push('/');
        break;
      default:
        this.push('/');
    }
  }

  // ===== NAVEGACIÓN A PÁGINAS =====
  navigateToPage(component, params = {}) {
    // Usar el sistema de navegación existente
    if (typeof navigate === 'function') {
      // Para rutas dinámicas, extraer el ID del componente
      const pageId = component.replace('-', '');
      
      if (params.id) {
        const id = parseInt(params.id);
        
        // Obtener datos según el componente
        let data = null;
        if (typeof API !== 'undefined') {
          switch (component) {
            case 'event-detail':
              data = API.getEventById(id);
              break;
            case 'artist-detail':
              data = API.getArtistById(id);
              break;
            case 'news-detail':
              data = API.getNewsById(id);
              break;
            case 'rrpp-detail':
              data = API.getRRPPById(id);
              break;
            case 'tickets':
              if (params.eventId) {
                data = API.getEventById(parseInt(params.eventId));
              }
              break;
          }
        }
        
        navigate(pageId, data);
      } else {
        navigate(pageId);
      }
    }
  }

  navigateToNotFound() {
    if (this.notFoundRoute) {
      this.navigate(this.notFoundRoute);
    }
  }

  setNotFoundRoute(path) {
    this.notFoundRoute = path;
  }

  // ===== UTILIDADES =====
  getCurrentRoute() {
    return this.currentRoute;
  }

  isActiveRoute(path) {
    if (!this.currentRoute) return false;
    return this.currentRoute.path === path;
  }

  // ===== LINKS =====
  createLink(path, text, className = '') {
    const isActive = this.isActiveRoute(path);
    const activeClass = isActive ? 'active' : '';
    return `<a href="${path}" class="${className} ${activeClass}" data-route>${text}</a>`;
  }
}

// Crear instancia global del router
const router = new Router();

// Interceptar clicks en links con data-route
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-route]');
  if (link) {
    e.preventDefault();
    const path = link.getAttribute('href');
    if (path) {
      router.push(path);
    }
  }
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = router;
} else {
  window.Router = router;
}
