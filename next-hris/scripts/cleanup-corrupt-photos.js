require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  console.log("Fetching attendance records with photos...");
  const { data, error } = await supabase
    .from('attendance')
    .select('id, date, check_in_photo, check_out_photo, users(full_name)')
    .order('date', { ascending: false });

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  const corruptCheckInIds = [];
  const corruptCheckOutIds = [];
  const chunkSize = 20;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (r) => {
      // Check check_in_photo
      if (r.check_in_photo && r.check_in_photo.includes('supabase.co')) {
        try {
          const res = await fetch(r.check_in_photo, { method: 'HEAD' });
          const len = parseInt(res.headers.get('content-length') || '0', 10);
          if (len <= 50 || res.status !== 200) {
            corruptCheckInIds.push(r.id);
          }
        } catch (e) {
          corruptCheckInIds.push(r.id);
        }
      }

      // Check check_out_photo
      if (r.check_out_photo && r.check_out_photo.includes('supabase.co')) {
        try {
          const res = await fetch(r.check_out_photo, { method: 'HEAD' });
          const len = parseInt(res.headers.get('content-length') || '0', 10);
          if (len <= 50 || res.status !== 200) {
            corruptCheckOutIds.push(r.id);
          }
        } catch (e) {
          corruptCheckOutIds.push(r.id);
        }
      }
    }));
    process.stdout.write(`Checked ${Math.min(i + chunkSize, data.length)} / ${data.length} records...\r`);
  }

  console.log(`\nFound ${corruptCheckInIds.length} corrupt check_in photos and ${corruptCheckOutIds.length} corrupt check_out photos.`);

  // Update check_in_photo to null in batches of 50
  if (corruptCheckInIds.length > 0) {
    console.log("Setting corrupt check_in_photo to NULL in database...");
    for (let i = 0; i < corruptCheckInIds.length; i += 50) {
      const batch = corruptCheckInIds.slice(i, i + 50);
      const { error: updErr } = await supabase
        .from('attendance')
        .update({ check_in_photo: null })
        .in('id', batch);
      if (updErr) {
        console.error("Error updating batch:", updErr);
      }
    }
  }

  // Update check_out_photo to null in batches of 50
  if (corruptCheckOutIds.length > 0) {
    console.log("Setting corrupt check_out_photo to NULL in database...");
    for (let i = 0; i < corruptCheckOutIds.length; i += 50) {
      const batch = corruptCheckOutIds.slice(i, i + 50);
      const { error: updErr } = await supabase
        .from('attendance')
        .update({ check_out_photo: null })
        .in('id', batch);
      if (updErr) {
        console.error("Error updating batch:", updErr);
      }
    }
  }

  console.log("Cleanup completed successfully!");
}

runCleanup();

