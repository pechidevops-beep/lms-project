# How to Set Up Supabase Database

## Step-by-Step Guide

### 1. Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** or the **"+"** button to create a new query

### 2. Copy the Schema File Contents

1. Open the file `database/schema.sql` in your code editor (VS Code, etc.)
2. **Select ALL** the contents (Ctrl+A / Cmd+A)
3. **Copy** the entire contents (Ctrl+C / Cmd+C)

### 3. Paste into Supabase SQL Editor

1. In the Supabase SQL Editor, **paste** the copied SQL code (Ctrl+V / Cmd+V)
2. You should see all the SQL statements appear in the editor

### 4. Run the SQL Script

1. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for the execution to complete
3. You should see a success message: "Success. No rows returned"

### 5. Verify Tables Were Created

1. Go to **"Table Editor"** in the left sidebar
2. You should see these tables:
   - `courses`
   - `course_enrollments`
   - `tasks`
   - `submissions`
   - `audit_logs`

### 6. Set Up Storage Bucket

1. Click on **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Name it: `submissions`
4. Set it to **Public** (or configure RLS if preferred)
5. Click **"Create bucket"**

## Common Issues

### Issue: "syntax error at or near 'database'"
**Problem**: You tried to run the filename instead of the file contents.

**Solution**: 
- Don't type `database/schema.sql` in the editor
- Instead, open the file and copy its **contents**, then paste those contents

### Issue: "relation already exists"
**Problem**: Tables already exist from a previous run.

**Solution**: 
- Either drop existing tables first, or
- The `IF NOT EXISTS` clauses should prevent errors for extensions

### Issue: "permission denied"
**Problem**: You might not have the right permissions.

**Solution**: 
- Make sure you're using the SQL Editor with proper database access
- Check that you're connected to the correct database

## Quick Copy-Paste Method

**Easiest way:**

1. Open `database/schema.sql` file
2. Select all (Ctrl+A)
3. Copy (Ctrl+C)
4. Go to Supabase SQL Editor
5. Paste (Ctrl+V)
6. Click Run

That's it! The entire database schema will be created.

## After Setup

Once the schema is set up:

1. ✅ Tables are created
2. ✅ RLS policies are enabled
3. ✅ Functions and triggers are set up
4. ✅ Indexes are created

You can now:
- Start your backend server
- Start your frontend server
- Create users and start using the LMS!

## Testing the Setup

To verify everything works:

1. **Check tables exist**: Go to Table Editor → you should see all 5 tables
2. **Check RLS**: Go to Authentication → Policies → verify policies are enabled
3. **Test insert**: Try creating a course via your API (after starting backend)

## Need Help?

If you encounter errors:
1. Check the error message in Supabase SQL Editor
2. Make sure you copied the **entire** schema.sql file
3. Verify you're connected to the correct database
4. Check that you have proper permissions

