# Environment Variables Setup Guide

## Step-by-Step Instructions

### Part 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Log in to your account
   - Select your project (or create a new one)

2. **Get Project URL**
   - Click on **"Settings"** (gear icon) in the left sidebar
   - Click on **"API"** in the settings menu
   - Find **"Project URL"** - it looks like: `https://xxxxxxxxxxxxx.supabase.co`
   - **Copy this URL** - you'll need it for both backend and frontend

3. **Get API Keys**
   - Still in **Settings → API**
   - Find **"Project API keys"** section
   - You'll see two keys:
     - **`anon` `public`** key - This is your ANON_KEY (for frontend)
     - **`service_role` `secret`** key - This is your SERVICE_ROLE_KEY (for backend only!)
   - **Copy both keys** - Keep them safe, especially the service_role key!

---

### Part 2: Configure Backend Environment

#### Step 1: Navigate to Backend Folder

```bash
cd backend
```

#### Step 2: Create .env File

**Option A: Using Command Line (Windows PowerShell)**
```powershell
Copy-Item .env.example .env
```

**Option B: Using Command Line (Git Bash / Terminal)**
```bash
cp .env.example .env
```

**Option C: Manual Method**
1. Open File Explorer
2. Navigate to `LMS/backend/` folder
3. Right-click on `.env.example`
4. Select "Copy"
5. Right-click in the same folder → "Paste"
6. Rename the copied file from `.env.example` to `.env`

#### Step 3: Edit .env File

1. **Open `.env` file** in any text editor (Notepad, VS Code, etc.)
2. **Replace the placeholder values** with your actual Supabase credentials:

```env
# Replace these with your actual values:
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# These can stay as default:
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Email (optional - leave as is if not using email notifications):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@lms.com
```

**Example of what it should look like:**
```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMn0.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

3. **Save the file** (Ctrl+S)

---

### Part 3: Configure Frontend Environment

#### Step 1: Navigate to Frontend Folder

```bash
cd ../frontend
```

#### Step 2: Create .env File

**Option A: Using Command Line (Windows PowerShell)**
```powershell
Copy-Item .env.example .env
```

**Option B: Using Command Line (Git Bash / Terminal)**
```bash
cp .env.example .env
```

**Option C: Manual Method**
1. Open File Explorer
2. Navigate to `LMS/frontend/` folder
3. Right-click on `.env.example`
4. Select "Copy"
5. Right-click in the same folder → "Paste"
6. Rename the copied file from `.env.example` to `.env`

#### Step 3: Edit .env File

1. **Open `.env` file** in any text editor
2. **Replace the placeholder values**:

```env
# Replace these with your actual values:
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# This should match your backend port (default is 3001):
VITE_API_URL=http://localhost:3001/api
```

**Example of what it should look like:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMn0.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
VITE_API_URL=http://localhost:3001/api
```

3. **Save the file** (Ctrl+S)

---

## Visual Guide: Where to Find Supabase Credentials

```
Supabase Dashboard
├── Settings (⚙️ icon)
    └── API
        ├── Project URL: https://xxxxx.supabase.co  ← Copy this
        └── Project API keys:
            ├── anon public: eyJhbGc...  ← Copy this (for frontend)
            └── service_role secret: eyJhbGc...  ← Copy this (for backend)
```

---

## Quick Checklist

### Backend Setup:
- [ ] Created `backend/.env` file
- [ ] Added `SUPABASE_URL` (from Settings → API → Project URL)
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` (from Settings → API → service_role key)
- [ ] Added `SUPABASE_ANON_KEY` (from Settings → API → anon key)
- [ ] Set `PORT=3001` (or your preferred port)
- [ ] Set `FRONTEND_URL=http://localhost:5173` (or your frontend URL)

### Frontend Setup:
- [ ] Created `frontend/.env` file
- [ ] Added `VITE_SUPABASE_URL` (same as backend SUPABASE_URL)
- [ ] Added `VITE_SUPABASE_ANON_KEY` (same as backend SUPABASE_ANON_KEY)
- [ ] Added `VITE_API_URL=http://localhost:3001/api` (matches backend port)

---

## Important Notes

1. **Never commit .env files to Git**
   - They contain sensitive credentials
   - The `.gitignore` file already excludes them

2. **Service Role Key is Secret**
   - Only use in backend (server-side)
   - Never expose in frontend code
   - Has admin privileges

3. **Anon Key is Public**
   - Safe to use in frontend
   - Protected by Row Level Security (RLS)

4. **File Naming**
   - Backend: `.env` (not `.env.example`)
   - Frontend: `.env` (not `.env.example`)
   - Make sure there's no `.example` extension!

---

## Troubleshooting

### Problem: Can't see .env file
**Solution**: 
- In File Explorer, enable "Show hidden files"
- Or use command line: `ls -la` (Mac/Linux) or `dir /a` (Windows)

### Problem: "Missing Supabase configuration" error
**Solution**: 
- Check that `.env` file exists (not `.env.example`)
- Verify all three Supabase variables are filled in
- Make sure there are no extra spaces or quotes around values

### Problem: Frontend can't connect to backend
**Solution**: 
- Check `VITE_API_URL` matches backend `PORT`
- Make sure backend server is running
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL

### Problem: CORS errors
**Solution**: 
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL exactly
- Include protocol (`http://` or `https://`)
- Include port number if not default

---

## Test Your Configuration

After setting up both `.env` files:

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Should see: "Server running on http://localhost:3001"

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Should see: "Local: http://localhost:5173"

3. **Test Connection:**
   - Open browser to `http://localhost:5173`
   - Try to sign up/login
   - If it works, configuration is correct! ✅

---

## Next Steps

After environment setup:
1. ✅ Database schema is set up (from previous step)
2. ✅ Storage bucket `submissions` is created
3. ✅ Environment variables are configured
4. 🚀 Ready to run the application!

See `QUICKSTART.md` for running the app.

