// Check what's in the Supabase storage bucket
const { getSupabaseClient, getSupabaseAdminClient } = require('./lib/supabase.ts');

async function checkStorage() {
  console.log('🔍 Checking Supabase storage contents...');
  
  try {
    const supabase = getSupabaseClient();
    const supabaseAdmin = getSupabaseAdminClient();
    
    if (!supabase || !supabaseAdmin) {
      console.log('❌ Supabase clients not available');
      return;
    }
    
    console.log('📋 Listing buckets...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('📦 Available buckets:', buckets.map(b => b.name));
    
    // Check member-photos bucket
    if (buckets.find(b => b.name === 'member-photos')) {
      console.log('\n📁 Checking member-photos bucket contents...');
      
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from('member-photos')
        .list('', {
          limit: 100,
          offset: 0
        });
      
      if (filesError) {
        console.error('❌ Error listing files:', filesError);
        return;
      }
      
      console.log(`📄 Found ${files.length} items in member-photos:`);
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
      });
      
      // Check profiles subfolder
      console.log('\n📁 Checking profiles subfolder...');
      const { data: profileFiles, error: profileError } = await supabaseAdmin.storage
        .from('member-photos')
        .list('profiles', {
          limit: 100,
          offset: 0
        });
      
      if (profileError) {
        console.error('❌ Error listing profile files:', profileError);
      } else {
        console.log(`📄 Found ${profileFiles.length} items in profiles folder:`);
        profileFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
        });
      }
    } else {
      console.log('❌ member-photos bucket not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

// Run the check
checkStorage();