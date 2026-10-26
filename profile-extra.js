import {supabase as db} from './supabase-client.js';
const $=id=>document.getElementById(id);
const roleLabels={owner:'Создатель',creator:'Создатель',tech_admin:'Технический администратор',technical_admin:'Технический администратор',ic_admin:'IC администратор',player:'Игрок'};
let activeUser=null;
function setMessage(text,ok=false){const e=$('appearance-message');e.textContent=text;e.className=ok?'notice success':'notice'}
function showAvatar(url){const el=$('profile-avatar');if(!el)return;el.style.backgroundImage=url?`url(${JSON.stringify(url)})`:'';el.textContent=url?'':(activeUser?.user_metadata?.display_name||'И')[0].toUpperCase()}
async function refreshAppearance(){if(!activeUser)return;const {data,error}=await db.from('profiles').select('role,avatar_url,banner_url,last_seen_at').eq('id',activeUser.id).maybeSingle();if(error){setMessage('Ошибка загрузки профиля: '+error.message);return}if(!data)return;showAvatar(data.avatar_url);if(data.banner_url)$('profile-cover').style.backgroundImage=`linear-gradient(0deg,#1b1016 0%,#3e1a1c65 55%,#100c11aa 100%),url(${JSON.stringify(data.banner_url)})`;else $('profile-cover').style.backgroundImage='';const roleKey=String(data.role||'player').toLowerCase().trim();const roleClass=({owner:'owner',creator:'owner',ic_admin:'ic-admin',ic_administrator:'ic-admin',tech_admin:'tech-admin',technical_admin:'tech-admin',player:'player'})[roleKey]||'player';const roleIcon=({owner:'♛','ic-admin':'✦','tech-admin':'⚙',player:'◇'})[roleClass];const roleEl=$('profile-role');roleEl.className='meta elseborn-role role-'+roleClass;roleEl.replaceChildren();const symbol=document.createElement('span');symbol.className='elseborn-role-symbol';symbol.textContent=roleIcon;symbol.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=roleLabels[roleKey]||'Игрок';roleEl.append(symbol,label);const online=data.last_seen_at&&(Date.now()-new Date(data.last_seen_at).getTime())<120000;$('presence-dot').classList.toggle('online',!!online);$('presence-label').textContent=online?'В сети':'Не в сети';}
const IMAGE_TYPES={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
async function upload(type,file){
 if(!activeUser)return setMessage('Сначала войди в аккаунт');
 if(!file)return;
 const max=type==='avatar'?5*1024*1024:15*1024*1024;
 if(!Object.hasOwn(IMAGE_TYPES,file.type))return setMessage('Разрешены PNG, JPG, WebP и GIF');
 if(file.size>max)return setMessage(`Файл слишком большой. Максимум ${type==='avatar'?5:15} МБ`);
 const input=$(type==='avatar'?'avatar-file':'banner-file');
 input.disabled=true;
 setMessage('Загружаем '+(file.type==='image/gif'?'анимированное GIF':'изображение')+'...');
 try{
  const ext=IMAGE_TYPES[file.type];
  const path=`${activeUser.id}/${type}-${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from('profile-images').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(error)throw new Error(error.message);
  const {data}=db.storage.from('profile-images').getPublicUrl(path);
  const column=type==='avatar'?'avatar_url':'banner_url';
  const {error:saveError}=await db.from('profiles').update({[column]:data.publicUrl}).eq('id',activeUser.id);
  if(saveError)throw new Error('Файл загружен, но профиль не обновлён: '+saveError.message);
  setMessage('Изображение сохранено! GIF будет воспроизводиться автоматически.',true);
  await refreshAppearance();
 }catch(e){setMessage('Ошибка загрузки: '+e.message);await refreshAppearance()}
 finally{input.disabled=false;input.value=''}
}
function preview(type,file){
 if(!file)return;
 if(!Object.hasOwn(IMAGE_TYPES,file.type)){setMessage('Разрешены PNG, JPG, WebP и GIF');return}
 const max=type==='avatar'?5:15;
 if(file.size>max*1024*1024){setMessage('Максимальный размер — '+max+' МБ');return}
 const url=URL.createObjectURL(file);
 const img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);upload(type,file)};
 img.onerror=()=>{URL.revokeObjectURL(url);setMessage('Не удалось прочитать изображение')};
 img.src=url;
 if(type==='avatar')showAvatar(url);
 else $('profile-cover').style.backgroundImage=`linear-gradient(0deg,#1b1016 0%,#3e1a1c65 55%,#100c11aa 100%),url(${JSON.stringify(url)})`;
 setMessage('Предпросмотр: сохраняем выбранное изображение...');
}
$('avatar-file').onchange=e=>preview('avatar',e.target.files[0]);
$('banner-file').onchange=e=>preview('banner',e.target.files[0]);
async function sync(){const {data:{session}}=await db.auth.getSession();activeUser=session?.user||null;if(activeUser)await refreshAppearance()}
db.auth.onAuthStateChange(()=>setTimeout(sync,0));await sync();setInterval(()=>{if(activeUser)refreshAppearance()},60000);
