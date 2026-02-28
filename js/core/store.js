// ===== STORE - ESTADO GLOBAL - PARAÍSO ASTRAL =====

class Store {
  constructor() {
    this.state = {
      currentPage: "home",
      selectedEvent: null,
      selectedArtist: null,
      selectedRRPP: null,
      calendarMonth: 9, // October 2024
      calendarYear: 2024,
      selectedTicketType: "general",
      cartItems: [],
      isAdmin: true,
      isLoggedIn: true,
      userName: "Admin",
      unreadNotifs: 3,
      user: {
        id: 1,
        name: "Admin",
        email: "admin@paraiso-astral.com",
        role: "admin",
        permissions: ["admin", "events:write", "rrpp:write", "stats:read"]
      }
    };
    
    this.subscribers = new Set();
    this.loadState();
  }

  // ===== SUSCRIPCIONES =====
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // ===== ACCIONES =====
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
    this.saveState();
  }

  updateState(path, value) {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.notify();
    this.saveState();
  }

  // ===== NAVEGACIÓN =====
  navigate(pageId, data = null) {
    this.setState({
      currentPage: pageId,
      selectedEvent: pageId === 'event-detail' ? data : this.state.selectedEvent,
      selectedArtist: pageId === 'artist-detail' ? data : this.state.selectedArtist,
      selectedRRPP: pageId === 'rrpp-detail' ? data : this.state.selectedRRPP
    });
  }

  // ===== CARRITO =====
  addToCart(item) {
    this.setState({
      cartItems: [...this.state.cartItems, item]
    });
  }

  removeFromCart(itemId) {
    this.setState({
      cartItems: this.state.cartItems.filter(item => item.id !== itemId)
    });
  }

  clearCart() {
    this.setState({ cartItems: [] });
  }

  // ===== NOTIFICACIONES =====
  markNotificationRead(notifId) {
    // Implementar cuando tengamos el módulo de notificaciones
    this.setState({ unreadNotifs: Math.max(0, this.state.unreadNotifs - 1) });
  }

  markAllNotificationsRead() {
    this.setState({ unreadNotifs: 0 });
  }

  // ===== CALENDARIO =====
  setCalendarMonth(month, year) {
    this.setState({
      calendarMonth: month,
      calendarYear: year
    });
  }

  changeCalendarMonth(direction) {
    let newMonth = this.state.calendarMonth + direction;
    let newYear = this.state.calendarYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    this.setCalendarMonth(newMonth, newYear);
  }

  // ===== AUTENTICACIÓN =====
  login(userData) {
    this.setState({
      isLoggedIn: true,
      user: userData,
      userName: userData.name,
      isAdmin: userData.role === 'admin'
    });
  }

  logout() {
    this.setState({
      isLoggedIn: false,
      user: null,
      userName: '',
      isAdmin: false,
      currentPage: 'home'
    });
  }

  // ===== PERSISTENCIA =====
  saveState() {
    try {
      const stateToSave = {
        currentPage: this.state.currentPage,
        calendarMonth: this.state.calendarMonth,
        calendarYear: this.state.calendarYear,
        selectedTicketType: this.state.selectedTicketType,
        cartItems: this.state.cartItems,
        isLoggedIn: this.state.isLoggedIn,
        userName: this.state.userName,
        unreadNotifs: this.state.unreadNotifs
      };
      localStorage.setItem('paraiso_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('No se pudo guardar el estado:', e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('paraiso_state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state = { ...this.state, ...parsedState };
      }
    } catch (e) {
      console.warn('No se pudo cargar el estado:', e);
    }
  }

  // ===== GETTERS =====
  get currentPage() { return this.state.currentPage; }
  get selectedEvent() { return this.state.selectedEvent; }
  get selectedArtist() { return this.state.selectedArtist; }
  get selectedRRPP() { return this.state.selectedRRPP; }
  get cartItems() { return this.state.cartItems; }
  get user() { return this.state.user; }
  get isLoggedIn() { return this.state.isLoggedIn; }
  get isAdmin() { return this.state.isAdmin; }
  get unreadNotifs() { return this.state.unreadNotifs; }
}

// Crear instancia global del store
const store = new Store();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = store;
} else {
  window.Store = store;
}
