# Yahrzeit Notification System Implementation Plan

## Overview
Implement daily yahrzeit notifications on ajew.org splash page with clickable links to tzaddik profiles.

## Features
1. **Daily Notification**: Show tzaddikim with yahrzeit today/tomorrow
2. **Clickable Names**: Link to detailed profile pages
3. **Reliable Sources**: Only verified material from trusted sources
4. **Hebrew/English**: Bilingual interface
5. **Mobile Responsive**: Works on all devices

## Database Structure

### Table: `tzaddikim`
```sql
CREATE TABLE tzaddikim (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hebrew_name VARCHAR(255),
  yahrzeit_hebrew VARCHAR(50),
  yahrzeit_month VARCHAR(20),
  gregorian_date DATE,
  year_passed INTEGER,
  location VARCHAR(255),
  notes TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `tzaddik_profiles`
```sql
CREATE TABLE tzaddik_profiles (
  id SERIAL PRIMARY KEY,
  tzaddik_id INTEGER REFERENCES tzaddikim(id),
  biography TEXT,
  teachings TEXT,
  stories TEXT,
  quotes TEXT,
  sources JSONB,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `yahrzeit_notifications`
```sql
CREATE TABLE yahrzeit_notifications (
  id SERIAL PRIMARY KEY,
  tzaddik_id INTEGER REFERENCES tzaddikim(id),
  notification_date DATE,
  displayed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Steps

### Phase 1: Database Setup
1. Convert CSV to SQL database
2. Create API endpoints
3. Set up daily cron job for notifications

### Phase 2: Frontend Implementation
1. Splash page notification component
2. Tzaddik profile pages
3. Search and browse interface

### Phase 3: Content Collection
1. Gather reliable source material
2. Create profile pages
3. Add images and multimedia

## Reliable Sources
- **Breslov**: Likutey Moharan, Sichot HaRan, Shivchey HaRan
- **General**: Chabad.org, Sefaria.org, Torah.org
- **Historical**: Jewish Encyclopedia, Wikipedia (verified)
- **Academic**: Bar-Ilan University, Hebrew University

## API Endpoints

### GET `/api/yahrzeit/today`
Returns tzaddikim with yahrzeit today

### GET `/api/yahrzeit/tomorrow`
Returns tzaddikim with yahrzeit tomorrow

### GET `/api/tzaddik/:id`
Returns full profile for specific tzaddik

### GET `/api/tzaddik/search?q=:query`
Search tzaddikim by name

## Frontend Components

### 1. Splash Page Notification
```astro
<div class="yahrzeit-notification">
  <h2>Today's Yahrzeits</h2>
  <div class="tzaddik-list">
    <!-- Dynamic list from API -->
  </div>
  <h3>Tomorrow's Yahrzeits</h3>
  <div class="tzaddik-list tomorrow">
    <!-- Dynamic list from API -->
  </div>
</div>
```

### 2. Tzaddik Profile Page
```astro
---
import TzaddikProfile from '../components/TzaddikProfile.astro';
const { id } = Astro.params;
---

<TzaddikProfile id={id} />
```

### 3. Notification Logic
- Check Hebrew date daily
- Convert to Gregorian for display
- Show notifications 1 day before and on day of
- Cache results for performance

## Daily Cron Job
```bash
# Run at 00:01 daily
0 1 * * * /usr/bin/node /path/to/ajew-org/scripts/update-yahrzeits.js
```

## Security Considerations
1. Input validation for all API endpoints
2. Rate limiting on public APIs
3. SQL injection prevention
4. XSS protection in frontend

## Performance Optimization
1. Database indexing on yahrzeit dates
2. Redis caching for daily notifications
3. CDN for static assets
4. Lazy loading for profile images

## Testing Plan
1. Unit tests for date conversion
2. Integration tests for API endpoints
3. E2E tests for user flow
4. Load testing for high traffic

## Deployment
1. Database migration scripts
2. Environment configuration
3. Monitoring and logging
4. Backup strategy

## Timeline
- **Week 1**: Database setup and API development
- **Week 2**: Frontend implementation
- **Week 3**: Content collection and population
- **Week 4**: Testing and deployment

## Success Metrics
1. Daily active users viewing notifications
2. Click-through rate to profile pages
3. User engagement time on profile pages
4. Positive feedback from community

This system will provide meaningful daily inspiration while educating users about tzaddikim throughout Jewish history.