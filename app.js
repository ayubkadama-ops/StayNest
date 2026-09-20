import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const listings=[
 {id:1,title:'Sunlit apartment in Masaki',location:'Masaki, Dar es Salaam',price:'TZS 210,000',type:'short',rating:'4.96',reviews:38,image:'/assets/ezgif-frame-032.jpg',tag:'Guest favourite'},
 {id:2,title:'The Palm House',location:'Mikocheni, Dar es Salaam',price:'TZS 3,200,000',type:'long',rating:'4.88',reviews:21,image:'/assets/ezgif-frame-084.jpg',tag:'New this week'},
 {id:3,title:'Quiet garden studio',location:'Oyster Bay, Dar es Salaam',price:'TZS 155,000',type:'short',rating:'4.91',reviews:54,image:'/assets/ezgif-frame-156.jpg',tag:''},
 {id:4,title:'Modern home with a view',location:'Arusha',price:'TZS 4,800,000',type:'long',rating:'4.83',reviews:17,image:'/assets/ezgif-frame-220.jpg',tag:'Most loved'}
];
const grid=document.querySelector('#listingGrid'),toast=document.querySelector('#toast'),pageMain=document.querySelector('main'),homeMarkup=pageMain.innerHTML;
const DEFAULT_AGENT_AVATAR='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"%3E%3Crect width="240" height="240" fill="%23dfe9e2"/%3E%3Ccircle cx="120" cy="86" r="42" fill="%2372807b"/%3E%3Cpath d="M42 222c8-55 35-82 78-82s70 27 78 82" fill="%2372807b"/%3E%3C/svg%3E';
const agentBadge=active=>active?'<span class="agent-badge" role="img" aria-label="Verified agent" title="Verified agent">✓</span>':'';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeMediaUrl=value=>{const url=String(value||'');return /^(?:https?:\/\/|\/|data:image\/(?:svg\+xml|png|jpeg|webp);)/i.test(url)?url:DEFAULT_AGENT_AVATAR};
const avatarMarkup=(value,alt='')=>`<img src="${escapeHtml(safeMediaUrl(value))}" alt="${escapeHtml(alt)}" onerror="this.onerror=null;this.src='${DEFAULT_AGENT_AVATAR}'">`;
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&!image.dataset.avatarFallback){image.dataset.avatarFallback='true';image.src=DEFAULT_AGENT_AVATAR}},true);
const agentAvatar=(src,_active,alt='')=>`<img class="search-result-avatar" src="${escapeHtml(safeMediaUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy">`;
async function recordPostView(id,node){if(!node||node.dataset.viewed==='true')return;const counter=node.querySelector('[data-post-views],[data-views]');try{const result=await apiJson(`/api/listings/${encodeURIComponent(id)}/view`,{method:'POST',cache:'no-store'});node.dataset.viewed='true';if(counter&&result.views!==undefined)counter.textContent=`${result.views} views`}catch(error){delete node.dataset.viewed;console.warn('StayNest view tracking failed',error.message)}}
async function togglePostLike(id,node){try{const liked=node.dataset.liked==='true',csrf=(await apiJson('/api/auth/csrf')).token,result=await apiJson(`/api/listings/${id}/like`,{method:liked?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});node.dataset.liked=String(result.liked);node.classList.toggle('liked',result.liked);const counter=node.querySelector('[data-post-likes]');if(counter)counter.textContent=`${result.likes} likes`}catch(error){showToast(error.message)}}
function setupPostEngagement(root){root.querySelectorAll('[data-post-id]').forEach(post=>{recordPostView(post.dataset.postId,post);post.addEventListener('pointerenter',()=>recordPostView(post.dataset.postId,post),{once:true});post.addEventListener('click',()=>recordPostView(post.dataset.postId,post),{once:true});post.querySelector('[data-post-like]')?.addEventListener('click',event=>{event.stopPropagation();togglePostLike(post.dataset.postId,post)})})}
function updateAgentFollowUI(result){const buttons=document.querySelectorAll('#followAgentAction');buttons.forEach(button=>{button.textContent=result.following?'Unfollow':'Follow agent';button.setAttribute('aria-pressed',String(result.following));button.disabled=false});document.querySelectorAll('#followersStat strong,.agent-profile-stats span:nth-child(2) strong').forEach(stat=>{if(result.followers!==undefined)stat.textContent=String(result.followers)})}
let currentUser=null;
function requireAccount(action='use this feature'){if(currentUser)return true;openModal(`<p class="eyebrow">Members only</p><h2>Sign in to ${action}</h2><p>Create a free StayNest account or sign in to access profiles, bookings, messaging, saved homes, and personalized features.</p><div class="auth-prompt-actions"><button class="primary" id="promptSignup">Create an account <span>→</span></button><button class="outline-btn" id="promptLogin">Already have an account? Sign in</button></div>`);content.querySelector('#promptSignup').onclick=()=>auth('signup');content.querySelector('#promptLogin').onclick=()=>auth('login');return false}
const savedIds=new Set(JSON.parse(localStorage.getItem('staynest_saved')||'[]'));
const bookings=JSON.parse(localStorage.getItem('staynest_bookings')||'[]');
function updatePersonalGreeting(user){const greeting=document.querySelector('#personalGreeting'),detail=document.querySelector('#personalGreetingDetail');if(!greeting||!detail)return;const hour=new Date().getHours(),timeGreeting=hour<5?'Good night':hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';if(user?.firstName){greeting.textContent=`${timeGreeting}, ${user.firstName}`;detail.textContent='Your StayNest recommendations are ready';}else{greeting.textContent=`${timeGreeting}`;detail.textContent='Discover homes made for real life';}}
async function apiJson(url, options={}){let response;try{response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options})}catch(error){throw new Error('StayNest is temporarily unavailable. Please make sure the app is running and try again.')}const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{throw new Error(response.status===404?'The requested StayNest service could not be found. Refresh the page and try again.':response.status===429?'Too many attempts. Please wait a few minutes and try again.':response.ok?'The server returned an invalid response.':`StayNest could not complete the request (HTTP ${response.status}).`)}if(!response.ok){if(response.status===429)throw new Error('Too many attempts. Please wait a few minutes and try again.');throw new Error(data.error||`StayNest could not complete the request (HTTP ${response.status}).`)}return data}
function render(filter='all'){const data=filter==='popular'?listings.filter(x=>+x.rating>4.9):filter==='new'?listings.filter(x=>x.tag.includes('New')):filter==='all'?listings:listings.filter(x=>x.type===filter);grid.innerHTML=data.map(x=>`<article class="listing-card reveal-on-scroll is-visible"><div class="listing-photo" style="background-image:url('${x.image}')"><button class="heart" data-id="${x.id}" aria-label="Save ${x.title}">♡</button>${x.tag?`<span class="rating">${x.tag}</span>`:''}</div><div class="listing-info"><h3>${x.title}</h3><div class="listing-meta">${x.location} · ${x.type==='short'?'Entire place':'Monthly rental'}</div><div class="listing-price"><strong>${x.price}</strong> ${x.type==='short'?'/ night':'/ month'} <span class="listing-meta"> · ★ ${x.rating}</span></div></div></article>`).join('');grid.querySelectorAll('.heart').forEach(btn=>btn.addEventListener('click',()=>{if(!requireAccount('save homes'))return;btn.classList.toggle('saved');btn.textContent=btn.classList.contains('saved')?'♥':'♡';showToast(btn.classList.contains('saved')?'Saved to your wishlist':'Removed from wishlist')}));grid.querySelectorAll('.listing-card').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('.heart'))return;const item=listings.find(x=>x.id===+card.querySelector('.heart').dataset.id);openListing({...item,isDemo:true})}))}
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
const modal=document.querySelector('#modal'),content=document.querySelector('#modalContent');
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
function openModal(html){setSafeMarkup(content,html);modal.classList.add('open');document.body.classList.add('modal-open');const form=content.querySelector('form');if(form?.dataset.auth==='login'){const recovery=document.createElement('button');recovery.type='button';recovery.className='auth-recovery';recovery.textContent='Forgot password?';recovery.addEventListener('click',()=>openPasswordReset());form.after(recovery)}if(form&&!form.dataset.auth&&!form.dataset.adminGate)form.addEventListener('submit',e=>{e.preventDefault();closeModal();showToast('Thanks — your request has been received.');});}
function openAdminGate(){openModal(`<p class="eyebrow">Private access</p><h2>Administrator sign in</h2><p>This control center is available only through the private StayNest access gate.</p><form id="adminGateForm" data-admin-gate="true"><label>Username</label><input name="username" autocomplete="username" required><label>Password</label><input name="password" type="password" autocomplete="current-password" required><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">Open admin control <span>→</span></button></form>`);content.querySelector('#adminGateForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;try{const result=await apiJson('/api/admin/gate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.elements.username.value,password:form.elements.password.value})});closeModal();window.location.assign(result.redirect||'/admin.html')}catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false}})}
document.querySelectorAll('.brand').forEach(brand=>brand.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();openAdminGate()},true));
function showAgentApproval(result){const contact=result?.approvalContact||{email:'cleysir54@gmail.com',whatsapp:'255794442907',displayPhone:'0794 442 907'};openModal(`<div class="approval-message"><div class="approval-icon" aria-hidden="true">✓</div><p class="eyebrow">Application received</p><h2>Your agent account is awaiting approval</h2><p>Thank you for applying to join StayNest in Tanzania. An administrator must verify your profile before you can sign in, publish homes, or manage bookings. We will review your application as soon as possible.</p><div class="approval-contact"><a href="mailto:${contact.email}"><span aria-hidden="true">✉</span><span><strong>Email support</strong><small>${contact.email}</small></span></a><a href="https://wa.me/${contact.whatsapp}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span><span><strong>WhatsApp support</strong><small>${contact.displayPhone}</small></span></a></div><button class="primary" id="approvalSignIn">Continue to sign in</button></div>`);content.querySelector('#approvalSignIn').onclick=()=>auth('login','Your application is pending administrator approval. You can sign in after the admin verifies your account.')}
function showHostApproval(){const contact={email:'cleysir54@gmail.com',whatsapp:'255794442907',displayPhone:'0794 442 907'};openModal(`<div class="approval-message"><div class="approval-icon" aria-hidden="true">i</div><p class="eyebrow">Hosting requires approval</p><h2>Become a StayNest agent</h2><p>To start hosting, your account must be reviewed and approved by a StayNest administrator. Your tenant account and bookings remain unchanged while the hosting request is reviewed.</p><p class="search-note">Please provide accurate identity and property information. Do not publish or accept bookings outside StayNest before approval.</p><div class="approval-contact"><a href="mailto:${contact.email}"><span aria-hidden="true">✉</span><span><strong>Admin email</strong><small>${contact.email}</small></span></a><a href="https://wa.me/${contact.whatsapp}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span><span><strong>WhatsApp</strong><small>${contact.displayPhone}</small></span></a></div><button class="primary" id="hostApprovalContinue">Apply for agent access <span>→</span></button></div>`);content.querySelector('#hostApprovalContinue').onclick=()=>auth('host')}
async function openListingDetails(x){try{const result=await apiJson(`/api/listings/${encodeURIComponent(x.id)}/details`);const listing=result.listing;const recent=JSON.parse(localStorage.getItem('staynest.recentListings')||'[]').filter(id=>Number(id)!==Number(listing.id));localStorage.setItem('staynest.recentListings',JSON.stringify([Number(listing.id),...recent].slice(0,12)));openModal(`<p class="eyebrow">Listing details</p><h2>${escapeHtml(listing.title)}</h2><p>${escapeHtml(listing.city||'')} ${listing.neighborhood?`· ${escapeHtml(listing.neighborhood)}`:''} · ★ ${Number(listing.rating||0).toFixed(1)} (${listing.reviewCount||0} reviews)</p><div class="listing-photo" style="height:220px;background-image:url('${safeMediaUrl(listing.coverUrl||DEFAULT_AGENT_AVATAR)}');margin:20px 0"></div>${Number.isFinite(Number(listing.latitude))&&Number.isFinite(Number(listing.longitude))?`<h3>Estate location</h3><div id="tenantListingMap" class="tenant-listing-map"></div><p class="map-status">Approximate map location for this estate.</p>`:`<p class="empty-copy">Location map is not available for this listing yet.</p>`}<p>${escapeHtml(listing.description||'')}</p><div class="feature-list"><div><b>01</b><span><strong>${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent'}</strong><small>${listing.bedrooms||0} bedrooms · ${listing.bathrooms||0} bathrooms · ${listing.responseHours?`Agent response ~${Math.round(listing.responseHours)}h`:'Response time available after contact'}</small></span></div></div><div class="listing-actions"><button class="primary" id="detailBook">Request booking <span>→</span></button><button class="outline-btn" id="detailSave">${listing.saved?'Saved':'Save favorite'}</button><button class="outline-btn" id="detailMessage">Contact agent</button><button class="outline-btn" id="detailCompare">Compare</button><button class="outline-btn" id="detailShare">Share</button><button class="outline-btn" id="detailReport">Report listing</button></div><h3>Similar listings</h3>${result.similar.length?result.similar.map(item=>`<button class="search-result" data-similar-id="${item.id}"><img src="${safeMediaUrl(item.coverUrl||DEFAULT_AGENT_AVATAR)}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city)} · ${item.currency} ${item.nightlyPrice||item.monthlyPrice||'Contact agent'}</small></span></button>`).join(''):'<p class="empty-copy">No similar listings found yet.</p>'}`);const tenantMapHost=content.querySelector('#tenantListingMap');if(tenantMapHost){const tenantMap=L.map(tenantMapHost,{scrollWheelZoom:false}).setView([Number(listing.latitude),Number(listing.longitude)],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(tenantMap);L.marker([Number(listing.latitude),Number(listing.longitude)]).addTo(tenantMap);setTimeout(()=>tenantMap.invalidateSize(),0)}content.querySelector('#detailBook').onclick=()=>{closeModal();openListing({...listing,id:listing.id,_booking:true,title:listing.title,location:listing.city,image:listing.coverUrl,rating:listing.rating,reviews:listing.reviewCount,tag:'Listing request'})};content.querySelector('#detailSave').onclick=async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;const saved=content.querySelector('#detailSave').textContent==='Saved';if(saved){await apiJson(`/api/listings/${listing.id}/save`,{method:'DELETE',headers:{'X-CSRF-Token':csrf}})}else await apiJson(`/api/listings/${listing.id}/save`,{method:'POST',headers:{'X-CSRF-Token':csrf}});content.querySelector('#detailSave').textContent=saved?'Save favorite':'Saved';showToast(saved?'Removed from favorites':'Saved to favorites')}catch(error){showToast(error.message)}};content.querySelector('#detailMessage').onclick=()=>openAgentMessage(listing.agentId,`${listing.firstName||'Listing'} ${listing.lastName||'agent'}`);content.querySelector('#detailCompare').onclick=()=>{const selected=JSON.parse(localStorage.getItem('staynest.compareListings')||'[]').filter(item=>Number(item.id)!==Number(listing.id));selected.push({id:listing.id,title:listing.title,price:listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent',city:listing.city,bedrooms:listing.bedrooms,bathrooms:listing.bathrooms,rating:listing.rating});localStorage.setItem('staynest.compareListings',JSON.stringify(selected.slice(-3)));openModal(`<p class="eyebrow">Listing comparison</p><h2>Compare saved listings</h2><div class="compare-grid">${selected.slice(-3).map(item=>`<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.city||'')}<br>${item.price}<br>${item.bedrooms||0} bedrooms · ${item.bathrooms||0} bathrooms<br>★ ${Number(item.rating||0).toFixed(1)}</small></div>`).join('')}</div>`)};content.querySelector('#detailShare').onclick=async()=>{const url=`${location.origin}/index.html?listing=${listing.id}`;if(navigator.share)await navigator.share({title:listing.title,url});else await navigator.clipboard.writeText(url);showToast('Listing link copied')};content.querySelector('#detailReport').onclick=()=>openListingReport(listing.id);content.querySelectorAll('[data-similar-id]').forEach(button=>button.onclick=()=>openListing({id:button.dataset.similarId}));}catch(error){showToast(error.message)}}
function openListingReport(id){openModal(`<p class="eyebrow">Safety report</p><h2>Report this listing</h2><form id="listingReportForm"><label>Reason<select name="reason" required><option value="fake">Fake listing</option><option value="misleading">Misleading information</option><option value="scam">Possible scam</option><option value="other">Other safety concern</option></select></label><label>Details<textarea name="details" maxlength="1000" required></textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Send report</button></form>`);content.querySelector('#listingReportForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{await apiJson('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityType:'listing',entityId:id,reason:form.elements.reason.value,details:form.elements.details.value})});closeModal();showToast('Report sent to StayNest administrators')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
function openListing(x){if(x.id&&!x._booking)return openListingDetails(x);if(currentUser?.roles?.includes('agent')){openModal(`<p class="eyebrow">Agent account</p><h2>Booking is for tenants</h2><p>Agent accounts manage listings and booking requests. Sign in with a tenant account to request a stay.</p>`);return}if(x.isDemo){openModal(`<p class="eyebrow">Preview home</p><h2>${x.title}</h2><p>${x.location} · ★ ${x.rating} (${x.reviews} reviews)</p><div class="listing-photo" style="height:180px;background-image:url('${x.image}');margin:20px 0"></div><p>This is a featured preview. Search for this home to request a booking from its assigned agent.</p>${currentUser?.roles?.includes('tenant')?'<p class="form-error">Search for this home to request a booking.</p>':'<button class="primary" id="loginToBook">Sign in to book <span>→</span></button>'}`);if(!currentUser)content.querySelector('#loginToBook').onclick=()=>auth('login');return}if(!currentUser&&!requireAccount('request a booking'))return;if(!currentUser?.roles?.includes('tenant'))return;openModal(`<p class="eyebrow">${x.tag||'Verified home'}</p><h2>${x.title}</h2><p>${x.location} · ★ ${x.rating} (${x.reviews} reviews)</p><div class="listing-photo" style="height:180px;background-image:url('${x.image||x.coverUrl||DEFAULT_AGENT_AVATAR}');margin:20px 0"></div><p>Send a booking request to the assigned agent. Your dates are held while the agent reviews the request.</p><form id="bookingForm"><label>Check-in</label><input name="checkIn" type="date" required><label>Check-out</label><input name="checkOut" type="date" required><label>Request type<select name="bookingKind"><option value="stay">Book a stay</option><option value="viewing">Request a viewing</option></select></label><label>Guests</label><input name="guests" type="number" min="1" max="20" value="1" required><p class="form-error" role="alert"></p><button class="primary" type="submit">Request to book <span>→</span></button></form>`);content.querySelector('#bookingForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({listingId:x.id,checkIn:form.elements.checkIn.value,checkOut:form.elements.checkOut.value,guests:Number(form.elements.guests.value),bookingKind:form.elements.bookingKind.value})});closeModal();showToast(`Booking request ${result.bookingCode} sent to the agent`)}catch(error){form.querySelector('.form-error').textContent=error.message}})}
function openPasswordReset(token=''){let resetToken=token;openModal(`<p class="eyebrow">${resetToken?'Set a new password':'Account recovery'}</p><h2>${resetToken?'Create a new password':'Forgot your password?'}</h2><p>${resetToken?'Choose a strong password with at least 12 characters and three character types.':'Enter your email and, if it matches a StayNest account, recovery instructions will be prepared.'}</p><form id="passwordResetForm">${resetToken?`<input type="hidden" name="token" value="${escapeHtml(resetToken)}"><label>New password</label><input name="password" type="password" autocomplete="new-password" minlength="12" required><label>Confirm new password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required>`:'<label>Email address</label><input name="email" type="email" autocomplete="email" required>'}<p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">${resetToken?'Update password':'Send recovery instructions'} <span>→</span></button></form>${resetToken?'':'<p class="auth-switch"><button type="button" id="backToLogin">Back to sign in</button></p>'}`);const form=content.querySelector('#passwordResetForm');form.onsubmit=async event=>{event.preventDefault();const errorBox=form.querySelector('.form-error'),button=form.querySelector('button');button.disabled=true;try{if(resetToken&&form.elements.password.value!==form.elements.confirmPassword.value)throw new Error('Passwords do not match.');const csrf=(await apiJson('/api/auth/csrf')).token;const endpoint=resetToken?'/api/auth/password-reset/complete':'/api/auth/password-reset/request';const body=resetToken?{token:resetToken,password:form.elements.password.value}:{email:form.elements.email.value};const result=await apiJson(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});if(resetToken){closeModal();showToast(result.message);auth('login')}else if(result.resetUrl){setSafeMarkup(content,`<p class="eyebrow">Recovery link ready</p><h2>Open your recovery link</h2><p>For this local development environment, use the link below. In production it will be delivered by email.</p><a class="primary" href="${escapeHtml(result.resetUrl)}">Reset password <span>→</span></a>`)}else{closeModal();showToast(result.message)}}catch(error){errorBox.textContent=error.message;button.disabled=false}};content.querySelector('#backToLogin')?.addEventListener('click',()=>auth('login'))}
function auth(mode,notice=''){const host=mode==='host';let signup=mode==='signup'||host;const renderAuth=()=>{openModal(`<p class="eyebrow">${host?'Join as an agent':signup?'Join StayNest':'Welcome to StayNest'}</p><h2>${host?'Start managing homes':signup?'Create your account':'Welcome back'}</h2><p>${signup?'Choose Tenant to book homes or Agent to manage properties.':'Sign in to access your bookings, messages, profile, and role workspace.'}</p>${notice?`<p class="search-note">${escapeHtml(notice)}</p>`:''}<a class="google-auth-btn" href="/api/auth/google" aria-label="Sign in with Google" title="Sign in with Google"><svg class="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.74-.07-1.46-.21-2.14H12v4.06h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.31Z"/><path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.49-4.03H3.27v2.53A9.75 9.75 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.51 13.58A5.86 5.86 0 0 1 6.2 12c0-.55.11-1.08.31-1.58V7.89H3.27A9.5 9.5 0 0 0 2.25 12c0 1.48.36 2.88 1.02 4.11l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.36 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.73 5.39l3.24 2.53C7.29 8.11 9.45 6.39 12 6.39Z"/></svg><span>Continue with Google</span></a><div class="auth-divider"><span>or use your email</span></div><form data-auth="${signup?'register':'login'}">${signup?`<label>I want to</label><select name="role" required><option value="tenant">Tenant — rent or book a home</option><option value="agent" ${host?'selected':''}>Agent — manage properties and bookings</option></select><label>First name</label><input name="firstName" autocomplete="given-name" required><label>Last name</label><input name="lastName" autocomplete="family-name" required>`:''}<label>Email address</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required><label>Password</label><input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="12" placeholder="At least 12 characters" required>${!signup?'':''}<label class="check-row"><input name="rememberMe" type="checkbox"> Remember me on this device</label><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">${signup?'Create account':'Sign in'} <span>→</span></button></form><p class="auth-switch">${signup?'Already have an account?':'New to StayNest?'} <button type="button" id="authSwitch">${signup?'Sign in':'Create an account'}</button></p>`);const form=content.querySelector('form'),submit=form.querySelector('button[type="submit"]'),errorBox=form.querySelector('.form-error');form.addEventListener('submit',async e=>{e.preventDefault();errorBox.textContent='';submit.disabled=true;submit.classList.add('loading');const data=Object.fromEntries(new FormData(form));data.rememberMe=Boolean(form.elements.rememberMe.checked);try{const csrf=await apiJson('/api/auth/csrf');const result=await apiJson(`/api/auth/${form.dataset.auth}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token},body:JSON.stringify(data)});if(result.mfaRequired){errorBox.textContent='Multi-factor authentication is not available in this login form yet.';return}if(result.pendingApproval){showAgentApproval(result);return}closeModal();const signedInUser=(await apiJson('/api/auth/me')).user;sessionStorage.setItem('stayNest.tabUser',JSON.stringify({id:signedInUser?.id,roles:signedInUser?.roles||[]}));await updateAuthControls(signedInUser);showToast(signup?'Account created — you are now signed in.':'Signed in successfully.');if(signup&&data.role==='tenant'){window.location.assign('/index.html#explore');return}else showRoleDashboard(result.roles||[data.role]);}catch(error){errorBox.textContent=error.message;showToast(error.message)}finally{submit.disabled=false;submit.classList.remove('loading')}});content.querySelector('#authSwitch').onclick=()=>{signup=!signup;renderAuth()}};renderAuth()}
function openGoogleSetup(){openModal(`<p class="eyebrow">Complete your profile</p><h2>Welcome to StayNest</h2><p>Your Google email is verified. Set a StayNest password so you can also sign in with this email when Google is unavailable.</p><form id="googleSetupForm"><label>Phone number</label><input name="phone" type="tel" autocomplete="tel" placeholder="+255 700 000 000" required><label>City or location</label><input name="location" autocomplete="address-level2" placeholder="Dar es Salaam" maxlength="100" required><label>How will you use StayNest?</label><select name="role" required><option value="tenant">Tenant — rent or book a home</option><option value="agent">Agent — manage properties and bookings</option></select><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">Create my StayNest account <span>→</span></button></form>`);content.querySelector('#googleSetupForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,errorNode=form.querySelector('.form-error'),button=form.querySelector('button');button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson('/api/auth/google/complete',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({phone:form.elements.phone.value,location:form.elements.location.value,role:form.elements.role.value})});if(result.pendingApproval){showAgentApproval(result);return}closeModal();const googleUser=(await apiJson('/api/auth/me')).user;sessionStorage.setItem('stayNest.tabUser',JSON.stringify({id:googleUser?.id,roles:googleUser?.roles||[]}));await updateAuthControls(googleUser);showToast('Your StayNest account is ready.');if(form.elements.role.value==='tenant')location.hash='explore';else showRoleDashboard(result.roles||['agent']);}catch(error){errorNode.textContent=error.message;button.disabled=false}})}
async function showRoleDashboard(roles){const role=roles.includes('agent')?'agent':'tenant';let data={};try{data=await apiJson(role==='agent'?'/api/agent/summary':'/api/account/summary')}catch(error){showToast(error.message);return}const contentByRole=role==='agent'?{title:'Agent workspace',intro:'Manage assigned homes and booking operations.',items:[`${data.assignedListings||0} assigned listings`,` ${data.pendingBookings||0} pending booking requests`,'Create a listing','Upload identity documents','Manage listing media']}:{title:'Your tenant workspace',intro:'Book homes and manage your stays from one secure account.',items:[`${data.upcomingBookings||0} upcoming bookings`,`${data.savedHomes||0} saved homes`,`${data.searchAlerts||0} active search alerts`,'Messages with agents','Reviews and ratings']};openModal(`<p class="eyebrow">${role} workspace</p><h2>${contentByRole.title}</h2><p>${contentByRole.intro}</p><div class="feature-list">${contentByRole.items.map((item,index)=>`<div><b>0${index+1}</b><span><strong>${item}</strong><small>Available from your authenticated ${role} account</small></span></div>`).join('')}</div>${role==='agent'?'<button class="primary" id="createListingAction">Create listing <span>→</span></button><button class="outline-btn" id="listingManagerAction">My listings</button><button class="outline-btn" id="bookingRequestsAction">Review booking requests</button><button class="outline-btn" id="profileAction">Manage public profile</button>':'<button class="primary" id="bookingsAction">Open my bookings <span>→</span></button>'}`);content.querySelector('#createListingAction, #bookingsAction').addEventListener('click',()=>{if(role==='agent')openAgentListingForm();else loadTenantBookings()});content.querySelector('#listingManagerAction')?.addEventListener('click',openAgentListings);content.querySelector('#bookingRequestsAction')?.addEventListener('click',loadAgentBookings);content.querySelector('#profileAction')?.addEventListener('click',openOwnAgentProfile)}
async function openOwnProfile(preferredRole=''){const result=await apiJson('/api/auth/me');const user=result.user;if(!user?.id)return requireAccount('view your profile');const roles=Array.isArray(user.roles)?user.roles:[];const role=preferredRole&&roles.includes(preferredRole)?preferredRole:roles.includes('tenant')?'tenant':roles.includes('agent')?'agent':'';if(role==='tenant')return openOwnTenantProfile();if(role==='agent')return openOwnAgentProfile();showToast('Your account does not have a profile workspace yet');return false}
async function openOwnAgentProfile(){closeModal();const me=(await apiJson('/api/auth/me')).user;if(!me?.id||!me.roles?.includes('agent'))return openOwnProfile('tenant');document.body.classList.remove('tenant-view');document.body.classList.add('role-view');history.replaceState({},'',`/index.html?view=agent&agent=${encodeURIComponent(me.mainAgentId||me.id)}`);return openAgentProfile(me.mainAgentId||me.id,true)}
async function openOwnTenantProfile(){closeModal();const me=(await apiJson('/api/auth/me')).user;if(!me?.id||!me.roles?.includes('tenant'))return openOwnProfile('agent');document.body.classList.remove('agent-marketplace-view','role-view');document.body.classList.add('tenant-view');history.replaceState({},'','/index.html?view=tenant');const result=await apiJson('/api/tenant/profile');const {profile,following,wishlist}=result;pageMain.innerHTML=`<section class="agent-page tenant-page"><div class="agent-page-top"><button class="outline-btn" id="tenantBackHome">← Explore StayNest</button><span class="eyebrow">Your private StayNest profile</span></div><div class="agent-page-hero"><img class="agent-page-avatar" src="${profile.avatarUrl||DEFAULT_AGENT_AVATAR}" alt="${profile.firstName} ${profile.lastName}"><div class="agent-page-copy"><p class="eyebrow">Tenant profile</p><h1>${profile.firstName} ${profile.lastName}</h1><p class="agent-page-bio">${profile.bio||'Your saved homes and trusted agents, all in one place.'}</p><div class="agent-page-stats"><span><strong>${wishlist.length}</strong>saved homes</span><span><strong>${following.length}</strong>following</span></div><p class="agent-page-contact">${profile.email}</p><div class="agent-profile-actions"><button class="primary" id="editTenantProfile">Edit profile <span>→</span></button><button class="outline-btn" id="tenantBookingsProfile">My bookings</button></div></div></div><div class="tenant-sections"><div><div class="agent-page-toolbar"><h2>Following</h2><span>Agents you trust</span></div>${following.length?following.map(agent=>`<button class="search-result" data-agent-id="${agent.id}">${agentAvatar(agent.profileImageUrl,agent.badgeLabel,`${agent.firstName} ${agent.lastName}`)}<span><strong>${agent.firstName} ${agent.lastName}</strong><small>${agent.bio||'StayNest agent'}</small></span></button>`).join(''):'<p class="empty-copy">You are not following any agents yet. Explore an agent profile to follow them.</p>'}</div><div><div class="agent-page-toolbar"><h2>Wishlist</h2><span>Homes you saved</span></div><div class="tenant-wishlist">${wishlist.length?wishlist.map(home=>`<article class="search-result" data-listing-id="${home.id}" role="button" tabindex="0"><img src="${home.coverUrl||DEFAULT_AGENT_AVATAR}" alt=""><span><strong>${home.title}</strong><small>${home.city} · ${home.currency} ${home.nightlyPrice||home.monthlyPrice||'Contact agent'}</small></span></article>`).join(''):'<p class="empty-copy">Your wishlist is empty. Save a home while exploring to see it here.</p>'}</div></div></div></section>`;document.querySelector('#tenantBackHome').onclick=()=>location.href='/index.html?v=20260912-auth-bookings1#top';document.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>openAgentProfile(button.dataset.agentId,false));document.querySelectorAll('.tenant-wishlist .search-result').forEach(button=>button.onclick=()=>openListing({id:button.dataset.listingId}));document.querySelector('#editTenantProfile').onclick=()=>openTenantProfileEditor(profile);document.querySelector('#tenantBookingsProfile').onclick=loadTenantBookings;window.scrollTo({top:0,behavior:'smooth'})}
function openTenantProfileEditor(profile){openModal(`<p class="eyebrow">Tenant profile</p><h2>Edit your profile</h2><form id="tenantProfileForm"><label>Profile photo</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>First name</label><input name="firstName" value="${escapeHtml(profile.firstName||'')}" maxlength="80" required><label>Last name</label><input name="lastName" value="${escapeHtml(profile.lastName||'')}" maxlength="80" required><label>Phone number</label><input name="phone" type="tel" value="${escapeHtml(profile.phone||'')}" placeholder="+255 700 000 000"><label>City or location</label><input name="city" value="${escapeHtml(profile.city||'')}" maxlength="100" placeholder="Dar es Salaam"><label>About you</label><textarea name="bio" maxlength="5000">${escapeHtml(profile.bio||'')}</textarea><p class="form-error" role="alert"></p><button class="primary" type="submit">Save profile</button></form>`);content.querySelector('#tenantProfileForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const photo=form.elements.profilePic.files[0];if(photo){const data=new FormData();data.append('profilePic',photo);await apiJson('/api/tenant/profile/photo',{method:'POST',headers:{'X-CSRF-Token':csrf},body:data})}await apiJson('/api/tenant/profile',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,phone:form.elements.phone.value,city:form.elements.city.value,bio:form.elements.bio.value})});closeModal();showToast('Profile updated');await openOwnTenantProfile();await updateAuthControls((await apiJson('/api/auth/me')).user)}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function openAgentFollowList(id,kind){const result=await apiJson(`/api/agents/${id}/${kind}`);openModal(`<p class="eyebrow">Agent network</p><h2>${kind==='followers'?'Followers':'Following'}</h2>${result.users.length?result.users.map(user=>`<button class="search-result" data-user-id="${user.id}" data-role="${user.role}">${user.role==='agent'?agentAvatar(user.profileImageUrl,user.badgeLabel,`${user.firstName} ${user.lastName}`):''}<span><strong>${user.firstName} ${user.lastName}</strong><small>${user.role==='agent'?'Open agent profile':'StayNest tenant'}</small></span></button>`).join(''):'<p>No profiles here yet.</p>'}`);content.querySelectorAll('[data-user-id]').forEach(button=>button.onclick=()=>{if(button.dataset.role!=='agent'){showToast('Tenant profiles are private');return}closeModal();openAgentProfile(button.dataset.userId,false)})}
function openAgentMessage(id,name){if(!requireAccount('message other members'))return;openModal(`<p class="eyebrow">Private message</p><h2>Message ${escapeHtml(name)}</h2><p>Your message will open a secure conversation with this StayNest member.</p><form id="messageForm"><textarea name="body" maxlength="2000" minlength="1" required placeholder="Write a respectful message"></textarea><p class="form-error" role="alert"></p><div class="auth-prompt-actions"><button class="primary" type="submit">Send message <span>→</span></button><button class="outline-btn" type="button" id="openInboxAfterMessage">Open inbox</button></div></form>`);content.querySelector('#openInboxAfterMessage').onclick=openMessages;content.querySelector('#messageForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token},body:JSON.stringify({recipientId:Number(id),body:form.elements.body.value.trim()})});closeModal();showToast('Message sent securely. Open your inbox to continue the conversation.');openMessages()}catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false}})}
async function openAgentProfileModal(id,owner=false){if(!requireAccount('view agent profiles'))return;const result=await apiJson(`/api/agents/${id}/profile`);const {profile,posts}=result;let isFollowing=Boolean(result.following);const avatar=safeMediaUrl(profile.profileImageUrl||profile.avatarUrl);const postMarkup=posts.length?posts.map(post=>`<article class="agent-post ${post.status==='pending_review'?'agent-post-pending':''}" data-post-id="${post.id}" data-liked="${post.liked?'true':'false'}" title="${post.title}">${post.status==='pending_review'?'<span class="agent-post-status">Pending review</span>':''}${post.mediaType==='video'?`<video src="${post.coverUrl||''}" muted preload="metadata"></video>`:`<img src="${post.coverUrl||''}" alt="${post.title}" loading="lazy">`}<div class="agent-post-overlay"><button class="post-like-button" data-post-like="${post.id}" aria-label="Like post">♥</button><span><b data-post-likes>${post.likes||0}</b> likes · <b data-post-views>${post.views||0}</b> views</span></div></article>`).join(''):'<div class="agent-post-empty">No published posts yet. Create a listing and it will appear here after moderation.</div>';openModal(`<div class="agent-profile"><p class="eyebrow">StayNest agent profile</p><div class="agent-profile-head"><img class="agent-profile-avatar" src="${avatar}" alt="${profile.firstName} ${profile.lastName}" onerror="this.style.display='none'"><div><h2>${profile.firstName} ${profile.lastName}${agentBadge(profile.badgeLabel)}</h2><p>${profile.bio||'StayNest property professional.'}</p><div class="agent-profile-stats"><span><strong>${posts.length}</strong>posts</span><span><strong>${profile.followers||0}</strong>followers</span><span><strong>${profile.following||0}</strong>following</span></div><small>${profile.phone||'Phone not provided'} · ${profile.email||''}</small></div></div><div class="agent-profile-actions">${owner?'<button class="primary" id="createProfilePost">Create post <span>→</span></button><button class="outline-btn" id="editProfileAction">Edit profile</button>':`<button class="primary" id="messageAgentAction">✉ Message</button><button class="outline-btn" id="followAgentAction">${isFollowing?'Unfollow':'Follow agent'}</button>`}</div><h3>Posts</h3><div class="agent-post-grid">${postMarkup}</div></div>`);setupPostEngagement(content);content.querySelector('#followAgentAction')?.addEventListener('click',async()=>{try{const button=content.querySelector('#followAgentAction');button.disabled=true;const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson(`/api/agents/${id}/follow`,{method:isFollowing?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});updateAgentFollowUI(result);isFollowing=Boolean(result.following);showToast(result.following?'Agent followed':'Agent unfollowed')}catch(error){content.querySelector('#followAgentAction').disabled=false;showToast(error.message)}});content.querySelector('#messageAgentAction')?.addEventListener('click',()=>openAgentMessage(id,`${profile.firstName} ${profile.lastName}`));content.querySelector('#editProfileAction')?.addEventListener('click',()=>openAgentProfileEditor(profile));content.querySelector('#createProfilePost')?.addEventListener('click',openAgentListingForm)}
async function openAgentProfile(id,owner=false){if(owner&&!currentUser)return requireAccount('manage your agent profile');if(owner)document.body.classList.add('role-view');history.replaceState({},'',`/index.html?view=agent&agent=${encodeURIComponent(id)}`);const result=await apiJson(`/api/agents/${id}/profile`);const {profile,posts}=result;let isFollowing=Boolean(result.following);const avatar=safeMediaUrl(profile.profileImageUrl||profile.avatarUrl);const postMarkup=posts.length?posts.map(post=>`<article class="agent-post ${post.status==='pending_review'?'agent-post-pending':''}" data-post-id="${post.id}" data-liked="${post.liked?'true':'false'}" title="${post.title}">${post.status==='pending_review'?'<span class="agent-post-status">Pending review</span>':''}${post.mediaType==='video'?`<video src="${post.coverUrl||''}" muted preload="metadata"></video>`:`<img src="${post.coverUrl||''}" alt="${post.title}" loading="lazy">`}<div class="agent-post-overlay"><button class="post-like-button" data-post-like="${post.id}" aria-label="Like post">♥</button><span><b data-post-likes>${post.likes||0}</b> likes · <b data-post-views>${post.views||0}</b> views</span></div></article>`).join(''):'<div class="agent-post-empty">No published posts yet. Create a post and it will appear here after moderation.</div>';pageMain.innerHTML=`<section class="agent-page"><div class="agent-page-top"><button class="outline-btn" id="backHome">← Explore StayNest</button><span class="eyebrow">StayNest agent</span></div><div class="agent-page-hero"><img class="agent-page-avatar" src="${avatar}" alt="${profile.firstName} ${profile.lastName}"><div class="agent-page-copy"><p class="eyebrow">Verified property professional</p><h1>${profile.firstName} ${profile.lastName}${profile.badgeLabel?` ${agentBadge(profile.badgeLabel)}`:''}</h1><p class="agent-page-bio">${profile.agencyName?`${escapeHtml(profile.agencyName)} · `:''}${profile.bio||'Curating places that feel like home.'}</p><div class="agent-page-stats"><button class="profile-stat-link" id="postsStat"><strong>${posts.length}</strong>posts</button><button class="profile-stat-link" id="followersStat"><strong>${profile.followers||0}</strong>followers</button><button class="profile-stat-link" id="followingStat"><strong>${profile.following||0}</strong>following</button></div><p class="agent-page-contact">${profile.phone||'Phone not provided'} ${profile.email?`· ${profile.email}`:''}</p><div class="agent-profile-actions">${owner?'<button class="primary" id="createProfilePost">Create post <span>→</span></button><button class="outline-btn" id="editProfileAction">Edit profile</button>':`<button class="primary" id="messageAgentAction">✉ Message</button><button class="outline-btn" id="followAgentAction">${isFollowing?'Unfollow':'Follow agent'}</button>`}</div></div></div><div class="agent-page-toolbar"><h2>Posts</h2><span>${posts.length} published ${posts.length===1?'post':'posts'}</span></div><div class="agent-post-grid">${postMarkup}</div></section>`;setupPostEngagement(pageMain);document.querySelector('#backHome').onclick=()=>{location.href='/index.html?v=20260912-agent-profile6#top'};document.querySelector('#followersStat')?.addEventListener('click',()=>openAgentFollowList(id,'followers'));document.querySelector('#followingStat')?.addEventListener('click',()=>openAgentFollowList(id,'following'));document.querySelector('#messageAgentAction')?.addEventListener('click',()=>openAgentMessage(id,`${profile.firstName} ${profile.lastName}`));document.querySelector('#followAgentAction')?.addEventListener('click',async()=>{if(!requireAccount('follow agents'))return;const button=document.querySelector('#followAgentAction');try{button.disabled=true;const csrf=(await apiJson('/api/auth/csrf')).token;const result=await apiJson(`/api/agents/${id}/follow`,{method:isFollowing?'DELETE':'POST',headers:{'X-CSRF-Token':csrf}});updateAgentFollowUI(result);isFollowing=Boolean(result.following);showToast(result.following?'Agent followed':'Agent unfollowed');button.disabled=false}catch(error){button.disabled=false;showToast(error.message)}});document.querySelector('#editProfileAction')?.addEventListener('click',()=>openAgentProfileEditor(profile));document.querySelector('#createProfilePost')?.addEventListener('click',openAgentListingForm);window.scrollTo({top:0,behavior:'smooth'})}
function openAgentProfileEditor(profile){openModal(`<p class="eyebrow">Agent profile</p><h2>Manage your profile</h2><form id="profileForm"><label>Profile photo</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>First name</label><input name="firstName" value="${escapeHtml(profile.firstName||'')}" maxlength="80" required><label>Last name</label><input name="lastName" value="${escapeHtml(profile.lastName||'')}" maxlength="80" required><label>Phone</label><input name="phone" type="tel" value="${escapeHtml(profile.phone||'')}" placeholder="+255 700 000 000"><label>City or location</label><input name="city" value="${escapeHtml(profile.city||'')}" maxlength="100" placeholder="Dar es Salaam"><label>Bio</label><textarea name="bio" maxlength="5000">${escapeHtml(profile.bio||'')}</textarea><p class="form-error" role="alert"></p><button class="primary" type="submit">Save profile</button></form>`);content.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,errorBox=form.querySelector('.form-error');try{const csrf=(await apiJson('/api/auth/csrf')).token;const photo=form.elements.profilePic.files[0];if(photo){const photoData=new FormData();photoData.append('profilePic',photo);await apiJson('/api/agent/profile/photo',{method:'POST',headers:{'X-CSRF-Token':csrf},body:photoData})}await apiJson('/api/agent/profile',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,phone:form.elements.phone.value,city:form.elements.city.value,bio:form.elements.bio.value})});closeModal();showToast('Profile updated');await openOwnAgentProfile()}catch(error){errorBox.textContent=error.message}})}
async function openAgentListings(){try{const result=await apiJson('/api/host/listings');openModal(`<p class="eyebrow">Agent workspace</p><h2>Your listings</h2><p class="search-note">Manage every listing and watch moderation or publication status update from the database.</p><div class="listing-manager">${result.listings.length?result.listings.map(listing=>`<div class="listing-manager-row"><span><strong>${escapeHtml(listing.title)}</strong><small>${escapeHtml(listing.status.replaceAll('_',' '))} · ${escapeHtml(listing.rental_mode||'short term')} · Updated ${new Date(listing.updated_at).toLocaleString()}</small></span><span class="status-pill">${escapeHtml(listing.status)}</span></div>`).join(''):'<p class="empty-copy">You have not submitted a listing yet.</p>'}</div><button class="primary" id="newListingFromManager">List another place <span>→</span></button>`);content.querySelector('#newListingFromManager').onclick=openAgentListingForm}catch(error){showToast(error.message)}}
function openAgentListingForm(){openModal(`<p class="eyebrow">Agent workspace</p><h2>Create a listing</h2><p>Your registration document and at least one estate image or video are required. Search the address with OpenStreetMap so guests can find the property accurately.</p><form id="agentListingForm" enctype="multipart/form-data"><label>Title</label><input name="title" required><label>Description / caption</label><textarea name="description" required></textarea><label>Address</label><div class="location-search-row"><input name="addressLine1" id="listingAddress" required placeholder="Street address"><button class="outline-btn" type="button" id="findListingLocation">Find on map</button></div><label>City</label><input name="city" required><input type="hidden" name="latitude"><input type="hidden" name="longitude"><div class="listing-map-wrap"><div id="listingMap" aria-label="OpenStreetMap listing location"></div><p id="listingMapStatus" class="map-status">Search for the exact property address to place it on the map.</p></div><label>Rental duration</label><select name="rentalMode"><option value="short_term">Nightly</option><option value="long_term">Monthly</option><option value="both">Nightly, monthly, or yearly</option></select><label>Nightly price</label><input name="nightlyPrice" type="number" min="1" step="0.01"><label>Monthly price</label><input name="monthlyPrice" type="number" min="1" step="0.01"><label>Yearly price</label><input name="yearlyPrice" type="number" min="1" step="0.01"><label>Registration document</label><input name="document" type="file" accept=".pdf,image/jpeg,image/png" required><label>Estate image or video</label><input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple required><label>Media caption</label><input name="caption0" maxlength="255" placeholder="Describe the first image or video"><p class="form-error" role="alert"></p><button class="primary" type="submit">Submit for review <span>→</span></button></form>`);const form=content.querySelector('#agentListingForm'),mapHost=content.querySelector('#listingMap'),status=content.querySelector('#listingMapStatus'),errorBox=form.querySelector('.form-error');const map=L.map(mapHost).setView([-6.8,39.25],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);let marker=null;const setLocation=(latitude,longitude,label='Exact estate location selected')=>{form.elements.latitude.value=latitude;form.elements.longitude.value=longitude;if(marker)marker.setLatLng([latitude,longitude]);else{marker=L.marker([latitude,longitude],{draggable:true}).addTo(map);marker.on('dragend',()=>{const point=marker.getLatLng();setLocation(point.lat,point.lng)})}status.textContent=`${label} (${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)})`;status.classList.add('map-status-success')};map.on('click',event=>setLocation(event.latlng.lat,event.latlng.lng));setTimeout(()=>map.invalidateSize(),0);content.querySelector('#findListingLocation').onclick=async()=>{const address=[form.elements.addressLine1.value,form.elements.city.value].filter(Boolean).join(', '),button=content.querySelector('#findListingLocation');if(address.length<4){status.textContent='Enter an address and city first.';return}button.disabled=true;status.textContent='Searching OpenStreetMap…';try{const result=await apiJson(`/api/agent/geocode?address=${encodeURIComponent(address)}`),location=result.location;map.setView([location.latitude,location.longitude],17);setLocation(location.latitude,location.longitude,'Search result - click the map or drag the marker to pinpoint the estate')}catch(error){status.textContent=error.message;status.classList.remove('map-status-success')}finally{button.disabled=false}};form.addEventListener('submit',async e=>{e.preventDefault();try{if(!form.elements.latitude.value)throw new Error('Search and confirm the listing location on the map first.');const csrf=await apiJson('/api/auth/csrf');await apiJson('/api/agent/listings',{method:'POST',headers:{'X-CSRF-Token':csrf.token},body:new FormData(form)});closeModal();showToast('Listing submitted for moderation.');await openOwnAgentProfile()}catch(error){errorBox.textContent=error.message}})}
async function loadTenantBookings(){const result=await apiJson('/api/account/bookings');const statusLabel={pending:'Request sent — awaiting agent review',payment_pending:'Payment pending',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled',completed:'Completed'};openModal(`<p class="eyebrow">Tenant workspace</p><h2>My bookings</h2><p class="search-note">Your booking requests and their latest status are loaded directly from StayNest. Agents review pending requests and you will be notified when they decide.</p>${result.bookings.length?result.bookings.map(booking=>`<div class="feature-list booking-card"><div><b class="booking-status ${escapeHtml(booking.status)}">${escapeHtml(statusLabel[booking.status]||booking.status.replaceAll('_',' '))}</b><span><strong>${escapeHtml(booking.title)}</strong><small>${escapeHtml(booking.check_in)} to ${escapeHtml(booking.check_out)} · ${escapeHtml(booking.currency)} ${escapeHtml(booking.total_amount)} · Booking ${escapeHtml(booking.booking_code)}</small></span>${['pending','payment_pending','confirmed'].includes(booking.status)?`<button class="outline-btn" data-reschedule-booking="${booking.id}">Reschedule</button><button class="outline-btn" data-review-booking="${booking.id}" data-listing-id="${booking.listing_id}">Review</button><button class="outline-btn" data-cancel-booking="${booking.id}">Cancel request</button>`:''}</div></div>`).join(''):'<p class="empty-copy">You have no bookings yet. Search for a published home to send a request.</p>'}`);content.querySelectorAll('[data-cancel-booking]').forEach(button=>button.onclick=async()=>{if(!window.confirm('Cancel this booking request?'))return;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/bookings/${button.dataset.cancelBooking}/cancel`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf.token},body:JSON.stringify({reason:'Cancelled by tenant'})});showToast('Booking request cancelled');await loadTenantBookings()}catch(error){showToast(error.message)}});content.querySelectorAll('[data-reschedule-booking]').forEach(button=>button.onclick=()=>openRescheduleBooking(button.dataset.rescheduleBooking));content.querySelectorAll('[data-review-booking]').forEach(button=>button.onclick=()=>openBookingReview(button.dataset.reviewBooking,button.dataset.listingId))}
function openRescheduleBooking(id){openModal(`<p class="eyebrow">Booking change</p><h2>Reschedule request</h2><form id="rescheduleForm"><label>New check-in<input name="checkIn" type="date" required></label><label>New check-out<input name="checkOut" type="date" required></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Request new dates</button></form>`);content.querySelector('#rescheduleForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/bookings/${id}/reschedule`,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({checkIn:form.elements.checkIn.value,checkOut:form.elements.checkOut.value})});closeModal();showToast('Reschedule request sent');await loadTenantBookings()}catch(error){form.querySelector('.form-error').textContent=error.message}}}
function openBookingReview(bookingId,listingId){openModal(`<p class="eyebrow">StayNest review</p><h2>Rate your stay</h2><form id="bookingReviewForm"><label>Rating<select name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><label>Review<textarea name="comment" maxlength="5000" required></textarea></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Publish review</button></form>`);content.querySelector('#bookingReviewForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{await apiJson(`/api/listings/${listingId}/reviews`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId,rating:Number(form.elements.rating.value),comment:form.elements.comment.value})});closeModal();showToast('Thank you for your review')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function loadAgentBookings(){const result=await apiJson('/api/agent/bookings');openModal(`<p class="eyebrow">Agent workspace</p><h2>Booking requests</h2>${result.bookings.length?result.bookings.map(booking=>`<div class="booking-request"><div><strong>${booking.title}</strong><small>${booking.firstName} ${booking.lastName} · ${booking.email||booking.phone||'Contact available in profile'}<br>${booking.checkIn} to ${booking.checkOut} · ${booking.guests} guest(s) · ${booking.currency} ${booking.totalAmount}</small></div>${booking.status==='pending'?`<div class="booking-actions"><button class="primary" data-booking-decision="${booking.id}" data-status="confirmed">Approve</button><button class="outline-btn" data-booking-decision="${booking.id}" data-status="declined">Decline</button><button class="icon-btn" data-booking-message="${booking.tenantId}" data-name="${booking.firstName} ${booking.lastName}" aria-label="Message tenant">✉</button></div>`:`<span class="booking-status">${booking.status}</span>`}</div>`).join(''):'<p class="empty-copy">No booking requests yet.</p>'}`);content.querySelectorAll('[data-booking-decision]').forEach(button=>button.onclick=async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/bookings/${button.dataset.bookingDecision}/decision`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({status:button.dataset.status})});showToast(button.dataset.status==='confirmed'?'Booking approved and tenant notified':'Booking declined and tenant notified');loadAgentBookings()}catch(error){showToast(error.message)}});content.querySelectorAll('[data-booking-message]').forEach(button=>button.onclick=()=>openAgentMessage(button.dataset.bookingMessage,button.dataset.name))}
async function openMessages(){try{const result=await apiJson('/api/messages');openModal(`<p class="eyebrow">StayNest inbox</p><h2>Your messages</h2><p class="modal-intro">Continue conversations with tenants and agents from one secure inbox.</p><div class="message-list">${result.conversations.length?result.conversations.map(item=>`<button class="message-thread ${Number(item.unread)>0?'unread':''}" data-conversation-id="${item.conversationId}" data-recipient-id="${item.otherUserId}"><span><strong>${item.otherFirstName} ${item.otherLastName}</strong><small>${item.lastMessage||'No messages yet'}</small></span><time>${item.lastMessageAt?new Date(item.lastMessageAt).toLocaleString():''}</time></button>`).join(''):'<p class="empty-copy">Your inbox is empty. Open an agent profile to start a conversation.</p>'}</div>`);content.querySelectorAll('[data-conversation-id]').forEach(thread=>thread.addEventListener('click',()=>openConversation(thread.dataset.conversationId,thread.querySelector('strong').textContent,thread.dataset.recipientId)))}catch(error){showToast(error.message)}}
async function openConversation(id,name,recipientId){try{const result=await apiJson(`/api/messages/${id}`);openModal(`<p class="eyebrow">Conversation</p><h2>${escapeHtml(name)}</h2><p class="conversation-participants"><strong>From:</strong> ${escapeHtml(name)} <span>↔</span> <strong>To:</strong> ${escapeHtml(currentUser?.firstName||'You')} ${escapeHtml(currentUser?.lastName||'')}</p><div class="conversation-list">${result.messages.map(message=>`<div class="conversation-message ${Number(message.senderId)===Number(currentUser.id)?'mine':''}"><p>${escapeHtml(message.body)}</p><small>${new Date(message.createdAt).toLocaleString()}</small></div>`).join('')}</div><form id="replyMessageForm"><textarea name="body" maxlength="2000" required placeholder="Write a reply to ${name}"></textarea><p class="form-error" role="alert" aria-live="polite"></p><button class="primary" type="submit">Send reply <span>→</span></button></form>`);content.querySelector('#replyMessageForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({recipientId:recipientId||result.messages.find(message=>Number(message.senderId)!==Number(currentUser.id))?.senderId,body:form.elements.body.value})});await openConversation(id,name,recipientId)}catch(error){form.querySelector('.form-error').textContent=error.message}})}catch(error){showToast(error.message)}}
async function openBookingDetails(id){try{const result=await apiJson(`/api/bookings/${encodeURIComponent(id)}`),booking=result.booking;openModal(`<p class="eyebrow">Booking request</p><h2>${escapeHtml(booking.title)}</h2><div class="feature-list"><div><b>${escapeHtml(booking.status)}</b><span><strong>${escapeHtml(booking.bookingCode)}</strong><small>${escapeHtml(booking.bookingKind||'stay')} · ${escapeHtml(booking.checkIn)} to ${escapeHtml(booking.checkOut)} · ${booking.guests} guest(s)<br>${escapeHtml(booking.city||'')} · ${escapeHtml(booking.addressLine1||'')}</small></span></div><div><b>Guest</b><span><strong>${escapeHtml(`${booking.firstName||''} ${booking.lastName||''}`.trim())}</strong><small>${escapeHtml(booking.email||booking.phone||'Contact through messages')}</small></span></div></div>${currentUser?.roles?.includes('agent')&&booking.status==='pending'?'<div class="booking-actions"><button class="primary" id="approveBooking">Approve</button><button class="outline-btn" id="declineBooking">Decline</button></div>':''}`);content.querySelector('#approveBooking')?.addEventListener('click',()=>decideBooking(booking.id,'confirmed'));content.querySelector('#declineBooking')?.addEventListener('click',()=>decideBooking(booking.id,'declined'))}catch(error){showToast(error.message)}}
async function decideBooking(id,status){try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/bookings/${id}/decision`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({status})});closeModal();showToast(status==='confirmed'?'Booking approved and tenant notified':'Booking declined and tenant notified');await loadAgentBookings()}catch(error){showToast(error.message)}}
async function openNotifications(){const result=await apiJson('/api/notifications');const actionFor=notification=>{let data=notification.data;try{if(typeof data==='string')data=JSON.parse(data)}catch{data={}}if(String(notification.type||'').startsWith('booking_')||notification.type==='booking_request')return `<button class="outline-btn notification-action" data-booking-id="${Number(data?.bookingId)||0}">View booking</button>`;if(notification.type==='new_message')return '<button class="outline-btn notification-action" data-open-messages="true">Open message</button>';return ''};openModal(`<p class="eyebrow">StayNest updates</p><h2>Notifications</h2><p class="modal-intro">Important updates about your account, bookings, messages, and agent activity.</p><button class="primary small notification-messages" type="button">Open messages</button>${result.notifications.length?result.notifications.map(notification=>`<article class="notification-item ${notification.readAt?'':'unread'}"><strong>${escapeHtml(notification.title)}</strong><p>${escapeHtml(notification.body)}</p><small>${new Date(notification.createdAt).toLocaleString()}</small>${actionFor(notification)}</article>`).join(''):'<p class="empty-copy">You are all caught up. New updates will appear here.</p>'}`);content.querySelector('.notification-messages').onclick=openMessages;content.querySelectorAll('[data-open-messages]').forEach(button=>button.onclick=openMessages);content.querySelectorAll('[data-booking-id]').forEach(button=>button.onclick=()=>openBookingDetails(Number(button.dataset.bookingId)));if(result.unread){const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/notifications/read',{method:'POST',headers:{'X-CSRF-Token':csrf}});document.querySelector('#notificationBadge').hidden=true}}
async function openTenantSavedSearches(){try{const result=await apiJson('/api/account/search-alerts');openModal(`<p class="eyebrow">Saved searches</p><h2>Search alerts</h2>${result.alerts.length?result.alerts.map(alert=>`<div class="feature-list"><div><span><strong>${escapeHtml(alert.name)}</strong><small>${escapeHtml(alert.frequency)} alerts · ${alert.active?'Active':'Paused'}</small></span><button class="outline-btn" data-delete-alert="${alert.id}">Remove</button></div></div>`).join(''):'<p class="empty-copy">No saved searches yet. Run a home search and save it to receive matching-listing notifications.</p>'}`);content.querySelectorAll('[data-delete-alert]').forEach(button=>button.onclick=async()=>{try{await apiJson(`/api/search-alerts/${button.dataset.deleteAlert}`,{method:'DELETE'});await openTenantSavedSearches()}catch(error){showToast(error.message)}})}catch(error){showToast(error.message)}}
async function openTenantSecurity(){openModal(`<p class="eyebrow">Account security</p><h2>Change password</h2><form id="changePasswordForm"><label>Current password<input name="currentPassword" type="password" required></label><label>New password<input name="password" type="password" minlength="12" required></label><label>Confirm new password<input name="confirmPassword" type="password" minlength="12" required></label><p class="form-error" role="alert"></p><button class="primary" type="submit">Update password</button></form>`);content.querySelector('#changePasswordForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{if(form.elements.password.value!==form.elements.confirmPassword.value)throw new Error('Passwords do not match');const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/account/change-password',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({currentPassword:form.elements.currentPassword.value,password:form.elements.password.value})});closeModal();showToast('Password changed successfully')}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function openTenantNotificationPreferences(){try{const result=await apiJson('/api/account/notification-preferences'),preferences=result.preferences;openModal(`<p class="eyebrow">Notifications</p><h2>Notification preferences</h2><form id="notificationPreferencesForm">${[['saved_searches','New listings matching saved searches'],['price_drops','Price drops on favorites'],['booking_updates','Booking status updates'],['messages','Messages from agents'],['followed_agents','New listings from followed agents'],['marketing','StayNest recommendations']].map(([key,label])=>`<label class="preference-row"><input type="checkbox" name="${key}" ${preferences[key]?'checked':''}> ${label}</label>`).join('')}<p class="form-error" role="alert"></p><button class="primary" type="submit">Save preferences</button></form>`);content.querySelector('#notificationPreferencesForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;const body=Object.fromEntries([...form.querySelectorAll('input[type=checkbox]')].map(input=>[input.name,input.checked]));await apiJson('/api/account/notification-preferences',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});closeModal();showToast('Notification preferences saved')}catch(error){form.querySelector('.form-error').textContent=error.message}}}catch(error){showToast(error.message)}}
function openTenantDeleteAccount(){openModal(`<p class="eyebrow">Account access</p><h2>Request account deletion</h2><p>Your profile will be scheduled for deletion and active sessions will be closed.</p><form id="deleteAccountForm"><label>Confirm with your password<input name="password" type="password" required></label><label>Reason (optional)<textarea name="reason" maxlength="500"></textarea></label><p class="form-error" role="alert"></p><button class="primary danger" type="submit">Request deletion</button></form>`);content.querySelector('#deleteAccountForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({password:form.elements.password.value,reason:form.elements.reason.value})});closeModal();showToast('Account deletion request submitted');setTimeout(()=>location.reload(),600)}catch(error){form.querySelector('.form-error').textContent=error.message}}}
async function openSettings(){const me=(await apiJson('/api/auth/me')).user;if(me?.roles?.includes('agent')){try{return await openAgentSettings()}catch(error){showToast(`Agent settings could not be loaded: ${error.message}`);return}}openModal(`<p class="eyebrow">Account settings</p><h2>Your StayNest settings</h2><p>Manage your tenant profile, notifications, and account access.</p><div class="settings-list"><button class="outline-btn" id="languageSetting">Language: English</button>${me?.roles?.includes('agent')?'':''}<button class="outline-btn" id="tenantProfileSetting">Edit profile and photo</button><button class="outline-btn" id="tenantNotificationsSetting">Notification center</button><button class="outline-btn" id="tenantNotificationPreferences">Notification preferences</button><button class="outline-btn" id="tenantBookingsSetting">Booking history and status</button><button class="outline-btn" id="tenantSearchesSetting">Saved searches</button><button class="outline-btn" id="tenantSecuritySetting">Change password</button><button class="outline-btn danger" id="tenantDeleteSetting">Delete account</button></div>`);content.querySelector('#languageSetting').onclick=null;content.querySelector('#switchAgentRole')?.addEventListener('click',async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/auth/active-role',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({role:'agent'})});closeModal();await updateAuthControls((await apiJson('/api/auth/me')).user);await openOwnAgentProfile()}catch(error){showToast(error.message)}});content.querySelector('#tenantProfileSetting').onclick=async()=>{try{const result=await apiJson('/api/tenant/profile');openTenantProfileEditor(result.profile)}catch(error){showToast(`Profile editor could not be loaded: ${error.message}`)}};content.querySelector('#tenantNotificationsSetting').onclick=openNotifications;content.querySelector('#tenantNotificationPreferences').onclick=openTenantNotificationPreferences;content.querySelector('#tenantBookingsSetting').onclick=loadTenantBookings;content.querySelector('#tenantSearchesSetting').onclick=openTenantSavedSearches;content.querySelector('#tenantSecuritySetting').onclick=openTenantSecurity;content.querySelector('#tenantDeleteSetting').onclick=openTenantDeleteAccount}
async function openAgentSettings(){const result=await apiJson('/api/agent/settings');const me=(await apiJson('/api/auth/me')).user;const isMain=!result.currentUser.isSubAgent;openModal(`<p class="eyebrow">Agent settings</p><h2>${isMain?'Manage your agent account':'Your delegated access'}</h2><p>${isMain?'Control your profile, security, notifications, and remote sub-agent access.':'This account is labeled as a sub-agent. You can only use the permissions assigned by the main agent.'}</p>${!isMain?`<div class="access-summary"><strong>${result.currentUser.accountLabel||'Sub-agent'}</strong><small>Allowed actions: ${result.currentUser.permissions.join(', ')||'None'}</small></div>`:`<div class="settings-list"><button class="outline-btn" id="languageSetting">Language: English</button><button class="outline-btn" id="agentProfileSetting">Edit public profile</button><button class="outline-btn" id="agentBookingsSetting">Booking requests</button><button class="primary" id="agentSubagentSetting">+ Add and manage sub-agents</button></div><div class="subagent-list">${result.subagents.length?result.subagents.map(agent=>`<div class="subagent-row"><span><strong>${agent.label}</strong><small>${agent.firstName} ${agent.lastName} · ${agent.email} · ${agent.status}</small></span><button class="outline-btn" data-edit-subagent="${agent.id}">Access</button></div>`).join(''):'<p class="empty-copy">No sub-agents have been created yet. Use “Add and manage sub-agents” to create the first one.</p>'}</div>`}`);content.querySelector('#agentProfileSetting')?.addEventListener('click',async()=>{try{const profile=(await apiJson(`/api/agents/${result.currentUser.mainAgentId||result.currentUser.id}/profile`)).profile;openAgentProfileEditor(profile)}catch(error){showToast(`Profile editor could not be loaded: ${error.message}`)}});content.querySelector('#agentBookingsSetting')?.addEventListener('click',loadAgentBookings);content.querySelector('#agentSubagentSetting')?.addEventListener('click',()=>openSubagentEditor(result));content.querySelectorAll('[data-edit-subagent]').forEach(button=>button.onclick=()=>openSubagentAccessEditor(result,Number(button.dataset.editSubagent)))}
function openSubagentEditor(settings){openModal(`<p class="eyebrow">Agent actions</p><h2>Add a sub-agent</h2><p>Sub-agents use their own secure login and can work remotely on this main account. Select at least one allowed action.</p><form id="subagentForm" enctype="multipart/form-data"><label>Account label</label><input name="label" placeholder="Nairobi bookings assistant" required><label>First name</label><input name="firstName" required><label>Last name</label><input name="lastName" required><label>Email</label><input name="email" type="email" required><label>Phone</label><input name="phone" type="tel"><label>Location</label><input name="location" placeholder="City or region"><label>Profile picture</label><input name="profilePic" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><label>Password</label><input name="password" type="password" minlength="12" required><fieldset class="permission-grid"><legend>Allowed roles and actions</legend>${settings.permissions.map(permission=>`<label><input type="checkbox" name="permission" value="${permission.key}"> ${permission.label}</label>`).join('')}</fieldset><p class="form-error" role="alert"></p><button class="primary" type="submit">Create sub-agent</button></form>`);content.querySelector('#subagentForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,selected=[...form.querySelectorAll('[name="permission"]:checked')].map(input=>input.value),errorNode=form.querySelector('.form-error'),button=form.querySelector('button[type="submit"]');if(!selected.length){errorNode.textContent='Choose at least one action before creating this sub-agent';return}button.disabled=true;try{const csrf=(await apiJson('/api/auth/csrf')).token;const data=new FormData(form);data.set('permissions',JSON.stringify(selected));const result=await apiJson('/api/agent/subagents',{method:'POST',headers:{'X-CSRF-Token':csrf},body:data});closeModal();openModal(`<p class="eyebrow">Sub-agent created</p><h2>${result.label} is ready</h2><p>${result.message}</p><div class="feature-list"><div><b>Login email</b><span>${result.email}<small>The password is known only to the sub-agent and is not shown here.</small></span></div><div><b>Access granted</b><span>${result.permissionLabels.join(' · ')}</span></div></div><p class="search-note">The new sub-agent has received a StayNest notification with their sign-in email and assigned actions. Share the password securely; it is never displayed here.</p><button class="primary" id="viewSubagents">View sub-agents <span>→</span></button>`);content.querySelector('#viewSubagents').onclick=()=>openAgentSettings()}catch(error){errorNode.textContent=error.message;button.disabled=false}}}
function openSubagentAccessEditor(settings,id){const agent=settings.subagents.find(item=>item.id===id);if(!agent)return;openModal(`<p class="eyebrow">Agent actions</p><h2>${agent.label}</h2><p>Check or uncheck the actions this sub-agent may perform. At least one action is required.</p><form id="accessForm"><fieldset class="permission-grid">${settings.permissions.map(permission=>`<label><input type="checkbox" name="permission" value="${permission.key}" ${agent.permissions.includes(permission.key)?'checked':''}> ${permission.label}</label>`).join('')}</fieldset><label>Status</label><select name="status"><option value="active" ${agent.status==='active'?'selected':''}>Active</option><option value="suspended" ${agent.status==='suspended'?'selected':''}>Suspended</option><option value="revoked" ${agent.status==='revoked'?'selected':''}>Revoked</option></select><p class="form-error" role="alert"></p><button class="primary" type="submit">Save access</button></form>`);content.querySelector('#accessForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,permissions=[...form.querySelectorAll('[name="permission"]:checked')].map(input=>input.value),errorNode=form.querySelector('.form-error');if(!permissions.length){errorNode.textContent='A sub-agent must retain at least one permission';return}try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson(`/api/agent/subagents/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({permissions,status:form.elements.status.value})});closeModal();showToast('Sub-agent access updated');await openAgentSettings()}catch(error){errorNode.textContent=error.message}}}
async function openDiscover(){try{const [result,live]=await Promise.all([apiJson('/api/agents'),apiJson('/api/marketplace/live')]);openModal(`<div class="agent-marketplace"><div class="agent-marketplace-head"><div><p class="eyebrow">StayNest agent marketplace</p><h2>Find a trusted agent</h2><p class="search-note">Browse active agents ranked by followers, published homes, ratings, and engagement. Green dots show agents recently active.</p></div><span class="status-pill">${result.agents.length} available</span></div><div class="agent-directory">${result.agents.length?result.agents.map(agent=>`<button class="search-result agent-directory-item" data-agent-id="${agent.id}">${agentAvatar(agent.profileImageUrl,agent.badgeLabel,`${agent.firstName} ${agent.lastName}`)}<span><strong>${agent.firstName} ${agent.lastName}${agent.badgeLabel?` ${agentBadge(agent.badgeLabel)}`:''} ${agent.online?'<i class="presence-dot" title="Recently active"></i>':''}</strong><small>${agent.city||''} · ${agent.bio||'StayNest property professional'} · ${agent.listings} homes · ★ ${Number(agent.rating).toFixed(1)} · ${agent.followers||0} followers</small></span><em>#${result.agents.indexOf(agent)+1}</em></button>`).join(''):'<p class="empty-copy">No active agents are available yet.</p>'}</div>${live.listings.length?`<div class="live-activity"><div class="agent-page-toolbar"><h3>Trending homes</h3><span>Updated just now</span></div>${live.listings.slice(0,5).map(listing=>`<div class="live-activity-item">${avatarMarkup(listing.profileImageUrl,listing.firstName)}<span><strong>${escapeHtml(listing.title)}</strong><small>${escapeHtml(listing.city)} · ${listing.online?'Agent recently active':'New activity'} · ${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||'Contact agent'}</small></span></div>`).join('')}</div>`:''}</div>`);content.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>{closeModal();openAgentProfile(button.dataset.agentId,false)})}catch(error){if(error.message.includes('401')){auth('login')}else showToast(error.message)}} 
async function legacyUpdateAuthControls(user){currentUser=user||null;document.body.classList.toggle('agent-marketplace-view',Boolean(user?.roles?.includes('agent')));document.querySelector('.impersonation-banner')?.remove();if(user?.impersonating){const banner=document.createElement('div');banner.className='impersonation-banner';banner.innerHTML='<span>You are viewing StayNest as another user.</span><button type="button">Return to admin</button>';banner.querySelector('button').onclick=async()=>{try{await apiJson('/api/admin/impersonation/stop',{method:'POST',headers:{'X-CSRF-Token':(await apiJson('/api/auth/csrf')).token}});location.href='/admin.html'}catch(error){showToast(error.message)}};document.body.prepend(banner)}const login=document.querySelector('[data-auth-control="login"]'),signup=document.querySelector('[data-auth-control="signup"]'),agentButton=document.querySelector('#agentProfileControl'),agentAvatar=document.querySelector('#agentProfileAvatar'),agentName=document.querySelector('#agentProfileName'),tenantButton=document.querySelector('#tenantProfileControl'),tenantAvatar=document.querySelector('#tenantProfileAvatar'),tenantName=document.querySelector('#tenantProfileName'),notificationButton=document.querySelector('#notificationControl'),notificationBadge=document.querySelector('#notificationBadge'),settingsButton=document.querySelector('#settingsControl');if(!login||!signup)return;if(user){login.textContent='Sign out';login.setAttribute('aria-label','Sign out of StayNest');login.dataset.authAction='logout';signup.hidden=true;notificationButton.hidden=false;notificationButton.onclick=openNotifications;settingsButton.hidden=false;settingsButton.onclick=openSettings;const refreshNotifications=async()=>{try{const notifications=await apiJson('/api/notifications');notificationBadge.textContent=notifications.unread>99?'99+':notifications.unread;notificationBadge.hidden=!notifications.unread}catch(error){console.warn('Notifications unavailable:',error.message)}};await refreshNotifications();clearInterval(window.stayNestNotificationTimer);window.stayNestNotificationTimer=setInterval(refreshNotifications,15000);login.onclick=async()=>{try{const csrf=await apiJson('/api/auth/csrf');await apiJson('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf.token}});clearInterval(window.stayNestNotificationTimer);location.reload()}catch(error){showToast(error.message)}};if(agentButton)agentButton.hidden=!user.roles?.includes('agent');if(tenantButton)tenantButton.hidden=!user.roles?.includes('tenant');if(user.roles?.includes('agent')&&agentButton){agentName.textContent=user.isSubAgent?`${user.firstName||'Agent'} · ${user.accountLabel||'Sub-agent'}`:user.firstName||'Agent';agentAvatar.src=DEFAULT_AGENT_AVATAR;agentButton.setAttribute('data-profile-role','agent');agentButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('agent')};try{const profile=(await apiJson(`/api/agents/${user.mainAgentId||user.id}/profile`)).profile;agentAvatar.src=profile.profileImageUrl||profile.avatarUrl||DEFAULT_AGENT_AVATAR}catch(error){console.warn('Agent profile details unavailable:',error.message)}}if(user.roles?.includes('tenant')&&tenantButton){tenantName.textContent=user.firstName||'Tenant';tenantAvatar.src=DEFAULT_AGENT_AVATAR;tenantButton.setAttribute('data-profile-role','tenant');tenantButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('tenant')};try{const profile=(await apiJson('/api/tenant/profile')).profile;tenantAvatar.src=profile.avatarUrl||DEFAULT_AGENT_AVATAR;tenantName.textContent=profile.firstName||user.firstName||'Tenant'}catch(error){console.warn('Tenant profile details unavailable:',error.message)}}if(!user.roles?.includes('agent')&&!user.roles?.includes('tenant')&&tenantButton){tenantButton.hidden=false;tenantName.textContent=user.firstName||'Account';tenantAvatar.src=DEFAULT_AGENT_AVATAR;tenantButton.setAttribute('data-profile-role','tenant');tenantButton.onclick=event=>{event.preventDefault();event.stopPropagation();openOwnProfile('tenant')}}else{clearInterval(window.stayNestNotificationTimer);login.textContent='Log in';login.setAttribute('aria-label','Log in to StayNest');signup.hidden=false;notificationButton.hidden=true;settingsButton.hidden=true;login.dataset.authAction='login';login.onclick=()=>auth('login');signup.onclick=()=>auth('signup');if(agentButton)agentButton.hidden=true;if(tenantButton)tenantButton.hidden=true}}}
document.addEventListener('click',event=>{const button=event.target.closest('[data-profile-role]');if(button){event.preventDefault();event.stopImmediatePropagation();openOwnProfile(button.dataset.profileRole).catch(error=>showToast(`Profile could not be opened: ${error.message}`));return}if(event.target.closest('#languageSetting'))openModal('<p class="eyebrow">Language</p><h2>Choose your language</h2><p>StayNest currently supports English. More languages can be added from this setting as the service grows.</p><button class="primary" id="closeLanguageSetting">Continue in English</button>');if(event.target.closest('#switchTenantRole'))(async()=>{try{const csrf=(await apiJson('/api/auth/csrf')).token;await apiJson('/api/auth/active-role',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({role:'tenant'})});closeModal();await updateAuthControls((await apiJson('/api/auth/me')).user);await openOwnTenantProfile()}catch(error){showToast(error.message)}})()},true);
apiJson('/api/auth/me').then(({user})=>{if(user?.roles?.includes('administrator')){document.querySelector('#agentProfileControl')?.setAttribute('hidden','');document.querySelector('#tenantProfileControl')?.setAttribute('hidden','')}}).catch(error=>console.warn('StayNest header role check unavailable:',error.message));
async function updateAuthControls(user){
  const renderVersion=(window.stayNestAuthRenderVersion||0)+1;
  window.stayNestAuthRenderVersion=renderVersion;
  currentUser=user||null;
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
    login.hidden=false;login.textContent='Log in';login.setAttribute('aria-label','Log in to StayNest');login.dataset.authAction='login';login.onclick=()=>auth('login');
    signup.hidden=false;signup.onclick=()=>auth('signup');
    notificationButton.hidden=true;settingsButton.hidden=true;
    if(messageButton)messageButton.hidden=true;
    notificationButton.onclick=null;settingsButton.onclick=null;
    notificationBadge.hidden=true;notificationBadge.textContent='0';
    resetProfileControl(agentButton);resetProfileControl(tenantButton);
    return;
  }
  login.hidden=false;login.textContent='Sign out';login.setAttribute('aria-label','Sign out of StayNest');login.dataset.authAction='logout';signup.hidden=true;
  if(postsNav)postsNav.hidden=false;login.setAttribute('aria-label','Sign out of StayNest');login.dataset.authAction='logout';signup.hidden=true;
  const roles=Array.isArray(user.roles)?user.roles:[];
  notificationButton.hidden=false;notificationButton.onclick=openNotifications;
  if(messageButton){messageButton.hidden=false;messageButton.onclick=openMessages}
  settingsButton.hidden=false;settingsButton.onclick=()=>openSettings().catch(error=>showToast(`Settings could not be opened: ${error.message}`));
  const refreshNotifications=async()=>{try{const notifications=await apiJson('/api/notifications');if(renderVersion!==window.stayNestAuthRenderVersion)return;notificationBadge.textContent=notifications.unread>99?'99+':notifications.unread;notificationBadge.hidden=!notifications.unread}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Notifications unavailable:',error.message)}};
  const refreshMessages=async()=>{try{const messages=await apiJson('/api/messages/unread-count');if(renderVersion!==window.stayNestAuthRenderVersion)return;if(messageBadge){messageBadge.textContent=messages.unread>99?'99+':messages.unread;messageBadge.hidden=!messages.unread}}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Messages unavailable:',error.message)}};
  await Promise.all([refreshNotifications(),refreshMessages()]);clearInterval(window.stayNestNotificationTimer);window.stayNestNotificationTimer=setInterval(()=>{refreshNotifications();refreshMessages()},15000);
  clearInterval(window.stayNestPresenceTimer);window.stayNestPresenceTimer=setInterval(()=>apiJson('/api/presence/ping',{method:'POST'}).catch(()=>{}),60000);
  clearInterval(window.stayNestAttentionTimer);
  if(roles.includes('agent')){const refreshAttention=async()=>{try{const result=await apiJson('/api/agent/attention');const pending=Number(result.attention?.pendingBookings||0)+Number(result.attention?.listingActions||0)+Number(result.attention?.pendingVerification||0);if(pending>0)document.body.dataset.attentionCount=String(pending);else delete document.body.dataset.attentionCount}catch(error){console.warn('Agent attention refresh unavailable:',error.message)}};await refreshAttention();window.stayNestAttentionTimer=setInterval(refreshAttention,30000)}
  login.onclick=async()=>{try{login.disabled=true;const csrf=await apiJson('/api/auth/csrf');await apiJson('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf.token}});sessionStorage.removeItem('stayNest.tabUser');clearInterval(window.stayNestNotificationTimer);currentUser=null;await updateAuthControls(null);location.replace('/index.html')}catch(error){login.disabled=false;showToast(error.message)}};
  const activeRole=roles.includes(user.activeRole)?user.activeRole:roles.includes('agent')?'agent':'tenant';
  if(tenantSearchOption){tenantSearchOption.hidden=activeRole!=='agent';if(tenantSearchOption.hidden&&searchType.value==='tenant'){searchType.value='estate';searchType.dispatchEvent(new Event('change'))}}
  resetProfileControl(agentButton);resetProfileControl(tenantButton);
  if(agentButton)agentButton.hidden=activeRole!=='agent';
  if(tenantButton)tenantButton.hidden=activeRole!=='tenant';
  if(roles.includes('agent')&&agentButton){
    agentButton.dataset.profileRole='agent';agentButton.onclick=()=>openOwnProfile('agent').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    agentName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Agent';agentAvatar.src=user.profileImageUrl||user.avatarUrl||DEFAULT_AGENT_AVATAR;
    try{const profile=(await apiJson(`/api/agents/${user.mainAgentId||user.id}/profile`)).profile;if(renderVersion!==window.stayNestAuthRenderVersion)return;agentAvatar.src=profile.profileImageUrl||profile.avatarUrl||agentAvatar.src;agentName.textContent=[profile.firstName,profile.lastName].filter(Boolean).join(' ')||agentName.textContent}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Agent profile details unavailable:',error.message)}
  }
  if(roles.includes('tenant')&&tenantButton){
    tenantButton.dataset.profileRole='tenant';tenantButton.onclick=()=>openOwnProfile('tenant').catch(error=>showToast(`Profile could not be opened: ${error.message}`));
    tenantName.textContent=[user.firstName,user.lastName].filter(Boolean).join(' ')||'Tenant';tenantAvatar.src=user.profileImageUrl||user.avatarUrl||DEFAULT_AGENT_AVATAR;
    try{const profile=(await apiJson('/api/tenant/profile')).profile;if(renderVersion!==window.stayNestAuthRenderVersion)return;tenantAvatar.src=profile.avatarUrl||tenantAvatar.src;tenantName.textContent=[profile.firstName,profile.lastName].filter(Boolean).join(' ')||tenantName.textContent}catch(error){if(renderVersion===window.stayNestAuthRenderVersion)console.warn('Tenant profile details unavailable:',error.message)}
  }
  if(roles.includes('administrator')){if(agentButton)agentButton.hidden=true;if(tenantButton)tenantButton.hidden=true}
}
async function startHosting(){try{const user=(await apiJson('/api/auth/me')).user;if(user?.roles?.includes('agent'))return openAgentListingForm();if(user?.roles?.includes('tenant'))return showHostApproval();if(user)return showHostApproval();auth('host')}catch(error){auth('host')}}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>b.dataset.open==='host'?startHosting():auth(b.dataset.open)));document.querySelector('#modalClose').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal()});document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.chip.active').classList.remove('active');b.classList.add('active');render(b.dataset.filter)}));document.querySelector('#viewAll').addEventListener('click',()=>{document.querySelector('[data-filter="all"]').click()});render();
document.querySelector('#discoverAction').addEventListener('click',openDiscover);
function searchLabel(type){return {estate:'Homes',location:'Homes near',price:'Homes under',agent:'Agents',tenant:'Tenants'}[type]||'Search results'}
async function runSearch(){const input=document.querySelector('#locationInput'),type=document.querySelector('#searchType').value,query=input.value.trim();const valid=type==='price'?/^\$?\s*\d[\d,\s]*(\.\d+)?$/.test(query):query.length>=2;if(!valid){showToast(type==='price'?'Enter a maximum price, such as 1200':'Enter at least two characters to search');input.focus();return}try{const result=await apiJson(`/api/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}`);if(type==='agent'){openModal(`<p class="eyebrow">People</p><h2>${searchLabel(type)} matching “${query}”</h2><p class="search-note">Sorted by relevance, active listings, ratings, trusted engagement, and delegated account labels.</p>${result.agents.length?result.agents.map(agent=>`<button class="search-result" data-agent-id="${agent.id}"><img src="${safeMediaUrl(agent.profileImageUrl)}" alt=""><span><strong>${agent.firstName} ${agent.lastName}${agent.badgeLabel?` ${agentBadge(agent.badgeLabel)}`:''}</strong><small>${agent.agencyName?`${agent.agencyName} · `:''}${agent.subagentLabel?`Sub-agent · ${agent.subagentLabel}`:(agent.bio||'StayNest agent')} · ${agent.followers||0} followers</small></span></button>`).join(''):'<p class="empty-copy">No agents or sub-agents matched that search. Try a full name, account label, or part of their bio.</p>'}`);content.querySelectorAll('[data-agent-id]').forEach(button=>button.onclick=()=>{closeModal();openAgentProfile(button.dataset.agentId,false)})}else if(type==='tenant'){openModal(`<p class="eyebrow">People</p><h2>${searchLabel(type)} matching “${query}”</h2><p class="search-note">Tenant discovery is private to agent accounts.</p>${result.tenants.length?result.tenants.map(tenant=>`<div class="search-result">${avatarMarkup(tenant.avatarUrl,`${tenant.firstName} ${tenant.lastName}`)}<span><strong>${tenant.firstName} ${tenant.lastName}</strong><small>${tenant.city||'Registered StayNest tenant'}</small></span></div>`).join(''):'<p class="empty-copy">No tenants matched that name.</p>'}`)}else{openModal(`<p class="eyebrow">StayNest search</p><h2>${type==='price'?`${searchLabel(type)} ${query.replace(/[$,\s]/g,'')}`:`${searchLabel(type)} “${query}”`}</h2><p class="search-note">Ranked by relevance, location, freshness, ratings, saves, views, and likes.</p>${result.listings.length?result.listings.map(listing=>`<button class="search-result listing-result" data-listing='${JSON.stringify(listing).replace(/'/g,'&#39;')}'><img src="${listing.coverUrl||DEFAULT_AGENT_AVATAR}" alt=""><span><strong>${listing.title}</strong><small>${listing.city} · ${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent'} · ${listing.rating?`★ ${listing.rating}`:'New listing'}</small></span></button>`).join(''):'<p class="empty-copy">No published homes matched. Try a nearby location, property type, or a higher price.</p>'}`);content.querySelectorAll('[data-listing]').forEach(button=>button.onclick=()=>{const listing=JSON.parse(button.dataset.listing);closeModal();openListing({...listing,title:listing.title,location:listing.city,price:`${listing.currency} ${listing.nightlyPrice||listing.monthlyPrice||listing.yearlyPrice||'Contact agent'}`,rating:listing.rating||'New',reviews:listing.reviewCount||0,image:listing.coverUrl||DEFAULT_AGENT_AVATAR,tag:'Search result'})})}}catch(error){showToast(error.message)}}
document.querySelector('#searchBtn').onclick=runSearch;document.querySelector('#locationInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runSearch()}});document.querySelector('#exploreAgentsNav')?.addEventListener('click',event=>{event.preventDefault();openDiscover()});document.querySelector('#searchType').addEventListener('change',event=>{const input=document.querySelector('#locationInput'),dates=document.querySelector('.search-field.dates'),type=event.target.value,people=type==='agent'||type==='tenant';input.placeholder=type==='price'?'Maximum price, e.g. 1200':type==='agent'?'Search agent or agency name':type==='tenant'?'Search tenant name or city':'Search homes, places, or property types';dates.hidden=people;document.querySelector('#dateInput').disabled=people});
updatePersonalGreeting(null);const requestedParams=new URLSearchParams(location.search),requestedAgentId=requestedParams.get('agent'),requestedView=requestedParams.get('view'),requestedListingId=requestedParams.get('listing'),requestedAuth=requestedParams.get('auth'),requestedDiscover=requestedParams.get('discover')==='1';apiJson("/api/auth/me")
  .then((result) => {
    updatePersonalGreeting(result.user);
    updateAuthControls(
      result.user
        ? { ...result.user, impersonating: result.impersonating }
        : null,
    );
    if (requestedAuth === "login" || requestedAuth === "signup") {
      auth(requestedAuth);
    } else if (requestedDiscover) {
      openDiscover();
    } else if (requestedListingId) {
      openListing({ id: requestedListingId });
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
      requireAccount("view your StayNest profile");
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
      image.src = `${path}${String(index + 1).padStart(padding, "0")}${extension}`;
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
    if (!result.posts?.length) return;
    track.innerHTML = result.posts
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
        if (post)
          openListing({
            title: post.title,
            location: post.city,
            price: post.nightlyPrice || post.monthlyPrice || post.yearlyPrice,
            rating: post.rating || "New",
            reviews: post.reviewCount || 0,
            image: safeMediaUrl(post.coverUrl || "/assets/ezgif-frame-018.jpg"),
            tag: "Agent post",
          });
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
    if (image && !image.src) image.src = image.dataset.frameSrc;
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
const authParams = new URLSearchParams(window.location.search);
if (authParams.get("admin") === "1") {
  history.replaceState({}, "", window.location.pathname);
  openAdminGate();
}
function openGoogleSetupWithPassword() {
  openGoogleSetup();
  const form = content.querySelector("#googleSetupForm");
  if (!form) return;
  const role = form.querySelector('[name="role"]');
  form.querySelector("p:not(.form-error)").textContent =
    "Your Google email is verified. Set a StayNest password so you can also sign in with this email when Google is unavailable.";
  role.insertAdjacentHTML(
    "beforebegin",
    '<label>StayNest password</label><input name="password" type="password" autocomplete="new-password" minlength="12" placeholder="At least 12 characters" required><label>Confirm password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required>',
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
        showToast("Your StayNest account is ready.");
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
if(authParams.get('auth')==='google-setup'){history.replaceState({},'',window.location.pathname);openGoogleSetupWithPassword();}
if(authParams.get('auth')==='google'){history.replaceState({},'',window.location.pathname);showToast('Signed in with Google successfully.');}
if(authParams.get('authError')){showToast(authParams.get('authError'));history.replaceState({},'',window.location.pathname);}
if(authParams.get('reset')){history.replaceState({},'',window.location.pathname);openPasswordReset(authParams.get('reset'));}
loadAgentShowcase();
initCinematicMotion();
async function initStayNestConfig(){try{const config=await apiJson('/api/public-config');if(config.siteName)document.title=`${config.siteName} | Find a place that feels like home`;if(config.maintenanceMode&&!document.querySelector('.maintenance-banner')){const banner=document.createElement('div');banner.className='maintenance-banner';banner.textContent=config.maintenanceMessage;document.body.prepend(banner)}}catch(error){console.warn('StayNest public configuration unavailable:',error.message)}}
function initCookieConsent(){if(localStorage.getItem('staynest_cookie_consent'))return;const banner=document.createElement('aside');banner.className='cookie-consent';banner.setAttribute('role','dialog');banner.setAttribute('aria-label','Cookie preferences');banner.innerHTML='<div><strong>Your privacy matters</strong><p>StayNest uses essential cookies for secure sign-in and optional analytics to improve the service.</p></div><div class="cookie-consent-actions"><button type="button" data-cookie-choice="essential">Essential only</button><button type="button" class="primary" data-cookie-choice="all">Allow analytics</button></div>';banner.querySelectorAll('[data-cookie-choice]').forEach(button=>button.addEventListener('click',()=>{localStorage.setItem('staynest_cookie_consent',button.dataset.cookieChoice);banner.remove()}));document.body.append(banner)}
initStayNestConfig();
initCookieConsent();
