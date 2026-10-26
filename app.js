import {supabase} from './supabase-client.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/+esm';
const $=id=>document.getElementById(id);let user=null,register=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Elseborn: email confirmation by the 8-digit code from Supabase.
const pendingEmailKey='elseborn_pending_confirmation_email';
let confirmationEmail='';
function ensureConfirmationUI(){
 if(document.getElementById('email-code-panel'))return;
 const panel=document.createElement('section');
 panel.id='email-code-panel';panel.className='hidden';
 panel.innerHTML=`<div class="eb-code-eyebrow">ПОСЛЕДНИЙ ШАГ ПЕРЕД ПУТЕШЕСТВИЕМ</div>
 <h2>Подтверждение почты</h2><p class="eb-code-description">Мы отправили восьмизначный код на <strong id="eb-code-email"></strong>. Введи его ниже.</p>
 <form id="eb-code-form"><label for="eb-code-input">Код из письма</label><input id="eb-code-input" type="text" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" autocomplete="one-time-code" placeholder="00000000" required aria-label="Восьмизначный код подтверждения"><button id="eb-code-submit" class="wide" type="submit">Подтвердить аккаунт</button></form>
 <button id="eb-code-resend" type="button" class="linklike wide">Отправить код повторно</button><button id="eb-code-back" type="button" class="linklike wide">Вернуться ко входу</button><p id="eb-code-message" class="notice" aria-live="polite"></p>`;
 const card=document.querySelector('#auth-modal .modal-card');
 card.append(panel);
 const input=document.getElementById('eb-code-input');
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,8)});
 document.getElementById('eb-code-back').onclick=()=>{localStorage.removeItem(pendingEmailKey);showAuth(false)};
 document.getElementById('eb-code-form').onsubmit=async event=>{
  event.preventDefault();const token=input.value.trim();
  if(!/^[0-9]{8}$/.test(token))return message('eb-code-message','Введи все 8 цифр из письма.');
  const btn=document.getElementById('eb-code-submit');btn.disabled=true;message('eb-code-message','Проверяем код...');
  try{
   const {error}=await supabase.auth.verifyOtp({email:confirmationEmail,token,type:'signup'});
   if(error){message('eb-code-message','Не удалось подтвердить код: '+error.message);return}
   localStorage.removeItem(pendingEmailKey);confirmationEmail='';
   message('eb-code-message','Почта подтверждена! Аккаунт активирован.',true);
   setTimeout(()=>{document.getElementById('auth-modal').classList.add('hidden');location.href='profile.html'},900);
  }catch(err){message('eb-code-message','Ошибка подключения: '+err.message)}finally{btn.disabled=false}
 };
 document.getElementById('eb-code-resend').onclick=async()=>{
  const btn=document.getElementById('eb-code-resend');btn.disabled=true;message('eb-code-message','Отправляем новый код...');
  try{const {error}=await supabase.auth.resend({type:'signup',email:confirmationEmail});message('eb-code-message',error?'Не удалось отправить: '+error.message:'Новый код отправлен. Проверь почту.',!error)}
  catch(err){message('eb-code-message','Ошибка отправки: '+err.message)}finally{setTimeout(()=>{btn.disabled=false},60000)}
 };
}
function showConfirmation(email){
 ensureConfirmationUI();confirmationEmail=email;localStorage.setItem(pendingEmailKey,email);
 document.getElementById('auth-modal').classList.remove('hidden');
 document.querySelectorAll('#auth-modal .modal-card > :not(#email-code-panel):not(#modal-close)').forEach(el=>el.classList.add('hidden'));
 document.getElementById('email-code-panel').classList.remove('hidden');
 document.getElementById('eb-code-email').textContent=email;
 document.getElementById('eb-code-input').value='';message('eb-code-message','');
 document.getElementById('eb-code-input').focus();
}
function hideConfirmation(){
 const panel=document.getElementById('email-code-panel');if(panel)panel.classList.add('hidden');
 document.querySelectorAll('#auth-modal .modal-card > :not(#email-code-panel):not(#modal-close)').forEach(el=>el.classList.remove('hidden'));
}
const safe=html=>DOMPurify.sanitize(html,{ALLOWED_TAGS:['p','div','br','b','strong','i','em','u','h2','h3','ul','ol','li','blockquote','a','img'],ALLOWED_ATTR:['href','src','alt','title','target','rel'],ALLOWED_URI_REGEXP:/^(?:(?:https?:|mailto:)|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i});
const message=(id,t,ok=false)=>{if($(id)){$(id).textContent=t;$(id).className=ok?'notice success':'notice'}};
function showAuth(isRegister=false){
 hideConfirmation();
 register=isRegister;
 $('auth-modal').classList.remove('hidden');
 $('signup-fields').classList.toggle('hidden',!register);
 $('auth-register-extra').classList.toggle('hidden',!register);
 $('auth-title').textContent=register?'Создать аккаунт Elseborn':'Войти в Elseborn';
 $('auth-submit').textContent=register?'Зарегистрироваться':'Войти';
 $('auth-switch').textContent=register?'Есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться';
 $('signup-nick').required=register;
 $('auth-password-confirm').required=register;
 $('auth-consent').required=register;
 $('auth-email').placeholder=register?'you@example.com':'Почта или Minecraft-ник';
 $('auth-identifier-label').textContent=register?'Электронная почта':'Почта или Minecraft-ник';
 $('auth-reset').classList.toggle('hidden',register);
 message('auth-message','');
}
$('login-btn').onclick=()=>showAuth();
$('modal-close').onclick=()=> $('auth-modal').classList.add('hidden');
$('auth-modal').onclick=e=>{if(e.target===$('auth-modal'))$('auth-modal').classList.add('hidden')};
$('auth-switch').onclick=()=>showAuth(!register);
// Existing Google users must set a password BEFORE Google is disabled in Supabase.
$('google-btn').onclick=async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)message('auth-message',error.message)};
$('auth-reset').onclick=async()=>{
 const email=$('auth-email').value.trim();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return message('auth-message','Укажи электронную почту для восстановления пароля.');
 const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account-password.html'});
 message('auth-message',error?'Не удалось отправить письмо: '+error.message:'Если почта зарегистрирована, мы отправили письмо для установки пароля.',!error);
};
$('auth-form').onsubmit=async e=>{
 e.preventDefault();message('auth-message','Проверяем данные...');
 const identifier=$('auth-email').value.trim(),password=$('auth-password').value;
 if(register){
  const nick=$('signup-nick').value.trim();
  if(!/^[A-Za-z0-9_]{3,16}$/.test(nick))return message('auth-message','Ник: 3–16 латинских букв, цифр или _.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier))return message('auth-message','Укажи корректную почту.');
  if(password.length<8)return message('auth-message','Пароль должен быть не короче 8 символов.');
  if(password!==$('auth-password-confirm').value)return message('auth-message','Пароли не совпадают.');
  if(!$('auth-consent').checked)return message('auth-message','Необходимо согласие с условиями.');
  const {data:exists,error:checkError}=await supabase.rpc('elseborn_nickname_available',{candidate:nick});
  if(checkError)return message('auth-message','Сначала выполни ACCOUNT_MIGRATION_v11.sql в Supabase.');
  if(!exists)return message('auth-message','Этот Minecraft-ник уже занят.');
  const {data,error}=await supabase.auth.signUp({email:identifier,password,options:{emailRedirectTo:location.origin+location.pathname,data:{display_name:nick,minecraft_nickname:nick}}});
  if(error)return message('auth-message',error.message);
  if(!data.session)showConfirmation(identifier);
  else $('auth-modal').classList.add('hidden');
 }else{
  if(!identifier||!password)return message('auth-message','Введи логин и пароль.');
  if(identifier.includes('@')){
   const {error}=await supabase.auth.signInWithPassword({email:identifier,password});
   if(error)return message('auth-message','Неверные данные или почта не подтверждена.');
  }else{
   if(!/^[A-Za-z0-9_]{3,16}$/.test(identifier))return message('auth-message','Некорректный Minecraft-ник.');
   // Edge Function validates password server-side; it never discloses the email address.
   const {data,error}=await supabase.functions.invoke('login-by-nickname',{body:{nickname:identifier,password}});
   if(error||!data?.access_token||!data?.refresh_token)return message('auth-message','Неверные данные или сервис входа по нику ещё не настроен.');
   const {error:sessionError}=await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
   if(sessionError)return message('auth-message','Не удалось создать сессию.');
  }
  $('auth-modal').classList.add('hidden');
 }
};
$('logout-btn').onclick=async()=>{await supabase.auth.signOut();location.href='index.html'};
function updateAuth(u){user=u;$('login-btn').classList.toggle('hidden',!!u);$('logout-btn').classList.toggle('hidden',!u);$('user-label').textContent=u?(u.user_metadata?.display_name||u.email||'Игрок'):'';if($('profile-user'))renderProfile()}
supabase.auth.onAuthStateChange((event,session)=>{updateAuth(session?.user||null);if(event==='SIGNED_IN'){localStorage.removeItem(pendingEmailKey);$('auth-modal').classList.add('hidden')}});
const {data:{session},error:sessionError}=await supabase.auth.getSession();updateAuth(session?.user||null);if(sessionError)message('auth-message',sessionError.message);if(!session?.user){const pending=localStorage.getItem(pendingEmailKey);if(pending&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pending))showConfirmation(pending)}
const params=new URLSearchParams(location.search);if(params.has('error')){showAuth();message('auth-message',params.get('error_description')||params.get('error'))}
const FORUM_SECTIONS={topic:['Топики','Ролевые истории, события и хроники игроков'],application:['Анкеты','Заявки на создание персонажей'],rules:['Правила','Законы и правила проекта'],professions:['Профессии','Ремёсла, занятия и пути развития'],races:['Расы','Народы и происхождение персонажей'],guide:['Справочник','Энциклопедия, инструкции и гайды']};
const adminKinds=new Set(['rules','professions','races','guide']);
async function canPublish(kind){if(!user)return false;if(!adminKinds.has(kind))return true;const {data,error}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();return !error&&['owner','creator','technical_admin','tech_admin','ic_admin','ic_administrator','admin'].includes(data?.role)}
if($('forum-category-main')){const requested=params.get('kind');const kind=FORUM_SECTIONS[requested]?requested:'topic';$('forum-category-main').dataset.listKind=kind;$('forum-category-title').textContent=FORUM_SECTIONS[kind][0];$('forum-category-description').textContent=FORUM_SECTIONS[kind][1];$('forum-list-title').textContent=FORUM_SECTIONS[kind][0];document.title=FORUM_SECTIONS[kind][0]+' — Elseborn';$('forum-access-note').textContent=adminKinds.has(kind)?'Публикации в этом разделе создаёт администрация.':'Публиковать могут авторизованные игроки.';if(await canPublish(kind))$('new-post').classList.remove('hidden')}
if($('new-post'))$('new-post').onclick=()=>{if(!user)return showAuth();location.href='editor.html?kind='+document.querySelector('[data-list-kind]').dataset.listKind};
// Forum v5: author cards and persisted comments.
const forumRole=p=>({'owner':'Создатель','creator':'Создатель','ic_admin':'IC-администратор','ic_administrator':'IC-администратор','tech_admin':'Технический администратор','technical_admin':'Технический администратор','admin':'Администратор','player':'Игрок'})[p?.role]||'Игрок';
const forumDate=d=>new Date(d).toLocaleString('ru-RU');
const forumAvatar=p=>p?.avatar_url&&/^https:\/\//i.test(p.avatar_url)?`<img src="${esc(p.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span>${esc((p?.display_name||'?').slice(0,1).toUpperCase())}</span>`;
const forumAuthor=(p,id)=>`<a class="forum-person" href="${id?'public-profile.html?id='+encodeURIComponent(id):'users.html'}"><span class="forum-person-avatar">${forumAvatar(p)}</span><span class="forum-person-info"><strong>${esc(p?.display_name||'Житель Elseborn')}</strong><small>${esc(forumRole(p))}</small></span></a>`;
async function forumProfiles(ids){const map=new Map(),unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return map;const {data,error}=await supabase.from('profiles').select('id,display_name,role,avatar_url').in('id',unique);if(error){console.warn('Forum profiles:',error.message);return map}for(const p of data||[])map.set(p.id,p);return map}
async function renderList(){const kind=document.querySelector('[data-list-kind]')?.dataset.listKind;if(!kind)return;const box=$('post-list');box.innerHTML='<p class="muted">Загружаем публикации...</p>';const {data,error}=await supabase.from('posts').select('id,title,kind,created_at,author_id').eq('kind',kind).order('created_at',{ascending:false}).limit(100);if(error){box.replaceChildren();return message('list-message','Не удалось загрузить публикации: '+error.message)}const authors=await forumProfiles((data||[]).map(x=>x.author_id));box.innerHTML=data.length?data.map(x=>`<article class="forum-entry panel"><div class="forum-entry-author">${forumAuthor(authors.get(x.author_id),x.author_id)}</div><div class="forum-entry-body"><div class="forum-entry-kicker">${esc(FORUM_SECTIONS[kind]?.[0]||kind)} · ${forumDate(x.created_at)}</div><h3><a href="post.html?id=${encodeURIComponent(x.id)}">${esc(x.title)}</a></h3><a class="forum-entry-open" href="post.html?id=${encodeURIComponent(x.id)}">Читать публикацию и комментарии →</a></div></article>`).join(''):'<div class="panel">Пока публикаций нет. Стань первым автором!</div>'}
await renderList();
async function renderComments(postId){const box=$('forum-comments-list');if(!box)return;box.textContent='Загружаем комментарии...';const {data,error}=await supabase.from('post_comments').select('id,post_id,author_id,body,created_at').eq('post_id',postId).order('created_at',{ascending:true}).limit(200);if(error){box.textContent='Не удалось загрузить комментарии: '+error.message+' (проверь FORUM_COMMENTS_SETUP.sql)';return}const authors=await forumProfiles((data||[]).map(c=>c.author_id));$('forum-comments-count').textContent=`Комментарии (${data.length})`;box.innerHTML=data.length?data.map(c=>`<article class="forum-comment">${forumAuthor(authors.get(c.author_id),c.author_id)}<div class="forum-comment-content"><time>${forumDate(c.created_at)}</time><p>${esc(c.body).replace(/\n/g,'<br>')}</p>${user&&(user.id===c.author_id)?`<button class="forum-comment-delete" data-delete-comment="${esc(c.id)}" type="button">Удалить</button>`:''}</div></article>`).join(''):'<p class="muted">Комментариев пока нет. Начни обсуждение!</p>';box.querySelectorAll('[data-delete-comment]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Удалить комментарий?'))return;btn.disabled=true;const {error}=await supabase.from('post_comments').delete().eq('id',btn.dataset.deleteComment);if(error){btn.disabled=false;alert(error.message);return}await renderComments(postId)})}
if($('post-detail')){const id=params.get('id');if(!/^[0-9a-f-]{36}$/i.test(id||''))$('post-detail').textContent='Некорректная ссылка';else{const {data,error}=await supabase.from('posts').select('id,title,body,created_at,kind,author_id').eq('id',id).maybeSingle();if(error||!data)$('post-detail').textContent='Публикация не найдена: '+(error?.message||'');else{const authors=await forumProfiles([data.author_id]);$('post-heading').textContent=data.title;$('post-detail').innerHTML=`<div class="forum-post-author">${forumAuthor(authors.get(data.author_id),data.author_id)}<span class="meta">${forumDate(data.created_at)}</span></div><div class="content-body">${safe(data.body)}</div>`;const comments=$('forum-comments');comments.classList.remove('hidden');const form=$('forum-comment-form'),textarea=$('forum-comment-body'),note=$('forum-comment-status');$('forum-comment-guest').classList.toggle('hidden',!!user);form.classList.toggle('hidden',!user);form.onsubmit=async e=>{e.preventDefault();if(!user)return showAuth();const body=textarea.value.trim();if(body.length<1||body.length>3000){note.textContent='Комментарий должен содержать от 1 до 3000 символов.';return}const btn=form.querySelector('button[type=submit]');btn.disabled=true;note.textContent='Публикуем комментарий...';const {error}=await supabase.from('post_comments').insert({post_id:id,author_id:user.id,body});btn.disabled=false;if(error){note.textContent='Ошибка: '+error.message;return}textarea.value='';note.textContent='Комментарий опубликован.';await renderComments(id)};await renderComments(id)}}}
if($('post-kind')){$('post-kind').value=FORUM_SECTIONS[params.get('kind')]?params.get('kind'):'topic';if(!user){message('editor-message','Для публикации войди в аккаунт.')}else if(!(await canPublish($('post-kind').value))){message('editor-message','Публикации в этом разделе доступны только администрации.');$('publish').disabled=true;}$('post-kind').addEventListener('change',async()=>{const allowed=await canPublish($('post-kind').value);$('publish').disabled=!allowed;message('editor-message',allowed?'':'Публикации в этом разделе доступны только администрации.')});let imageRange=null;const editor=$('rich-editor');$('toolbar').addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});document.querySelectorAll('[data-cmd]').forEach(btn=>btn.onclick=()=>{editor.focus();document.execCommand(btn.dataset.cmd,false,btn.dataset.value||null)});$('insert-link').onclick=()=>{const href=prompt('Адрес ссылки (https://...)');if(href&&/^https:\/\//i.test(href)){editor.focus();document.execCommand('createLink',false,href)}};$('insert-image').onclick=()=>{if(!user)return showAuth();const sel=getSelection();imageRange=sel?.rangeCount?sel.getRangeAt(0).cloneRange():null;$('image-file').click()};$('image-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!user)return showAuth();if(file.size>5*1024*1024)return message('editor-message','Изображение больше 5 МБ');if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))return message('editor-message','Неподдерживаемый формат');message('editor-message','Загружаем изображение...');const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type],path=`${user.id}/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('post-images').upload(path,file,{contentType:file.type,upsert:false});if(error)return message('editor-message',error.message);const {data}=supabase.storage.from('post-images').getPublicUrl(path);editor.focus();if(imageRange){const sel=getSelection();sel.removeAllRanges();sel.addRange(imageRange)}const img=document.createElement('img');img.src=data.publicUrl;img.alt=file.name;const sel=getSelection();if(sel?.rangeCount){const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(img);range.setStartAfter(img);range.collapse(true);sel.removeAllRanges();sel.addRange(range)}else editor.append(img);message('editor-message','Изображение добавлено.',true);e.target.value=''};$('publish').onclick=async()=>{if(!user)return showAuth();if(!(await canPublish($('post-kind').value)))return message('editor-message','Недостаточно прав для публикации в этом разделе.');const title=$('post-title').value.trim(),body=safe(editor.innerHTML),kind=$('post-kind').value;if(title.length<3)return message('editor-message','Заголовок должен содержать хотя бы 3 символа');if(!editor.textContent.trim()&&!editor.querySelector('img'))return message('editor-message','Добавь текст или изображение');if(body.length>100000)return message('editor-message','Публикация слишком длинная');$('publish').disabled=true;message('editor-message','Публикуем...');const {data,error}=await supabase.from('posts').insert({title,body,kind,author_id:user.id}).select('id').single();$('publish').disabled=false;if(error)return message('editor-message','Ошибка сохранения: '+error.message);location.href='post.html?id='+encodeURIComponent(data.id)}}
async function renderProfile(){if(!$('profile-user'))return;$('profile-user').classList.toggle('hidden',!user);$('profile-guest').classList.toggle('hidden',!!user);if(!user)return;$('profile-display').textContent=user.user_metadata?.display_name||'Игрок';$('profile-email').textContent=user.email||'';if(!$('profile-avatar').style.backgroundImage)$('profile-avatar').textContent=(user.user_metadata?.display_name||'И').slice(0,1).toUpperCase();$('profile-name').value=user.user_metadata?.display_name||user.user_metadata?.full_name||'';$('profile-nick').value=user.user_metadata?.minecraft_nickname||'';const {data:storedProfile}=await supabase.from('profiles').select('display_name,minecraft_nickname').eq('id',user.id).maybeSingle();if(storedProfile){if(storedProfile.display_name){$('profile-display').textContent=storedProfile.display_name;$('profile-name').value=storedProfile.display_name}if(storedProfile.minecraft_nickname)$('profile-nick').value=storedProfile.minecraft_nickname}const {data,error}=await supabase.from('posts').select('id,title,kind').eq('author_id',user.id).order('created_at',{ascending:false}).limit(20);$('my-posts').innerHTML=error?esc(error.message):data.length?data.map(x=>`<p><a href="post.html?id=${encodeURIComponent(x.id)}">${esc(x.title)}</a> <span class="meta">(${esc(FORUM_SECTIONS[x.kind]?.[0]||x.kind)})</span></p>`).join(''):'<p class="muted">Публикаций пока нет.</p>'}
if($('profile-login'))$('profile-login').onclick=()=>showAuth();if($('profile-save'))$('profile-save').onclick=async()=>{const display_name=$('profile-name').value.trim(),minecraft_nickname=$('profile-nick').value.trim();if(!display_name)return message('profile-message','Укажи имя');if(!/^[A-Za-z0-9_]{3,16}$/.test(minecraft_nickname))return message('profile-message','Minecraft-ник: 3–16 латинских символов, цифр или _');const {error:profileError}=await supabase.from('profiles').update({display_name,minecraft_nickname}).eq('id',user.id).select('id').single();if(profileError)return message('profile-message','Ошибка сохранения в profiles: '+profileError.message);const {data,error}=await supabase.auth.updateUser({data:{display_name,minecraft_nickname}});if(error)return message('profile-message','Профиль обновлён в базе, но ошибка авторизации: '+error.message);user=data.user;updateAuth(user);message('profile-message','Профиль сохранён!',true)};

// Elseborn presence: online means last heartbeat was received within 2 minutes.
let presenceTimer=null;
async function heartbeat(){if(!user||document.visibilityState==='hidden')return;try{await supabase.from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',user.id)}catch(e){console.warn('Presence:',e)}}
function scheduleHeartbeat(){if(presenceTimer)clearInterval(presenceTimer);if(user){heartbeat();presenceTimer=setInterval(heartbeat,60000)}}
supabase.auth.onAuthStateChange(()=>setTimeout(scheduleHeartbeat,0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat()});
scheduleHeartbeat();
