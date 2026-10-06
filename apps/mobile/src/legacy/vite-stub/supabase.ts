import { createClient } from '@supabase/supabase-js';

import { supabaseConfig } from './env';

export const supabase = supabaseConfig ? createClient(supabaseConfig.url, supabaseConfig.key) : null;
