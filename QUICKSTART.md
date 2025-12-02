# Quick Start Guide

## 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

## 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run `database/schema.sql` in SQL Editor
4. Create storage bucket named `submissions` (public)

## 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001/api
```

## 4. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 5. Access Application

Open http://localhost:5173 in your browser

## 6. Create Admin User

1. Click "Sign Up"
2. Enter email/password
3. **Check "Register as Admin"**
4. Sign up and login

## Next Steps

- Create courses as admin
- Add tasks to courses
- Sign up as student (without admin checkbox)
- Join courses using course codes
- Submit tasks and view leaderboard

For detailed setup, see [SETUP.md](./SETUP.md)

