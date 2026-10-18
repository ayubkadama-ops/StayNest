import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { installLiveFormValidation } from './form-validation.js';

installLiveFormValidation();

const duplicateTopbars=[...document.querySelectorAll('body > .topbar')];
duplicateTopbars.slice(0,-1).forEach(topbar=>topbar.remove());

const listings=[];
const grid=document.querySelector('#listingGrid'),toast=document.querySelector('#toast'),pageMain=document.querySelector('main'),homeMarkup=pageMain.innerHTML;
let currentListings=[];
const propertyCategoryOptions=[
  {value:'house',label:'Homes',caption:'Room to grow',image:'/assets/makazi-category-home.webp',icon:'<path d="m3 10 9-7 9 7M5.5 9v12h13V9M9 21v-7h6v7"/>'},
  {value:'apartment',label:'Apartments',caption:'City living, made easy',image:'/assets/makazi-category-apartment.webp',icon:'<path d="M6 21V4h12v17M3 21h18M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/>'},
  {value:'land',label:'Land',caption:'Build your future',image:'/assets/makazi-category-land.webp',icon:'<path d="M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/>'},
  {value:'hotel',label:'Hotels',caption:'Welcoming stays',image:'/assets/makazi-category-hotel.webp',icon:'<path d="M4 20V5m0 10h16v5M7 14V9h5v5m2 0v-3a3 3 0 0 1 6 0v3M3 21h18"/>'},
  {value:'commercial',label:'Commercial',caption:'Room to do business',image:'/assets/makazi-category-commercial.webp',icon:'<path d="M4 21V9h16v12M3 9l2-5h14l2 5M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 21v-6h6v6"/>'}
];
function mountPropertyCategories(){
  const hero=document.querySelector('.hero');
  if(!hero||document.querySelector('.property-category-nav'))return;
  const section=document.createElement('section');
  section.className='property-category-section';
  section.id='showcase';
  section.setAttribute('aria-label','Browse property categories');
  section.innerHTML=`<div class="property-category-inner"><div class="property-category-heading"><div><p class="eyebrow">Find your place</p><h2>Explore by property type</h2></div><button class="property-category-reset" type="button" data-property-category-reset>All properties</button></div><nav class="property-category-nav" aria-label="Property type">${propertyCategoryOptions.map(({value,label,caption,image,icon})=>`<button type="button" class="property-category" data-property-category="${value}" aria-pressed="false"><span class="property-category-photo"><img src="${image}" alt="" loading="lazy"></span><span class="property-category-shade"></span><span class="property-category-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icon}</svg></span><span class="property-category-copy"><strong>${label}</strong><small>${caption}</small></span></button>`).join('')}</nav></div>`;
  hero.after(section);
  section.querySelectorAll('[data-property-category]').forEach(button=>button.addEventListener('click',()=>{
    location.href=`/listings.html?propertyType=${encodeURIComponent(button.dataset.propertyCategory)}`;
  }));
  section.querySelector('[data-property-category-reset]').addEventListener('click',()=>{
    location.href='/listings.html';
  });
}
mountPropertyCategories();
const DEFAULT_AGENT_AVATAR='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"%3E%3Crect width="240" height="240" fill="%23dfe9e2"/%3E%3Ccircle cx="120" cy="86" r="42" fill="%2372807b"/%3E%3Cpath d="M42 222c8-55 35-82 78-82s70 27 78 82" fill="%2372807b"/%3E%3C/svg%3E';
function applyMakaziBrand(){document.title='Makazi Go | Find your place. Make your move.';document.querySelector('meta[name="description"]')?.setAttribute('content','Discover homes, apartments, land, hotels, and commercial property across Tanzania with Makazi Go.');document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#062b22');document.querySelectorAll('.brand').forEach(brand=>{brand.setAttribute('aria-label','Makazi Go home');brand.innerHTML='<span class="brand-mark" aria-hidden="true">⌂</span><span>Makazi <span>Go</span></span>'});document.querySelector('.admin-shortcut')?.remove();const eyebrow=document.querySelector('.hero-copy .eyebrow'),heading=document.querySelector('.hero-copy h1'),lead=document.querySelector('.hero-lead');if(eyebrow)eyebrow.textContent='Find your place in Tanzania';if(heading)heading.innerHTML='Find your place.<br><em>Make your move.</em>';if(lead)lead.textContent='Discover homes, apartments, land, hotels, and commercial spaces in one trusted marketplace';const footer=document.querySelector('footer .footer-brand p');if(footer)footer.textContent='Find your place. Make your move.';document.querySelectorAll('footer h4').forEach(heading=>{if(heading.textContent.trim()==='Makazi Go')heading.textContent='Makazi Go'})}
applyMakaziBrand();
document.querySelectorAll('.brand').forEach(brand=>{
  brand.title='Double-click to open the administrator page';
  brand.addEventListener('dblclick',event=>{
    event.preventDefault();
    location.assign('/admin/');
  });
});
document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{link.href='/assets/makazi-go-icon.png';link.type='image/png'});
const cacheBustUrl=value=>{const url=String(value||'');return url&&url.startsWith('/')?`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`:url};
const agentBadge=active=>active?'<span class="agent-badge" role="img" aria-label="Verified agent" title="Verified agent">✓</span>':'';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeMediaUrl=value=>{const url=String(value||'').trim();return /^(?:https?:\/\/|\/|data:image\/(?:svg\+xml|png|jpeg|webp);)/i.test(url)?(window.cloudinaryAssetUrl?.(url)||url):DEFAULT_AGENT_AVATAR};
const mediaUrl=value=>cacheBustUrl(safeMediaUrl(value));
const avatarMarkup=(value,alt='')=>`<img src="${escapeHtml(safeMediaUrl(value))}" alt="${escapeHtml(alt)}" onerror="this.onerror=null;this.src='${DEFAULT_AGENT_AVATAR}'">`;
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&!image.dataset.avatarFallback){image.dataset.avatarFallback='true';image.src=DEFAULT_AGENT_AVATAR}},true);
const agentAvatar=(src,_active,alt='')=>`<img class="search-result-avatar" src="${escapeHtml(safeMediaUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy">`;
async function recordPostView(id,node){if(!node||node.dataset.viewed==='true')return;const counter=node.querySelector('[data-post-views],[data-views]');try{const result=await apiJson(`/api/listings/${encodeURIComponent(id)}/view`,{method:'POST',cache:'no-store'});node.dataset.viewed='true';if(counter&&result.views!==undefined)counter.textContent=`${result.views} views`}catch(error){delete node.dataset.viewed;console.warn('Makazi Go view tracking failed',error.message)}}
async function togglePostLike(id,node){if(!requireAccount('like posts'))return;try{const liked=node.dataset.liked==='true',csrf=(await apiJson('/api/auth/csrf')).token,result=await apiJson(`/api/listings/${id}/like`,{method:liked?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});node.dataset.liked=String(result.liked);node.classList.toggle('liked',result.liked);const counter=node.querySelector('[data-post-likes]');if(counter)counter.textContent=`${result.likes} likes`}catch(error){showToast(error.message)}}
function setupPostEngagement(root){root.querySelectorAll('[data-post-id]').forEach(post=>{recordPostView(post.dataset.postId,post);post.addEventListener('pointerenter',()=>recordPostView(post.dataset.postId,post),{once:true});post.addEventListener('click',()=>recordPostView(post.dataset.postId,post),{once:true});post.querySelector('[data-post-like]')?.addEventListener('click',event=>{event.stopPropagation();togglePostLike(post.dataset.postId,post)})})}
function updateAgentFollowUI(result){const buttons=document.querySelectorAll('#followAgentAction');buttons.forEach(button=>{button.textContent=result.following?'Unfollow':'Follow agent';button.setAttribute('aria-pressed',String(result.following));button.disabled=false});document.querySelectorAll('#followersStat strong,.agent-profile-stats span:nth-child(2) strong').forEach(stat=>{if(result.followers!==undefined)stat.textContent=String(result.followers)})}
let currentUser=null;
function showMemberGate(){openModal('<p class="eyebrow">Members only</p><h2>Sign in to request a booking</h2><p>Create a free Makazi Go account or sign in to access profiles, bookings, messaging, saved homes, and personalized features.</p><div class="auth-prompt-actions"><button class="primary" id="promptSignup">Create an account <span>→</span></button><button class="outline-btn" id="promptLogin">Already have an account? Sign in</button></div>');content.querySelector('#promptSignup').onclick=()=>auth('signup');content.querySelector('#promptLogin').onclick=()=>auth('login');}
function requireAccount(){if(currentUser)return true;showMemberGate();return false}
const openTenantDeleteAccount=()=>openAccountDeletionRequest();
const savedIds=new Set(JSON.parse(localStorage.getItem('staynest_saved')||'[]'));
const bookings=JSON.parse(localStorage.getItem('staynest_bookings')||'[]');
function updatePersonalGreeting(user){const greeting=document.querySelector('#personalGreeting'),detail=document.querySelector('#personalGreetingDetail');if(!greeting||!detail)return;const hour=new Date().getHours(),timeGreeting=hour<5?'Good night':hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';if(user?.firstName){greeting.textContent=`${timeGreeting}, ${user.firstName}`;detail.textContent='Your Makazi Go recommendations are ready';}else{greeting.textContent=`${timeGreeting}`;detail.textContent='Discover homes made for real life';}}
async function apiJson(url,options={},retryInvalidCsrf=true){
  const headers=new Headers(options.headers||{});
  if(marketplaceGuestMode)headers.set('X-StayNest-Guest','1');
  let response;
  try{response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers})}
  catch(error){if(error.name==='AbortError')throw error;throw new Error('Makazi Go is temporarily unavailable. Please make sure the app is running and try again.')}
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{}}
  catch{throw new Error(response.status===404?'The requested Makazi Go service could not be found. Refresh the page and try again.':response.status===429?'Too many attempts. Please wait a few minutes and try again.':response.ok?'The server returned an invalid response.':`Makazi Go could not complete the request (HTTP ${response.status}).`)}
  if(!response.ok&&response.status===403&&data.error==='Invalid CSRF token'&&retryInvalidCsrf&&headers.has('X-CSRF-Token')){
    try{
      const csrfResponse=await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'});
      const csrfData=await csrfResponse.json();
      if(csrfResponse.ok&&csrfData.token){headers.set('X-CSRF-Token',csrfData.token);return apiJson(url,{...options,headers},false)}
    }catch{}
  }
  if(!response.ok){
    if(response.status===429)throw new Error('Too many attempts. Please wait a few minutes and try again.');
    const message=data.error||`Makazi Go could not complete the request (HTTP ${response.status}).`;
    throw new Error(data.requestId?`${message} Reference: ${data.requestId}`:message);
  }
  return data;
}
function render(filter='all'){const data=filter==='popular'?currentListings.filter(x=>Number(x.rating||0)>0||Number(x.reviewCount||0)>0):filter==='new'?currentListings.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))):filter==='short'?currentListings.filter(x=>x.rentalMode==='short_term'||x.rentalMode==='both'):filter==='long'?currentListings.filter(x=>x.rentalMode==='long_term'||x.rentalMode==='both'):currentListings;if(!grid)return;if(!data.length){grid.innerHTML='<div class="feed-empty">No published homes match these filters yet. Try another location or clear the filters.</div>';return}grid.innerHTML=data.map(x=>{const price=x.nightlyPrice?`${x.currency} ${Number(x.nightlyPrice).toLocaleString()} / night`:x.monthlyPrice?`${x.currency} ${Number(x.monthlyPrice).toLocaleString()} / month`:`${x.currency} ${Number(x.yearlyPrice||0).toLocaleString()} / year`;const image=safeMediaUrl(x.coverUrl||'/assets/ezgif-frame-018.jpg');const rating=Number(x.rating||0);return `<article class="listing-card reveal-on-scroll is-visible" data-listing-id="${escapeHtml(x.id)}"><div class="listing-photo"><img class="listing-card-image" src="${escapeHtml(image)}" alt="${escapeHtml(x.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/ezgif-frame-018.jpg'"><button class="heart" data-id="${escapeHtml(x.id)}" aria-label="Save ${escapeHtml(x.title)}">♡</button>${x.propertyType?`<span class="rating">${escapeHtml(x.propertyType)}</span>`:''}</div><div class="listing-info"><h3>${escapeHtml(x.title)}</h3><div class="listing-meta">${escapeHtml([x.neighborhood,x.city].filter(Boolean).join(', '))} · ${escapeHtml(x.propertyType||'Home')} · ${x.bedrooms||0} bed${Number(x.bedrooms)===1?'':'s'}</div><div class="listing-price"><strong>${escapeHtml(price)}</strong> <span class="listing-meta">${rating?` · ★ ${rating.toFixed(1)} (${x.reviewCount||0})`: ' · New listing'}</span></div></div></article>`}).join('');grid.querySelectorAll('.heart').forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();if(!requireAccount('save homes'))return;btn.classList.toggle('saved');btn.textContent=btn.classList.contains('saved')?'♥':'♡';showToast(btn.classList.contains('saved')?'Saved to your wishlist':'Removed from wishlist')}));grid.querySelectorAll('.listing-card').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('.heart'))return;void openListingDetails({id:card.dataset.listingId})}))}
let homeListingController;
async function loadListings(filters={}){
  if(!grid)return;
  homeListingController?.abort();
  const controller=new AbortController();
  homeListingController=controller;
  grid.innerHTML='<div class="feed-empty">Finding published homes…</div>';
  try{
    const params=new URLSearchParams(filters);
    const result=await apiJson(`/api/listings/discover?${params}`,{signal:controller.signal});
    if(controller.signal.aborted)return;
    const live=Array.isArray(result.listings)?result.listings:[];
    currentListings=(live.length?live:listings).slice(0,8);
    render(document.querySelector('.chip.active')?.dataset.filter||'all');
  }catch(error){
    if(controller.signal.aborted||error.name==='AbortError')return;
    currentListings=listings;
    render(document.querySelector('.chip.active')?.dataset.filter||'all');
  }
}
let toastTimer;
function showToast(message,type='success'){
  if(!toast)return;
  const text=String(message||'');
  const isError=type==='error'||/invalid|unable|error|failed|could not|not available|expired|unavailable/i.test(text);
  const icon=toast.querySelector('.toast-icon'),messageNode=toast.querySelector('.toast-message'),progress=toast.querySelector('.toast-progress');
  if(messageNode)messageNode.textContent=text;else toast.textContent=text;
  if(icon)icon.textContent=isError?'!':'✓';
  toast.classList.toggle('error',isError);
  toast.hidden=false;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  if(progress){progress.style.animation='none';void progress.offsetWidth;progress.style.animation='toast-countdown 4.2s linear forwards'}
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>{if(!toast.classList.contains('show'))toast.hidden=true},320)},4200);
}
document.querySelector('#toast .toast-close')?.addEventListener('click',()=>{clearTimeout(toastTimer);toast.classList.remove('show');setTimeout(()=>{toast.hidden=true},320)});
const modal=document.querySelector('#modal'),content=document.querySelector('#modalContent');
const hasKnownAccountSession = Boolean(sessionStorage.getItem('stayNest.tabUser'));
const sharedListingLink = new URLSearchParams(location.search).has('listing')
  && new URLSearchParams(location.search).get('book') !== '1';
let marketplaceGuestMode = ['/','/index.html'].includes(location.pathname)
  && !new URLSearchParams(location.search).has('auth')
  && !['view','agent','discover'].some(key => new URLSearchParams(location.search).has(key))
  && (sharedListingLink || !hasKnownAccountSession);
const nativeInnerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
const safeMarkup=value=>{
  const template=document.createElement('template');
  template.innerHTML=String(value??'');
  template.content.querySelectorAll('script,iframe,object,embed,link,style').forEach(node=>node.remove());
  template.content.querySelectorAll('*').forEach(node=>{
    [...node.attributes].forEach(attribute=>{
      const name=attribute.name.toLowerCase(), value=attribute.value.trim();
      if(name.startsWith('on')||name==='style'||(['src','href','action','formaction','xlink:href'].includes(name)&&/^(?:javascript:|vbscript:|data:(?!image\/(?:svg\+xml|png|jpeg|webp);))/i.test(value))) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};
const setSafeMarkup=(element,markup)=>nativeInnerHTML.set.call(element,safeMarkup(markup));
if(pageMain&&nativeInnerHTML)Object.defineProperty(pageMain,'innerHTML',{configurable:true,get:()=>nativeInnerHTML.get.call(pageMain),set:value=>setSafeMarkup(pageMain,value)});
function closeModal(){modal.classList.remove('open');document.body.classList.remove('modal-open')}
function createVerificationResendButton(getEmail){const button=document.createElement('button');button.type='button';button.className='auth-verification-resend';button.textContent='Resend verification email';button.addEventListener('click',async()=>{const email=String(typeof getEmail==='function'?getEmail():getEmail||'').trim();if(!email){showToast('Enter your email address first.','error');return}button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson('/api/auth/email-verification/resend',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({email})});showToast(result.message)}catch(error){showToast(error.message,'error')}finally{button.disabled=false}});return button}
function openModal(html){setSafeMarkup(content,html);modal.classList.add('open');document.body.classList.add('modal-open');const form=content.querySelector('form');if(form?.dataset.auth==='login'){const recovery=document.createElement('button');recovery.type='button';recovery.className='auth-recovery';recovery.textContent='Forgot password?';recovery.addEventListener('click',()=>openPasswordReset());const resend=createVerificationResendButton(()=>form.elements.email.value);form.after(recovery,resend)}}
function showAgentApproval(result){const contact=result?.approvalContact||{email:'cleysir54@gmail.com',whatsapp:'255794442907',displayPhone:'0794 442 907'};openModal(`<div class="approval-message"><div class="approval-icon" aria-hidden="true">✓</div><p class="eyebrow">Application received</p><h2>Your agent account is awaiting approval</h2><p>Thank you for applying to join Makazi Go in Tanzania. An administrator must verify your profile before you can sign in, publish homes, or manage bookings. We will review your application as soon as possible.</p>${result?.emailVerificationSent?'<p class="search-note">A verification link was sent to your email. Verify it while your agent application is reviewed.</p>':'<p class="search-note">We could not send a verification email yet. You can request another link below.</p>'}<div class="approval-contact"><a href="mailto:${contact.email}"><span aria-hidden="true">✉</span><span><strong>Email support</strong><small>${contact.email}</small></span></a><a href="https://wa.me/${contact.whatsapp}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span><span><strong>WhatsApp support</strong><small>${contact.displayPhone}</small></span></a></div><button class="primary" id="approvalSignIn">Continue to sign in</button></div>`);const signIn=content.querySelector('#approvalSignIn');if(result?.email)signIn.before(createVerificationResendButton(result.email));signIn.onclick=()=>auth('login','Your application is pending administrator approval. You can sign in after the admin verifies your account.')}
function showHostApproval(){const contact={email:'cleysir54@gmail.com',whatsapp:'255794442907',displayPhone:'0794 442 907'};openModal(`<div class="approval-message"><div class="approval-icon" aria-hidden="true">i</div><p class="eyebrow">Hosting requires approval</p><h2>Become a Makazi Go agent</h2><p>To start hosting, your account must be reviewed and approved by a Makazi Go administrator. Your tenant account and bookings remain unchanged while the hosting request is reviewed.</p><p class="search-note">Please provide accurate identity and property information. Do not publish or accept bookings outside Makazi Go before approval.</p><div class="approval-contact"><a href="mailto:${contact.email}"><span aria-hidden="true">✉</span><span><strong>Admin email</strong><small>${contact.email}</small></span></a><a href="https://wa.me/${contact.whatsapp}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span><span><strong>WhatsApp</strong><small>${contact.displayPhone}</small></span></a></div><button class="primary" id="hostApprovalContinue">Apply for agent access <span>→</span></button></div>`);content.querySelector('#hostApprovalContinue').onclick=()=>auth('host')}
async function openListingDetails(x){try{const localIndex=listings.findIndex(item=>String(item.id)===String(x.id));const localListing=localIndex>=0?listings[localIndex]:null;const result=localListing?{listing:{...localListing,agentId:0,firstName:localListing.agentFirstName,lastName:localListing.agentLastName,saved:false},media:[{mediaType:'image',mediaUrl:localListing.coverUrl},{mediaType:'image',mediaUrl:`/assets/ezgif-frame-${String((localIndex*17+9)%240+1).padStart(3,'0')}.jpg`}],reviews:[{rating:localListing.rating,comment:'A comfortable, well-presented Makazi Go home with a thoughtful host.',firstName:'Makazi Go',lastName:'Guest'}],similar:[]}:await apiJson(`/api/listings/${encodeURIComponent(x.id)}/details`);const listing=result.listing;const media=Array.isArray(result.media)&&result.media.length?result.media:[{mediaType:'image',mediaUrl:listing.coverUrl}];const recent=JSON.parse(localStorage.getItem('staynest.recentListings')||'[]').filter(id=>Number(id)!==Number(listing.id));localStorage.setItem('staynest.recentListings',JSON.stringify([Number(listing.id),...recent].slice(0,12)));const mediaMarkup=media.map(item=>item.mediaType==='video'?`<video class="listing-detail-media" src="${escapeHtml(mediaUrl(item.mediaUrl))}" controls playsinline preload="metadata"></video>`:`<img class="listing-detail-media" src="${escapeHtml(mediaUrl(item.mediaUrl))}" alt="${escapeHtml(item.caption||listing.title)}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AGENT_AVATAR}'">`).join('');const rating=Number(listing.rating||0);const amenities=String(listing.amenities||'').split(',').filter(Boolean);const reviewMarkup=result.reviews.length?result.reviews.map(review=>`<article class="review-item"><strong>${escapeHtml(`${review.firstName||''} ${review.lastName||''}`.trim()||'Makazi Go member')}</strong><span>★ ${Number(review.rating).toFixed(1)}</span><p>${escapeHtml(review.comment||'')}</p></article>`).join(''):'<p class="empty-copy">No reviews yet. Be the first guest to share your experience.</p>';openModal(`<p class="eyebrow">Listing details</p><h2>${escapeHtml(listing.title)}</h2><p>${escapeHtml(listing.city||'')} ${listing.neighborhood?`· ${escapeHtml(listing.neighborhood)}`:''}${rating?` · ★ ${rating.toFixed(1)} (${listing.reviewCount||0} reviews)`: ' · New listing'}</p><div class="listing-detail-media-grid">${mediaMarkup}</div>${Number.isFinite(Number(listing.latitude))&&Number.isFinite(Number(listing.longitude))?`<h3>Estate location</h3><div id="tenantListingMap" class="tenant-listing-map"></div><p class="map-status">Approximate map location for this estate.</p>`:`<p class="empty-copy">Location map is not available for this listing yet.</p>`}<p>${escapeHtml(listing.description||'')}</p><div class="feature-list"><div><b>01</b><span><strong>${listing.currency} ${Number(listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||0).toLocaleString()} ${listing.nightlyPrice?'/ night':listing.monthlyPrice?'/ month':'/ year'}</strong><small>${escapeHtml(listing.rentalMode||'Flexible stay')} · ${escapeHtml(listing.propertyType||'Home')} · ${listing.bedrooms||0} bedrooms · ${listing.bathrooms||0} bathrooms · Up to ${listing.maxGuests||'—'} guests</small></span></div></div>${amenities.length?`<h3>Amenities</h3><p>${amenities.map(item=>`<span class="amenity-pill">${escapeHtml(item)}</span>`).join(' ')}</p>`:''}<h3>Host</h3><p>${escapeHtml(`${listing.firstName||''} ${listing.lastName||''}`.trim()||listing.agencyName||'Makazi Go host')}${listing.verifiedAgent?' · Verified agent':''}</p><div class="listing-actions"><button class="primary" id="detailBook">Request booking <span>→</span></button><button class="outline-btn" id="detailSave">${listing.saved?'Saved':'Save favorite'}</button><button class="outline-btn" id="detailMessage">Contact agent</button><button class="outline-btn" id="detailCompare">Compare</button><button class="outline-btn" id="detailShare">Share</button><button class="outline-btn" id="detailReport">Report listing</button></div><h3>Reviews</h3>${reviewMarkup}<h3>Similar listings</h3>${result.similar.length?result.similar.map(item=>`<button class="search-result" data-similar-id="${item.id}"><img src="${safeMediaUrl(item.coverUrl||DEFAULT_AGENT_AVATAR)}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city)} · ${item.currency} ${item.nightlyPrice||item.monthlyPrice||'Contact agent'}</small></span></button>`).join(''):'<p class="empty-copy">No similar listings found yet.</p>'}`);const tenantMapHost=content.querySelector('#tenantListingMap');if(tenantMapHost){const latitude=Number(listing.latitude),longitude=Number(listing.longitude);try{const tenantMap=L.map(tenantMapHost,{scrollWheelZoom:false}).setView([latitude,longitude],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(tenantMap);L.marker([latitude,longitude]).addTo(tenantMap);const resize=()=>tenantMap.invalidateSize({pan:false});requestAnimationFrame(()=>{resize();setTimeout(resize,250)})}catch(error){tenantMapHost.insertAdjacentHTML('afterend','<p class="form-error">The map could not be loaded. The listing location is still available.</p>');console.warn('Listing map unavailable:',error.message)}}content.querySelector('#detailBook').onclick=()=>{closeModal();openListing({...listing,id:listing.id,_booking:true,title:listing.title,location:listing.city,image:listing.coverUrl,rating:listing.rating,reviews:listing.reviewCount,tag:'Listing request'})};content.querySelector('#detailSave').onclick=async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;const saved=content.querySelector('#detailSave').textContent==='Saved';if(saved){await apiJson(`/api/listings/${listing.id}/save`,{method:'DELETE',headers:{'X-CSRF-Token':csrf}})}else await apiJson(`/api/listings/${listing.id}/save`,{method:'POST',headers:{'X-CSRF-Token':csrf}});content.querySelector('#detailSave').textContent=saved?'Save favorite':'Saved';showToast(saved?'Removed from favorites':'Saved to favorites')}catch(error){showToast(error.message)}};content.querySelector('#detailMessage').onclick=()=>openAgentMessage(listing.agentId,`${listing.firstName||'Listing'} ${listing.lastName||'agent'}`);content.querySelector('#detailCompare').onclick=()=>{const selected=JSON.parse(localStorage.getItem('staynest.compareListings')||'[]').filter(item=>Number(item.id)!==Number(listing.id));selected.push({id:listing.id,title:listing.title,price:listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent',city:listing.city,bedrooms:listing.bedrooms,bathrooms:listing.bathrooms,rating:listing.rating});localStorage.setItem('staynest.compareListings',JSON.stringify(selected.slice(-3)));openModal(`<p class="eyebrow">Listing comparison</p><h2>Compare saved listings</h2><div class="compare-grid">${selected.slice(-3).map(item=>`<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city||'')}<br>${item.price}<br>${item.bedrooms||0} bedrooms · ${item.bathrooms||0} bathrooms<br>★ ${Number(item.rating||0).toFixed(1)}</small></div>`).join('')}</div>`)};content.querySelector('#detailShare').onclick=async()=>{const url=`${location.origin}/index.html?listing=${listing.id}`;if(navigator.share)await navigator.share({title:listing.title,url});else await navigator.clipboard.writeText(url);showToast('Listing link copied')};content.querySelector('#detailReport').onclick=()=>openListingReport(listing.id);content.querySelectorAll('[data-similar-id]').forEach(button=>button.onclick=()=>openListingDetails({id:button.dataset.similarId}));}catch(error){showToast(error.message)}}
function openListingReport(id){openModal(`<p class="eyebrow">Safety report</p><h2>Report this listing</h2><form id="listingReportForm"><label>Reason<select name="reason" required><option value="fake">Fake listing</option><option value="misleading">Misleading information</option><option value="scam">Possible scam</option><option value="other">Other safety concern</option></select></label><label>Details<textarea name="details" maxlength="1000" required></textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Send report</button></form>`);content.querySelector('#listingReportForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{await apiJson('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityType:'listing',entityId:id,reason:form.elements.reason.value,details:form.elements.details.value})});closeModal();showToast('Report sent to Makazi Go administrators')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
function openListing(x){if(x.id&&!x._booking)return openListingDetails(x);if(currentUser?.roles?.includes('agent')){openModal(`<p class="eyebrow">Agent account</p><h2>Booking is for tenants</h2><p>Agent accounts manage listings and booking requests. Sign in with a tenant account to request a stay.</p>`);return}if(x.isDemo){openModal(`<p class="eyebrow">Preview home</p><h2>${x.title}</h2><p>${x.location} · ★ ${x.rating} (${x.reviews} reviews)</p><div class="listing-photo" style="height:180px;background-image:url('${x.image}');margin:20px 0"></div><p>This is a featured preview. Search for this home to request a booking from its assigned agent.</p>${currentUser?.roles?.includes('tenant')?'<p class="form-error">Search for this home to request a booking.</p>':'<button class="primary" id="loginToBook">Sign in to book <span>→</span></button>'}`);if(!currentUser)content.querySelector('#loginToBook').onclick=()=>auth('login');return}if(!currentUser&&!requireAccount('request a booking'))return;if(!currentUser?.roles?.includes('tenant'))return;openModal(`<p class="eyebrow">${x.tag||'Verified home'}</p><h2>${x.title}</h2><p>${x.location} · ★ ${x.rating} (${x.reviews} reviews)</p><div class="listing-photo" style="height:180px;background-image:url('${x.image||x.coverUrl||DEFAULT_AGENT_AVATAR}');margin:20px 0"></div><p>Send a booking request to the assigned agent. Your dates are held while the agent reviews the request.</p><form id="bookingForm"><label>Check-in</label><input name="checkIn" type="date" required><label>Check-out</label><input name="checkOut" type="date" required><label>Request type<select name="bookingKind"><option value="stay">Book a stay</option><option value="viewing">Request a viewing</option></select></label><label>Guests</label><input name="guests" type="number" min="1" max="20" value="1" required><p class="form-error" role="alert"></p><button class="primary" type="submit">Request to book <span>→</span></button></form>`);content.querySelector('#bookingForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({listingId:x.id,checkIn:form.elements.checkIn.value,checkOut:form.elements.checkOut.value,guests:Number(form.elements.guests.value),bookingKind:form.elements.bookingKind.value})});closeModal();showToast(`Booking request ${result.bookingCode} sent to the agent`)}catch(error){form.querySelector('.form-error').textContent=error.message}})}
function openPasswordReset(token=''){let resetToken=token;openModal(`<p class="eyebrow">${resetToken?'Set a new password':'Account recovery'}</p><h2>${resetToken?'Create a new password':'Forgot your password?'}</h2><p>${resetToken?'Choose a strong password with at least 12 characters and three character types.':'Enter your email and, if it matches a Makazi Go account, recovery instructions will be prepared.'}</p><form id="passwordResetForm">${resetToken?`<input type="hidden" name="token" value="${escapeHtml(resetToken)}"><label>New password</label><input name="password" type="password" autocomplete="new-password" minlength="12" required><label>Confirm new password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required>`:'<label>Email address</label><input name="email" type="email" autocomplete="email" required>'}<p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">${resetToken?'Update password':'Send recovery instructions'} <span>→</span></button></form>${resetToken?'':'<p class="auth-switch"><button type="button" id="backToLogin">Back to sign in</button></p>'}`);const form=content.querySelector('#passwordResetForm');form.onsubmit=async event=>{event.preventDefault();const errorBox=form.querySelector('.form-error'),button=form.querySelector('button');button.disabled=true;try{if(resetToken&&form.elements.password.value!==form.elements.confirmPassword.value)throw new Error('Passwords do not match.');const csrf=(await apiJson('/api/auth/csrf')).token;const endpoint=resetToken?'/api/auth/password-reset/complete':'/api/auth/password-reset/request';const body=resetToken?{token:resetToken,password:form.elements.password.value}:{email:form.elements.email.value};const result=await apiJson(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});if(resetToken){closeModal();showToast(result.message);auth('login')}else if(result.resetUrl){setSafeMarkup(content,`<p class="eyebrow">Recovery link ready</p><h2>Open your recovery link</h2><p>For this local development environment, use the link below. In production it will be delivered by email.</p><a class="primary" href="${escapeHtml(result.resetUrl)}">Reset password <span>→</span></a>`)}else{closeModal();showToast(result.message)}}catch(error){errorBox.textContent=error.message;button.disabled=false}};content.querySelector('#backToLogin')?.addEventListener('click',()=>auth('login'))}
function auth(mode,notice=''){const host=mode==='host';let signup=mode==='signup'||host;const renderAuth=()=>{openModal(`<p class="eyebrow">${host?'Join as an agent':signup?'Join Makazi Go':'Welcome to Makazi Go'}</p><h2>${host?'Start managing homes':signup?'Create your account':'Welcome back'}</h2><p>${signup?'Choose Tenant to book homes or Agent to manage properties.':'Sign in to access your bookings, messages, profile, and role workspace.'}</p>${notice?`<p class="search-note">${escapeHtml(notice)}</p>`:''}<a class="google-auth-btn" href="/api/auth/google" aria-label="Sign in with Google" title="Sign in with Google"><svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.74-.07-1.46-.21-2.14H12v4.06h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.31Z"/><path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.49-4.03H3.27v2.53A9.75 9.75 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.51 13.58A5.86 5.86 0 0 1 6.2 12c0-.55.11-1.08.31-1.58V7.89H3.27A9.5 9.5 0 0 0 2.25 12c0 1.48.36 2.88 1.02 4.11l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.36 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.73 5.39l3.24 2.53C7.29 8.11 9.45 6.39 12 6.39Z"/></svg><span>Continue with Google</span></a><div class="auth-divider"><span>or use your email</span></div><form data-auth="${signup?'register':'login'}">${signup?`<label>I want to</label><select name="role" required><option value="tenant">Tenant — rent or book a home</option><option value="agent" ${host?'selected':''}>Agent — manage properties and bookings</option></select><label>First name</label><input name="firstName" autocomplete="given-name" required><label>Last name</label><input name="lastName" autocomplete="family-name" required>`:''}<label>Email address</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required><label>Password</label><input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="12" placeholder="At least 12 characters" required>${!signup?'':''}<label class="check-row"><input name="rememberMe" type="checkbox"> Remember me on this device</label><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">${signup?'Create account':'Sign in'} <span>→</span></button></form><p class="auth-switch">${signup?'Already have an account?':'New to Makazi Go?'} <button type="button" id="authSwitch">${signup?'Sign in':'Create an account'}</button></p>`);const form=content.querySelector('form'),submit=form.querySelector('button[type="submit"]'),errorBox=form.querySelector('.form-error');form.addEventListener('submit',async e=>{e.preventDefault();errorBox.textContent='';submit.disabled=true;submit.classList.add('loading');const data=Object.fromEntries(new FormData(form));data.rememberMe=Boolean(form.elements.rememberMe.checked);try{const csrf=await apiJson('/api/auth/csrf');const result=await apiJson(`/api/auth/${form.dataset.auth}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token},body:JSON.stringify(data)});if(result.mfaRequired){errorBox.textContent='Multi-factor authentication is not available in this login form yet.';return}if(result.pendingApproval){showAgentApproval(result);return}marketplaceGuestMode=false;closeModal();const signedInUser=(await apiJson('/api/auth/me')).user;sessionStorage.setItem('stayNest.tabUser',JSON.stringify({id:signedInUser?.id,roles:signedInUser?.roles||[]}));await updateAuthControls(signedInUser);showToast(signup?'Account created — you are now signed in.':'Signed in successfully.');if(signup&&data.role==='tenant'){window.location.assign('/index.html#explore');return}else showRoleDashboard(result.roles||[data.role]);}catch(error){errorBox.textContent=error.message;showToast(error.message)}finally{submit.disabled=false;submit.classList.remove('loading')}});content.querySelector('#authSwitch').onclick=()=>{signup=!signup;renderAuth()}};renderAuth()}
function openGoogleSetup(){openModal(`<p class="eyebrow">Complete your profile</p><h2>Welcome to Makazi Go</h2><p>Your Google email is verified. Set a Makazi Go password so you can also sign in with this email when Google is unavailable.</p><form id="googleSetupForm"><label>Phone number</label><input name="phone" type="tel" autocomplete="tel" placeholder="+255 700 000 000" required><label>City or location</label><input name="location" autocomplete="address-level2" placeholder="Dar es Salaam" maxlength="100" required><label>How will you use Makazi Go?</label><select name="role" required><option value="tenant">Tenant — rent or book a home</option><option value="agent">Agent — manage properties and bookings</option></select><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">Create my Makazi Go account <span>→</span></button></form>`);content.querySelector('#googleSetupForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,errorNode=form.querySelector('.form-error'),button=form.querySelector('button');button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson('/api/auth/google/complete',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({phone:form.elements.phone.value,location:form.elements.location.value,role:form.elements.role.value})});if(result.pendingApproval){showAgentApproval(result);return}closeModal();const googleUser=(await apiJson('/api/auth/me')).user;sessionStorage.setItem('stayNest.tabUser',JSON.stringify({id:googleUser?.id,roles:googleUser?.roles||[]}));await updateAuthControls(googleUser);showToast('Your Makazi Go account is ready.');if(form.elements.role.value==='tenant')location.hash='explore';else showRoleDashboard(result.roles||['agent']);}catch(error){errorNode.textContent=error.message;button.disabled=false}})}
async function showRoleDashboard(roles){const role=roles.includes('agent')?'agent':'tenant';let data={};try{data=await apiJson(role==='agent'?'/api/agent/summary':'/api/account/summary')}catch(error){showToast(error.message);return}const contentByRole=role==='agent'?{title:'Agent workspace',intro:'Manage assigned homes and booking operations.',items:[`${data.assignedListings||0} assigned listings`,` ${data.pendingBookings||0} pending booking requests`,'Create a listing','Upload identity documents','Manage listing media']}:{title:'Your tenant workspace',intro:'Book homes and manage your stays from one secure account.',items:[`${data.upcomingBookings||0} upcoming bookings`,`${data.savedHomes||0} saved homes`,`${data.searchAlerts||0} active search alerts`,'Messages with agents','Reviews and ratings']};openModal(`<p class="eyebrow">${role} workspace</p><h2>${contentByRole.title}</h2><p>${contentByRole.intro}</p><div class="feature-list">${contentByRole.items.map((item,index)=>`<div><b>0${index+1}</b><span><strong>${item}</strong><small>Available from your authenticated ${role} account</small></span></div>`).join('')}</div>${role==='agent'?'<button class="primary" id="createListingAction">Create listing <span>→</span></button><button class="outline-btn" id="listingManagerAction">My listings</button><button class="outline-btn" id="bookingRequestsAction">Review booking requests</button><button class="outline-btn" id="profileAction">Manage public profile</button>':'<button class="primary" id="bookingsAction">Open my bookings <span>→</span></button>'}`);content.querySelector('#createListingAction, #bookingsAction').addEventListener('click',()=>{if(role==='agent')openAgentListingForm();else loadTenantBookings()});content.querySelector('#listingManagerAction')?.addEventListener('click',openAgentListings);content.querySelector('#bookingRequestsAction')?.addEventListener('click',loadAgentBookings);content.querySelector('#profileAction')?.addEventListener('click',openOwnAgentProfile)}
async function openOwnProfile(preferredRole=''){const result=await apiJson('/api/auth/me');const user=result.user;if(!user?.id)return requireAccount('view your profile');const roles=Array.isArray(user.roles)?user.roles:[];const role=preferredRole&&roles.includes(preferredRole)?preferredRole:roles.includes('tenant')?'tenant':roles.includes('agent')?'agent':'';if(role==='tenant')return openOwnTenantProfile();if(role==='agent')return openOwnAgentProfile();showToast('Your account does not have a profile workspace yet');return false}
async function openOwnAgentProfile(){closeModal();const me=(await apiJson('/api/auth/me')).user;if(!me?.id||!me.roles?.includes('agent'))return openOwnProfile('tenant');document.body.classList.remove('tenant-view');document.body.classList.add('role-view');history.replaceState({},'',`/index.html?view=agent&agent=${encodeURIComponent(me.mainAgentId||me.id)}`);return openAgentProfile(me.mainAgentId||me.id,true)}
async function openOwnTenantProfile(){closeModal();const me=(await apiJson('/api/auth/me')).user;if(!me?.id||!me.roles?.includes('tenant'))return openOwnProfile('agent');document.body.classList.remove('agent-marketplace-view','role-view');document.body.classList.add('tenant-view');history.replaceState({},'','/index.html?view=tenant');const result=await apiJson('/api/tenant/profile');const {profile,following,wishlist}=result;profile.avatarUrl=cacheBustUrl(profile.avatarUrl);pageMain.innerHTML=`<section class="agent-page tenant-page"><div class="agent-page-top"><button class="outline-btn" id="tenantBackHome">← Explore Makazi Go</button><span class="eyebrow">Your private Makazi Go profile</span></div><div class="agent-page-hero"><img class="agent-page-avatar" src="${profile.avatarUrl||DEFAULT_AGENT_AVATAR}" alt="${profile.firstName} ${profile.lastName}"><div class="agent-page-copy"><p class="eyebrow">Tenant profile</p><h1>${profile.firstName} ${profile.lastName}</h1><p class="agent-page-bio">${profile.bio||'Your saved homes and trusted agents, all in one place.'}</p><div class="agent-page-stats"><span><strong>${wishlist.length}</strong>saved homes</span><span><strong>${following.length}</strong>following</span></div><p class="agent-page-contact">${profile.email}</p><div class="agent-profile-actions"><button class="primary" id="editTenantProfile">Edit profile <span>→</span></button><button class="outline-btn" id="tenantBookingsProfile">My bookings</button></div></div></div><div class="tenant-sections"><div><div class="agent-page-toolbar"><h2>Following</h2><span>Agents you trust</span></div>${following.length?following.map(agent=>`<button class="search-result" data-agent-id="${agent.id}">${agentAvatar(agent.profileImageUrl,agent.badgeLabel,`${agent.firstName} ${agent.lastName}`)}<span><strong>${agent.firstName} ${agent.lastName}</strong><small>${agent.bio||'Makazi Go agent'}</small></span></button>`).join(''):'<p class="empty-copy">You are not following any agents yet. Explore an agent profile to follow them.</p>'}</div><div><div class="agent-page-toolbar"><h2>Wishlist</h2><span>Homes you saved</span></div><div class="tenant-wishlist">${wishlist.length?wishlist.map(home=>`<article class="search-result" data-listing-id="${home.id}" role="button" tabindex="0"><img src="${home.coverUrl||DEFAULT_AGENT_AVATAR}" alt=""><span><strong>${home.title}</strong><small>${home.city} · ${home.currency} ${home.nightlyPrice||home.monthlyPrice||'Contact agent'}</small></span></article>`).join(''):'<p class="empty-copy">Your wishlist is empty. Save a home while exploring to see it here.</p>'}</div></div></div></section>`;document.querySelector('#tenantBackHome').onclick=()=>location.href='/index.html?v=20260912-auth-bookings1#top';document.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>openAgentProfile(button.dataset.agentId,false));document.querySelectorAll('.tenant-wishlist .search-result').forEach(button=>button.onclick=()=>openListing({id:button.dataset.listingId}));document.querySelector('#editTenantProfile').onclick=()=>openTenantProfileEditor(profile);document.querySelector('#tenantBookingsProfile').onclick=loadTenantBookings;window.scrollTo({top:0,behavior:'smooth'})}
function openTenantProfileEditor(profile){openModal(`<p class="eyebrow">Tenant profile</p><h2>Edit your profile</h2><form id="tenantProfileForm"><label>Profile photo</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>First name</label><input name="firstName" value="${escapeHtml(profile.firstName||'')}" maxlength="80" required><label>Last name</label><input name="lastName" value="${escapeHtml(profile.lastName||'')}" maxlength="80" required><label>Phone number</label><input name="phone" type="tel" value="${escapeHtml(profile.phone||'')}" placeholder="+255 700 000 000"><label>City or location</label><input name="city" value="${escapeHtml(profile.city||'')}" maxlength="100" placeholder="Dar es Salaam"><label>About you</label><textarea name="bio" maxlength="5000">${escapeHtml(profile.bio||'')}</textarea><p class="form-error" role="alert"></p><button class="primary" type="submit">Save profile</button></form>`);content.querySelector('#tenantProfileForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const photo=form.elements.profilePic.files[0];if(photo){const data=new FormData();data.append('profilePic',photo);const uploaded=await apiJson('/api/tenant/profile/photo',{method:'POST',headers:{'X-CSRF-Token':csrf},body:data});profile.avatarUrl=`${uploaded.avatarUrl}${uploaded.avatarUrl.includes('?')?'&':'?'}v=${Date.now()}`}await apiJson('/api/tenant/profile',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,phone:form.elements.phone.value,city:form.elements.city.value,bio:form.elements.bio.value})});closeModal();showToast('Profile updated');await openOwnTenantProfile();await updateAuthControls((await apiJson('/api/auth/me')).user)}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function openAgentFollowList(id,kind){const result=await apiJson(`/api/agents/${id}/${kind}`);openModal(`<p class="eyebrow">Agent network</p><h2>${kind==='followers'?'Followers':'Following'}</h2>${result.users.length?result.users.map(user=>`<button class="search-result" data-user-id="${user.id}" data-role="${user.role}">${user.role==='agent'?agentAvatar(user.profileImageUrl,user.badgeLabel,`${user.firstName} ${user.lastName}`):''}<span><strong>${user.firstName} ${user.lastName}</strong><small>${user.role==='agent'?'Open agent profile':'Makazi Go tenant'}</small></span></button>`).join(''):'<p>No profiles here yet.</p>'}`);content.querySelectorAll('[data-user-id]').forEach(button=>button.onclick=()=>{if(button.dataset.role!=='agent'){showToast('Tenant profiles are private');return}closeModal();openAgentProfile(button.dataset.userId,false)})}
function openAgentMessage(id,name){if(!requireAccount('message other members'))return;openModal(`<p class="eyebrow">Private message</p><h2>Message ${escapeHtml(name)}</h2><p>Your message will open a secure conversation with this Makazi Go member.</p><form id="messageForm"><textarea name="body" maxlength="2000" minlength="1" required placeholder="Write a respectful message"></textarea><p class="form-error" role="alert"></p><div class="auth-prompt-actions"><button class="primary" type="submit">Send message <span>→</span></button><button class="outline-btn" type="button" id="openInboxAfterMessage">Open inbox</button></div></form>`);content.querySelector('#openInboxAfterMessage').onclick=openMessages;content.querySelector('#messageForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({recipientId:Number(id),body:form.elements.body.value.trim()})});closeModal();showToast('Message sent securely. Open your inbox to continue the conversation.');openMessages()}catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false}})}
async function openAgentProfileModal(id,owner=false){if(!requireAccount('view agent profiles'))return;const result=await apiJson(`/api/agents/${id}/profile`);const {profile,posts}=result;let isFollowing=Boolean(result.following);const avatar=safeMediaUrl(profile.profileImageUrl||profile.avatarUrl);const postMarkup=posts.length?posts.map(post=>`<article class="agent-post ${post.status==='pending_review'?'agent-post-pending':''}" data-post-id="${post.id}" data-liked="${post.liked?'true':'false'}" title="${post.title}">${post.status==='pending_review'?'<span class="agent-post-status">Pending review</span>':''}${post.mediaType==='video'?`<video src="${post.coverUrl||''}" muted preload="metadata"></video>`:`<img src="${post.coverUrl||''}" alt="${post.title}" loading="lazy">`}<div class="agent-post-overlay"><button class="post-like-button" data-post-like="${post.id}" aria-label="Like post">♥</button><span><b data-post-likes>${post.likes||0}</b> likes · <b data-post-views>${post.views||0}</b> views</span></div></article>`).join(''):'<div class="agent-post-empty">No published posts yet. Create a listing and it will appear here after moderation.</div>';openModal(`<div class="agent-profile"><p class="eyebrow">Makazi Go agent profile</p><div class="agent-profile-head"><img class="agent-profile-avatar" src="${avatar}" alt="${profile.firstName} ${profile.lastName}" onerror="this.style.display='none'"><div><h2>${profile.firstName} ${profile.lastName}${agentBadge(profile.badgeLabel)}</h2><p>${profile.bio||'Makazi Go property professional.'}</p><div class="agent-profile-stats"><span><strong>${posts.length}</strong>posts</span><span><strong>${profile.followers||0}</strong>followers</span><span><strong>${profile.following||0}</strong>following</span></div><small>${profile.phone||'Phone not provided'} · ${profile.email||''}</small></div></div><div class="agent-profile-actions">${owner?'<button class="primary" id="createProfilePost">Create post <span>→</span></button><button class="outline-btn" id="editProfileAction">Edit profile</button>':`<button class="primary" id="messageAgentAction">✉ Message</button><button class="outline-btn" id="followAgentAction">${isFollowing?'Unfollow':'Follow agent'}</button>`}</div><h3>Posts</h3><div class="agent-post-grid">${postMarkup}</div></div>`);setupPostEngagement(content);content.querySelector('#followAgentAction')?.addEventListener('click',async()=>{try{const button=content.querySelector('#followAgentAction');button.disabled=true;const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson(`/api/agents/${id}/follow`,{method:isFollowing?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});updateAgentFollowUI(result);isFollowing=Boolean(result.following);showToast(result.following?'Agent followed':'Agent unfollowed')}catch(error){content.querySelector('#followAgentAction').disabled=false;showToast(error.message)}});content.querySelector('#messageAgentAction')?.addEventListener('click',()=>openAgentMessage(id,`${profile.firstName} ${profile.lastName}`));content.querySelector('#editProfileAction')?.addEventListener('click',()=>openAgentProfileEditor(profile));content.querySelector('#createProfilePost')?.addEventListener('click',openAgentListingForm)}
async function openAgentProfile(id,owner=false){if(owner&&!currentUser)return requireAccount('manage your agent profile');if(owner)document.body.classList.add('role-view');history.replaceState({},'',`/index.html?view=agent&agent=${encodeURIComponent(id)}`);const result=await apiJson(`/api/agents/${id}/profile`);const {profile,posts}=result;let isFollowing=Boolean(result.following);const avatar=cacheBustUrl(safeMediaUrl(profile.profileImageUrl||profile.avatarUrl));const postMarkup=posts.length?posts.map(post=>`<article class="agent-post ${post.status==='pending_review'?'agent-post-pending':''}" data-post-id="${post.id}" data-liked="${post.liked?'true':'false'}" title="${post.title}">${post.status==='pending_review'?'<span class="agent-post-status">Pending review</span>':''}${post.mediaType==='video'?`<video src="${post.coverUrl||''}" muted preload="metadata"></video>`:`<img src="${post.coverUrl||''}" alt="${post.title}" loading="lazy">`}<div class="agent-post-overlay"><button class="post-like-button" data-post-like="${post.id}" aria-label="Like post">♥</button><span><b data-post-likes>${post.likes||0}</b> likes · <b data-post-views>${post.views||0}</b> views</span></div></article>`).join(''):'<div class="agent-post-empty">No published posts yet. Create a post and it will appear here after moderation.</div>';pageMain.innerHTML=`<section class="agent-page"><div class="agent-page-top"><button class="outline-btn" id="backHome">← Explore Makazi Go</button><span class="eyebrow">Makazi Go agent</span></div><div class="agent-page-hero"><img class="agent-page-avatar" src="${avatar}" alt="${profile.firstName} ${profile.lastName}"><div class="agent-page-copy"><p class="eyebrow">Verified property professional</p><h1>${profile.firstName} ${profile.lastName}${profile.badgeLabel?` ${agentBadge(profile.badgeLabel)}`:''}</h1><p class="agent-page-bio">${profile.agencyName?`${escapeHtml(profile.agencyName)} · `:''}${profile.bio||'Curating places that feel like home.'}</p><div class="agent-page-stats"><button class="profile-stat-link" id="postsStat"><strong>${posts.length}</strong>posts</button><button class="profile-stat-link" id="followersStat"><strong>${profile.followers||0}</strong>followers</button><button class="profile-stat-link" id="followingStat"><strong>${profile.following||0}</strong>following</button></div><p class="agent-page-contact">${profile.phone||'Phone not provided'} ${profile.email?`· ${profile.email}`:''}</p><div class="agent-profile-actions">${owner?'<button class="primary" id="createProfilePost">Create post <span>→</span></button><button class="outline-btn" id="editProfileAction">Edit profile</button>':`<button class="primary" id="messageAgentAction">✉ Message</button><button class="outline-btn" id="followAgentAction">${isFollowing?'Unfollow':'Follow agent'}</button>`}</div></div></div><div class="agent-page-toolbar"><h2>Posts</h2><span>${posts.length} published ${posts.length===1?'post':'posts'}</span></div><div class="agent-post-grid">${postMarkup}</div></section>`;setupPostEngagement(pageMain);document.querySelector('#backHome').onclick=()=>{location.href='/index.html?v=20260912-agent-profile6#top'};document.querySelector('#followersStat')?.addEventListener('click',()=>openAgentFollowList(id,'followers'));document.querySelector('#followingStat')?.addEventListener('click',()=>openAgentFollowList(id,'following'));document.querySelector('#messageAgentAction')?.addEventListener('click',()=>openAgentMessage(id,`${profile.firstName} ${profile.lastName}`));document.querySelector('#followAgentAction')?.addEventListener('click',async()=>{if(!requireAccount('follow agents'))return;const button=document.querySelector('#followAgentAction');try{button.disabled=true;const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson(`/api/agents/${id}/follow`,{method:isFollowing?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});updateAgentFollowUI(result);isFollowing=Boolean(result.following);showToast(result.following?'Agent followed':'Agent unfollowed');button.disabled=false}catch(error){button.disabled=false;showToast(error.message)}});document.querySelector('#editProfileAction')?.addEventListener('click',()=>openAgentProfileEditor(profile));document.querySelector('#createProfilePost')?.addEventListener('click',openAgentListingForm);window.scrollTo({top:0,behavior:'smooth'})}
function openAgentProfileEditor(profile){openModal(`<p class="eyebrow">Agent profile</p><h2>Manage your profile</h2><form id="profileForm"><label>Profile photo</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>First name</label><input name="firstName" value="${escapeHtml(profile.firstName||'')}" maxlength="80" required><label>Last name</label><input name="lastName" value="${escapeHtml(profile.lastName||'')}" maxlength="80" required><label>Phone</label><input name="phone" type="tel" value="${escapeHtml(profile.phone||'')}" placeholder="+255 700 000 000"><label>City or location</label><input name="city" value="${escapeHtml(profile.city||'')}" maxlength="100" placeholder="Dar es Salaam"><label>Bio</label><textarea name="bio" maxlength="5000">${escapeHtml(profile.bio||'')}</textarea><p class="form-error" role="alert"></p><button class="primary" type="submit">Save profile</button></form>`);content.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,errorBox=form.querySelector('.form-error');try{const csrf=(await apiJson('/api/auth/csrf')).token;const photo=form.elements.profilePic.files[0];if(photo){const photoData=new FormData();photoData.append('profilePic',photo);const uploaded=await apiJson('/api/agent/profile/photo',{method:'POST',headers:{'X-CSRF-Token':csrf},body:photoData});profile.profileImageUrl=uploaded.profileImageUrl;document.querySelectorAll('#agentProfileAvatar,.agent-page-avatar').forEach(image=>{image.src=`${uploaded.profileImageUrl}${uploaded.profileImageUrl.includes('?')?'&':'?'}v=${Date.now()}`})}await apiJson('/api/agent/profile',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,phone:form.elements.phone.value,city:form.elements.city.value,bio:form.elements.bio.value})});closeModal();showToast('Profile updated');await openOwnAgentProfile()}catch(error){errorBox.textContent=error.message}})}
async function openAgentListings(){try{const result=await apiJson('/api/host/listings');openModal(`<p class="eyebrow">Agent workspace</p><h2>Your listings</h2><p class="search-note">Manage every listing and watch moderation or publication status update from the database.</p><div class="listing-manager">${result.listings.length?result.listings.map(listing=>`<div class="listing-manager-row"><span><strong>${escapeHtml(listing.title)}</strong><small>${escapeHtml(listing.status.replaceAll('_',' '))} · ${escapeHtml(listing.rental_mode||'short term')} · Updated ${new Date(listing.updated_at).toLocaleString()}</small></span><span class="status-pill">${escapeHtml(listing.status)}</span></div>`).join(''):'<p class="empty-copy">You have not submitted a listing yet.</p>'}</div><button class="primary" id="newListingFromManager">List another place <span>→</span></button>`);content.querySelector('#newListingFromManager').onclick=openAgentListingForm}catch(error){showToast(error.message)}}
function openAgentListingForm(){openModal(`<p class="eyebrow">Agent workspace</p><h2>Create a listing</h2><p>Your registration document and at least one estate image or video are required. Search the address with OpenStreetMap so guests can find the property accurately.</p><form id="agentListingForm" enctype="multipart/form-data"><label>Title</label><input name="title" required><label>Description / caption</label><textarea name="description" required></textarea><label>Address</label><div class="location-search-row"><input name="addressLine1" id="listingAddress" required placeholder="Street address"><button class="outline-btn" type="button" id="findListingLocation">Find on map</button></div><label>City</label><input name="city" required><input type="hidden" name="latitude"><input type="hidden" name="longitude"><div class="listing-map-wrap"><div id="listingMap" aria-label="OpenStreetMap listing location"></div><p id="listingMapStatus" class="map-status">Search for the exact property address to place it on the map.</p></div><label>Bedrooms</label><input name="bedrooms" type="number" min="0" max="99" value="1"><label>Bathrooms</label><input name="bathrooms" type="number" min="0.5" max="99" step="0.5" value="1"><label>Maximum guests</label><input name="maxGuests" type="number" min="1" max="999" value="2"><label>Amenities</label><input name="amenities" maxlength="500" placeholder="Wi-Fi, Parking, Garden"><label>Rental duration</label><select name="rentalMode"><option value="short_term">Nightly</option><option value="long_term">Monthly</option><option value="both">Nightly, monthly, or yearly</option></select><label>Nightly price</label><input name="nightlyPrice" type="number" min="1" step="0.01"><label>Monthly price</label><input name="monthlyPrice" type="number" min="1" step="0.01"><label>Yearly price</label><input name="yearlyPrice" type="number" min="1" step="0.01"><label>Registration document</label><input name="document" type="file" accept=".pdf,image/jpeg,image/png" required><label>Estate image or video</label><input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple required><label>Media caption</label><input name="caption0" maxlength="255" placeholder="Describe the first image or video"><p class="form-error" role="alert"></p><button class="primary" type="submit">Submit for review <span>→</span></button></form>`);const form=content.querySelector('#agentListingForm'),mapHost=content.querySelector('#listingMap'),status=content.querySelector('#listingMapStatus'),errorBox=form.querySelector('.form-error');const map=L.map(mapHost).setView([-6.8,39.25],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);let marker=null;const setLocation=(latitude,longitude,label='Exact estate location selected')=>{form.elements.latitude.value=latitude;form.elements.longitude.value=longitude;if(marker)marker.setLatLng([latitude,longitude]);else{marker=L.marker([latitude,longitude],{draggable:true}).addTo(map);marker.on('dragend',()=>{const point=marker.getLatLng();setLocation(point.lat,point.lng)})}status.textContent=`${label} (${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)})`;status.classList.add('map-status-success')};map.on('click',event=>setLocation(event.latlng.lat,event.latlng.lng));setTimeout(()=>map.invalidateSize(),0);content.querySelector('#findListingLocation').onclick=async()=>{const address=[form.elements.addressLine1.value,form.elements.city.value].filter(Boolean).join(', '),button=content.querySelector('#findListingLocation');if(address.length<4){status.textContent='Enter an address and city first.';return}button.disabled=true;status.textContent='Searching OpenStreetMap…';try{const result=await apiJson(`/api/agent/geocode?address=${encodeURIComponent(address)}`),location=result.location;map.setView([location.latitude,location.longitude],17);setLocation(location.latitude,location.longitude,'Search result - click the map or drag the marker to pinpoint the estate')}catch(error){status.textContent=error.message;status.classList.remove('map-status-success')}finally{button.disabled=false}};form.addEventListener('submit',async e=>{e.preventDefault();try{if(!form.elements.latitude.value)throw new Error('Search and confirm the listing location on the map first.');const csrf=await apiJson('/api/auth/csrf');await apiJson('/api/agent/listings',{method:'POST',headers:{'X-CSRF-Token':csrf.token},body:new FormData(form)});closeModal();showToast('Listing submitted for moderation.');await openOwnAgentProfile()}catch(error){errorBox.textContent=error.message}})}
async function loadTenantBookings(){const result=await apiJson('/api/account/bookings');const statusLabel={pending:'Request sent — awaiting agent review',payment_pending:'Payment pending',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled',completed:'Completed'};openModal(`<p class="eyebrow">Tenant workspace</p><h2>My bookings</h2><p class="search-note">Your booking requests and their latest status are loaded directly from Makazi Go. Agents review pending requests and you will be notified when they decide.</p>${result.bookings.length?result.bookings.map(booking=>`<div class="feature-list booking-card"><div><b class="booking-status ${escapeHtml(booking.status)}">${escapeHtml(statusLabel[booking.status]||booking.status.replaceAll('_',' '))}</b><span><strong>${escapeHtml(booking.title)}</strong><small>${escapeHtml(booking.check_in)} to ${escapeHtml(booking.check_out)} · ${escapeHtml(booking.currency)} ${escapeHtml(booking.total_amount)} · Booking ${escapeHtml(booking.booking_code)}</small></span>${['pending','confirmed'].includes(booking.status)?`<button class="outline-btn" data-reschedule-booking="${booking.id}">Reschedule</button>`:''}${booking.status==='completed'?`<button class="outline-btn" data-review-booking="${booking.id}" data-listing-id="${booking.listing_id}">Review</button>`:''}${['pending','payment_pending','confirmed'].includes(booking.status)?`<button class="outline-btn" data-cancel-booking="${booking.id}">Cancel request</button>`:''}</div></div>`).join(''):'<p class="empty-copy">You have no bookings yet. Search for a published home to send a request.</p>'}`);content.querySelectorAll('[data-cancel-booking]').forEach(button=>button.onclick=async()=>{if(!window.confirm('Cancel this booking request?'))return;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/bookings/${button.dataset.cancelBooking}/cancel`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({reason:'Cancelled by tenant'})});showToast('Booking request cancelled');await loadTenantBookings()}catch(error){showToast(error.message)}});content.querySelectorAll('[data-reschedule-booking]').forEach(button=>button.onclick=()=>openRescheduleBooking(button.dataset.rescheduleBooking));content.querySelectorAll('[data-review-booking]').forEach(button=>button.onclick=()=>openBookingReview(button.dataset.reviewBooking,button.dataset.listingId))}
function openRescheduleBooking(id){openModal(`<p class="eyebrow">Booking change</p><h2>Reschedule request</h2><form id="rescheduleForm"><label>New check-in<input name="checkIn" type="date" required></label><label>New check-out<input name="checkOut" type="date" required></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Request new dates</button></form>`);content.querySelector('#rescheduleForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/bookings/${id}/reschedule`,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({checkIn:form.elements.checkIn.value,checkOut:form.elements.checkOut.value})});closeModal();showToast('Reschedule request sent');await loadTenantBookings()}catch(error){form.querySelector('.form-error').textContent=error.message}}}
function openBookingReview(bookingId,listingId){openModal(`<p class="eyebrow">Makazi Go review</p><h2>Rate your stay</h2><form id="bookingReviewForm"><label>Rating<select name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><label>Review<textarea name="comment" maxlength="5000" required></textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Publish review</button></form>`);content.querySelector('#bookingReviewForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/listings/${listingId}/reviews`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({bookingId,rating:Number(form.elements.rating.value),comment:form.elements.comment.value})});closeModal();showToast('Thank you for your review')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function loadAgentBookings(){const result=await apiJson('/api/agent/bookings');openModal(`<p class="eyebrow">Agent workspace</p><h2>Booking requests</h2>${result.bookings.length?result.bookings.map(booking=>`<div class="booking-request"><div><strong>${booking.title}</strong><small>${booking.firstName} ${booking.lastName} · ${booking.email||booking.phone||'Contact available in profile'}<br>${booking.checkIn} to ${booking.checkOut} · ${booking.guests} guest(s) · ${booking.currency} ${booking.totalAmount}</small></div>${booking.status==='pending'?`<div class="booking-actions"><button class="primary" data-booking-decision="${booking.id}" data-status="confirmed">Approve</button><button class="outline-btn" data-booking-decision="${booking.id}" data-status="declined">Decline</button><button class="icon-btn" data-booking-message="${booking.tenantId}" data-name="${booking.firstName} ${booking.lastName}" aria-label="Message tenant">✉</button></div>`:`<span class="booking-status">${booking.status}</span>`}</div>`).join(''):'<p class="empty-copy">No booking requests yet.</p>'}`);content.querySelectorAll('[data-booking-decision]').forEach(button=>button.onclick=async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/bookings/${button.dataset.bookingDecision}/decision`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({status:button.dataset.status})});showToast(button.dataset.status==='confirmed'?'Booking approved and tenant notified':'Booking declined and tenant notified');loadAgentBookings()}catch(error){showToast(error.message)}});content.querySelectorAll('[data-booking-message]').forEach(button=>button.onclick=()=>openAgentMessage(button.dataset.bookingMessage,button.dataset.name))}
async function openMessages(){try{const result=await apiJson('/api/messages');openModal(`<p class="eyebrow">Makazi Go inbox</p><h2>Your messages</h2><p class="modal-intro">Continue conversations with tenants and agents from one secure inbox.</p><div class="message-list">${result.conversations.length?result.conversations.map(item=>`<button class="message-thread ${Number(item.unread)>0?'unread':''}" data-conversation-id="${item.conversationId}" data-recipient-id="${item.otherUserId}"><span><strong>${item.otherFirstName} ${item.otherLastName}</strong><small>${item.lastMessage||'No messages yet'}</small></span><time>${item.lastMessageAt?new Date(item.lastMessageAt).toLocaleString():''}</time></button>`).join(''):'<p class="empty-copy">Your inbox is empty. Open an agent profile to start a conversation.</p>'}</div>`);content.querySelectorAll('[data-conversation-id]').forEach(thread=>thread.addEventListener('click',()=>openConversation(thread.dataset.conversationId,thread.querySelector('strong').textContent,thread.dataset.recipientId)))}catch(error){showToast(error.message)}}
async function refreshMessageBadge(){
  const badge=document.querySelector('#messageBadge');
  if(!badge||!currentUser)return;
  try{
    const result=await apiJson('/api/messages/unread-count');
    badge.textContent=result.unread>99?'99+':String(result.unread||0);
    badge.hidden=!result.unread;
  }catch(error){console.warn('Message unread count unavailable:',error.message)}
}
async function openConversation(id,name='',recipientId=''){
  try{
    const result=await apiJson(`/api/messages/${id}`);
    const otherMessage=result.messages.find(message=>Number(message.senderId)!==Number(currentUser?.id));
    name=name||[otherMessage?.firstName,otherMessage?.lastName].filter(Boolean).join(' ')||'Makazi Go member';
    recipientId=recipientId||otherMessage?.senderId;
    openModal(`<p class="eyebrow">Conversation</p><h2>${escapeHtml(name)}</h2><p class="conversation-participants"><strong>From:</strong> ${escapeHtml(name)} <span>↔</span> <strong>To:</strong> ${escapeHtml(currentUser?.firstName||'You')} ${escapeHtml(currentUser?.lastName||'')}</p><div class="conversation-list">${result.messages.map(message=>`<div class="conversation-message ${Number(message.senderId)===Number(currentUser?.id)?'mine':''}"><p>${escapeHtml(message.body)}</p><small>${new Date(message.createdAt).toLocaleString()}</small></div>`).join('')}</div><form id="replyMessageForm"><textarea name="body" maxlength="2000" required placeholder="Write a reply to ${escapeHtml(name)}"></textarea><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">Send reply <span>→</span></button></form>`);
    void refreshMessageBadge();
    content.querySelector('#replyMessageForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget,button=form.querySelector('[type="submit"]');
      button.disabled=true;
      try{
        const csrf=(await apiJson('/api/auth/csrf')).token;
        await apiJson('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({recipientId:Number(recipientId),body:form.elements.body.value.trim()})});
        await openConversation(id,name,recipientId);
      }catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false}
    });
  }catch(error){showToast(`Conversation could not be loaded: ${error.message}`,'error')}
}
async function openBookingDetails(id){try{const result=await apiJson(`/api/bookings/${encodeURIComponent(id)}`),booking=result.booking;openModal(`<p class="eyebrow">Booking request</p><h2>${escapeHtml(booking.title)}</h2><div class="feature-list"><div><b>${escapeHtml(booking.status)}</b><span><strong>${escapeHtml(booking.bookingCode)}</strong><small>${escapeHtml(booking.bookingKind||'stay')} · ${escapeHtml(booking.checkIn)} to ${escapeHtml(booking.checkOut)} · ${booking.guests} guest(s)<br>${escapeHtml(booking.city||'')} · ${escapeHtml(booking.addressLine1||'')}</small></span></div><div><b>Guest</b><span><strong>${escapeHtml(`${booking.firstName||''} ${booking.lastName||''}`.trim())}</strong><small>${escapeHtml(booking.email||booking.phone||'Contact through messages')}</small></span></div></div>${currentUser?.roles?.includes('agent')&&booking.status==='pending'?'<div class="booking-actions"><button class="primary" id="approveBooking">Approve</button><button class="outline-btn" id="declineBooking">Decline</button></div>':''}`);content.querySelector('#approveBooking')?.addEventListener('click',()=>decideBooking(booking.id,'confirmed'));content.querySelector('#declineBooking')?.addEventListener('click',()=>decideBooking(booking.id,'declined'))}catch(error){showToast(error.message)}}
async function decideBooking(id,status){try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/bookings/${id}/decision`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({status})});closeModal();showToast(status==='confirmed'?'Booking approved and tenant notified':'Booking declined and tenant notified');await loadAgentBookings()}catch(error){showToast(error.message)}}
async function openNotifications(){
  try{
    const result=await apiJson('/api/notifications');
    const notificationData=notification=>{
      try{return typeof notification.data==='string'?JSON.parse(notification.data):(notification.data||{})}
      catch{return {}}
    };
    const actionFor=notification=>{
      const data=notificationData(notification);
      if(String(notification.type||'').startsWith('booking_')||notification.type==='booking_request')return `<button class="outline-btn notification-action" data-booking-id="${Number(data.bookingId)||0}">View booking</button>`;
      if(notification.type==='new_message'&&Number(data.conversationId))return `<button class="outline-btn notification-action" data-open-conversation="${Number(data.conversationId)}">Open conversation</button>`;
      if(notification.type==='new_message')return '<button class="outline-btn notification-action" data-open-messages="true">Open inbox</button>';
      return '';
    };
    openModal(`<p class="eyebrow">Makazi Go updates</p><h2>Notifications</h2><p class="modal-intro">Important updates about your account, bookings, messages, and agent activity.</p><button class="primary small notification-messages" type="button">Open messages</button>${result.notifications.length?result.notifications.map(notification=>`<article class="notification-item ${notification.readAt?'':'unread'}"><strong>${escapeHtml(notification.title)}</strong><p>${escapeHtml(notification.body)}</p><small>${new Date(notification.createdAt).toLocaleString()}</small>${actionFor(notification)}</article>`).join(''):'<p class="empty-copy">You are all caught up. New updates will appear here.</p>'}`);
    content.querySelector('.notification-messages').onclick=openMessages;
    content.querySelectorAll('[data-open-messages]').forEach(button=>button.onclick=openMessages);
    content.querySelectorAll('[data-open-conversation]').forEach(button=>button.onclick=()=>openConversation(button.dataset.openConversation));
    content.querySelectorAll('[data-booking-id]').forEach(button=>button.onclick=()=>openBookingDetails(Number(button.dataset.bookingId)));
    if(result.unread){
      const csrf=(await apiJson('/api/auth/csrf')).token;
      await apiJson('/api/notifications/read',{method:'POST',headers:{'X-CSRF-Token':csrf}});
      const badge=document.querySelector('#notificationBadge');
      if(badge){badge.hidden=true;badge.textContent='0'}
    }
  }catch(error){showToast(`Notifications could not be loaded: ${error.message}`,'error')}
}
async function openTenantSavedSearches(){try{const result=await apiJson('/api/account/search-alerts');openModal(`<p class="eyebrow">Saved searches</p><h2>Search alerts</h2>${result.alerts.length?result.alerts.map(alert=>`<div class="feature-list"><div><span><strong>${escapeHtml(alert.name)}</strong><small>${escapeHtml(alert.frequency)} alerts · ${alert.active?'Active':'Paused'}</small></span><button class="outline-btn" data-delete-alert="${alert.id}">Remove</button></div></div>`).join(''):'<p class="empty-copy">No saved searches yet. Run a home search and save it to receive matching-listing notifications.</p>'}`);content.querySelectorAll('[data-delete-alert]').forEach(button=>button.onclick=async()=>{try{await apiJson(`/api/search-alerts/${button.dataset.deleteAlert}`,{method:'DELETE'});await openTenantSavedSearches()}catch(error){showToast(error.message)}})}catch(error){showToast(error.message)}}
async function openTenantSecurity(){openModal(`<p class="eyebrow">Account security</p><h2>Change password</h2><form id="changePasswordForm"><label>Current password<input name="currentPassword" type="password" required></label><label>New password<input name="password" type="password" minlength="12" required></label><label>Confirm new password<input name="confirmPassword" type="password" minlength="12" required></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Update password</button></form>`);content.querySelector('#changePasswordForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{if(form.elements.password.value!==form.elements.confirmPassword.value)throw new Error('Passwords do not match');const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/account/change-password',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({currentPassword:form.elements.currentPassword.value,password:form.elements.password.value})});closeModal();showToast('Password changed successfully')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function openTenantNotificationPreferences(){try{const result=await apiJson('/api/account/notification-preferences'),preferences=result.preferences;openModal(`<p class="eyebrow">Notifications</p><h2>Notification preferences</h2><form id="notificationPreferencesForm">${[['saved_searches','New listings matching saved searches'],['price_drops','Price drops on favorites'],['booking_updates','Booking status updates'],['messages','Messages from agents'],['followed_agents','New listings from followed agents'],['marketing','Makazi Go recommendations']].map(([key,label])=>`<label class="preference-row"><input type="checkbox" name="${key}" ${preferences[key]?'checked':''}> ${label}</label>`).join('')}<p class="form-error" role="alert"></p><button class="primary" type="submit">Save preferences</button></form>`);content.querySelector('#notificationPreferencesForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const body=Object.fromEntries([...form.querySelectorAll('input[type=checkbox]')].map(input=>[input.name,input.checked]));await apiJson('/api/account/notification-preferences',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});closeModal();showToast('Notification preferences saved')}catch(error){form.querySelector('.form-error').textContent=error.message}}}catch(error){showToast(error.message)}}
function openAccountDeletionRequest(){openModal(`<p class="eyebrow">Account access</p><h2>Request account deletion</h2><p>We will close your active session and send this request to the Makazi Go administration team for review.</p><form id="deleteAccountForm"><label>Confirm with your password<input name="password" type="password" autocomplete="current-password" required></label><label>Reason (optional)<textarea name="reason" maxlength="500"></textarea></label><p class="form-error" role="alert"></p><button class="primary danger" type="submit">Submit deletion request</button></form>`);content.querySelector('#deleteAccountForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({password:form.elements.password.value,reason:form.elements.reason.value})});currentUser=null;sessionStorage.removeItem('stayNest.tabUser');closeModal();showToast('Deletion request submitted. You have been signed out.');setTimeout(()=>location.assign('/'),500)}catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false}}}
async function openSettings(){const me=(await apiJson('/api/auth/me')).user;if(me?.roles?.includes('agent')){try{return await openAgentSettings()}catch(error){showToast(`Agent settings could not be loaded: ${error.message}`);return}}openModal(`<p class="eyebrow">Account settings</p><h2>Your Makazi Go settings</h2><p>Manage your tenant profile, notifications, and account access.</p><div class="settings-list"><button class="outline-btn" id="languageSetting">Language: English</button>${me?.roles?.includes('agent')?'':''}<button class="outline-btn" id="tenantProfileSetting">Edit profile and photo</button><button class="outline-btn" id="tenantNotificationsSetting">Notification center</button><button class="outline-btn" id="tenantNotificationPreferences">Notification preferences</button><button class="outline-btn" id="tenantBookingsSetting">Booking history and status</button><button class="outline-btn" id="tenantSearchesSetting">Saved searches</button><button class="outline-btn" id="tenantSecuritySetting">Change password</button><button class="outline-btn danger" id="tenantDeleteSetting">Delete account</button></div>`);content.querySelector('#languageSetting').onclick=null;content.querySelector('#switchAgentRole')?.addEventListener('click',async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/auth/active-role',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({role:'agent'})});closeModal();await updateAuthControls((await apiJson('/api/auth/me')).user);await openOwnAgentProfile()}catch(error){showToast(error.message)}});content.querySelector('#tenantProfileSetting').onclick=async()=>{try{const result=await apiJson('/api/tenant/profile');openTenantProfileEditor(result.profile)}catch(error){showToast(`Profile editor could not be loaded: ${error.message}`)}};content.querySelector('#tenantNotificationsSetting').onclick=openNotifications;content.querySelector('#tenantNotificationPreferences').onclick=openTenantNotificationPreferences;content.querySelector('#tenantBookingsSetting').onclick=loadTenantBookings;content.querySelector('#tenantSearchesSetting').onclick=openTenantSavedSearches;content.querySelector('#tenantSecuritySetting').onclick=openTenantSecurity;content.querySelector('#tenantDeleteSetting').onclick=openTenantDeleteAccount}
async function openAgentSettings(){
  const result=await apiJson('/api/agent/settings');
  const isMain=!result.currentUser.isSubAgent;
  const accountDeletionButton='<button class="outline-btn danger" id="agentDeleteSetting">Delete account</button>';
  const settings=isMain
    ? `<div class="settings-list"><button class="outline-btn" id="languageSetting">Language: English</button><button class="outline-btn" id="agentProfileSetting">Edit public profile</button><button class="outline-btn" id="agentBookingsSetting">Booking requests</button><button class="primary" id="agentSubagentSetting">Add and manage sub-agents</button>${accountDeletionButton}</div><div class="subagent-list">${result.subagents.length?result.subagents.map(agent=>`<div class="subagent-row"><span><strong>${escapeHtml(agent.label)}</strong><small>${escapeHtml(`${agent.firstName} ${agent.lastName} · ${agent.email} · ${agent.status}`)}</small></span><button class="outline-btn" data-edit-subagent="${agent.id}">Access</button></div>`).join(''):'<p class="empty-copy">No sub-agents have been created yet.</p>'}</div>`
    : `<div class="access-summary"><strong>${escapeHtml(result.currentUser.accountLabel||'Sub-agent')}</strong><small>Allowed actions: ${escapeHtml(result.currentUser.permissions.join(', ')||'None')}</small></div><div class="settings-list">${accountDeletionButton}</div>`;
  openModal(`<p class="eyebrow">Agent settings</p><h2>${isMain?'Manage your agent account':'Your delegated access'}</h2><p>${isMain?'Control your profile, security, notifications, and remote sub-agent access.':'This account is labeled as a sub-agent. You can only use the permissions assigned by the main agent.'}</p>${settings}`);
  content.querySelector('#agentDeleteSetting').onclick=openAccountDeletionRequest;
  content.querySelector('#agentProfileSetting')?.addEventListener('click',async()=>{
    try{
      const profile=(await apiJson(`/api/agents/${result.currentUser.mainAgentId||result.currentUser.id}/profile`)).profile;
      openAgentProfileEditor(profile);
    }catch(error){showToast(`Profile editor could not be loaded: ${error.message}`)}
  });
  content.querySelector('#agentBookingsSetting')?.addEventListener('click',loadAgentBookings);
  content.querySelector('#agentSubagentSetting')?.addEventListener('click',()=>openSubagentEditor(result));
  content.querySelectorAll('[data-edit-subagent]').forEach(button=>button.onclick=()=>openSubagentAccessEditor(result,Number(button.dataset.editSubagent)));
}
function openSubagentEditor(settings){openModal(`<p class="eyebrow">Agent actions</p><h2>Add a sub-agent</h2><p>Sub-agents use their own secure login and can work remotely on this main account. Select at least one allowed action.</p><form id="subagentForm" enctype="multipart/form-data"><label>Account label</label><input name="label" placeholder="Nairobi bookings assistant" required><label>First name</label><input name="firstName" required><label>Last name</label><input name="lastName" required><label>Email</label><input name="email" type="email" required><label>Phone</label><input name="phone" type="tel"><label>Location</label><input name="location" placeholder="City or region"><label>Profile picture</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>Password</label><input name="password" type="password" minlength="12" required><fieldset class="permission-grid"><legend>Allowed roles and actions</legend>${settings.permissions.map(permission=>`<label><input type="checkbox" name="permission" value="${permission.key}"> ${permission.label}</label>`).join('')}</fieldset><p class="form-error" role="alert"></p><button class="primary" type="submit">Create sub-agent</button></form>`);content.querySelector('#subagentForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,selected=[...form.querySelectorAll('[name="permission"]:checked')].map(input=>input.value),errorNode=form.querySelector('.form-error'),button=form.querySelector('button[type="submit"]');if(!selected.length){errorNode.textContent='Choose at least one action before creating this sub-agent';return}button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;const data=new FormData(form);data.set('permissions',JSON.stringify(selected));const result=await apiJson('/api/agent/subagents',{method:'POST',headers:{'X-CSRF-Token':csrf},body:data});closeModal();openModal(`<p class="eyebrow">Sub-agent created</p><h2>${result.label} is ready</h2><p>${result.message}</p><div class="feature-list"><div><b>Login email</b><span>${result.email}<small>The password is known only to the sub-agent and is not shown here.</small></span></div><div><b>Access granted</b><span>${result.permissionLabels.join(' · ')}</span></div></div><p class="search-note">The new sub-agent has received a Makazi Go notification with their sign-in email and assigned actions. Share the password securely; it is never displayed here.</p><button class="primary" id="viewSubagents">View sub-agents <span>→</span></button>`);content.querySelector('#viewSubagents').onclick=()=>openAgentSettings()}catch(error){errorNode.textContent=error.message;button.disabled=false}}}
function openSubagentAccessEditor(settings,id){const agent=settings.subagents.find(item=>item.id===id);if(!agent)return;openModal(`<p class="eyebrow">Agent actions</p><h2>${agent.label}</h2><p>Check or uncheck the actions this sub-agent may perform. At least one action is required.</p><form id="accessForm"><fieldset class="permission-grid">${settings.permissions.map(permission=>`<label><input type="checkbox" name="permission" value="${permission.key}" ${agent.permissions.includes(permission.key)?'checked':''}> ${permission.label}</label>`).join('')}</fieldset><label>Status</label><select name="status"><option value="active" ${agent.status==='active'?'selected':''}>Active</option><option value="suspended" ${agent.status==='suspended'?'selected':''}>Suspended</option><option value="revoked" ${agent.status==='revoked'?'selected':''}>Revoked</option></select><p class="form-error" role="alert"></p><button class="primary" type="submit">Save access</button></form>`);content.querySelector('#accessForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,permissions=[...form.querySelectorAll('[name="permission"]:checked')].map(input=>input.value),errorNode=form.querySelector('.form-error');if(!permissions.length){errorNode.textContent='A sub-agent must retain at least one permission';return}try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/subagents/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({permissions,status:form.elements.status.value})});closeModal();showToast('Sub-agent access updated');await openAgentSettings()}catch(error){errorNode.textContent=error.message}}}
async function openDiscover(){try{const [result,live]=await Promise.all([apiJson('/api/agents'),apiJson('/api/marketplace/live')]);openModal(`<div class="agent-marketplace"><div class="agent-marketplace-head"><div><p class="eyebrow">Makazi Go agent marketplace</p><h2>Find a trusted agent</h2><p class="search-note">Browse active agents ranked by followers, published homes, ratings, and engagement. Green dots show agents recently active.</p></div><span class="status-pill">${result.agents.length} available</span></div><div class="agent-directory">${result.agents.length?result.agents.map(agent=>`<button class="search-result agent-directory-item" data-agent-id="${agent.id}">${agentAvatar(agent.profileImageUrl,agent.badgeLabel,`${agent.firstName} ${agent.lastName}`)}<span><strong>${agent.firstName} ${agent.lastName}${agent.badgeLabel?` ${agentBadge(agent.badgeLabel)}`:''} ${agent.online?'<i class="presence-dot" title="Recently active"></i>':''}</strong><small>${agent.city||''} · ${agent.bio||'Makazi Go property professional'} · ${agent.listings} homes · ★ ${Number(agent.rating).toFixed(1)} · ${agent.followers||0} followers</small></span><em>#${result.agents.indexOf(agent)+1}</em></button>`).join(''):'<p class="empty-copy">No active agents are available yet.</p>'}</div>${live.listings.length?`<div class="live-activity"><div class="agent-page-toolbar"><h3>Trending homes</h3><span>Updated just now</span></div>${live.listings.slice(0,5).map(listing=>`<div class="live-activity-item">${avatarMarkup(listing.profileImageUrl,listing.firstName)}<span><strong>${escapeHtml(listing.title)}</strong><small>${escapeHtml(listing.city)} · ${listing.online?'Agent recently active':'New activity'} · ${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||'Contact agent'}</small></span></div>`).join('')}</div>`:''}</div>`);content.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>{closeModal();openAgentProfile(button.dataset.agentId,false)})}catch(error){if(error.message.includes('401')){auth('login')}else showToast(error.message)}}
async function legacyUpdateAuthControls(user){currentUser=user||null;document.body.classList.toggle('agent-marketplace-view',Boolean(user?.roles?.includes('agent')));document.querySelector('.impersonation-banner')?.remove();if(user?.impersonating){const banner=document.createElement('div');banner.className='impersonation-banner';banner.innerHTML='<span>You are viewing Makazi Go as another user.</span><button type="button">Return to admin</button>';banner.querySelector('button').onclick=async()=>{try{await apiJson('/api/admin/impersonation/stop',{method:'POST',headers:{'X-CSRF-Token':(await apiJson('/api/auth/csrf')).token}});location.href='/admin.html'}catch(error){showToast(error.message)}};document.body.prepend(banner)}const login=document.querySelector('[data-auth-control="login"]'),signup=document.querySelector('[data-auth-control="signup"]'),agentButton=document.querySelector('#agentProfileControl'),agentAvatar=document.querySelector('#agentProfileAvatar'),agentName=document.querySelector('#agentProfileName'),tenantButton=document.querySelector('#tenantProfileControl'),tenantAvatar=document.querySelector('#tenantProfileAvatar'),tenantName=document.querySelector('#tenantProfileName'),notificationButton=document.querySelector('#notificationControl'),notificationBadge=document.querySelector('#notificationBadge'),settingsButton=document.querySelector('#settingsControl');if(!login||!signup)return;if(user){login.textContent='Sign out';login.setAttribute('aria-label','Sign out of Makazi Go');login.dataset.authAction='logout';signup.hidden=true;notificationButton.hidden=false;notificationButton.onclick=openNotifications;settingsButton.hidden=false;settingsButton.onclick=openSettings;const refreshNotifications=async()=>{try{const notifications=await apiJson('/api/notifications');notificationBadge.textContent=notifications.unread>99?'99+':notifications.unread;notificationBadge.hidden=!notifications.unread}catch(error){console.warn('Notifications unavailable:',error.message)}};await refreshNotifications();clearInterval(window.stayNestNotificationTimer);window.stayNestNotificationTimer=setInterval(refreshNotifications,15000);login.onclick=async()=>{try{const csrf=await apiJson('/api/auth/csrf');await apiJson('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf.token}});clearInterval(window.stayNestNotificationTimer);location.reload()}catch(error){showToast(error.message)}};if(agentButton)agentButton.hidden=!user.roles?.includes('agent');if(tenantButton)tenantButton.hidden=!user.roles?.includes('tenant');if(user.roles?.includes('agent')&&agentButton){agentName.textContent=user.isSubAgent?`${user.firstName||'Agent'} · ${user.accountLabel||'Sub-agent'}`:user.firstName||'Agent';agentAvatar.src=DEFAULT_AGENT_AVATAR;agentButton.setAttribute('data-profile-role','agent');agentButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('agent')};try{const profile=(await apiJson(`/api/agents/${user.mainAgentId||user.id}/profile`)).profile;agentAvatar.src=profile.profileImageUrl||profile.avatarUrl||DEFAULT_AGENT_AVATAR}catch(error){console.warn('Agent profile details unavailable:',error.message)}}if(user.roles?.includes('tenant')&&tenantButton){tenantName.textContent=user.firstName||'Tenant';tenantAvatar.src=DEFAULT_AGENT_AVATAR;tenantButton.setAttribute('data-profile-role','tenant');tenantButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('tenant')};try{const profile=(await apiJson('/api/tenant/profile')).profile;tenantAvatar.src=profile.avatarUrl||DEFAULT_AGENT_AVATAR;tenantName.textContent=profile.firstName||user.firstName||'Tenant'}catch(error){console.warn('Tenant profile details unavailable:',error.message)}}if(!user.roles?.includes('agent')&&!user.roles?.includes('tenant')&&tenantButton){tenantButton.hidden=false;tenantName.textContent=user.firstName||'Account';tenantAvatar.src=DEFAULT_AGENT_AVATAR;tenantButton.setAttribute('data-profile-role','tenant');tenantButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('tenant')}}else{clearInterval(window.stayNestNotificationTimer);login.textContent='Log in';login.setAttribute('aria-label','Log in to Makazi Go');signup.hidden=false;notificationButton.hidden=true;settingsButton.hidden=true;login.dataset.authAction='login';login.onclick=()=>auth('login');signup.onclick=()=>auth('signup');if(agentButton)agentButton.hidden=true;if(tenantButton)tenantButton.hidden=true}}}
document.addEventListener('click',event=>{const button=event.target.closest('[data-profile-role]');if(button){event.preventDefault();event.stopImmediatePropagation();openOwnProfile(button.dataset.profileRole).catch(error=>showToast(`Profile could not be opened: ${error.message}`));return}if(event.target.closest('#languageSetting'))openModal('<p class="eyebrow">Language</p><h2>Choose your language</h2><p>Makazi Go currently supports English. More languages can be added from this setting as the service grows.</p><button class="primary" id="closeLanguageSetting">Continue in English</button>');if(event.target.closest('#switchTenantRole'))(async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/auth/active-role',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({role:'tenant'})});closeModal();await updateAuthControls((await apiJson('/api/auth/me')).user);await openOwnTenantProfile()}catch(error){showToast(error.message)}})()},true);
apiJson('/api/auth/me').then(({user})=>{if(user?.roles?.includes('administrator')){document.querySelector('#agentProfileControl')?.setAttribute('hidden','');document.querySelector('#tenantProfileControl')?.setAttribute('hidden','')}}).catch(error=>console.warn('Makazi Go header role check unavailable:',error.message));
async function updateAuthControls(user){
  const renderVersion=(window.stayNestAuthRenderVersion||0)+1;
  window.stayNestAuthRenderVersion=renderVersion;
  currentUser=user||null;
  document.body.classList.toggle('guest-view',!user);
  document.body.classList.toggle('agent-marketplace-view',Boolean(user?.roles?.includes('agent')));
  const login=document.querySelector('[data-auth-control="login"]');
  const signup=document.querySelector('[data-auth-control="signup"]');
  const agentButton=document.querySelector('#agentProfileControl');
  const agentAvatar=document.querySelector('#agentProfileAvatar');
  const agentName=document.querySelector('#agentProfileName');
  const tenantButton=document.querySelector('#tenantProfileControl');
  const tenantAvatar=document.querySelector('#tenantProfileAvatar');
  const tenantName=document.querySelector('#tenantProfileName');
  const notificationButton=document.querySelector('#notificationControl');
  const notificationBadge=document.querySelector('#notificationBadge');
  const messageButton=document.querySelector('#messageControl');
  const messageBadge=document.querySelector('#messageBadge');
  const settingsButton=document.querySelector('#settingsControl');
  const postsNav=document.querySelector('#postsNav');
  const searchType=document.querySelector('#searchType');
  const tenantSearchOption=document.querySelector('#searchType option[value="tenant"]');
  if(!login||!signup)return;
  const resetProfileControl=(button)=>{
    if(!button)return;
    button.hidden=true;
    button.removeAttribute('data-profile-role');
    button.onclick=null;
  };
  if(!user){
    if(postsNav)postsNav.hidden=true;
    if(tenantSearchOption){tenantSearchOption.hidden=true;if(searchType.value==='tenant'){searchType.value='estate';searchType.dispatchEvent(new Event('change'))}}
    clearInterval(window.stayNestNotificationTimer);
    clearInterval(window.stayNestPresenceTimer);
    clearInterval(window.stayNestAttentionTimer);
    login.hidden=false;login.textContent='Log in';login.setAttribute('aria-label','Log in to Makazi Go');login.dataset.authAction='login';login.onclick=()=>auth('login');
    signup.hidden=false;signup.onclick=()=>auth('signup');
    notificationButton.hidden=true;settingsButton.hidden=true;
    if(messageButton)messageButton.hidden=true;
    notificationButton.onclick=null;settingsButton.onclick=null;
    notificationBadge.hidden=true;notificationBadge.textContent='0';
    resetProfileControl(agentButton);resetProfileControl(tenantButton);
    return;
  }
  login.hidden=false;login.textContent='Sign out';login.setAttribute('aria-label','Sign out of Makazi Go');login.dataset.authAction='logout';signup.hidden=true;
  if(postsNav)postsNav.hidden=false;login.setAttribute('aria-label','Sign out of Makazi Go');login.dataset.authAction='logout';signup.hidden=true;
  const roles=Array.isArray(user.roles)?user.roles:[];
  const activeRole=roles.includes(user.activeRole)?user.activeRole:roles.includes('agent')?'agent':'tenant';
  resetProfileControl(agentButton);resetProfileControl(tenantButton);
  if(agentButton)agentButton.hidden=activeRole!=='agent';
  if(tenantButton)tenantButton.hidden=activeRole!=='tenant';
  if(roles.includes('agent')&&agentButton){
    agentButton.dataset.profileRole='agent';
    agentButton.onclick=()=>openOwnProfile('agent').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    agentName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Agent';
    agentAvatar.src=cacheBustUrl(user.profileImageUrl||user.avatarUrl)||DEFAULT_AGENT_AVATAR;
  }
  if(roles.includes('tenant')&&tenantButton){
    tenantButton.dataset.profileRole='tenant';
    tenantButton.onclick=()=>openOwnProfile('tenant').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    tenantName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Tenant';
    tenantAvatar.src=cacheBustUrl(user.profileImageUrl||user.avatarUrl)||DEFAULT_AGENT_AVATAR;
  }
  notificationButton.hidden=false;notificationButton.onclick=openNotifications;
  if(messageButton){messageButton.hidden=false;messageButton.onclick=openMessages}
  settingsButton.hidden=false;settingsButton.onclick=()=>openSettings().catch(error=>showToast(`Settings could not be opened: ${error.message}`));
  const refreshNotifications=async()=>{try{const notifications=await apiJson('/api/notifications');if(renderVersion!==window.stayNestAuthRenderVersion)return;notificationBadge.textContent=notifications.unread>99?'99+':notifications.unread;notificationBadge.hidden=!notifications.unread}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Notifications unavailable:',error.message)}};
  const refreshMessages=async()=>{try{const messages=await apiJson('/api/messages/unread-count');if(renderVersion!==window.stayNestAuthRenderVersion)return;if(messageBadge){messageBadge.textContent=messages.unread>99?'99+':messages.unread;messageBadge.hidden=!messages.unread}}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Messages unavailable:',error.message)}};
  await Promise.all([refreshNotifications(),refreshMessages()]);clearInterval(window.stayNestNotificationTimer);window.stayNestNotificationTimer=setInterval(()=>{refreshNotifications();refreshMessages()},15000);
  clearInterval(window.stayNestPresenceTimer);window.stayNestPresenceTimer=setInterval(()=>apiJson('/api/presence/ping',{method:'POST'}).catch(()=>{}),60000);
  clearInterval(window.stayNestAttentionTimer);
  if(roles.includes('agent')){const refreshAttention=async()=>{try{const result=await apiJson('/api/agent/attention');const pending=Number(result.attention?.pendingBookings||0)+Number(result.attention?.listingActions||0)+Number(result.attention?.pendingVerification||0);if(pending>0)document.body.dataset.attentionCount=String(pending);else delete document.body.dataset.attentionCount}catch(error){console.warn('Agent attention refresh unavailable:',error.message)}};await refreshAttention();window.stayNestAttentionTimer=setInterval(refreshAttention,30000)}
  login.onclick=async()=>{try{login.disabled=true;await apiJson('/api/auth/logout',{method:'POST'});sessionStorage.removeItem('stayNest.tabUser');clearInterval(window.stayNestNotificationTimer);currentUser=null;await updateAuthControls(null);showToast('You have been signed out safely.');setTimeout(()=>location.replace('/index.html'),700)}catch(error){login.disabled=false;showToast(error.message,'error')}};
  if(tenantSearchOption){tenantSearchOption.hidden=activeRole!=='agent';if(tenantSearchOption.hidden&&searchType.value==='tenant'){searchType.value='estate';searchType.dispatchEvent(new Event('change'))}}
  resetProfileControl(agentButton);resetProfileControl(tenantButton);
  if(agentButton)agentButton.hidden=activeRole!=='agent';
  if(tenantButton)tenantButton.hidden=activeRole!=='tenant';
  if(roles.includes('agent')&&agentButton){
    agentButton.dataset.profileRole='agent';agentButton.onclick=()=>openOwnProfile('agent').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    agentName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Agent';agentAvatar.src=cacheBustUrl(user.profileImageUrl||user.avatarUrl)||DEFAULT_AGENT_AVATAR;
    try{const profile=(await apiJson(`/api/agents/${user.mainAgentId||user.id}/profile`)).profile;if(renderVersion!==window.stayNestAuthRenderVersion)return;agentAvatar.src=mediaUrl(profile.profileImageUrl||profile.avatarUrl||agentAvatar.src);agentName.textContent=[profile.firstName,profile.lastName].filter(Boolean).join(' ')||agentName.textContent}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Agent profile details unavailable:',error.message)}
  }
  if(roles.includes('tenant')&&tenantButton){
    tenantButton.dataset.profileRole='tenant';tenantButton.onclick=()=>openOwnProfile('tenant').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    tenantName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Tenant';tenantAvatar.src=cacheBustUrl(user.profileImageUrl||user.avatarUrl)||DEFAULT_AGENT_AVATAR;
    try{const profile=(await apiJson('/api/tenant/profile')).profile;if(renderVersion!==window.stayNestAuthRenderVersion)return;tenantAvatar.src=mediaUrl(profile.avatarUrl||tenantAvatar.src);tenantName.textContent=[profile.firstName,profile.lastName].filter(Boolean).join(' ')||tenantName.textContent}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Tenant profile details unavailable:',error.message)}
  }
  if(roles.includes('administrator')){if(agentButton)agentButton.hidden=true;if(tenantButton)tenantButton.hidden=true}
}
async function startHosting(){try{const user=currentUser||(await apiJson('/api/auth/me')).user;if(user?.roles?.includes('agent'))return openAgentListingForm();if(user?.roles?.includes('tenant'))return showHostApproval();if(user)return showHostApproval();auth('host')}catch(error){if(currentUser?.roles?.includes('agent'))return openAgentListingForm();auth('host')}}
document.querySelectorAll('.menu').forEach(mobileMenu=>mobileMenu.addEventListener('click',()=>{
  const isOpen=document.body.classList.toggle('mobile-nav-open');
  document.querySelectorAll('.menu').forEach(menu=>menu.setAttribute('aria-expanded',String(isOpen)));
}));
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>b.dataset.open==='host'?startHosting():auth(b.dataset.open)));document.querySelector('#modalClose').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal()});document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.chip.active').classList.remove('active');b.classList.add('active');render(b.dataset.filter)}));document.querySelector('#viewAll').addEventListener('click',()=>{document.querySelector('[data-filter="all"]').click()});render();
document.querySelector('#discoverAction').addEventListener('click',openDiscover);
function searchLabel(type){return {estate:'Homes',location:'Homes near',price:'Homes under',agent:'Agents',tenant:'Tenants'}[type]||'Search results'}
async function runSearch(){const input=document.querySelector('#locationInput'),type=document.querySelector('#searchType').value,query=input.value.trim();const valid=type==='price'?/^\$?\s*\d[\d,\s]*(\.\d+)?$/.test(query):query.length>=2;if(!valid){showToast(type==='price'?'Enter a maximum price, such as 1200':'Enter at least two characters to search');input.focus();return}if(['estate','location','price'].includes(type)){const normalized=query.toLowerCase().replace(/[tzs$,\s]/g,'');const matches=currentListings.filter(item=>{const text=[item.title,item.city,item.neighborhood,item.propertyType].join(' ').toLowerCase();return type==='price'?Number(item.nightlyPrice||item.monthlyPrice||item.yearlyPrice)<=Number(normalized):text.includes(query.toLowerCase())});openModal(`<p class="eyebrow">Makazi Go search</p><h2>${matches.length?`${searchLabel(type)} “${escapeHtml(query)}”`:'No homes found'}</h2>${matches.length?matches.map(item=>`<button class="search-result" data-demo-listing="${escapeHtml(item.id)}"><img src="${safeMediaUrl(item.coverUrl)}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city)} · ${item.currency} ${Number(item.nightlyPrice||item.monthlyPrice||item.yearlyPrice).toLocaleString()} · ${item.bedrooms} bedrooms</small></span></button>`).join(''):'<p class="empty-copy">Try another neighborhood, city, or price range. Makazi Go will show matching published homes here.</p>'}`);content.querySelectorAll('[data-demo-listing]').forEach(button=>button.onclick=()=>{closeModal();void openListingDetails({id:button.dataset.demoListing})});return}try{const result=await apiJson(`/api/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}`);if(type==='agent'){openModal(`<p class="eyebrow">People</p><h2>${searchLabel(type)} matching “${query}”</h2><p class="search-note">Sorted by relevance, active listings, ratings, trusted engagement, and delegated account labels.</p>${result.agents.length?result.agents.map(agent=>`<button class="search-result" data-agent-id="${agent.id}"><img src="${safeMediaUrl(agent.profileImageUrl)}" alt=""><span><strong>${agent.firstName} ${agent.lastName}${agent.badgeLabel?` ${agentBadge(agent.badgeLabel)}`:''}</strong><small>${agent.agencyName?`${agent.agencyName} · `:''}${agent.subagentLabel?`Sub-agent · ${agent.subagentLabel}`:(agent.bio||'Makazi Go agent')} · ${agent.followers||0} followers</small></span></button>`).join(''):'<p class="empty-copy">No agents or sub-agents matched that search. Try a full name, account label, or part of their bio.</p>'}`);content.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>{closeModal();openAgentProfile(button.dataset.agentId,false)})}else if(type==='tenant'){openModal(`<p class="eyebrow">People</p><h2>${searchLabel(type)} matching “${query}”</h2><p class="search-note">Tenant discovery is private to agent accounts.</p>${result.tenants.length?result.tenants.map(tenant=>`<div class="search-result">${avatarMarkup(tenant.avatarUrl,`${tenant.firstName} ${tenant.lastName}`)}<span><strong>${tenant.firstName} ${tenant.lastName}</strong><small>${tenant.city||'Registered Makazi Go tenant'}</small></span></div>`).join(''):'<p class="empty-copy">No tenants matched that name.</p>'}`)}else{openModal(`<p class="eyebrow">Makazi Go search</p><h2>${type==='price'?`${searchLabel(type)} ${query.replace(/[$,\s]/g,'')}`:`${searchLabel(type)} “${query}”`}</h2><p class="search-note">Ranked by relevance, location, freshness, ratings, saves, views, and likes.</p>${result.listings.length?result.listings.map(listing=>`<button class="search-result listing-result" data-listing='${JSON.stringify(listing).replace(/'/g,'&#39;')}'><img src="${listing.coverUrl||DEFAULT_AGENT_AVATAR}" alt=""><span><strong>${listing.title}</strong><small>${listing.city} · ${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent'} · ${listing.rating?`★ ${listing.rating}`:'New listing'}</small></span></button>`).join(''):'<p class="empty-copy">No published homes matched. Try a nearby location, property type, or a higher price.</p>'}`);content.querySelectorAll('[data-listing]').forEach(button=>button.onclick=()=>{const listing=JSON.parse(button.dataset.listing);closeModal();openListing({...listing,title:listing.title,location:listing.city,price:`${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent'}`,rating:listing.rating||'New',reviews:listing.reviewCount||0,image:listing.coverUrl||DEFAULT_AGENT_AVATAR,tag:'Search result'})})}}catch(error){showToast(error.message)}}
let homeSearchTimer;
let homeSearchController;
runSearch=async()=>{
  clearTimeout(homeSearchTimer);
  homeListingController?.abort();
  homeSearchController?.abort();
  const controller=new AbortController();
  homeSearchController=controller;
  const params=new URLSearchParams();
  const propertyType=document.querySelector('#searchType').value;
  const query=document.querySelector('#locationInput').value.trim().replace(/\s+/g,' ');
  const rentalMode=document.querySelector('#dateInput').value;
  if(propertyType)params.set('propertyType',propertyType);
  if(query)params.set('q',query);
  if(rentalMode)params.set('rentalMode',rentalMode);
  const url=new URL(location.href);
  for(const name of ['q','propertyType','rentalMode'])url.searchParams.delete(name);
  for(const [name,value] of params)url.searchParams.set(name,value);
  history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  grid.setAttribute('aria-live','polite');
  grid.innerHTML='<div class="feed-empty" role="status">Finding matching homes...</div>';
  try{
    const result=await apiJson(`/api/listings/discover?${params}`,{signal:controller.signal});
    if(controller.signal.aborted)return;
    currentListings=Array.isArray(result.listings)?result.listings:[];
    document.querySelector('.chip.active')?.classList.remove('active');
    document.querySelector('.chip[data-filter="all"]')?.classList.add('active');
    render('all');
  }catch(error){
    if(error.name==='AbortError')return;
    currentListings=[];
    render('all');
    showToast(error.message,'error');
  }
};
const scheduleHomeSearch=()=>{clearTimeout(homeSearchTimer);homeListingController?.abort();homeSearchTimer=setTimeout(()=>void runSearch(),260)};
document.querySelector('#searchBtn').onclick=()=>void runSearch();
document.querySelector('#locationInput').addEventListener('input',scheduleHomeSearch);
document.querySelector('#locationInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void runSearch()}});
document.querySelector('#searchType').addEventListener('change',()=>void runSearch());
document.querySelector('#dateInput').addEventListener('change',()=>void runSearch());
document.querySelector('#exploreAgentsNav')?.addEventListener('click',event=>{event.preventDefault();openDiscover()});
document.querySelector('#searchType').addEventListener('change',()=>{document.querySelector('#locationInput').placeholder='City, neighbourhood, or property name'});
updatePersonalGreeting(null);const requestedParams=new URLSearchParams(location.search),requestedAgentId=requestedParams.get('agent'),requestedView=requestedParams.get('view'),requestedListingId=requestedParams.get('listing'),requestedMessageAgent=requestedParams.get('messageAgent'),requestedBook=requestedParams.get('book')==='1',requestedAuth=requestedParams.get('auth'),requestedDiscover=requestedParams.get('discover')==='1'||location.pathname==='/explore';loadListings();(sharedListingLink?Promise.resolve({user:null,sharedLinkGuest:true}):apiJson("/api/auth/me"))
  .then(async (result) => {
    updatePersonalGreeting(result.user);
    if (result.user) {
      sessionStorage.setItem(
        'stayNest.tabUser',
        JSON.stringify({ id: result.user.id, roles: result.user.roles || [] }),
      );
    } else {
      sessionStorage.removeItem('stayNest.tabUser');
    }
    await updateAuthControls(
      result.user
        ? { ...result.user, impersonating: result.impersonating }
        : null,
    );
    if(!result.user&&!sharedListingLink&&!requestedAuth&&sessionStorage.getItem('stayNest.memberGateShown')!=='true'){
      sessionStorage.setItem('stayNest.memberGateShown','true');
      setTimeout(showMemberGate,0);
    }
    if (requestedAuth === "login" || requestedAuth === "signup") {
      auth(requestedAuth);
    } else if (requestedDiscover) {
      openDiscover();
    } else if (requestedBook && requestedListingId) {
      try {
        const listingResult=await apiJson(`/api/listings/${encodeURIComponent(requestedListingId)}/details`);
        openListing({...listingResult.listing,_booking:true});
      } catch(error) { showToast(error.message,'error'); }
    } else if (requestedMessageAgent) {
      openAgentMessage(requestedMessageAgent,'the agent');
    } else if (requestedListingId) {
      openListingDetails({ id: requestedListingId });
    } else if (requestedAgentId) {
      const viewer = result.user,
        ownsAgent = Boolean(
          viewer?.roles?.includes("agent") &&
          String(viewer.mainAgentId || viewer.id) === String(requestedAgentId),
        );
      openAgentProfile(requestedAgentId, ownsAgent).catch((error) =>
        showToast(error.message),
      );
    } else if (
      requestedView === "tenant" &&
      result.user?.roles?.includes("tenant")
    )
      openOwnTenantProfile().catch((error) => showToast(error.message));
  })
  .catch(() => {
    updateAuthControls(null);
    if (requestedAuth === "login" || requestedAuth === "signup")
      auth(requestedAuth);
    else if (requestedAgentId || requestedView || requestedListingId)
      requireAccount("view your Makazi Go profile");
  });

function initLegacyScrollSequence() {
  const section = document.querySelector(".sequence-section"),
    canvas = document.querySelector("#sequenceCanvas"),
    status = document.querySelector("#sequenceStatus"),
    progress = document.querySelector("#sequenceProgress");
  if (!section || !canvas) return;
  const context = canvas.getContext("2d", { alpha: false });
  const count = Number(section.dataset.frameCount) || 240,
    padding = Number(section.dataset.framePadding) || 3,
    path = section.dataset.framePath || "/assets/frame_",
    extension = section.dataset.frameExtension || ".jpg",
    frames = Array.from({ length: count }, (_, index) => {
      const image = new Image();
      image.decoding = "async";
      image.src = window.cloudinaryAssetUrl?.(`${path}${String(index + 1).padStart(padding, "0")}${extension}`) || `${path}${String(index + 1).padStart(padding, "0")}${extension}`;
      return image;
    });
  let loaded = 0,
    lastFrame = -1,
    pendingFrame = null,
    drawQueued = false,
    targetProgress = 0,
    displayProgress = 0,
    animationFrame = 0;
  const drawFrame = (index) => {
    const image = frames[index];
    if (!image || !image.complete || !image.naturalWidth) return;
    const width = canvas.clientWidth,
      height = canvas.clientHeight,
      dpr = Math.min(window.devicePixelRatio || 1, 2),
      pixelWidth = Math.round(width * dpr),
      pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
      ),
      drawWidth = image.naturalWidth * scale,
      drawHeight = image.naturalHeight * scale;
    context.fillStyle = "#10251f";
    context.fillRect(0, 0, width, height);
    context.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    lastFrame = index;
  };
  const queueFrame = (index) => {
    pendingFrame = index;
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      if (pendingFrame !== null) {
        drawFrame(pendingFrame);
        pendingFrame = null;
      }
    });
  };
  const animate = () => {
    const difference = targetProgress - displayProgress;
    displayProgress += difference * 0.18;
    if (Math.abs(difference) < 0.0005) displayProgress = targetProgress;
    const frameIndex = Math.min(
      count - 1,
      Math.round(displayProgress * (count - 1)),
    );
    if (frameIndex !== lastFrame) queueFrame(frameIndex);
    if (progress) progress.style.width = `${displayProgress * 100}%`;
    if (Math.abs(targetProgress - displayProgress) > 0.0005) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
    }
  };
  const requestAnimation = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  };
  const update = () => {
    const scrollDistance = Math.max(
      1,
      section.offsetHeight - window.innerHeight,
    );
    targetProgress = Math.max(
      0,
      Math.min(1, (window.scrollY - section.offsetTop) / scrollDistance),
    );
    requestAnimation();
  };
  const resize = () => {
    if (lastFrame >= 0) {
      lastFrame = -1;
      update();
    }
  };
  frames.forEach((image) =>
    image.addEventListener(
      "load",
      () => {
        loaded += 1;
        if (loaded === count) {
          status.textContent = "Scroll to explore";
          drawFrame(0);
        } else if (loaded % 24 === 0)
          status.textContent = `Loading visual tour… ${Math.round((loaded / count) * 100)}%`;
      },
      { once: true },
    ),
  );
  frames.forEach((image) =>
    image.addEventListener(
      "error",
      () => {
        status.textContent = "Some frames could not be loaded";
      },
      { once: true },
    ),
  );
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  update();
  if (frames[0].complete) drawFrame(0);
}
function initCinematicMotion() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const revealItems = document.querySelectorAll(
    ".cinema-section,.cinema-card,.listing-card,.split-image,.split-copy,.host-banner",
  );
  revealItems.forEach((item) => item.classList.add("reveal-on-scroll"));
  if (reduceMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );
    revealItems.forEach((item) => observer.observe(item));
  }
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (reduceMotion || event.pointerType === "touch") return;
      const rect = card.getBoundingClientRect(),
        x = (event.clientX - rect.left) / rect.width - 0.5,
        y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1100px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-5px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
  const track = document.querySelector("[data-smooth-track]");
  if (track && !reduceMotion)
    track.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault();
          track.scrollBy({ left: event.deltaY * 0.85, behavior: "smooth" });
        }
      },
      { passive: false },
    );
  const heroImage = document.querySelector(".hero-image");
  if (heroImage && !reduceMotion) {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const offset = Math.max(-20, Math.min(20, window.scrollY * 0.035));
          heroImage.style.transform = `translate3d(0,${offset}px,0) scale(1.015)`;
          ticking = false;
        });
      },
      { passive: true },
    );
  }
}
async function loadAgentShowcase() {
  const track = document.querySelector("[data-smooth-track]");
  if (!track) return;
  try {
    const result = await apiJson("/api/showcase/posts");
    const presentationPosts = (Array.isArray(result.posts) ? result.posts : []).filter(post => !/kado|burnette|phone store|best in town|estate$/i.test(`${post.firstName || ''} ${post.lastName || ''} ${post.title || ''}`));
    if (!presentationPosts.length) return;
    track.innerHTML = presentationPosts
      .map((post, index) => {
        const creator = post.subagentLabel
          ? `${post.firstName} ${post.lastName} · ${post.subagentLabel}`
          : `${post.firstName} ${post.lastName}`;
        const price = post.nightlyPrice
          ? `${post.currency} ${post.nightlyPrice} / night`
          : post.monthlyPrice
            ? `${post.currency} ${post.monthlyPrice} / month`
            : post.yearlyPrice
              ? `${post.currency} ${post.yearlyPrice} / year`
              : "Contact agent";
        const media = escapeHtml(
          safeMediaUrl(post.coverUrl || "/assets/ezgif-frame-018.jpg"),
        );
        return `<article class="cinema-card ${index % 2 ? "cinema-card-wide" : "cinema-card-tall"}" data-tilt data-showcase-post="${escapeHtml(post.id)}"><img src="${media}" alt="${escapeHtml(post.title)}" loading="lazy"><div class="cinema-card-copy"><a class="cinema-card-author" href="/index.html?view=agent&amp;agent=${encodeURIComponent(post.agentId)}" aria-label="Open ${escapeHtml(creator)} profile">${escapeHtml(creator)}</a><span>${escapeHtml(post.city)}</span><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(price)} · ${post.rating ? `★ ${escapeHtml(post.rating)}` : "New post"} · ${escapeHtml(post.likes || 0)} likes</small></div></article>`;
      })
      .join("");
    track.querySelectorAll("[data-showcase-post]").forEach((card) =>
      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        const post = result.posts.find(
          (item) => String(item.id) === card.dataset.showcasePost,
        );
        if (post) void openListingDetails({ id: post.id });
      }),
    );
    initCinematicMotion();
  } catch (error) {
    console.warn("Agent showcase unavailable:", error.message);
  }
}
function initProgressiveScrollSequence() {
  const section = document.querySelector(".sequence-section"),
    canvas = document.querySelector("#sequenceCanvas"),
    status = document.querySelector("#sequenceStatus"),
    progress = document.querySelector("#sequenceProgress");
  if (!section || !canvas) return;
  const context = canvas.getContext("2d", { alpha: false }),
    count = Number(section.dataset.frameCount) || 240,
    padding = Number(section.dataset.framePadding) || 3,
    path = section.dataset.framePath || "/assets/frame_",
    extension = section.dataset.frameExtension || ".jpg",
    frames = Array.from({ length: count }, (_, index) => {
      const image = new Image();
      image.decoding = "async";
      image.dataset.frameSrc = `${path}${String(index + 1).padStart(padding, "0")}${extension}`;
      return image;
    });
  let loaded = 0,
    lastFrame = -1,
    pendingFrame = 0,
    drawQueued = false,
    targetProgress = 0,
    displayProgress = 0,
    animationFrame = 0;
  const loadFrame = (index) => {
    const image = frames[index];
    if (image && !image.src) image.src = window.cloudinaryAssetUrl?.(image.dataset.frameSrc) || image.dataset.frameSrc;
  };
  const drawFrame = (index) => {
    const image = frames[index];
    if (!image?.complete || !image.naturalWidth) return;
    const width = canvas.clientWidth,
      height = canvas.clientHeight,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
      ),
      drawWidth = image.naturalWidth * scale,
      drawHeight = image.naturalHeight * scale;
    context.fillStyle = "#10251f";
    context.fillRect(0, 0, width, height);
    context.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    lastFrame = index;
  };
  const queueFrame = (index) => {
    loadFrame(index);
    for (let offset = 1; offset <= 3; offset += 1) {
      loadFrame(index - offset);
      loadFrame(index + offset);
    }
    pendingFrame = index;
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      drawFrame(pendingFrame);
    });
  };
  const animate = () => {
    const difference = targetProgress - displayProgress;
    displayProgress += difference * 0.18;
    if (Math.abs(difference) < 0.0005) displayProgress = targetProgress;
    const frameIndex = Math.min(
      count - 1,
      Math.round(displayProgress * (count - 1)),
    );
    if (frameIndex !== lastFrame) queueFrame(frameIndex);
    if (progress) progress.style.width = `${displayProgress * 100}%`;
    if (Math.abs(targetProgress - displayProgress) > 0.0005)
      animationFrame = requestAnimationFrame(animate);
    else animationFrame = 0;
  };
  const requestAnimation = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  };
  const update = () => {
    const scrollDistance = Math.max(
      1,
      section.offsetHeight - window.innerHeight,
    );
    targetProgress = Math.max(
      0,
      Math.min(1, (window.scrollY - section.offsetTop) / scrollDistance),
    );
    requestAnimation();
  };
  frames.forEach((image) =>
    image.addEventListener(
      "load",
      () => {
        loaded += 1;
        if (loaded === 1) status.textContent = "Scroll to explore";
        if (image === frames[0]) queueFrame(0);
      },
      { once: true },
    ),
  );
  loadFrame(0);
  for (let index = 1; index < 6; index += 1) loadFrame(index);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", () => {
    lastFrame = -1;
    update();
  });
  update();
}
initProgressiveScrollSequence();
function openGoogleSetupWithPassword() {
  openGoogleSetup();
  const form = content.querySelector("#googleSetupForm");
  if (!form) return;
  const roleSelect = form.elements.role;
  const roleGuidance = document.createElement("p");
  roleGuidance.className = "search-note";
  roleSelect.after(roleGuidance);
  const updateRoleGuidance = () => {
    roleGuidance.textContent = roleSelect.value === "agent"
      ? "Agent accounts require administrator approval before you can sign in and manage properties."
      : "Tenant accounts are ready after creation. Sign in with your email and password to explore and book homes.";
  };
  roleSelect.addEventListener("change", updateRoleGuidance);
  updateRoleGuidance();
  form.previousElementSibling.textContent =
    "Your Google email is verified. Set a Makazi Go password so you can also sign in with this email when Google is unavailable.";
  form.querySelector(".form-error").insertAdjacentHTML(
    "beforebegin",
    '<label>Makazi Go password</label><input name="password" type="password" autocomplete="new-password" minlength="12" placeholder="At least 12 characters" required><label>Confirm password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required>',
  );
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const errorNode = form.querySelector(".form-error"),
        button = form.querySelector("button");
      button.disabled = true;
      try {
        if (
          form.elements.password.value !== form.elements.confirmPassword.value
        )
          throw new Error("Passwords do not match.");
        const csrf = (await apiJson("/api/auth/csrf")).token;
        const result = await apiJson("/api/auth/google/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify({
            phone: form.elements.phone.value,
            location: form.elements.location.value,
            password: form.elements.password.value,
            confirmPassword: form.elements.confirmPassword.value,
            role: form.elements.role.value,
          }),
        });
        if (result.requiresLogin) {
          closeModal();
          auth("login", `Your account was created successfully. Please sign in with ${result.email} and the password you chose.`);
          const loginForm = content.querySelector('[data-auth="login"]');
          if (loginForm) loginForm.elements.email.value = result.email;
          return;
        }
        if (result.pendingApproval) {
          showAgentApproval(result);
          return;
        }
        closeModal();
        const googleUser = (await apiJson("/api/auth/me")).user;
        sessionStorage.setItem(
          "stayNest.tabUser",
          JSON.stringify({
            id: googleUser?.id,
            roles: googleUser?.roles || [],
          }),
        );
        await updateAuthControls(googleUser);
        showToast("Your Makazi Go account is ready.");
        if (form.elements.role.value === "tenant") location.hash = "explore";
        else showRoleDashboard(result.roles || ["agent"]);
      } catch (error) {
        errorNode.textContent = error.message;
        button.disabled = false;
      }
    },
    true,
  );
}
function openEmailVerification(token){
  openModal('<p class="eyebrow">Email verification</p><h2>Confirm your email</h2><p>Confirm your email address to finish setting up your Makazi Go account.</p><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" id="confirmEmailVerification" type="button">Verify email</button><p class="auth-switch"><button id="verificationBackToLogin" type="button">Back to sign in</button></p>');
  const button=content.querySelector('#confirmEmailVerification'),errorNode=content.querySelector('.form-error');
  button.addEventListener('click',async()=>{
    button.disabled=true;
    errorNode.textContent='';
    try{
      const csrf=(await apiJson('/api/auth/csrf')).token;
      const result=await apiJson('/api/auth/email-verification/confirm',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({token})});
      auth('login',result.message);
    }catch(error){errorNode.textContent=error.message;button.disabled=false}
  });
  content.querySelector('#verificationBackToLogin').addEventListener('click',()=>auth('login'));
}
const authParams = new URLSearchParams(window.location.search);
if(authParams.get('auth')==='google-setup'){history.replaceState({},'',window.location.pathname);openGoogleSetupWithPassword();}
if(authParams.get('auth')==='google'){history.replaceState({},'',window.location.pathname);showToast('Signed in with Google successfully.');}
if(authParams.get('authError')){showToast(authParams.get('authError'));history.replaceState({},'',window.location.pathname);}
if(authParams.get('verifyEmail')){const token=authParams.get('verifyEmail');history.replaceState({},'',window.location.pathname);openEmailVerification(token);}
if(authParams.get('reset')){history.replaceState({},'',window.location.pathname);openPasswordReset(authParams.get('reset'));}
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.dataset.auth!=='register')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const errorNode=form.querySelector('.form-error'),button=form.querySelector('[type="submit"]');
  button.disabled=true;
  errorNode.textContent='';
  try{
    const csrf=(await apiJson('/api/auth/csrf')).token;
    const result=await apiJson('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    if(result.pendingApproval){showAgentApproval(result);return}
    auth('login',result.emailVerificationSent
      ? `Your account was created. Verify your email, then sign in using ${result.email} and your password.`
      : `Your account was created, but we could not send the verification email yet. Use Resend verification email, then sign in as ${result.email}.`);
    const loginForm=content.querySelector('[data-auth="login"]');
    if(loginForm)loginForm.elements.email.value=result.email;
  }catch(error){
    errorNode.textContent=error.message;
    showToast(error.message,'error');
  }finally{button.disabled=false}
},true);
loadAgentShowcase();
initCinematicMotion();
function renderFooterSocialLinks(config){
  const footer=document.querySelector('footer');
  if(!footer||footer.querySelector('.footer-social'))return;
  const networks=[
    ['facebook','Facebook','f'],
    ['instagram','Instagram','ig'],
    ['linkedin','LinkedIn','in'],
    ['tiktok','TikTok','tk'],
    ['whatsapp','WhatsApp','wa'],
    ['youtube','YouTube','yt']
  ];
  const links=networks.flatMap(([network,label,mark])=>{
    const value=config.socialLinks?.[network];
    if(!value)return [];
    try{
      const url=new URL(value);
      if(url.protocol!=='https:')return [];
      return [{network,label,mark,url}];
    }catch{return []}
  });
  if(!links.length)return;
  const section=document.createElement('div');
  section.className='footer-social';
  section.innerHTML='<h4>Follow Makazi Go</h4><p>Local homes, new listings, and updates.</p><div class="footer-social-links" aria-label="Social media"></div>';
  const linkContainer=section.querySelector('.footer-social-links');
  links.forEach(({network,label,mark,url})=>{
    const link=document.createElement('a');
    link.href=url.href;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.title=label;
    link.setAttribute('aria-label',label);
    link.dataset.socialNetwork=network;
    const icon=document.createElement('span');
    icon.setAttribute('aria-hidden','true');
    icon.textContent=mark;
    link.append(icon);
    linkContainer.append(link);
  });
  footer.insertBefore(section,footer.querySelector('.footer-bottom'));
}
async function initStayNestConfig(){try{const config=await (window.cloudinaryConfigReady||apiJson('/api/public-config'));document.title='Makazi Go | Find your place. Make your move.';renderFooterSocialLinks(config);if(config.maintenanceMode&&!document.querySelector('.maintenance-banner')){const banner=document.createElement('div');banner.className='maintenance-banner';banner.textContent=config.maintenanceMessage;document.body.prepend(banner)}}catch(error){console.warn('Makazi Go public configuration unavailable:',error.message)}}
function initCookieConsent(){if(localStorage.getItem('staynest_cookie_consent'))return;const banner=document.createElement('aside');banner.className='cookie-consent';banner.setAttribute('role','dialog');banner.setAttribute('aria-label','Cookie preferences');banner.innerHTML='<div><strong>Your privacy matters</strong><p>Makazi Go uses essential cookies for secure sign-in and optional analytics to improve the service.</p></div><div class="cookie-consent-actions"><button type="button" data-cookie-choice="essential">Essential only</button><button type="button" class="primary" data-cookie-choice="all">Allow analytics</button></div>';banner.querySelectorAll('[data-cookie-choice]').forEach(button=>button.addEventListener('click',()=>{localStorage.setItem('staynest_cookie_consent',button.dataset.cookieChoice);banner.remove()}));document.body.append(banner)}
initStayNestConfig();
document.addEventListener('click',event=>{if(event.target.closest('#detailSave,#detailReport')&&!requireAccount('save or report listings')){event.preventDefault();event.stopImmediatePropagation();return}},true);
initCookieConsent();

