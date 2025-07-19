# BrgyExpress Admin Authentication Setup

## 🔐 Database Setup

### 1. Create Admin Table
Make sure you have the admin table in your PostgreSQL database:

```sql
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,          -- Hashed password (e.g., bcrypt)
    full_name TEXT NOT NULL,         -- Full name of the secretary
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Insert Admin User (with bcrypt hashing)

#### Option A: Use the API endpoint (Recommended)
Make a POST request to create an admin with hashed password:

```bash
curl -X POST http://localhost:5000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "full_name": "Barangay Secretary",
    "role": "admin"
  }'
```

#### Option B: Manual SQL (if you need to hash manually)
First, generate a bcrypt hash, then insert:

```sql
-- Generate hash first, then insert
INSERT INTO admins (username, password, full_name, role) 
VALUES ('admin', '$2b$10$hashedpasswordhere', 'Barangay Secretary', 'admin');
```

**Note:** The backend now uses bcrypt for secure password hashing. Passwords are automatically hashed when using the API endpoint.

## 🚀 Frontend Setup

### 1. Environment Variables
Create a `.env` file in the `web-admin` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 2. Start the Application
```bash
cd web-admin
npm start
```

## 🔧 Features

### ✅ Authentication Features
- **Database Authentication** - Direct PostgreSQL connection
- **Protected Routes** - All admin pages require login
- **Session Management** - localStorage-based sessions
- **Secure Logout** - Proper session cleanup

### ✅ UI/UX Features
- **Modern Login Design** - Professional gradient background
- **Form Validation** - Real-time error handling
- **Loading States** - Smooth loading animations
- **Responsive Design** - Works on all screen sizes

### ✅ Security Features
- **Route Protection** - Automatic redirect to login
- **Token-based Auth** - Simple token system
- **Input Validation** - Server-side validation

## 📁 File Structure

```
web-admin/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.js      # Route protection
│   │   ├── DashboardLayout.js     # Layout wrapper
│   │   └── Sidebar.js             # Updated with user info
│   ├── pages/
│   │   ├── Login.js               # Login component
│   │   └── Login.css              # Login styles
│   └── app.js                     # Updated with routing
└── ADMIN_SETUP.md                 # This file

backend/
└── server.js                      # Added admin login endpoint
```

## 🔧 Backend API

### Admin Login Endpoint
- **URL:** `POST /api/admin/login`
- **Body:** `{ username: string, password: string }`
- **Response:** `{ success: boolean, admin: object, token: string }`

## 🛠️ Customization

### Styling
- Modify `Login.css` for login page styling
- Update `Dashboard.css` for sidebar user section

### Authentication
- Edit `ProtectedRoute.js` for custom auth logic
- Modify `DashboardLayout.js` for layout changes
- Update routing in `app.js` for new protected routes

## 🔒 Security Notes

### Production Recommendations
1. ✅ **Use bcrypt** for password hashing (IMPLEMENTED)
2. **Implement JWT** for proper token management
3. ✅ **Add rate limiting** to prevent brute force attacks (IMPLEMENTED)
4. **Use HTTPS** in production
5. ✅ **Add input validation** and sanitization (IMPLEMENTED)
6. ✅ **Add security headers** with helmet (IMPLEMENTED)
7. ✅ **Add session management** with auto-logout (IMPLEMENTED)

### Current Implementation
- ✅ **bcrypt password hashing** (IMPLEMENTED)
- ✅ **Rate limiting** - 5 login attempts per 15 minutes (IMPLEMENTED)
- ✅ **Input validation** - All admin endpoints validated (IMPLEMENTED)
- ✅ **Security headers** - Helmet middleware (IMPLEMENTED)
- ✅ **Session management** - 30-minute auto-logout (IMPLEMENTED)
- ✅ **Session warnings** - 5-minute warning before expiry (IMPLEMENTED)
- Base64 token (for development)
- localStorage session storage

## 🚀 Usage

1. **Start Backend:** `cd backend && npm start`
2. **Start Frontend:** `cd web-admin && npm start`
3. **Login:** Use admin credentials from database
4. **Access Dashboard:** All routes are now protected

## 🛠️ Troubleshooting

### Common Issues
1. **Database Connection**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in backend .env

2. **API Connection**
   - Verify REACT_APP_API_URL in frontend .env
   - Check backend server is running on port 5000

3. **Login Issues**
   - Verify admin user exists in database
   - Check username/password match

### Support
For database issues, check your PostgreSQL connection and table structure. 