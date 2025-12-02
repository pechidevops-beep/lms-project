# Learning Management System (LMS)

A lightweight LMS built with Supabase (Auth + Postgres) and Node.js/Express backend.

## Features

- **Authentication**: Signup/Login with Supabase Auth (email + password)
- **Admin Dashboard**: Create courses, tasks, track submissions, assign points
- **Student Dashboard**: View courses, submit tasks, track progress
- **Leaderboard**: Points-based ranking with early submission bonuses
- **Submissions**: File uploads + text responses with timestamps
- **Audit Logs**: Track user actions
- **Settings**: Profile management, course join codes

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Frontend**: React + Vite
- **File Storage**: Supabase Storage

## Setup

### Prerequisites

- Node.js 18+
- Supabase account and project

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

### Database Setup

1. Create a Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Configure storage buckets for file uploads

## Project Structure

```
LMS/
├── backend/          # Express API server
│   ├── server.js     # Main server file
│   ├── package.json  # Backend dependencies
│   └── .env          # Backend environment variables (create from .env.example)
├── frontend/         # React frontend
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/ # Reusable components
│   │   └── lib/      # API and Supabase clients
│   ├── package.json  # Frontend dependencies
│   └── .env          # Frontend environment variables
├── database/
│   └── schema.sql    # Database schema and RLS policies
├── SETUP.md          # Detailed setup instructions
├── QUICKSTART.md     # Quick start guide
└── README.md         # This file
```

## Key Features Implemented

✅ **Authentication**
- Signup/Login with Supabase Auth
- Admin flag in user metadata
- Protected routes based on role

✅ **Admin Dashboard**
- Create/edit/delete courses
- Create/edit/delete tasks
- View all students
- View and grade submissions
- Track submission status

✅ **Student Dashboard**
- View enrolled courses
- See active tasks with deadlines
- Submit responses (text + file uploads)
- View submission status and feedback

✅ **Submissions System**
- File uploads to Supabase Storage
- Text responses
- Timestamp tracking
- Admin grading with points and feedback
- Status tracking (pending/accepted/rejected/graded)

✅ **Leaderboard**
- Points-based ranking
- Early submission bonuses (first submitter gets highest points)
- Filter by course
- Total points and submission counts

✅ **Additional Features**
- Audit logs for all actions
- Profile settings (name, email)
- Course join codes
- Email notifications (when SMTP configured)
- Responsive UI

## Next Steps

1. Follow [QUICKSTART.md](./QUICKSTART.md) for immediate setup
2. See [SETUP.md](./SETUP.md) for detailed configuration
3. Customize styling and add more features as needed