document.querySelectorAll('#postsNav, .main-nav a[href="/posts.html"]').forEach(link=>link.remove());
document.querySelectorAll('.main-nav a[href="/index.html#explore"]').forEach(link=>{link.textContent='Listings';link.href='/listings.html'});
document.querySelector('#viewAll')?.addEventListener('click',event=>{event.preventDefault();location.href='/listings.html'} ,true);
document.addEventListener('click',event=>{const card=event.target.closest('.listing-card');if(!card||event.target.closest('.heart'))return;event.preventDefault();event.stopImmediatePropagation();location.href=`/listing-detail.html?listing=${encodeURIComponent(card.dataset.listingId)}&returnTo=${encodeURIComponent('/listings.html')}`},true);

openAgentProfile=async function(id,owner=false){
  if(owner&&!currentUser)return requireAccount('manage your agent profile');
  if(owner)document.body.classList.add('role-view');
  history.replaceState({},'',`/index.html?view=agent&agent=${encodeURIComponent(id)}`);
  const result=await apiJson(`/api/agents/${id}/profile`),profile=result.profile,listings=result.listings||result.posts||[];
  let isFollowing=Boolean(result.following);
  const avatar=cacheBustUrl(safeMediaUrl(profile.profileImageUrl||profile.avatarUrl));
  const listingMarkup=listings.length?listings.map(listing=>`<article class="agent-listing-card ${listing.status==='pending_review'?'agent-listing-pending':''}" data-agent-listing-id="${escapeHtml(listing.id)}"><button type="button" class="agent-listing-cover"><img src="${escapeHtml(safeMediaUrl(listing.coverUrl||'/assets/ezgif-frame-018.jpg'))}" alt="${escapeHtml(listing.title)}" loading="lazy"><span>${listing.status==='pending_review'?'Pending review':'View listing'}</span></button><div><h3>${escapeHtml(listing.title)}</h3><p>${escapeHtml(listing.city||'Tanzania')} · ${escapeHtml(listing.currency||'TZS')} ${Number(listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||0).toLocaleString()}</p></div></article>`).join(''):'<div class="agent-post-empty">No listings available yet.</div>';
  pageMain.innerHTML=`<section class="agent-page"><div class="agent-page-top"><button class="outline-btn" id="backHome">← Explore Makazi Go</button><span class="eyebrow">Makazi Go agent</span></div><div class="agent-page-hero"><img class="agent-page-avatar" src="${avatar}" alt="${escapeHtml(`${profile.firstName||''} ${profile.lastName||''}`)}"><div class="agent-page-copy"><p class="eyebrow">Verified property professional</p><h1>${escapeHtml(`${profile.firstName||''} ${profile.lastName||''}`)}${profile.badgeLabel?` ${agentBadge(profile.badgeLabel)}`:''}</h1><p class="agent-page-bio">${profile.agencyName?`${escapeHtml(profile.agencyName)} · `:''}${escapeHtml(profile.bio||'Curating places that feel like home.')}</p><div class="agent-page-stats"><span><strong>${listings.length}</strong>listings</span><button class="profile-stat-link" id="followersStat"><strong>${profile.followers||0}</strong>followers</button><button class="profile-stat-link" id="followingStat"><strong>${profile.following||0}</strong>following</button></div><p class="agent-page-contact">${escapeHtml(profile.phone||'Phone not provided')} ${profile.email?`· ${escapeHtml(profile.email)}`:''}</p><div class="agent-profile-actions">${owner?'<button class="primary" id="createProfileListing">Create listing <span>→</span></button><button class="outline-btn" id="editProfileAction">Edit profile</button>':`<button class="primary" id="messageAgentAction">Message agent</button><button class="outline-btn" id="followAgentAction">${isFollowing?'Unfollow':'Follow agent'}</button>`}</div></div></div><div class="agent-page-toolbar"><h2>Listings</h2><span>${listings.length} ${listings.length===1?'home':'homes'}</span></div><div class="agent-listing-grid">${listingMarkup}</div></section>`;
  document.querySelector('#backHome').onclick=()=>{location.href='/index.html#top'};
  document.querySelector('#followersStat')?.addEventListener('click',()=>openAgentFollowList(id,'followers'));
  document.querySelector('#followingStat')?.addEventListener('click',()=>openAgentFollowList(id,'following'));
  document.querySelector('#messageAgentAction')?.addEventListener('click',()=>openAgentMessage(id,`${profile.firstName||''} ${profile.lastName||''}`));
  document.querySelector('#createProfileListing')?.addEventListener('click',openAgentListingForm);
  document.querySelector('#editProfileAction')?.addEventListener('click',()=>openAgentProfileEditor(profile));
  document.querySelector('#followAgentAction')?.addEventListener('click',async()=>{if(!requireAccount('follow agents'))return;const button=document.querySelector('#followAgentAction');try{button.disabled=true;const csrf=(await apiJson('/api/auth/csrf')).token;const follow=await apiJson(`/api/agents/${id}/follow`,{method:isFollowing?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});isFollowing=Boolean(follow.following);button.textContent=isFollowing?'Unfollow':'Follow agent';button.disabled=false;showToast(isFollowing?'Agent followed':'Agent unfollowed')}catch(error){button.disabled=false;showToast(error.message)}});
  document.querySelectorAll('[data-agent-listing-id]').forEach(card=>card.addEventListener('click',()=>{if(card.classList.contains('agent-listing-pending'))return;location.href=`/listings.html?listing=${encodeURIComponent(card.dataset.agentListingId)}`}));
  window.scrollTo({top:0,behavior:'smooth'});
};

