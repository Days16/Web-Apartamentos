import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJson() {
    const { data, error } = await supabase.from('apartments').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data[0], null, 2));
    }
}

checkJson();
