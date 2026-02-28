# GET /api/events - Final Production Checklist 🔒

## Prerequisites ✅

### Environment Setup
- [ ] PostgreSQL database running and accessible
- [ ] DATABASE_URL configured in .env
- [ ] Firebase credentials configured
- [ ] Node.js 18+ installed
- [ ] Dependencies installed: `npm install`

### Database Setup
```bash
# 1. Generate Prisma client
npm run prisma:generate

# 2. Run database migrations
npm run prisma:migrate

# 3. Seed minimal data
npm run seed

# 4. Verify data in Prisma Studio
npm run prisma:studio
```

## Server Startup ✅

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

**Expected output:**
```
🚀 Server running on port 4000
📱 Environment: development
🔗 Health check: http://localhost:4000/health
🔗 Version: http://localhost:4000/api/version
🌐 CORS origin: http://localhost:3000
✅ Database connected successfully
✅ Database connection verified
```

## API Testing 🔍

### 1. Health Check
```bash
curl -X GET "http://localhost:4000/health" -H "Content-Type: application/json"
```
**Expected (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-02-28T20:00:00.000Z",
  "uptime": 0.123,
  "environment": "development",
  "version": "1.0.0"
}
```

### 2. Default Events List
```bash
curl -X GET "http://localhost:4000/api/events" -H "Content-Type: application/json"
```
**Expected (200):**
```json
{
  "data": [
    {
      "id": "c123...",
      "title": "Cosmic Festival Past",
      "slug": "cosmic-festival-past",
      "description": "Un festival increíble que ya ocurrió en el pasado.",
      "coverImage": "https://example.com/past-event.jpg",
      "startAt": "2024-02-27T20:00:00.000Z",
      "endAt": "2024-02-28T04:00:00.000Z",
      "venue": "Cosmic Arena",
      "city": "Salta",
      "status": "PUBLISHED",
      "organization": {
        "id": "c876...",
        "name": "Astral Events"
      }
    },
    {
      "id": "c456...",
      "title": "Stellar Night Future",
      "slug": "stellar-night-future",
      "description": "Una noche estelar que está por venir...",
      "coverImage": "https://example.com/future-event.jpg",
      "startAt": "2024-02-29T20:00:00.000Z",
      "endAt": "2024-02-30T04:00:00.000Z",
      "venue": "Stellar Club",
      "city": "Buenos Aires",
      "status": "PUBLISHED",
      "organization": {
        "id": "c876...",
        "name": "Astral Events"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### 3. Upcoming Filter
```bash
curl -X GET "http://localhost:4000/api/events?upcoming=true" -H "Content-Type: application/json"
```
**Expected (200):** Only future events (startAt >= now)

### 4. Organization Filter
```bash
curl -X GET "http://localhost:4000/api/events?organizationId=c8765432100fedcba87654321" -H "Content-Type: application/json"
```
**Expected (200):** Events from that organization only

### 5. Status PUBLISHED (Explicit)
```bash
curl -X GET "http://localhost:4000/api/events?status=PUBLISHED" -H "Content-Type: application/json"
```
**Expected (200):** Same as default (only PUBLISHED events)

### 6. Invalid Status (400 Error)
```bash
curl -X GET "http://localhost:4000/api/events?status=DRAFT" -H "Content-Type: application/json"
```
**Expected (400):**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Invalid status parameter. Only PUBLISHED events are available publicly."
}
```

### 7. Pagination
```bash
curl -X GET "http://localhost:4000/api/events?page=1&limit=1" -H "Content-Type: application/json"
```
**Expected (200):** First event only, pagination info correct

## Edge Cases Testing 🧪

### Invalid OrganizationId
```bash
curl -X GET "http://localhost:4000/api/events?organizationId=nonexistent" -H "Content-Type: application/json"
```
**Expected (200):** Empty data array, pagination with total: 0

### Invalid Pagination
```bash
curl -X GET "http://localhost:4000/api/events?page=-1&limit=200" -H "Content-Type: application/json"
```
**Expected (200):** Uses defaults (page=1, limit=20)

### Empty Database
```bash
# After running: npm run prisma:migrate reset --force
curl -X GET "http://localhost:4000/api/events" -H "Content-Type: application/json"
```
**Expected (200):**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Frontend Integration 🌐

### Configuration Check
```javascript
// js/config.js should have:
const CONFIG = {
  API_BASE_URL: 'http://localhost:4000', // ✅ Matches backend port
  // ... other config
};
```

### Frontend Testing
1. Open `http://localhost:3000` in browser
2. Navigate to Events page
3. Should see seeded events displayed correctly
4. Test filters and pagination

## Security Validation 🔒

### Error Handling
- [ ] 400 errors return proper JSON format
- [ ] 500 errors don't expose stack traces in production
- [ ] HttpError instances handled correctly

### Input Validation
- [ ] SQL injection protection via Prisma
- [ ] XSS protection via input sanitization
- [ ] Parameter limits enforced (page, limit, organizationId)

### Data Exposure
- [ ] No sensitive data in responses
- [ ] Draft events not visible publicly
- [ ] Internal fields not exposed (passwordHash, etc.)

## Performance Checks ⚡

### Database Queries
- [ ] Pagination uses LIMIT/OFFSET correctly
- [ ] Indexes exist on filtered columns
- [ ] No N+1 queries in includes

### Response Times
- [ ] API responses under 200ms
- [ ] Database queries optimized
- [ ] Proper HTTP headers set

## Production Deployment 🚀

### Environment Variables
```bash
# Required for production
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://yourdomain.com

# Firebase (required)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Build Process
```bash
# 1. Build TypeScript
npm run build

# 2. Verify dist folder
ls -la dist/

# 3. Start production server
npm start
```

## Monitoring 📊

### Health Monitoring
- [ ] `/health` endpoint accessible
- [ ] Database connection monitored
- [ ] Error logging configured

### Metrics to Track
- Response times per endpoint
- Error rates by status code
- Database query performance
- Memory and CPU usage

---

## ✅ Production Ready Checklist

Before deploying to production, confirm:

- [ ] All tests pass in development environment
- [ ] Database schema matches production expectations
- [ ] Error handling works correctly
- [ ] Security measures are in place
- [ ] Performance meets requirements
- [ ] Frontend integration tested
- [ ] Environment variables documented
- [ ] Logging and monitoring configured

**When all items checked ✅, the endpoint is PRODUCTION-READY** 🎉
