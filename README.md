# Acacia Dashboard

## Project Overview

Acacia Dashboard is a mobile-first covered calls trading dashboard built with Node.js, Express, EJS, and MySQL. It helps traders track stock positions, log covered call trades, view portfolio performance, and review trading statistics in a secured web interface.

## Use Case

This project is designed for options traders who want a lightweight private dashboard to:

- track underlying stock positions
- record covered call trades and outcomes
- manage open, closed, expired, and assigned trades
- analyze income, performance, and risk metrics
- keep the data behind a login-protected interface

It is especially useful for traders who want an offline/self-hosted portfolio tracker rather than a cloud service.

## Features

- Authentication with username and password
- Protected dashboard, positions, statistics, and API routes
- Position management with add/edit/delete workflows
- Covered call trade logging and status updates (close, expire, assign)
- Portfolio summary and statistics pages
- Flash messages for success/error feedback
- Session storage using file-based sessions

## Requirements

- Node.js 20 or newer
- MySQL server
- npm

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (optional)

The app uses these environment variables if provided:

```ini
PORT=3000
SESSION_SECRET=your-session-secret
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=covered_calls
```

3. Apply the database schema

```bash
mysql -u root -p covered_calls < sql/schema.sql
```

If the database does not exist, the schema file includes `CREATE DATABASE IF NOT EXISTS covered_calls`.

4. Seed the database

```bash
npm run seed
```

This sets up a default user and sample position/trade data.

## Default Login

- Username: `trader`
- Password: `password123`

## Run the App

```bash
npm start
```

Or for development with automatic restart:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Application Routes

- `/login` — login page
- `/logout` — sign out
- `/` — dashboard overview
- `/positions` — list positions
- `/positions/add` — add a new position
- `/positions/:id` — position details and trades
- `/statistics` — performance and risk analytics

## Database Structure

The app uses three main tables in MySQL:

- `users`: stores authenticated users with bcrypt hashed passwords
- `positions`: tracks underlying stock positions
- `trades`: records covered call trade details and status

## Notes

- Sessions are stored in `data/sessions/`
- The password is hashed with bcrypt
- The app uses EJS templates in `views/`
- Static assets are served from `public/`

## Troubleshooting

- Ensure MySQL is running and accessible with the credentials in `.env`
- If schema import fails, verify `sql/schema.sql` and the database connection
- Check console logs for database initialization and server startup messages

## Development

- Add or adjust positions in `models/Position.js`
- Add or adjust trade logic in `models/Trade.js`
- Statistics and summary calculations are handled in `services/statsService.js`
- Route logic is in `routes/` and `controllers/`
