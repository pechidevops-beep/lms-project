# Environment Variables - Quick Reference

## 🎯 Quick Steps

### 1️⃣ Get Supabase Credentials

Go to: **Supabase Dashboard → Settings → API**

Copy these 3 values:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: `eyJhbGc...` (long string)
- **service_role secret key**: `eyJhbGc...` (long string)

---

### 2️⃣ Backend Configuration

**Location:** `backend/.env`

```env
SUPABASE_URL=paste_your_project_url_here
SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here
SUPABASE_ANON_KEY=paste_anon_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**How to create:**
```powershell
# In PowerShell (Windows)
cd backend
Copy-Item .env.example .env
# Then edit .env file with your values
```

---

### 3️⃣ Frontend Configuration

**Location:** `frontend/.env`

```env
VITE_SUPABASE_URL=paste_your_project_url_here
VITE_SUPABASE_ANON_KEY=paste_anon_key_here
VITE_API_URL=http://localhost:3001/api
```

**How to create:**
```powershell
# In PowerShell (Windows)
cd frontend
Copy-Item .env.example .env
# Then edit .env file with your values
```

---

## 📋 Copy-Paste Template

### Backend `.env` Template:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` Template:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001/api
```

---

## ✅ Verification Checklist

- [ ] Backend `.env` file exists
- [ ] Frontend `.env` file exists
- [ ] All values filled in (no empty strings)
- [ ] No `.example` extension on files
- [ ] Backend server starts without errors
- [ ] Frontend can connect to backend

---

## 🚨 Common Mistakes

❌ **Wrong:** `.env.example` (this is the template, not the actual file)
✅ **Right:** `.env` (the actual configuration file)

❌ **Wrong:** `SUPABASE_URL=your_supabase_project_url` (placeholder text)
✅ **Right:** `SUPABASE_URL=https://abc123.supabase.co` (actual URL)

❌ **Wrong:** Adding quotes around values
✅ **Right:** No quotes needed: `SUPABASE_URL=https://...`

---

For detailed instructions, see [ENV_SETUP.md](./ENV_SETUP.md)

