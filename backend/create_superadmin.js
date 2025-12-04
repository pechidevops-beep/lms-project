// Script to create SuperAdmin account
// Run this with: node create_superadmin.js
// Make sure your backend/.env is configured with Supabase credentials

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin() {
  const email = 'pechimuthu@gmail.com';
  const password = 'pechimuthu000';
  const displayName = 'Super Admin';

  try {
    console.log('Creating SuperAdmin account...');

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists. Updating to SuperAdmin...');
      
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          email_confirm: true,
          user_metadata: {
            role: 'superadmin',
            display_name: displayName
          }
        }
      );

      if (updateError) throw updateError;

      // Update profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: existingUser.id,
        email: email,
        display_name: displayName,
        role: 'superadmin',
        points: 0
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      console.log('✅ SuperAdmin account updated successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`User ID: ${existingUser.id}`);
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'superadmin',
          display_name: displayName
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: email,
        display_name: displayName,
        role: 'superadmin',
        points: 0
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      console.log('✅ SuperAdmin account created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`User ID: ${authData.user.id}`);
    }

    console.log('\n🎉 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating SuperAdmin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();

