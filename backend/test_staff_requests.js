// Test script to check staff requests
// Run with: node test_staff_requests.js

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

async function testStaffRequests() {
  try {
    console.log('🔍 Checking pending staff requests...\n');

    // Check all profiles
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching all profiles:', allError);
      return;
    }

    console.log(`📊 Total profiles: ${allProfiles?.length || 0}`);
    console.log('\n📋 All profiles:');
    allProfiles?.forEach(p => {
      console.log(`  - ${p.email} (${p.role}) - Created: ${new Date(p.created_at).toLocaleString()}`);
    });

    // Check pending staff
    const { data: pendingStaff, error: pendingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pending_staff')
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.error('❌ Error fetching pending staff:', pendingError);
      return;
    }

    console.log(`\n⏳ Pending staff requests: ${pendingStaff?.length || 0}`);
    if (pendingStaff && pendingStaff.length > 0) {
      pendingStaff.forEach(staff => {
        console.log(`  - ${staff.display_name} (${staff.email})`);
        console.log(`    Staff ID: ${staff.staff_id || 'N/A'}`);
        console.log(`    Department: ${staff.dept || 'N/A'}`);
        console.log(`    Created: ${new Date(staff.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('  No pending staff requests found.');
    }

    // Check if quick_tasks table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('quick_tasks')
      .select('count')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('\n⚠️  quick_tasks table does not exist. Run the schema.sql to create it.');
      } else {
        console.error('\n❌ Error checking quick_tasks table:', tableError);
      }
    } else {
      console.log('\n✅ quick_tasks table exists');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStaffRequests();

