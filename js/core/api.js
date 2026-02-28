// ===== API - ACCESO A DATOS - PARAÍSO ASTRAL =====

class API {
  constructor() {
    this.data = null; // Se cargará desde db.js
  }

  // ===== INICIALIZACIÓN =====
  initData(data) {
    this.data = data;
  }

  // ===== VALIDACIÓN =====
  validateEventData(event) {
    const required = ['id', 'title', 'venue', 'date', 'time', 'status', 'lineup'];
    return required.every(field => event[field] !== undefined);
  }

  validateArtistData(artist) {
    const required = ['id', 'name', 'role', 'genre'];
    return required.every(field => artist[field] !== undefined);
  }

  validateRRPPData(rrpp) {
    const required = ['id', 'name', 'email', 'commission'];
    return required.every(field => rrpp[field] !== undefined);
  }

  // ===== EVENTOS =====
  getEvents(filter = {}) {
    if (!this.data) return [];
    
    let events = [...this.data.events];
    
    if (filter.status) {
      if (filter.status === 'past') {
        events = events.filter(e => e.status === 'past');
      } else if (filter.status === 'upcoming') {
        events = events.filter(e => e.status !== 'past');
      } else if (filter.status === 'live') {
        events = events.filter(e => e.status === 'live');
      }
    }
    
    if (filter.search) {
      const query = filter.search.toLowerCase();
      events = events.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.venue.toLowerCase().includes(query)
      );
    }
    
    if (filter.date) {
      events = events.filter(e => e.date === filter.date);
    }
    
    return events;
  }

  getEventById(id) {
    if (!this.data) return null;
    return this.data.events.find(e => e.id === parseInt(id)) || null;
  }

  getFeaturedEvent() {
    if (!this.data) return null;
    return this.data.events.find(e => e.status === 'featured') || this.data.events[0] || null;
  }

  getLiveEvent() {
    if (!this.data) return null;
    return this.data.events.find(e => e.status === 'live') || null;
  }

  getUpcomingEvents(limit = 3) {
    if (!this.data) return [];
    return this.data.events
      .filter(e => e.status !== 'past' && e.status !== 'live')
      .slice(0, limit);
  }

  getEventRevenue(eventId) {
    const event = this.getEventById(eventId);
    if (!event) return 0;
    return (event.soldGeneral * event.ticketGeneral) + 
           (event.soldVIP * event.ticketVIP) + 
           (event.soldBackstage * event.ticketBackstage);
  }

  getEventTotalSold(eventId) {
    const event = this.getEventById(eventId);
    if (!event) return 0;
    return event.soldGeneral + event.soldVIP + event.soldBackstage;
  }

  // ===== ARTISTAS =====
  getArtists(filter = {}) {
    if (!this.data) return [];
    
    let artists = [...this.data.artists];
    
    if (filter.genre) {
      artists = artists.filter(a => 
        a.genre.toLowerCase().includes(filter.genre.toLowerCase())
      );
    }
    
    if (filter.search) {
      const query = filter.search.toLowerCase();
      artists = artists.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.genre.toLowerCase().includes(query)
      );
    }
    
    return artists;
  }

  getArtistById(id) {
    if (!this.data) return null;
    return this.data.artists.find(a => a.id === parseInt(id)) || null;
  }

  getArtistsByEvent(eventId) {
    if (!this.data) return [];
    const event = this.getEventById(eventId);
    if (!event || !event.lineup) return [];
    
    return event.lineup.map(artistName => 
      this.data.artists.find(a => a.name === artistName)
    ).filter(Boolean);
  }

  // ===== RRPP =====
  getRRPP(filter = {}) {
    if (!this.data) return [];
    
    let rrpp = [...this.data.rrpp];
    
    if (filter.active !== undefined) {
      rrpp = rrpp.filter(r => r.active === filter.active);
    }
    
    if (filter.search) {
      const query = filter.search.toLowerCase();
      rrpp = rrpp.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query)
      );
    }
    
    return rrpp;
  }

  getRRPPById(id) {
    if (!this.data) return null;
    return this.data.rrpp.find(r => r.id === parseInt(id)) || null;
  }

  getActiveRRPP() {
    return this.getRRPP({ active: true });
  }

  // ===== NOTICIAS =====
  getNews(limit = null) {
    if (!this.data) return [];
    let news = [...this.data.news];
    if (limit) news = news.slice(0, limit);
    return news;
  }

  getNewsById(id) {
    if (!this.data) return null;
    return this.data.news.find(n => n.id === parseInt(id)) || null;
  }

  getNewsByCategory(category) {
    if (!this.data) return [];
    return this.data.news.filter(n => n.category === category);
  }

  // ===== NOTIFICACIONES =====
  getNotifications(unreadOnly = false) {
    if (!this.data) return [];
    let notifs = [...this.data.notifications];
    if (unreadOnly) {
      notifs = notifs.filter(n => n.unread);
    }
    return notifs;
  }

  // ===== ESTADÍSTICAS ADMIN =====
  getAdminStats() {
    if (!this.data) return null;
    return this.data.adminStats;
  }

  getTotalRevenue() {
    const stats = this.getAdminStats();
    return stats ? stats.totalRevenue : 0;
  }

  getTotalAttendance() {
    const stats = this.getAdminStats();
    return stats ? stats.attendance : 0;
  }

  getTotalTicketsSold() {
    const stats = this.getAdminStats();
    return stats ? stats.ticketsSold : 0;
  }

  // ===== BÚSQUEDA =====
  search(query) {
    if (!this.data || !query) return { events: [], artists: [], news: [] };
    
    const q = query.toLowerCase();
    
    return {
      events: this.getEvents({ search: q }),
      artists: this.getArtists({ search: q }),
      news: this.data.news.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.body.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      )
    };
  }

  // ===== CALENDARIO =====
  getEventsInMonth(year, month) {
    return this.getEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  }

  getEventDaysInMonth(year, month) {
    const events = this.getEventsInMonth(year, month);
    return events.map(event => {
      const date = new Date(event.date);
      return date.getDate();
    });
  }

  // ===== TICKETS =====
  getTicketPrice(eventId, type) {
    const event = this.getEventById(eventId);
    if (!event) return 0;
    
    switch (type) {
      case 'general': return event.ticketGeneral;
      case 'vip': return event.ticketVIP;
      case 'backstage': return event.ticketBackstage;
      default: return 0;
    }
  }

  getTicketAvailability(eventId, type) {
    const event = this.getEventById(eventId);
    if (!event) return 0;
    
    const sold = this.getEventTotalSold(eventId);
    const capacity = event.capacity;
    return Math.max(0, capacity - sold);
  }

  // ===== UTILIDADES =====
  getEventStatusColor(status) {
    switch (status) {
      case 'live': return 'var(--pink)';
      case 'upcoming': return 'var(--primary)';
      case 'featured': return 'var(--cyan)';
      case 'past': return 'var(--text-muted)';
      default: return 'var(--text)';
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(timeStr) {
    return timeStr; // Ya viene formateado
  }
}

// Crear instancia global de la API
const api = new API();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.API = api;
}
