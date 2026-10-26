// Deploy with Supabase Edge Functions; do not expose SERVICE_ROLE_KEY to browser.
import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'https://elseborn.ru','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const respond=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 if(req.headers.get('origin')!=='https://elseborn.ru')return respond(403,{error:'forbidden'});
 try{
  const {nickname,password}=await req.json();
  if(typeof nickname!=='string'||!/^[A-Za-z0-9_]{3,16}$/.test(nickname)||typeof password!=='string'||password.length>1024||password.length<1)return respond(400,{error:'invalid_credentials'});
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:profiles,error:lookupError}=await admin.from('profiles').select('id').ilike('minecraft_nickname',nickname).limit(2);
  if(lookupError||!profiles||profiles.length!==1)return respond(401,{error:'invalid_credentials'});
  // Admin getUserById is required: never publish the resolved email address.
  const {data:record,error:userError}=await admin.auth.admin.getUserById(profiles[0].id);
  if(userError||!record.user?.email)return respond(401,{error:'invalid_credentials'});
  const client=createClient(url,anon,{auth:{persistSession:false}});
  const {data,error}=await client.auth.signInWithPassword({email:record.user.email,password});
  if(error||!data.session)return respond(401,{error:'invalid_credentials'});
  return respond(200,{access_token:data.session.access_token,refresh_token:data.session.refresh_token});
 }catch{return respond(400,{error:'invalid_request'})}
});
