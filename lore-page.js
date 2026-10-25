const chapters = window.ELSEBORN_LORE || [];
const menu = document.getElementById('lore-menu');
const title = document.getElementById('lore-heading');
const text = document.getElementById('lore-text');
const icons=['♜','▣','♟','✝','◇','⌛','♞'];
function selectChapter(id){const item=chapters.find(c=>c.id===id)||chapters[0];if(!item)return;title.textContent=item.title;text.replaceChildren();for(const para of item.text.split(/\n\n|\n/)){if(!para.trim())continue;const p=document.createElement('p');p.textContent=para;text.appendChild(p)}for(const b of menu.querySelectorAll('button')){const active=b.dataset.chapter===item.id;b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'true':'false')}history.replaceState(null,'','#'+item.id)}
chapters.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.dataset.chapter=item.id;b.innerHTML='<span class="lore-icon" aria-hidden="true">'+icons[i%icons.length]+'</span><span></span>';b.lastElementChild.textContent=item.title;b.addEventListener('click',()=>selectChapter(item.id));menu.appendChild(b)});
selectChapter(location.hash.slice(1));
window.addEventListener('hashchange',()=>selectChapter(location.hash.slice(1)));
