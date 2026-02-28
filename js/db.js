// ===== DATABASE - DATOS ESTÁTICOS - PARAÍSO ASTRAL =====

const DATABASE = {
  events: [
    {
      id: 1, title: "Neon Nebula Rave", venue: "Cosmic Dome, Sector 7",
      date: "2024-10-04", time: "22:00 - 06:00", month: "OCT", day: "04",
      status: "live",
      lineup: ["Nebula Flux", "Moon Echo", "Astral Void", "Nova Pulse"],
      flyer: "🌌", description: "La reunión cósmica más intensa del año. Techno de alto voltaje y psytrance en el Cosmic Dome.",
      ticketGeneral: 45, ticketVIP: 120, ticketBackstage: 200,
      soldGeneral: 320, soldVIP: 85, soldBackstage: 12,
      capacity: 1200, attendance: 417,
      tags: ["Techno", "Psytrance"],
    },
    {
      id: 2, title: "Pulsar Deep House", venue: "Gravity Lounge",
      date: "2024-10-09", time: "21:00 - 04:00", month: "OCT", day: "09",
      status: "upcoming",
      lineup: ["Deep Void", "Silicon Soul", "Zen Drift"],
      flyer: "🎵", description: "Una noche íntima de deep house y melodías cósmicas en el exclusivo Gravity Lounge.",
      ticketGeneral: 35, ticketVIP: 90, ticketBackstage: 150,
      soldGeneral: 180, soldVIP: 40, soldBackstage: 5,
      capacity: 400, attendance: 0,
      tags: ["Deep House", "Ambient"],
    },
    {
      id: 3, title: "Supernova Festival", venue: "The Zenith Arena",
      date: "2024-10-12", time: "16:00 - 08:00", month: "OCT", day: "12",
      status: "upcoming",
      lineup: ["Orbital", "Zenith Force", "Comet", "Solar Flare", "Cosmic Ray"],
      flyer: "✨", description: "El festival más esperado del año regresa con un lineup estelar.",
      ticketGeneral: 60, ticketVIP: 180, ticketBackstage: 350,
      soldGeneral: 850, soldVIP: 210, soldBackstage: 28,
      capacity: 5000, attendance: 0,
      tags: ["Festival", "Techno", "Live"],
    },
    {
      id: 4, title: "Solar Eclipse Festival", venue: "Main Stage Open Air",
      date: "2024-10-24", time: "02:00 - 14:00", month: "OCT", day: "24",
      status: "upcoming",
      lineup: ["Astral Projection", "Luna Edge", "Echo Pulse", "Nova Stream"],
      flyer: "🌞", description: "Celebra el eclipse solar con 12 horas de música non-stop al aire libre.",
      ticketGeneral: 55, ticketVIP: 150, ticketBackstage: 280,
      soldGeneral: 420, soldVIP: 95, soldBackstage: 15,
      capacity: 3000, attendance: 0,
      tags: ["Psytrance", "Open Air"],
    },
    {
      id: 5, title: "Interstellar Rave 2024", venue: "Galactic Station V",
      date: "2024-12-14", time: "22:00 - 10:00", month: "DIC", day: "14",
      status: "featured",
      lineup: ["Nebula Flux", "Cosmic Ray", "Astral Void", "Solar Flare", "Luna Edge", "Deep Void"],
      flyer: "🚀", description: "El evento más grande de la galaxia. 12 horas de música electrónica en Galactic Station V.",
      ticketGeneral: 75, ticketVIP: 200, ticketBackstage: 450,
      soldGeneral: 1200, soldVIP: 380, soldBackstage: 45,
      capacity: 8000, attendance: 0,
      tags: ["Festival", "Headliner"],
    },
    {
      id: 6, title: "Neon Desert Rave", venue: "Dune Dome",
      date: "2024-11-12", time: "23:30 - 08:00", month: "NOV", day: "12",
      status: "upcoming",
      lineup: ["Echo Pulse", "Silicon Soul", "Zen Drift"],
      flyer: "🏜️", description: "Un viaje sonoro a través del desierto neon.",
      ticketGeneral: 40, ticketVIP: 100, ticketBackstage: 180,
      soldGeneral: 210, soldVIP: 60, soldBackstage: 8,
      capacity: 600, attendance: 0,
      tags: ["Techno", "Experimental"],
    },
  ],

  artists: [
    { id: 1, name: "Nebula Flux", role: "Headliner", genre: "High Velocity Techno", emoji: "🎧", bio: "DJ referente del techno underground europeo. Conocido por sus sets de alta energía y técnica impecable.", events: [1,5], followers: 48200 },
    { id: 2, name: "Cosmic Ray", role: "Resident", genre: "Psychedelic Dub", emoji: "🌀", bio: "Residente histórico de Paraíso Astral. Maestro del dub psicodélico y las texturas sonoras.", events: [1,3,5], followers: 32100 },
    { id: 3, name: "Astral Void", role: "Special Guest", genre: "Ethereal Vocals", emoji: "🎤", bio: "Vocalista electrónica con presencia escénica única. Sus performances fusionan música y arte visual.", events: [1,5], followers: 61000 },
    { id: 4, name: "Solar Flare", role: "Rising Star", genre: "Acid House", emoji: "⚡", bio: "La estrella emergente del circuito underground. Su sonido ácido y contundente está conquistando los clubs.", events: [3,5], followers: 18500 },
    { id: 5, name: "Luna Edge", role: "Top Performer", genre: "Dark Techno", emoji: "🌙", bio: "Una de las artistas más versátiles de la escena. Sus sets nocturnos son experiencias transformadoras.", events: [4,5], followers: 29800 },
    { id: 6, name: "Echo Pulse", role: "Resident", genre: "Progressive House", emoji: "📡", bio: "Residente del Gravity Lounge, experto en construcción de sets largos y fluidos.", events: [4,6], followers: 22300 },
    { id: 7, name: "Deep Void", role: "Guest", genre: "Deep Techno", emoji: "🌊", bio: "Productor y DJ con raíces en el techno de Detroit. Profundidad sónica garantizada.", events: [2,5], followers: 35700 },
    { id: 8, name: "Zen Drift", role: "Ambient", genre: "Ambient / Downtempo", emoji: "🧘", bio: "Especialista en música ambient y downtempo. El piso chill nunca sonó tan bien.", events: [2,6], followers: 15400 },
    { id: 9, name: "Silicon Soul", role: "Producer", genre: "Electronica / IDM", emoji: "💿", bio: "Productor experimental con influencias del IDM y la electrónica académica.", events: [2,3], followers: 11200 },
    { id: 10, name: "Nova Stream", role: "Rising", genre: "Melodic Techno", emoji: "🌠", bio: "Artista multidisciplinar que combina el techno melódico con instalaciones visuales.", events: [4], followers: 8900 },
  ],

  rrpp: [
    { id: 1, name: "Lucas Silva", email: "lucas@gmail.com", phone: "+54 911 2345-6789", commission: 0.15, sold: 142, revenue: 4820.50, earned: 723.08, joinDate: "2024-01-15", active: true, sales: [ { buyer: "Ana García", ticket: "VIP Astral Pass", amount: 120, time: "2m ago" }, { buyer: "Marco Russo", ticket: "General Admission", amount: 45, time: "15m ago" }, { buyer: "Sofia Mendez", ticket: "Celestial Ritual Pass", amount: 45, time: "1h ago" }, { buyer: "Pedro Costa", ticket: "VIP Astral Pass", amount: 120, time: "2h ago" }, ] },
    { id: 2, name: "Ana K. Schmidt", email: "ana@gmail.com", phone: "+54 911 3456-7890", commission: 0.15, sold: 98, revenue: 6200.00, earned: 930.00, joinDate: "2024-02-20", active: true, sales: [ { buyer: "Carlos Torres", ticket: "General Admission", amount: 45, time: "30m ago" }, { buyer: "María López", ticket: "Backstage Pass", amount: 200, time: "3h ago" }, ] },
    { id: 3, name: "Marco Polo", email: "marco@gmail.com", phone: "+54 911 4567-8901", commission: 0.12, sold: 67, revenue: 2890.00, earned: 346.80, joinDate: "2024-03-10", active: true, sales: [ { buyer: "Juan Díaz", ticket: "General Admission", amount: 35, time: "1h ago" }, ] },
    { id: 4, name: "Valentina Cruz", email: "vale@gmail.com", phone: "+54 911 5678-9012", commission: 0.15, sold: 201, revenue: 9845.00, earned: 1476.75, joinDate: "2023-12-01", active: true, sales: [] },
    { id: 5, name: "Diego Romero", email: "diego@gmail.com", phone: "+54 911 6789-0123", commission: 0.10, sold: 34, revenue: 1260.00, earned: 126.00, joinDate: "2024-05-05", active: false, sales: [] },
  ],

  news: [
    { id: 1, title: "Mastering para frecuencias cósmicas", category: "Producción", date: "2024-10-01", body: "El proceso de mastering en Paraíso Astral busca frecuencias que resuenen con la energía del universo.", emoji: "🎛️" },
    { id: 2, title: "Introduciendo a Nebula Void", category: "Nuevo Artista", date: "2024-09-28", body: "Un nuevo talento emerge del underground con un sonido fresco y poderoso que ya está dando de qué hablar.", emoji: "⭐" },
    { id: 3, title: "European Astral Tour 2025", category: "Tour", date: "2024-09-20", body: "Paraíso Astral lleva su propuesta única a las mejores salas de Europa en una gira histórica.", emoji: "🌍" },
    { id: 4, title: "Analog vs Digital: La guerra de los synths", category: "Gear Talk", date: "2024-09-15", body: "Un análisis profundo de los sintetizadores analógicos y digitales y cómo conviven en la escena actual.", emoji: "🎹" },
    { id: 5, title: "Nuevo stage en Supernova Festival", category: "Festival", date: "2024-10-02", body: "El Supernova Festival anuncia un nuevo escenario dedicado al ambient y la música experimental.", emoji: "🔊" },
    { id: 6, title: "Paraíso Astral en Ibiza 2025", category: "Noticias", date: "2024-09-10", body: "Confirmamos nuestra residencia en Ibiza para la temporada 2025. Detalles próximamente.", emoji: "🏝️" },
  ],

  notifications: [
    { id: 1, text: "🎫 Lucas Silva vendió 3 entradas para Supernova Festival", time: "Hace 2 min", unread: true },
    { id: 2, text: "🎵 Nuevo artista confirmado: ORBITAL para Supernova", time: "Hace 15 min", unread: true },
    { id: 3, text: "⚠️ Stock limitado: quedan 12 Backstage Pass para Neon Nebula Rave", time: "Hace 1h", unread: true },
    { id: 4, text: "💰 Valentina Cruz superó $9,000 en ventas este mes", time: "Hace 2h", unread: false },
    { id: 5, text: "📊 El informe semanal de ventas está listo", time: "Hace 5h", unread: false },
    { id: 6, text: "🎉 Supernova Festival: 1,088 entradas vendidas", time: "Ayer", unread: false },
    { id: 7, text: "🔔 Recuerda: Neon Nebula Rave es ESTA NOCHE", time: "Ayer", unread: false },
  ],

  adminStats: {
    totalRevenue: 128450,
    attendance: 4290,
    ticketsSold: 15200,
    activeRRPP: 4,
    revenueChange: 12.5,
    attendanceChange: 8.2,
    ticketsChange: 5.4,
    projection: 5800,
    chartData: [40, 65, 90, 55, 75, 100, 85],
    chartLabels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  }
};

// Inicializar la API con los datos
if (typeof API !== 'undefined') {
  API.initData(DATABASE);
}

// Exportar para compatibilidad temporal
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DATABASE;
} else {
  window.DATABASE = DATABASE;
}
