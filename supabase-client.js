// Единственный клиент Supabase для всех модулей сайта.
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const supabase = createClient('https://mknxnishyfgnltgnmwel.supabase.co','sb_publishable_aueSLI26Mgk3QSQETaEeSQ_2wiRI7v3',{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
});
