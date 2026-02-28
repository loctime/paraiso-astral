# GET /api/events - Examples for Testing

## Setup
- Base URL: `http://localhost:3000/api/events`
- Method: `GET`
- Headers: `Content-Type: application/json`

---

## a) GET /api/events (default)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "c1234567890abcdef12345678",
      "title": "Festival Astral 2024",
      "slug": "festival-astral-2024",
      "description": "Una experiencia cósmica única te espera.",
      "coverImage": "https://example.com/image.jpg",
      "startAt": "2024-12-15T22:00:00.000Z",
      "endAt": "2024-12-16T06:00:00.000Z",
      "venue": "Paraiso Venue",
      "city": "Salta",
      "status": "PUBLISHED",
      "organization": {
        "id": "c8765432100fedcba87654321",
        "name": "Astral Events"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## b) GET /api/events?upcoming=true

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events?upcoming=true" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "c1234567890abcdef12345678",
      "title": "Future Festival",
      "slug": "future-festival",
      "description": "El futuro de la música electrónica.",
      "coverImage": null,
      "startAt": "2024-12-20T22:00:00.000Z",
      "endAt": "2024-12-21T06:00:00.000Z",
      "venue": "Space Station",
      "city": "Buenos Aires",
      "status": "PUBLISHED",
      "organization": {
        "id": "c8765432100fedcba87654321",
        "name": "Astral Events"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## c) GET /api/events?organizationId=xxx

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events?organizationId=c8765432100fedcba87654321" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "c1234567890abcdef12345678",
      "title": "Organization Event",
      "slug": "organization-event",
      "description": "Evento específico de la organización.",
      "coverImage": "https://example.com/org-image.jpg",
      "startAt": "2024-12-10T20:00:00.000Z",
      "endAt": "2024-12-11T02:00:00.000Z",
      "venue": "Club Central",
      "city": "Córdoba",
      "status": "PUBLISHED",
      "organization": {
        "id": "c8765432100fedcba87654321",
        "name": "Astral Events"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**If organizationId doesn't exist:**
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

---

## d) GET /api/events?status=PUBLISHED

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events?status=PUBLISHED" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "c1234567890abcdef12345678",
      "title": "Published Event",
      "slug": "published-event",
      "description": "Evento publicado y disponible.",
      "coverImage": "https://example.com/published.jpg",
      "startAt": "2024-12-25T21:00:00.000Z",
      "endAt": "2024-12-26T05:00:00.000Z",
      "venue": "Main Arena",
      "city": "Rosario",
      "status": "PUBLISHED",
      "organization": {
        "id": "c8765432100fedcba87654321",
        "name": "Astral Events"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## e) GET /api/events?status=DRAFT → 400

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events?status=DRAFT" \
  -H "Content-Type: application/json"
```

**Expected Response (400):**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Invalid status parameter. Only PUBLISHED events are available publicly."
}
```

---

## f) GET /api/events?page=2&limit=10

**Request:**
```bash
curl -X GET "http://localhost:3000/api/events?page=2&limit=10" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "c2345678901bcdef123456789",
      "title": "Page 2 Event",
      "slug": "page-2-event",
      "description": "Evento en la segunda página.",
      "coverImage": null,
      "startAt": "2024-12-30T23:00:00.000Z",
      "endAt": "2024-12-31T07:00:00.000Z",
      "venue": "Beach Club",
      "city": "Mar del Plata",
      "status": "PUBLISHED",
      "organization": {
        "id": "c9876543210abcdef98765432",
        "name": "Beach Productions"
      }
    }
  ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

## Edge Cases to Test

### Invalid organizationId (too long)
```bash
curl -X GET "http://localhost:3000/api/events?organizationId=$(python -c 'print("a" * 130)')" \
  -H "Content-Type: application/json"
```
**Expected:** Ignores the parameter, returns all events

### Invalid page (negative)
```bash
curl -X GET "http://localhost:3000/api/events?page=-1" \
  -H "Content-Type: application/json"
```
**Expected:** Uses default page=1

### Invalid limit (too high)
```bash
curl -X GET "http://localhost:3000/api/events?limit=200" \
  -H "Content-Type: application/json"
```
**Expected:** Uses default limit=20

### Empty database
**Expected Response:**
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

---

## Validation Rules Summary

| Parameter | Valid Values | Default | Validation |
|-----------|--------------|----------|------------|
| status | PUBLISHED only | PUBLISHED | 400 error for other values |
| organizationId | Non-empty string, max 128 chars | - | Ignored if invalid |
| upcoming | "true" or undefined | - | Boolean conversion |
| page | Positive integer, max 1000 | 1 | Uses default if invalid |
| limit | Positive integer, max 100 | 20 | Uses default if invalid |

## Database Schema Reference

```sql
-- Event table structure
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "venue" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "capacityTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
```
