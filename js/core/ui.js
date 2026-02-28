// ===== UI MANAGER - EVENT DELEGATION Y RENDER - PARAÍSO ASTRAL =====

class UIManager {
  constructor() {
    this.renderQueue = [];
    this.renderScheduled = false;
    this.observers = new Map();
    this.lazyLoadedElements = new Set();
    
    this.init();
  }

  // ===== INICIALIZACIÓN =====
  init() {
    this.setupEventDelegation();
    this.setupIntersectionObserver();
    this.setupResizeObserver();
    this.setupPerformanceMonitoring();
  }

  // ===== EVENT DELEGATION =====
  setupEventDelegation() {
    // Delegar todos los eventos al document principal
    document.addEventListener('click', this.handleGlobalClick.bind(this), true);
    document.addEventListener('change', this.handleGlobalChange.bind(this), true);
    document.addEventListener('input', this.handleGlobalInput.bind(this), true);
    document.addEventListener('submit', this.handleGlobalSubmit.bind(this), true);
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this), true);
  }

  handleGlobalClick(event) {
    const target = event.target;
    const closest = target.closest('[data-action]');
    
    if (closest) {
      const action = closest.dataset.action;
      const data = closest.dataset;
      
      // Prevenir comportamiento por defecto si es necesario
      if (this.shouldPreventDefault(action)) {
        event.preventDefault();
      }
      
      // Ejecutar acción
      this.executeAction(action, data, closest, event);
    }
  }

  handleGlobalChange(event) {
    const target = event.target;
    const closest = target.closest('[data-change]');
    
    if (closest) {
      const action = closest.dataset.change;
      const data = target.dataset;
      
      this.executeAction(action, data, target, event);
    }
  }

  handleGlobalInput(event) {
    const target = event.target;
    const closest = target.closest('[data-input]');
    
    if (closest) {
      const action = closest.dataset.input;
      const data = {
        value: target.value,
        name: target.name,
        id: target.id
      };
      
      // Debounce para inputs de búsqueda
      if (action === 'search') {
        this.debounceAction(action, data, target, 300);
      } else {
        this.executeAction(action, data, target, event);
      }
    }
  }

  handleGlobalSubmit(event) {
    const target = event.target;
    const action = target.dataset.submit;
    
    if (action) {
      event.preventDefault();
      const formData = new FormData(target);
      const data = Object.fromEntries(formData);
      
      this.executeAction(action, data, target, event);
    }
  }

  handleGlobalKeydown(event) {
    const target = event.target;
    
    // Atajos de teclado globales
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'k':
          event.preventDefault();
          this.showSearchModal();
          break;
        case '/':
          event.preventDefault();
          this.focusSearch();
          break;
        case 'n':
          event.preventDefault();
          if (typeof Router !== 'undefined') {
            Router.push('/notifications');
          }
          break;
      }
    }
    
    // Escape para cerrar modales
    if (event.key === 'Escape') {
      this.closeTopModal();
    }
  }

  // ===== EJECUCIÓN DE ACCIONES =====
  executeAction(action, data, element, event) {
    try {
      switch (action) {
        case 'navigate':
          this.handleNavigate(data);
          break;
        case 'modal':
          this.handleModal(data);
          break;
        case 'toast':
          this.showToast(data.message || 'Acción completada');
          break;
        case 'search':
          this.handleSearch(data);
          break;
        case 'filter':
          this.handleFilter(data);
          break;
        case 'purchase':
          this.handlePurchase(data);
          break;
        case 'validate':
          this.handleValidate(data);
          break;
        case 'share':
          this.handleShare(data);
          break;
        case 'download':
          this.handleDownload(data);
          break;
        case 'toggle':
          this.handleToggle(data, element);
          break;
        default:
          console.warn('Acción no reconocida:', action);
      }
    } catch (error) {
      console.error('Error ejecutando acción:', error);
      this.showToast('Error en la acción', 'error');
    }
  }

  handleNavigate(data) {
    if (typeof Router !== 'undefined') {
      if (data.route) {
        Router.push(data.route);
      } else if (data.page) {
        Router.push(`/${data.page}`);
      }
    }
  }

  handleModal(data) {
    if (data.id) {
      if (typeof openModal === 'function') {
        openModal(data.id);
      }
    }
  }

  handleSearch(data) {
    const query = data.value || data.query || '';
    
    if (typeof filterEvents === 'function') {
      filterEvents(query);
    }
    
    // Actualizar URL con parámetros de búsqueda
    if (typeof Router !== 'undefined') {
      const url = new URL(window.location);
      if (query) {
        url.searchParams.set('q', query);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url);
    }
  }

  handleFilter(data) {
    const { type, value } = data;
    
    switch (type) {
      case 'events':
        if (typeof renderEvents === 'function') {
          renderEvents(value);
        }
        break;
      case 'artists':
        // Implementar filtrado de artistas
        break;
      default:
        console.warn('Filtro no reconocido:', type);
    }
  }

  handlePurchase(data) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      this.showToast('Debes iniciar sesión para comprar tickets', 'warning');
      return;
    }
    
    // Lógica de compra
    if (data.eventId && typeof Router !== 'undefined') {
      Router.push(`/tickets/${data.eventId}`);
    }
  }

  handleValidate(data) {
    if (typeof TicketValidator !== 'undefined') {
      TicketValidator.startScanMode({
        onScan: (result) => {
          if (result.valid) {
            this.showToast('✅ Ticket válido', 'success');
          } else {
            this.showToast('❌ ' + result.error, 'error');
          }
        },
        onError: (error) => {
          this.showToast('Error en validación: ' + error.message, 'error');
        }
      });
    }
  }

  handleShare(data) {
    if (navigator.share) {
      navigator.share({
        title: data.title || 'Paraíso Astral',
        text: data.text || 'Mira este evento increíble',
        url: data.url || window.location.href
      });
    } else {
      // Fallback para navegadores que no soportan Web Share API
      this.copyToClipboard(data.url || window.location.href);
      this.showToast('Enlace copiado al portapapeles');
    }
  }

  handleDownload(data) {
    const { url, filename } = data;
    
    // Crear link temporal para descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  handleToggle(data, element) {
    const { target, state } = data;
    
    if (target) {
      const targetElement = document.querySelector(target);
      if (targetElement) {
        const isVisible = targetElement.style.display !== 'none';
        targetElement.style.display = state === 'toggle' ? (isVisible ? 'none' : '') : (state ? '' : 'none');
        
        // Actualizar estado del botón
        if (element) {
          element.classList.toggle('active', !isVisible);
        }
      }
    }
  }

  // ===== UTILIDADES =====
  shouldPreventDefault(action) {
    const preventDefaultActions = [
      'navigate', 'modal', 'search', 'filter', 'purchase', 
      'validate', 'share', 'download', 'toggle'
    ];
    return preventDefaultActions.includes(action);
  }

  showToast(message, type = 'info') {
    if (typeof toast === 'function') {
      toast(message);
    } else {
      // Fallback
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);
      }
    }
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  showSearchModal() {
    this.handleModal({ id: 'modal-search' });
  }

  focusSearch() {
    const searchInput = document.querySelector('#search-events, #search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  closeTopModal() {
    const topModal = document.querySelector('.modal-overlay.show');
    if (topModal) {
      const modalId = topModal.id;
      if (typeof closeModal === 'function') {
        closeModal(modalId);
      }
    }
  }

  // ===== DEBOUNCE =====
  debounceAction(action, data, element, delay = 300) {
    if (element._debounceTimer) {
      clearTimeout(element._debounceTimer);
    }
    
    element._debounceTimer = setTimeout(() => {
      this.executeAction(action, data, element);
      element._debounceTimer = null;
    }, delay);
  }

  // ===== RENDER INCREMENTAL =====
  scheduleRender(renderFn, priority = 'normal') {
    this.renderQueue.push({ renderFn, priority });
    
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.processRenderQueue();
        this.renderScheduled = false;
      });
    }
  }

  processRenderQueue() {
    // Ordenar por prioridad
    const priorities = { high: 0, normal: 1, low: 2 };
    this.renderQueue.sort((a, b) => priorities[a.priority] - priorities[b.priority]);
    
    // Procesar cola
    while (this.renderQueue.length > 0) {
      const { renderFn } = this.renderQueue.shift();
      try {
        renderFn();
      } catch (error) {
        console.error('Error en render:', error);
      }
    }
  }

  // ===== LAZY LOADING =====
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    // Observar elementos con data-lazy
    document.querySelectorAll('[data-lazy]').forEach(element => {
      observer.observe(element);
    });
  }

  loadElement(element) {
    const lazyType = element.dataset.lazy;
    
    switch (lazyType) {
      case 'image':
        this.loadLazyImage(element);
        break;
      case 'component':
        this.loadLazyComponent(element);
        break;
      default:
        console.warn('Tipo de lazy loading no reconocido:', lazyType);
    }
  }

  loadLazyImage(element) {
    const src = element.dataset.src;
    if (src) {
      element.src = src;
      element.classList.add('loaded');
    }
  }

  loadLazyComponent(element) {
    const component = element.dataset.component;
    if (component && !this.lazyLoadedElements.has(component)) {
      this.lazyLoadedElements.add(component);
      // Cargar componente dinámicamente
      this.loadComponent(component, element);
    }
  }

  async loadComponent(componentName, container) {
    try {
      // Aquí iría la lógica para cargar componentes dinámicamente
      console.log('Cargando componente:', componentName);
    } catch (error) {
      console.error('Error cargando componente:', error);
    }
  }

  // ===== PERFORMANCE MONITORING =====
  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'measure') {
          this.logPerformanceMetric(entry.name, entry.duration);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
  }

  setupResizeObserver() {
    if (!('ResizeObserver' in window)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        this.handleResize(entry.target, entry.contentRect);
      });
    });

    // Observar elementos que necesiten redimensionamiento
    document.querySelectorAll('[data-resize]').forEach(element => {
      observer.observe(element);
    });
  }

  handleResize(element, rect) {
    const resizeAction = element.dataset.resize;
    
    switch (resizeAction) {
      case 'chart':
        this.resizeChart(element, rect);
        break;
      case 'grid':
        this.resizeGrid(element, rect);
        break;
      default:
        console.warn('Acción de resize no reconocida:', resizeAction);
    }
  }

  resizeChart(element, rect) {
    // Lógica para redimensionar gráficos
    console.log('Redimensionando chart:', rect);
  }

  resizeGrid(element, rect) {
    // Lógica para redimensionar grids
    console.log('Redimensionando grid:', rect);
  }

  setupPerformanceMonitoring() {
    // Marcar tiempo de carga inicial
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.logPerformanceMetric('page-load', loadTime);
    });

    // Monitorear interacciones
    this.setupInteractionTiming();
  }

  setupInteractionTiming() {
    const interactions = ['click', 'touchstart'];
    
    interactions.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const target = event.target.closest('[data-track]');
        if (target) {
          const trackName = target.dataset.track;
          performance.mark(`${trackName}-start`);
          
          setTimeout(() => {
            performance.mark(`${trackName}-end`);
            performance.measure(
              trackName,
              `${trackName}-start`,
              `${trackName}-end`
            );
          }, 100);
        }
      });
    });
  }

  logPerformanceMetric(name, duration) {
    console.log(`Performance - ${name}: ${duration.toFixed(2)}ms`);
    
    // Enviar a analytics si está disponible
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(duration)
      });
    }
  }

  // ===== ACCESSIBILITY =====
  setupAccessibility() {
    // Manejo de focus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Anuncios para screen readers
    this.setupScreenReaderAnnouncements();
  }

  setupScreenReaderAnnouncements() {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);

    this.screenReaderAnnouncer = announcer;
  }

  announceToScreenReader(message) {
    if (this.screenReaderAnnouncer) {
      this.screenReaderAnnouncer.textContent = message;
      setTimeout(() => {
        this.screenReaderAnnouncer.textContent = '';
      }, 1000);
    }
  }
}

// Crear instancia global del UI Manager
const uiManager = new UIManager();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = uiManager;
} else {
  window.UIManager = uiManager;
}
