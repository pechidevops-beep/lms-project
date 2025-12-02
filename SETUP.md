# LMS Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- npm or yarn package manager

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note down your project URL and API keys (anon key and service role key)

## Step 2: Set Up Database

1. In your Supabase project, go to the SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Run the SQL script to create all tables, policies, and functions

## Step 3: Set Up Storage Bucket

1. In Supabase, go to Storage
2. Create a new bucket named `submissions`
3. Set it to **Public** (or configure RLS policies if you prefer private)
4. Configure CORS if needed for file uploads

## Step 4: Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example` if it exists):
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   
   # Optional: Email configuration for notifications
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=noreply@lms.com
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

## Step 5: Configure Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:3001/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Step 6: Create Your First Admin User

1. Open the application in your browser (usually `http://localhost:5173`)
2. Click "Sign Up"
3. Enter your email and password
4. **Check the "Register as Admin" checkbox**
5. Click "Sign Up"

Alternatively, you can create an admin user directly in Supabase:
1. Go to Authentication > Users in Supabase dashboard
2. Create a new user
3. Edit the user's metadata and add: `{"is_admin": true}`

## Step 7: Test the Application

1. **As Admin:**
   - Create a course
   - Add tasks to the course
   - View student submissions
   - Grade submissions

2. **As Student:**
   - Sign up (without admin checkbox)
   - Join a course using the course code
   - Submit tasks
   - View leaderboard

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the PORT in backend `.env`
- **Supabase connection errors**: Verify your Supabase URL and keys
- **File upload errors**: Ensure the `submissions` storage bucket exists and is configured correctly

### Frontend Issues

- **CORS errors**: Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL
- **Auth errors**: Verify Supabase credentials in frontend `.env`
- **API errors**: Check that backend is running and `VITE_API_URL` is correct

### Database Issues

- **RLS policies blocking access**: Check that you've run the complete schema.sql
- **Missing tables**: Re-run the schema.sql script

## Email Notifications (Optional)

To enable email notifications:

1. Set up SMTP credentials in backend `.env`
2. For Gmail, you'll need an App Password:
   - Go to Google Account settings
   - Enable 2-factor authentication
   - Generate an App Password
   - Use that password in `SMTP_PASS`

## Production Deployment

For production:

1. Update environment variables with production URLs
2. Build the frontend: `cd frontend && npm run build`
3. Serve the built files from a static host or integrate with your backend
4. Use a process manager like PM2 for the backend
5. Configure proper CORS and security settings
6. Set up SSL/HTTPS certificates

## Features Overview

- ✅ User authentication (Signup/Login)
- ✅ Admin dashboard (Create courses, tasks, grade submissions)
- ✅ Student dashboard (View courses, submit tasks)
- ✅ File uploads for submissions
- ✅ Leaderboard with point system
- ✅ Audit logs
- ✅ Profile settings
- ✅ Course join codes
- ✅ Email notifications (when configured)

