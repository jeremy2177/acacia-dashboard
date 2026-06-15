# Authentication & Bcrypt Setup

## What's been implemented:

### 1. **Database Changes**
- Added `users` table to `sql/schema.sql` with:
  - `id` (primary key)
  - `username` (unique)
  - `email` (unique)
  - `password_hash` (bcrypt hashed)
  - Timestamps

### 2. **Authentication System**
- **Auth Controller** (`controllers/authController.js`):
  - `login()` - handles GET (show form) and POST (authenticate)
  - `logout()` - destroys session
  - Uses bcrypt.compare() for password verification

- **Auth Middleware** (`middleware/auth.js`):
  - `requireAuth` - redirects unauthenticated users to login
  - `requireGuest` - prevents logged-in users from accessing login page
  - `injectUser` - makes user info available in templates

### 3. **Login Page**
- Beautiful gradient login form (`views/login.ejs`)
- Responsive design (mobile-friendly)
- Flash message support for errors
- Default credentials displayed

### 4. **Protected Routes**
All these routes now require authentication:
- `/` - Dashboard
- `/positions` - All position routes
- `/statistics` - Stats page
- `/api/export/*` - CSV exports

### 5. **Navigation Updates**
- Added user info display in sidebar footer
- Added logout button
- Shows current logged-in username

## How to Use:

### 1. **Apply Database Schema**
```bash
mysql -u root -p covered_calls < sql/schema.sql
```

### 2. **Seed Database with Default User**
```bash
npm run seed
```
This creates a default user:
- **Username:** `trader`
- **Password:** `password123`

### 3. **Start the Server**
```bash
npm start
# or
npm run dev
```

### 4. **Login**
Navigate to `http://localhost:3000` → redirects to `/login`
- Enter username: `trader`
- Enter password: `password123`

### 5. **Logout**
Click the "Logout" button in the sidebar footer

## Security Notes:
- Passwords are hashed with bcrypt (10 salt rounds)
- Sessions stored in `data/sessions/`
- Session cookie expires after 7 days
- Environment variables respected:
  - `SESSION_SECRET` - session encryption key
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - database config

## Adding New Users:
To add more users manually, use bcrypt to hash passwords:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_password', 10);
// Then insert into database with the hash
```
