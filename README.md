# Gym System - Admin Dashboard

A private gym management system for internal use by gym owners/admins in Pakistan.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL)
- **Offline Storage**: IndexedDB (via `idb`)
- **Charts**: Recharts
- **Barcode**: JsBarcode

## Setup

### 1. Install Dependencies

```bash
cd "Gym System"
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in your Supabase URL and anon key in `.env`

### 3. Create Database Tables

Run the SQL schema in your Supabase SQL Editor:
- Open `src/config/schema.sql`
- Copy and paste into Supabase SQL Editor
- Execute

### 4. Create Admin User

In Supabase Dashboard → Authentication → Users → Add User:
- Add admin email and password
- No public signup is needed

### 5. Run Development Server

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000)

## Features

- **Member Management**: Add, edit, search members with phone normalization
- **Membership Plans**: Configurable plan classes and durations with price overrides
- **Subscriptions**: Flexible start/end dates with monthly segment breakdown
- **Attendance**: Manual + barcode scanner support, one per day, overdue warnings
- **Payments**: Track all payments with method and date
- **Violation Tracking**: Record overdue days for expired memberships
- **Returning Member Detection**: Auto-detect by phone number, show history
- **Barcode Cards**: Auto-generated, printable member cards
- **Offline Support**: IndexedDB caching with auto-sync on reconnect
- **Audit Log**: All admin actions tracked (except attendance)
- **Dashboard**: Active members, attendance, revenue, expiring/overdue stats
- **Soft Delete**: Important records use `deleted_at` instead of hard delete

## Offline Mode

When offline, the system uses IndexedDB to:
- Search and view cached members
- Mark attendance
- Create members and subscriptions
- Record payments

On reconnection, data auto-syncs to Supabase using last-update-wins conflict resolution.

## Barcode Scanner

Connect a USB/Bluetooth barcode scanner. On the Attendance page:
1. Click "Enable Barcode Scanner"
2. Scan a member's barcode card
3. The scanner inputs the member ID automatically
4. Attendance is marked with duplicate/overdue checks