function openAgentListingWizard(){
  const draftKey=`staynest_listing_draft_${currentUser?.id||'agent'}`;
  let draft={};
  try{draft=JSON.parse(localStorage.getItem(draftKey)||'{}')}catch{}
  const amenityGroups=[
    ['Guest favorites',[['Wifi','Wifi'],['TV','TV'],['Kitchen','Kitchen'],['Parking','Parking'],['AC','AC']]],
    ['Standout',[['Pool','Pool'],['Generator','Generator'],['Borehole water','Borehole water'],['BBQ','BBQ']]],
    ['Safety',[['Smoke alarm','Smoke alarm'],['Fire extinguisher','Fire extinguisher'],['First aid kit','First aid kit']]]
  ];
  const steps=['Location','Property category','Privacy','Category details','Amenities','Photos','Listing description','Pricing','Booking','Review & submit'];
  const structureOptions=[['house','House'],['apartment','Apartment'],['room','Room'],['land_plot','Land/Plot'],['guesthouse','Guesthouse'],['serviced_apartment','Serviced apartment'],['hotel','Hotel'],['commercial','Commercial space']];
  const privacyOptions=[['entire_place','Entire place'],['private_room','Private room'],['shared_room','Shared room']];
  const categoryQuestions={
    house:{title:'House details',intro:'Tell renters about the home layout and outdoor space.',fields:[{name:'homeStyle',label:'Home style',options:['Detached house','Bungalow','Villa','Townhouse','Other']},{name:'outdoorSpace',label:'Outdoor space',options:['Private garden','Private yard','Balcony or patio','No private outdoor space']},{name:'parking',label:'Parking',options:['No parking','Street parking','One space','Two or more spaces']}]},
    apartment:{title:'Apartment details',intro:'Help renters understand the unit and building.',fields:[{name:'apartmentStyle',label:'Apartment style',options:['Studio','One bedroom','Two bedrooms','Three or more bedrooms','Penthouse']},{name:'floorLevel',label:'Floor level',type:'number',min:0,max:150,placeholder:'Ground floor is 0'},{name:'buildingAccess',label:'Building access',options:['Elevator','Stairs','Elevator and stairs']},{name:'balcony',label:'Private balcony',options:['Yes','No']}]},
    room:{title:'Room details',intro:'Clarify what is private and which spaces are shared.',fields:[{name:'roomFurnishing',label:'Furnishing',options:['Furnished','Partly furnished','Unfurnished']},{name:'sharedSpaces',label:'Shared spaces',type:'text',placeholder:'Kitchen, bathroom, living room'},{name:'roomAccess',label:'Room access',options:['Private entrance','Shared entrance']}]},
    land_plot:{title:'Plot details',intro:'Describe plot size, intended use, and access.',fields:[{name:'plotSize',label:'Plot size',type:'number',min:1,step:0.01,placeholder:'e.g. 600'},{name:'plotSizeUnit',label:'Size unit',options:['Square metres','Acres','Hectares']},{name:'landUse',label:'Intended land use',options:['Residential','Agricultural','Commercial','Mixed use','Other']},{name:'titleStatus',label:'Title or survey status',options:['Surveyed title','Title available','In process','Confirm with agent']}]},
    guesthouse:{title:'Guesthouse details',intro:'Share the guest services and room setup.',fields:[{name:'guestRooms',label:'Guest rooms',type:'number',min:1,max:999},{name:'mealService',label:'Meals',options:['No meals','Breakfast','Breakfast and dinner','Restaurant on site']},{name:'receptionHours',label:'Reception',options:['24-hour reception','Daytime reception','Self check-in']}]},
    serviced_apartment:{title:'Serviced apartment details',intro:'Describe what is included during a serviced stay.',fields:[{name:'housekeeping',label:'Housekeeping',options:['Daily','Weekly','On request','Not included']},{name:'utilitiesIncluded',label:'Utilities included',options:['All utilities','Some utilities','Not included']},{name:'kitchenSetup',label:'Kitchen',options:['Full kitchen','Kitchenette','Shared kitchen']}]},
    hotel:{title:'Hotel details',intro:'Add the accommodation and guest services visitors expect.',fields:[{name:'hotelRooms',label:'Guest rooms',type:'number',min:1,max:999},{name:'mealService',label:'Meals',options:['No meals','Breakfast','Breakfast and dinner','Restaurant on site']},{name:'receptionHours',label:'Reception',options:['24-hour reception','Daytime reception','Self check-in']}]},
    commercial:{title:'Commercial property details',intro:'Describe the usable area, business use, and customer access.',fields:[{name:'floorArea',label:'Floor area (m²)',type:'number',min:1,step:0.01,placeholder:'e.g. 120'},{name:'businessUse',label:'Suitable business use',options:['Office','Retail or shop','Hospitality','Warehouse or industrial','Mixed use','Other']},{name:'customerAccess',label:'Customer access',options:['Street frontage','Inside a complex','Appointment only']},{name:'loadingAccess',label:'Loading access',options:['Loading bay','Vehicle access','No loading access']}]}
  };
  const categoryAmenities={
    house:['Private garden','Fenced yard','Family kitchen','Parking','Storage','Backup water','Security gate','Outdoor dining'],
    apartment:['Balcony','Elevator','Secure entry','Backup generator','Swimming pool','Gym','Parking','Air conditioning','Laundry'],
    room:['Shared kitchen','Shared bathroom','Secure entry','Wi-Fi','Laundry','Furnished','Parking'],
    land_plot:['Road access','Water connection','Electricity nearby','Fenced plot','Surveyed title','Drainage'],
    guesthouse:['Breakfast','Restaurant','Swimming pool','24-hour reception','Housekeeping','Parking','Generator','Wi-Fi'],
    serviced_apartment:['Full kitchen','Housekeeping','Wi-Fi','Laundry','Linen included','Backup generator','Secure entry','Parking'],
    hotel:['Restaurant','Swimming pool','Conference room','24-hour reception','Housekeeping','Parking','Generator','Wi-Fi'],
    commercial:['Street frontage','Customer parking','Loading access','Power backup','Fiber internet','Security','Air conditioning','Public transport']
  };
  const requiredCategoryAnswers={house:['homeStyle'],apartment:['apartmentStyle'],room:['roomFurnishing'],land_plot:['plotSize','landUse'],guesthouse:['guestRooms'],serviced_apartment:['housekeeping'],hotel:['hotelRooms'],commercial:['floorArea','businessUse']};
  const stepper=(name,label,min,max,step,value)=>`<div class="wizard-stepper"><span>${label}</span><button type="button" data-stepper="${name}" data-direction="down" aria-label="Decrease ${label}">−</button><input name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"><button type="button" data-stepper="${name}" data-direction="up" aria-label="Increase ${label}">+</button></div>`;
  const optionCards=(name,options)=>`<div class="wizard-option-grid">${options.map(([value,label])=>`<label class="wizard-option"><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`).join('')}</div>`;
  const amenityMarkup=amenityGroups.map(([group,items])=>`<fieldset class="wizard-amenity-group"><legend>${group}</legend><div class="wizard-amenity-grid">${items.map(([value,label])=>`<label class="wizard-amenity"><input type="checkbox" value="${value}" data-amenity><span class="wizard-amenity-icon" aria-hidden="true">✦</span><span>${label}</span></label>`).join('')}</div></fieldset>`).join('');
  openModal(`<div class="listing-wizard"><div class="wizard-heading"><div><p class="eyebrow">Agent workspace</p><h2>Create a listing</h2></div><span class="wizard-step-label" id="wizardStepLabel"></span></div><div class="wizard-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="1"><span id="wizardProgress"></span></div><form id="agentListingWizard" enctype="multipart/form-data"><section class="wizard-panel" data-step="0"><h3>Where is the place?</h3><p class="search-note">Your exact address stays private until booking. Search and confirm the pin so guests can find the area accurately.</p><label>Street address<input name="addressLine1" id="listingAddress" required placeholder="Street address"></label><label>City<input name="city" required></label><div class="location-search-row"><button class="outline-btn" type="button" id="findListingLocation">Find on map</button></div><input type="hidden" name="latitude"><input type="hidden" name="longitude"><div class="listing-map-wrap"><div id="listingMap" aria-label="OpenStreetMap listing location"></div><p id="listingMapStatus" class="map-status">Search for the exact property address to place it on the map.</p></div></section><section class="wizard-panel" data-step="1" hidden><h3>What kind of place is it?</h3><p class="search-note">Choose the structure that best describes the listing.</p>${optionCards('structureType',structureOptions)}</section><section class="wizard-panel" data-step="2" hidden><h3>How will guests use it?</h3><p class="search-note">This describes the privacy arrangement for a stay.</p>${optionCards('privacyType',privacyOptions)}</section><section class="wizard-panel" data-step="3" hidden><h3>Make room for the right stay</h3><p class="search-note">Use the steppers to set the capacity and layout.</p>${stepper('maxGuests','Maximum guests',1,999,1,2)}${stepper('bedrooms','Bedrooms',0,99,1,1)}${stepper('bathrooms','Bathrooms',0.5,99,0.5,1)}</section><section class="wizard-panel" data-step="4" hidden><h3>What makes it special?</h3><p class="search-note">Select the amenities guests will find at the place.</p>${amenityMarkup}<input type="hidden" name="amenities"></section><section class="wizard-panel" data-step="5" hidden><h3>Show the place</h3><p class="search-note">Add at least five photos. Drag cards to reorder them; the first one becomes the cover.</p><label class="wizard-file-drop" id="mediaDrop"><input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple required><strong>Drop photos here or browse</strong><small>Minimum 5 photos</small></label><div class="wizard-media-grid" id="mediaGrid"></div><div id="mediaCaptions"></div></section><section class="wizard-panel" data-step="6" hidden><h3>Give it a name</h3><label>Title<input name="title" maxlength="180" required placeholder="A memorable name for this place"></label><label>Description / caption<textarea name="description" maxlength="5000" required placeholder="Tell guests what makes the place feel like home."></textarea></label></section><section class="wizard-panel" data-step="7" hidden><h3>Set your pricing</h3><label>Rental duration<select name="rentalMode"><option value="short_term">Short-term — nightly</option><option value="long_term">Long-term — monthly/yearly</option><option value="both">Both short-term and long-term</option></select></label><div class="wizard-price-grid"><label>Nightly price<input name="nightlyPrice" type="number" min="1" step="0.01"></label><label>Monthly price<input name="monthlyPrice" type="number" min="1" step="0.01"></label><label>Yearly price<input name="yearlyPrice" type="number" min="1" step="0.01"></label></div></section><section class="wizard-panel" data-step="8" hidden><h3>Choose a booking mode</h3><p class="search-note">Decide whether guests can confirm instantly or need your approval.</p>${optionCards('bookingMode',[['request','Request to book'],['instant','Instant book']])}</section><section class="wizard-panel" data-step="9" hidden><h3>Review and submit</h3><div class="wizard-summary" id="wizardSummary"></div><label>Registration document<input name="document" type="file" accept=".pdf,image/jpeg,image/png" required></label><p class="search-note">Your registration document is required for review and stays private.</p></section><p class="form-error" role="alert"></p><div class="wizard-actions"><button class="outline-btn" type="button" id="wizardBack">Back</button><button class="primary" type="button" id="wizardNext">Continue <span>→</span></button></div></form></div>`);
  const form=content.querySelector('#agentListingWizard'),panels=[...form.querySelectorAll('.wizard-panel')],errorBox=form.querySelector('.form-error'),progress=content.querySelector('#wizardProgress'),stepLabel=content.querySelector('#wizardStepLabel'),back=form.querySelector('#wizardBack'),next=form.querySelector('#wizardNext');
  let currentStep=0,marker=null,mediaFiles=[];
  const maxPhotoBytes=20*1024*1024,maxPhotoCount=10;
  const categoryInput=document.createElement('input');categoryInput.type='hidden';categoryInput.name='propertyType';form.append(categoryInput);const categoryByStructure={house:'house',apartment:'apartment',room:'room',land_plot:'land',guesthouse:'hotel',serviced_apartment:'apartment',hotel:'hotel',commercial:'commercial'};const syncPropertyCategory=()=>{const structure=form.querySelector('[name="structureType"]:checked')?.value;categoryInput.value=categoryByStructure[structure]||'apartment'};
  const bathroomStepper=form.elements.bathrooms.closest('.wizard-stepper');
  const bedsStepper=document.createElement('div');
  bedsStepper.className='wizard-stepper';
  bedsStepper.innerHTML='<span>Beds</span><button type="button" data-stepper="beds" data-direction="down" aria-label="Decrease beds">−</button><input name="beds" type="number" min="0" max="99" step="1" value="1" aria-label="Beds"><button type="button" data-stepper="beds" data-direction="up" aria-label="Increase beds">+</button>';
  bathroomStepper.before(bedsStepper);
  const detailsPanel=form.querySelector('[data-step="3"]');
  const capacityGroup=document.createElement('div');
  capacityGroup.className='wizard-basics-group';
  const firstStepper=detailsPanel.querySelector('.wizard-stepper');
  detailsPanel.insertBefore(capacityGroup,firstStepper);
  [...detailsPanel.querySelectorAll('.wizard-stepper')].forEach(stepper=>capacityGroup.append(stepper));
  const categoryDetailsHost=document.createElement('div');
  categoryDetailsHost.className='wizard-category-details';
  detailsPanel.append(categoryDetailsHost);
  const amenitiesPanel=form.querySelector('[data-step="4"]');
  const categoryAmenitiesHost=document.createElement('div');
  categoryAmenitiesHost.className='wizard-category-amenities';
  amenitiesPanel.querySelectorAll('.wizard-amenity-group').forEach(group=>group.remove());
  amenitiesPanel.insertBefore(categoryAmenitiesHost,form.elements.amenities);
  const categoryDetailsDraft={...(draft.categoryDetails||{})};
  const categoryAmenitiesDraft={...(draft.categoryAmenities||{})};
  let currentStructure='',previousLeaseCategory=false;
  const readCategoryAnswers=()=>Object.fromEntries([...categoryDetailsHost.querySelectorAll('[data-category-question]')].map(input=>[input.name,input.value]).filter(([,value])=>String(value).trim()));
  const renderCategoryQuestions=structure=>{
    const definition=categoryQuestions[structure]||categoryQuestions.house;
    categoryDetailsHost.replaceChildren();
    const intro=document.createElement('p');intro.className='search-note';intro.textContent=definition.intro;categoryDetailsHost.append(intro);
    for(const question of definition.fields){
      const label=document.createElement('label');label.textContent=question.label;
      const control=document.createElement(question.options?'select':question.type==='textarea'?'textarea':'input');
      control.name=question.name;control.dataset.categoryQuestion='';
      if(question.options){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose an answer';control.append(placeholder);question.options.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;control.append(option)})}
      else{control.type=question.type||'text';if(question.min!==undefined)control.min=question.min;if(question.max!==undefined)control.max=question.max;if(question.step!==undefined)control.step=question.step;if(question.placeholder)control.placeholder=question.placeholder}
      control.addEventListener('input',saveDraft);control.addEventListener('change',saveDraft);label.append(control);categoryDetailsHost.append(label);
    }
    const saved=categoryDetailsDraft[structure]||{};
    Object.entries(saved).forEach(([name,value])=>{const control=categoryDetailsHost.querySelector(`[name="${CSS.escape(name)}"]`);if(control)control.value=value});
  };
  const renderCategoryAmenities=structure=>{
    const selected=new Set(categoryAmenitiesDraft[structure]||[]);
    categoryAmenitiesHost.replaceChildren();
    for(const amenity of categoryAmenities[structure]||categoryAmenities.house){
      const label=document.createElement('label');label.className='wizard-amenity';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=amenity;checkbox.dataset.amenity='';checkbox.checked=selected.has(amenity);
      const icon=document.createElement('span');icon.className='wizard-amenity-icon';icon.setAttribute('aria-hidden','true');icon.textContent='+';
      const text=document.createElement('span');text.textContent=amenity;
      checkbox.addEventListener('change',()=>{categoryAmenitiesDraft[structure]=[...categoryAmenitiesHost.querySelectorAll('[data-amenity]:checked')].map(input=>input.value);form.elements.amenities.value=categoryAmenitiesDraft[structure].join(',');saveDraft()});
      label.append(checkbox,icon,text);categoryAmenitiesHost.append(label);
    }
    form.elements.amenities.value=(categoryAmenitiesDraft[structure]||[]).join(',');
  };
  const updateCategoryFlow=()=>{
    const structure=form.querySelector('[name="structureType"]:checked')?.value||'house';
    if(currentStructure&&currentStructure!==structure){categoryDetailsDraft[currentStructure]=readCategoryAnswers();categoryAmenitiesDraft[currentStructure]=[...categoryAmenitiesHost.querySelectorAll('[data-amenity]:checked')].map(input=>input.value)}
    currentStructure=structure;syncPropertyCategory();
    const lease=['land_plot','commercial'].includes(structure);
    capacityGroup.hidden=lease;
    form.querySelector('[data-step="3"] h3').textContent=lease?'Property details':'Capacity and category details';
    form.querySelector('[data-step="3"] .search-note').textContent=lease?'Add the specific details renters and buyers need to compare this property.':'Add the capacity, layout, and category details guests need to choose this place.';
    form.querySelector('[data-step="4"] h3').textContent=`Features for ${structure.replaceAll('_',' ')}`;
    form.querySelector('[data-step="4"] .search-note').textContent='Select the features that are actually available at this property.';
    const privacyPanel=form.querySelector('[data-step="2"]');
    privacyPanel.querySelector('.search-note').textContent=structure==='room'?'Describe whether this is a private or shared room.':'Choose how guests will use the accommodation.';
    const privacyHeading=privacyPanel.querySelector('h3');
    privacyHeading.textContent=structure==='room'?'Is this room private or shared?':'What privacy arrangement do you offer?';
    const privacyRadios=[...privacyPanel.querySelectorAll('[name="privacyType"]')];
    if(lease)privacyRadios.forEach(input=>{input.checked=false});
    else if(!privacyRadios.some(input=>input.checked)){const defaultPrivacy=structure==='room'?'private_room':'entire_place';const option=privacyRadios.find(input=>input.value===defaultPrivacy);if(option)option.checked=true}
    const nightlyLabel=form.elements.nightlyPrice.closest('label');
    const nightlyOption=[...form.elements.rentalMode.options].find(option=>option.value==='short_term');
    const bothOption=[...form.elements.rentalMode.options].find(option=>option.value==='both');
    if(lease){if(!previousLeaseCategory||form.elements.rentalMode.value!=='long_term')form.elements.rentalMode.value='long_term';form.elements.nightlyPrice.value='';nightlyLabel.hidden=true;nightlyOption.hidden=true;bothOption.hidden=true;form.elements.bookingMode.value='request'}
    else{if(previousLeaseCategory)form.elements.rentalMode.value='short_term';nightlyLabel.hidden=false;nightlyOption.hidden=false;bothOption.hidden=false}
    previousLeaseCategory=lease;
    renderCategoryQuestions(structure);renderCategoryAmenities(structure);saveDraft();
  };
  const visibleSteps=()=>['land_plot','commercial'].includes(currentStructure)?[0,1,3,4,5,6,7,9]:[0,1,2,3,4,5,6,7,8,9];
  const saveDraft=()=>{const values={};['addressLine1','city','latitude','longitude','structureType','privacyType','maxGuests','bedrooms','beds','bathrooms','amenities','title','description','rentalMode','nightlyPrice','monthlyPrice','yearlyPrice','bookingMode'].forEach(name=>{const field=form.elements[name];if(field)values[name]=field.value});if(currentStructure){categoryDetailsDraft[currentStructure]=readCategoryAnswers();categoryAmenitiesDraft[currentStructure]=[...categoryAmenitiesHost.querySelectorAll('[data-amenity]:checked')].map(input=>input.value)}values.categoryDetails=categoryDetailsDraft;values.categoryAmenities=categoryAmenitiesDraft;localStorage.setItem(draftKey,JSON.stringify(values))};
  const restoreDraft=()=>{Object.entries(draft).forEach(([name,value])=>{if(['amenities','categoryDetails','categoryAmenities'].includes(name))return;const field=form.elements[name];if(!field)return;if(field instanceof RadioNodeList){const radio=[...field].find(input=>input.value===value);if(radio)radio.checked=true}else field.value=value});updateCategoryFlow();const amenities=Array.isArray(draft.amenities)?draft.amenities:String(draft.amenities||'').split(',').filter(Boolean);if(!draft.categoryAmenities)categoryAmenitiesDraft[currentStructure]=amenities;renderCategoryAmenities(currentStructure);form.elements.amenities.value=(categoryAmenitiesDraft[currentStructure]||[]).join(',');};
  form.addEventListener('change',event=>{if(event.target.name==='structureType')updateCategoryFlow()});
  const setLocation=(latitude,longitude,label='Exact estate location selected')=>{form.elements.latitude.value=latitude;form.elements.longitude.value=longitude;if(marker)marker.setLatLng([latitude,longitude]);else{marker=L.marker([latitude,longitude],{draggable:true}).addTo(map);marker.on('dragend',()=>{const point=marker.getLatLng();setLocation(point.lat,point.lng)})}const status=form.querySelector('#listingMapStatus');status.textContent=`${label} (${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)})`;status.classList.add('map-status-success');saveDraft()};
  const map=L.map(form.querySelector('#listingMap')).setView([-6.8,39.25],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);map.on('click',event=>setLocation(event.latlng.lat,event.latlng.lng));setTimeout(()=>map.invalidateSize(),0);
  const updateAmenities=()=>{form.elements.amenities.value=[...form.querySelectorAll('[data-amenity]:checked')].map(input=>input.value).join(',');saveDraft()};
  const renderMedia=()=>{const grid=form.querySelector('#mediaGrid'),captions=form.querySelector('#mediaCaptions');grid.innerHTML=mediaFiles.map((file,index)=>`<div class="wizard-media-card" draggable="true" data-media-index="${index}"><span class="wizard-media-order">${index===0?'Cover':index+1}</span><img src="${URL.createObjectURL(file)}" alt="Photo ${index+1}"><button type="button" data-remove-media="${index}" aria-label="Remove photo">×</button></div>`).join('');captions.innerHTML=mediaFiles.map((file,index)=>`<label class="wizard-caption">${index===0?'Cover ':''}caption<input name="caption${index}" maxlength="255" placeholder="Describe photo ${index+1}"></label>`).join('');grid.querySelectorAll('[data-remove-media]').forEach(button=>button.onclick=()=>{mediaFiles.splice(Number(button.dataset.removeMedia),1);syncFiles();renderMedia()});grid.querySelectorAll('.wizard-media-card').forEach(card=>{card.ondragstart=event=>event.dataTransfer.setData('text/plain',card.dataset.mediaIndex);card.ondragover=event=>event.preventDefault();card.ondrop=event=>{event.preventDefault();const from=Number(event.dataTransfer.getData('text/plain')),to=Number(card.dataset.mediaIndex);if(from===to)return;const [file]=mediaFiles.splice(from,1);mediaFiles.splice(to,0,file);syncFiles();renderMedia()}})};
  const syncFiles=()=>{if(typeof DataTransfer==='undefined')return;try{const input=form.elements.media,dataTransfer=new DataTransfer();mediaFiles.forEach(file=>dataTransfer.items.add(file));input.files=dataTransfer.files}catch(error){console.warn('Listing photo selection remains in wizard state:',error.message)}};
  const validate=()=>{
    const values={address:form.elements.addressLine1.value.trim(),city:form.elements.city.value.trim(),lat:form.elements.latitude.value,lng:form.elements.longitude.value,title:form.elements.title.value.trim(),description:form.elements.description.value.trim()};
    if(currentStep===0&&!values.address)return 'Enter the street address';
    if(currentStep===0&&!values.city)return 'Enter the city';
    if(currentStep===0&&(!values.lat||!values.lng))return 'Find and confirm the listing location on the map';
    if(currentStep===1&&!form.querySelector('[name="structureType"]:checked'))return 'Choose a structure type';
    if(currentStep===2&&!form.querySelector('[name="privacyType"]:checked'))return 'Choose a privacy type';
    if(currentStep===3){
      const structure=form.querySelector('[name="structureType"]:checked')?.value;
      for(const name of requiredCategoryAnswers[structure]||[]){
        const question=categoryQuestions[structure]?.fields.find(item=>item.name===name);
        if(!form.elements[name]?.value)return `Provide ${question?.label?.toLowerCase()||'the category details'}`;
      }
    }
    if(currentStep===5&&mediaFiles.length<5)return 'Add at least five photos';
    if(currentStep===6&&(!values.title||!values.description))return 'Add a title and description';
    if(currentStep===7&&!['short_term','long_term','both'].includes(form.elements.rentalMode.value))return 'Choose a rental duration';
    if(currentStep===7&&!['nightlyPrice','monthlyPrice','yearlyPrice'].some(name=>Number(form.elements[name].value)>0))return 'Enter at least one valid price';
    if(currentStep===7&&['land_plot','commercial'].includes(currentStructure)&&!['monthlyPrice','yearlyPrice'].some(name=>Number(form.elements[name].value)>0))return 'Enter a monthly or yearly lease price';
    if(currentStep===8&&!form.querySelector('[name="bookingMode"]:checked'))return 'Choose a booking mode';
    return '';
  };
  const updateSummary=()=>{const selected=name=>form.querySelector(`[name="${name}"]:checked`)?.parentElement?.textContent?.trim()||'Not selected';form.querySelector('#wizardSummary').innerHTML=`<dl><div><dt>Location</dt><dd>${escapeHtml([form.elements.addressLine1.value,form.elements.city.value].filter(Boolean).join(', ')||'Not added')}</dd></div><div><dt>Structure</dt><dd>${escapeHtml(selected('structureType'))}</dd></div><div><dt>Privacy</dt><dd>${escapeHtml(selected('privacyType'))}</dd></div><div><dt>Basics</dt><dd>${form.elements.maxGuests.value} guests · ${form.elements.bedrooms.value} bedrooms · ${form.elements.bathrooms.value} bathrooms</dd></div><div><dt>Amenities</dt><dd>${escapeHtml(form.elements.amenities.value||'None selected')}</dd></div><div><dt>Photos</dt><dd>${mediaFiles.length} added</dd></div><div><dt>Title</dt><dd>${escapeHtml(form.elements.title.value||'Not added')}</dd></div><div><dt>Pricing</dt><dd>${escapeHtml(form.elements.rentalMode.selectedOptions[0].textContent)} · ${escapeHtml([form.elements.nightlyPrice.value&&'Nightly',form.elements.monthlyPrice.value&&'Monthly',form.elements.yearlyPrice.value&&'Yearly'].filter(Boolean).join(', ')||'No price added')}</dd></div><div><dt>Booking</dt><dd>${escapeHtml(selected('bookingMode'))}</dd></div></dl>`};
  const appendCategoryReview=()=>{
    const structure=currentStructure,summary=form.querySelector('#wizardSummary dl');
    if(['land_plot','commercial'].includes(structure))summary.querySelectorAll('dt').forEach(term=>{if(['Privacy','Basics','Booking'].includes(term.textContent))term.parentElement.remove()});
    const answers=readCategoryAnswers(),definition=categoryQuestions[structure];
    const rows=Object.entries(answers).map(([name,value])=>({label:definition.fields.find(question=>question.name===name)?.label||name,value}));
    if(!rows.length)return;
    const row=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');
    term.textContent=definition.title;description.textContent=rows.map(item=>`${item.label}: ${item.value}`).join(' · ');
    row.append(term,description);summary.append(row);
  };
  const showStep=step=>{
    currentStep=step;
    const sequence=visibleSteps(),position=sequence.indexOf(step);
    panels.forEach((panel,index)=>{panel.hidden=index!==step||!sequence.includes(index)});
    back.disabled=position===0;
    next.innerHTML=position===sequence.length-1?'Submit for review <span>→</span>':'Continue <span>→</span>';
    stepLabel.textContent=`Step ${position+1} of ${sequence.length} · ${steps[step]}`;
    progress.setAttribute('aria-valuemax',String(sequence.length));
    progress.style.width=`${((position+1)/sequence.length)*100}%`;
    form.closest('.modal')?.scrollTo({top:0,behavior:'smooth'});
    if(step===9){updateSummary();appendCategoryReview()}
  };
  form.querySelector('#findListingLocation').onclick=async()=>{const address=[form.elements.addressLine1.value,form.elements.city.value].filter(Boolean).join(', '),button=form.querySelector('#findListingLocation'),status=form.querySelector('#listingMapStatus');if(address.length<4){status.textContent='Enter an address and city first.';return}button.disabled=true;status.textContent='Searching OpenStreetMap…';try{const result=await apiJson(`/api/agent/geocode?address=${encodeURIComponent(address)}`),location=result.location;map.setView([location.latitude,location.longitude],17);setLocation(location.latitude,location.longitude,'Search result - click the map or drag the marker to pinpoint the estate')}catch(error){status.textContent=error.message;status.classList.remove('map-status-success')}finally{button.disabled=false}};
  form.querySelectorAll('[data-stepper]').forEach(button=>button.onclick=()=>{const input=form.elements[button.dataset.stepper],direction=button.dataset.direction==='up'?1:-1,value=Number(input.value||0)+direction*Number(input.step||1);input.value=Math.max(Number(input.min),Math.min(Number(input.max),value));saveDraft()});
  form.querySelectorAll('[data-amenity]').forEach(input=>input.onchange=updateAmenities);form.querySelectorAll('input:not([type=file]),select,textarea').forEach(input=>input.addEventListener('input',saveDraft));
  const appendMediaFiles=files=>{const existingKeys=new Set(mediaFiles.map(file=>`${file.name}:${file.size}:${file.lastModified}`));let rejection='';for(const file of files){const key=`${file.name}:${file.size}:${file.lastModified}`;if(!file.type.startsWith('image/')){rejection='Choose JPG, PNG, WebP, or AVIF photos';continue}if(file.size>maxPhotoBytes){rejection='Each photo must be 20 MB or smaller';continue}if(existingKeys.has(key))continue;if(mediaFiles.length>=maxPhotoCount){rejection='A listing can include up to 10 photos';continue}mediaFiles.push(file);existingKeys.add(key)}syncFiles();renderMedia();errorBox.textContent=rejection};
  const mediaHint=form.querySelector('#mediaDrop small');if(mediaHint)mediaHint.textContent='5-10 photos, up to 20 MB each';
  const mediaInput=form.elements.media;mediaInput.onchange=()=>{const selectedFiles=[...mediaInput.files];mediaInput.value='';appendMediaFiles(selectedFiles)};const drop=form.querySelector('#mediaDrop');drop.ondragover=event=>{event.preventDefault();drop.classList.add('is-dragging')};drop.ondragleave=()=>drop.classList.remove('is-dragging');drop.ondrop=event=>{event.preventDefault();drop.classList.remove('is-dragging');appendMediaFiles([...event.dataTransfer.files])};
  back.onclick=()=>{const sequence=visibleSteps(),position=sequence.indexOf(currentStep);if(position>0)showStep(sequence[position-1])};
  next.onclick=async()=>{
    errorBox.textContent='';
    const validation=validate();
    if(validation){errorBox.textContent=validation;return}
    const sequence=visibleSteps(),position=sequence.indexOf(currentStep);
    if(position<sequence.length-1){saveDraft();showStep(sequence[position+1]);return}
    if(!form.elements.document.files.length){errorBox.textContent='Upload the required registration document';return}
    if(mediaFiles.length<5){errorBox.textContent='Add at least five photos';return}
    next.disabled=true;back.disabled=true;next.textContent='Uploading…';errorBox.textContent=`Uploading ${mediaFiles.length} photos and submitting your listing…`;
    try{
      const categoryDetails=Object.entries(readCategoryAnswers()).map(([name,value])=>{
        const question=categoryQuestions[currentStructure].fields.find(item=>item.name===name);
        return `${question?.label||name}: ${value}`;
      });
      const submission=new FormData(form);
      submission.delete('media');
      mediaFiles.forEach(file=>submission.append('media',file));
      const originalDescription=String(form.elements.description.value||'').trim();
      if(categoryDetails.length)submission.set('description',`${originalDescription}\n\n${categoryQuestions[currentStructure].title}:\n${categoryDetails.map(value=>`- ${value}`).join('\n')}`);
      const csrf=await apiJson('/api/auth/csrf');
      await apiJson('/api/agent/listings',{method:'POST',headers:{'X-CSRF-Token':csrf.token},body:submission});
      localStorage.removeItem(draftKey);closeModal();showToast('Listing submitted for moderation.');
      try{await openOwnAgentProfile()}catch{showToast('Listing submitted. Refresh your profile to see its review status.')}
    }catch(error){errorBox.textContent=error.message;next.disabled=false;back.disabled=false;next.innerHTML='Submit for review <span>→</span>'}
  };
  restoreDraft();if(draft.latitude&&draft.longitude)setLocation(draft.latitude,draft.longitude,'Saved listing location');showStep(0);
}
openAgentListingForm=openAgentListingWizard;
document.addEventListener('submit',event=>{if(event.target.id==='agentListingWizard'){event.preventDefault();event.target.querySelector('#wizardNext')?.click()}});
const groupedHeader=document.querySelector('.topbar:has(.nav-dropdown)');
if(groupedHeader)document.querySelectorAll('.topbar').forEach(header=>{if(header!==groupedHeader)header.remove()});

async function openAgentPostForm(){
  try{
    const result=await apiJson('/api/agent/posts/listings');
    const listings=result.listings||[];
    if(!listings.length){openModal('<p class="eyebrow">Agent workspace</p><h2>Create post</h2><p class="empty-copy">Posts can be created after one of your listings is published.</p>');return}
    const types=[['new_listing','New listing'],['price_drop','Price drop'],['fresh_photos','Fresh photos'],['now_available','Now available']];
    const tags=[['Reliable power','Umeme wa uhakika'],['Clean water','Maji safi'],['Fast Wi-Fi','Wi-Fi ya haraka'],['Secure home','Nyumba salama']];
    openModal(`<p class="eyebrow">Agent workspace</p><h2>Create post</h2><p class="search-note">Share a focused update about one of your published listings. Posts go to review before appearing publicly.</p><form id="agentPostForm"><label>Published listing<select name="listingId" required>${listings.map(listing=>`<option value="${listing.id}">${escapeHtml(listing.title)} · ${escapeHtml(listing.city)}</option>`).join('')}</select></label><label>Post type<select name="postType" required>${types.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>Caption<textarea name="caption" maxlength="5000" required></textarea></label><fieldset class="post-tag-picker"><legend>Amenity tags (optional)</legend><div>${tags.map(([en,sw])=>`<label><input type="checkbox" data-tag-en="${escapeHtml(en)}" data-tag-sw="${escapeHtml(sw)}"> ${en} · ${sw}</label>`).join('')}</div></fieldset><p class="form-error" role="alert"></p><button class="primary" type="submit">Submit for review <span>→</span></button></form>`);
    const form=content.querySelector('#agentPostForm'),caption=form.elements.caption,listingSelect=form.elements.listingId,typeSelect=form.elements.postType;
    const selectedListing=()=>listings.find(listing=>Number(listing.id)===Number(listingSelect.value))||listings[0];
    const fillCaption=()=>{const listing=selectedListing(),title=listing.title,city=listing.city;const templates={new_listing:`Meet ${title} in ${city}. A new place to feel at home.`,price_drop:`A better rate is now available for ${title} in ${city}.`,fresh_photos:`Take a fresh look at ${title} in ${city}.`,now_available:`${title} in ${city} is now available to book.`};caption.value=templates[typeSelect.value]||''};
    listingSelect.onchange=fillCaption;typeSelect.onchange=fillCaption;fillCaption();
    form.onsubmit=async event=>{event.preventDefault();const errorBox=form.querySelector('.form-error'),button=form.querySelector('button[type="submit"]');button.disabled=true;errorBox.textContent='';try{const csrf=(await apiJson('/api/auth/csrf')).token;const amenityTags=[...form.querySelectorAll('[data-tag-en]:checked')].map(input=>({en:input.dataset.tagEn,sw:input.dataset.tagSw}));await apiJson('/api/agent/posts',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({listingId:Number(listingSelect.value),postType:typeSelect.value,caption:caption.value.trim(),amenityTags})});closeModal();showToast('Post submitted for moderation.')}catch(error){errorBox.textContent=error.message;button.disabled=false}};
  }catch(error){showToast(error.message)}
}
document.addEventListener('click',event=>{const button=event.target.closest('#createProfilePost');if(button){event.preventDefault();event.stopImmediatePropagation();openAgentPostForm()}},true);
document.addEventListener('click',event=>{const button=event.target.closest('.host-nav-cta');if(button){event.preventDefault();startHosting()}},true);
document.querySelectorAll('#postsNav').forEach(link=>{link.href='/index.html#explore';link.textContent='Explore stays';link.removeAttribute('id')});
document.querySelectorAll('#createProfilePost').forEach(button=>button.remove());
document.querySelectorAll('.main-nav a[href="/index.html#explore"]').forEach(link=>{link.textContent='Listings';link.setAttribute('aria-label','Browse listings')});
