# 🌌 Paraíso Astral PWA

Aplicación web progresiva (PWA) para la productora de música electrónica Paraíso Astral.

## 🚀 Características

### Para Usuarios
- **🏠 Home**: Evento destacado, noticias, próximos eventos, reproductor ambient
- **📅 Eventos**: Calendario, listado de eventos, búsqueda y filtros, detalle completo
- **🎫 Tickets**: Selección de tipo de entrada, pase digital QR, pasarela de pago simulada
- **🎵 Artistas**: Grid de artistas, perfiles detallados, filtro por género
- **🔔 Notificaciones**: Alertas de ventas, confirmaciones, novedades

### Para Administradores
- **📊 Admin Panel**: Métricas en tiempo real, gráficos de ventas, proyecciones
- **👥 RRPP**: Gestión completa del equipo de RRPP, seguimiento de ventas y comisiones
- **📤 Exportar**: Descarga de datos en JSON

## 📱 PWA / Instalación

Esta app es una **Progressive Web App** (PWA). Para instalarla:

1. Abre `index.html` en Chrome/Edge/Safari
2. Busca la opción "Añadir a pantalla de inicio" o "Instalar aplicación"
3. Confirma la instalación

## 🏗️ Estructura

```
paraiso-astral/
├── index.html          # Entrada principal
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker (offline)
├── css/
│   └── style.css       # Sistema de diseño cósmico
└── js/
    ├── db.js           # Base de datos + estado (in-memory)
    └── app.js          # Lógica completa + renderizado
```

## 🎨 Diseño

- **Tipografía**: Orbitron (display) + Exo 2 (body)
- **Colores**: Púrpura cósmico, cyan, verde neón, rosa
- **Fondo**: Gradientes radiales + partículas de estrellas
- **Animaciones**: Fade-in, glow pulse, hover effects

## ⚙️ Tecnologías

- HTML5 + CSS3 + Vanilla JS (sin dependencias npm)
- PWA: Web App Manifest + Service Worker
- Google Fonts: Orbitron + Exo 2
- Sin frameworks externos (máxima compatibilidad)

## 🔌 Servidor local

Para desarrollo local con Service Worker funcionando:
```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Luego abre: http://localhost:8000
## Seguridad basica

- Escaneo local: `node scripts/secret-scan.js`
- En backend: `cd backend && npm run security:scan`
- Hook opcional: `git config core.hooksPath .githooks`
