# AJEW.ORG Chat, Login & Subscription Fixes

## Summary of Changes

### 1. ✅ Created `/login` page
**File:** `src/pages/login.astro`

A simple redirect page that sends users to `/auth`. This fixes the 404 error when users navigate to `/login`.

### 2. ✅ Created Supabase Setup SQL Script
**File:** `src/data/supabase-setup.sql`

Complete SQL script to create the required tables in Supabase:
- `messages` - Stores chat messages
- `subscriptions` - Stores user subscription tiers

### 3. ✅ Verified Chat API
**File:** `src/pages/api/chat.ts`

The API already uses the correct table name (`messages`). No changes needed.

### 4. ✅ Verified Stripe Links
**File:** `src/pages/subscribe.astro`

All Stripe payment links are correct:
- Basic ($1/year): `https://buy.stripe.com/00w5kD89Ld3Y9F1fsUfUQ03`
- Premium ($5/mo): `https://buy.stripe.com/3cI3cvey95Bw9F13KcfUQ01`
- Super ($10/mo): `https://buy.stripe.com/3cI3cvey95Bw9F13KcfUQ00`
- Donate: `https://buy.stripe.com/3cI3cvey95Bw9F13KcfUQ02`

---

## Deployment Steps

### Step 1: Run SQL in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `ekggvujbuusvgmrertgp`
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of `src/data/supabase-setup.sql`
6. Click **Run**
7. Verify the output shows:
   - "Messages table created"
   - "Subscriptions table created"

### Step 2: Deploy Updated Site

```bash
# Build the site
npm run build

# Or deploy to Vercel
vercel --prod
```

### Step 3: Configure Stripe Webhook (if not done)

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://ajew.org/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Add to environment variables: `STRIPE_WEBHOOK_SECRET`

### Step 4: Set Environment Variables

Ensure these are set in your deployment platform:

```
SUPABASE_URL=https://ekggvujbuusvgmrertgp.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Testing the Flow

### 1. Login Flow
- Visit `/login` → Should redirect to `/auth`
- Create account or sign in

### 2. Subscription Flow
- Go to `/subscribe`
- Click "Subscribe - $1/year" button
- Complete Stripe payment
- Return to site with success message

### 3. Chat Flow
- Go to `/chat`
- Select a room (General, Hitbodedut, or Stories)
- Free users: See "Subscription Required" message
- Subscribed users: Can send messages

---

## Table Schemas

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| room | VARCHAR(100) | Chat room slug |
| username | VARCHAR(50) | Display name |
| message | TEXT | Message content |
| email | VARCHAR(100) | User email |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | When updated |

### subscriptions
| Column | Type | Description |
|--------|------|-------------|
| email | VARCHAR(100) | Primary key (user email) |
| tier | VARCHAR(20) | free/basic/premium/super |
| expiry | TIMESTAMP | Subscription expiry date |
| username | VARCHAR(50) | Display name for chat |
| name | VARCHAR(100) | Full name |
| status | VARCHAR(20) | active/inactive/cancelled |
| stripe_customer_id | VARCHAR(100) | Stripe customer ID |
| stripe_subscription_id | VARCHAR(100) | Stripe subscription ID |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | When updated |

---

## Troubleshooting

### Chat shows empty/no messages
- Check Supabase tables are created
- Verify `messages` table has data
- Check browser console for API errors

### Cannot send messages
- Verify user has `tier` of 'basic' or higher in localStorage
- Check subscription exists in Supabase `subscriptions` table
- Verify user email matches subscription email

### Stripe payments not updating subscription
- Check webhook is configured correctly
- Verify `STRIPE_WEBHOOK_SECRET` environment variable
- Check webhook logs in Stripe dashboard

### Admin API Access
Use the admin password `NaNach2026!` for:
- `/api/admin-subs` - Add subscriptions manually
- `/api/subscriptions` POST - Update subscriptions
