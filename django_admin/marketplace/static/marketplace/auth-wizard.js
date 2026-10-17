const dialog=document.querySelector('#authPrompt');
const promptMessage=dialog?.querySelector('[data-auth-prompt-message]');
const promptLogin=dialog?.querySelector('[data-auth-prompt-login]');
const promptSignup=dialog?.querySelector('[data-auth-prompt-signup]');

async function authRequest(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||`Request failed (${response.status})`);error.status=response.status;throw error}
  return data;
}

async function authCsrf(){return (await authRequest('/api/auth/csrf')).token}
function authDestination(path,role='tenant'){
  const query=new URLSearchParams({next:`${location.pathname}${location.search}`});
  if(path==='/signup/')query.set('role',role);
  return `${path}?${query.toString()}`;
}
function showAuthPrompt(message='Sign in or create an account to continue.',role='tenant'){
  if(!dialog)return;
  promptMessage.textContent=message;
  promptLogin.href=authDestination('/login/');
  promptSignup.href=authDestination('/signup/',role);
  dialog.showModal();
}
window.showMakaziAuthPrompt=showAuthPrompt;
dialog?.querySelector('[data-auth-prompt-close]')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});

document.querySelector('[data-auth-gate-link]')?.addEventListener('click',async event=>{
  event.preventDefault();
  const link=event.currentTarget;
  try{
    const {user}=await authRequest('/api/auth/me');
    if(user){location.assign(link.href);return}
  }catch{}
  showAuthPrompt('Create or sign in to a property agent account to list and manage properties.',link.dataset.authRole||'agent');
});

document.querySelectorAll('form[data-auth-required]').forEach(form=>{
  let approvedSubmit=false;
  form.addEventListener('submit',async event=>{
    if(approvedSubmit){approvedSubmit=false;return}
    event.preventDefault();
    event.stopImmediatePropagation();
    try{
      const {user}=await authRequest('/api/auth/me');
      if(user){approvedSubmit=true;form.requestSubmit(event.submitter);return}
    }catch{}
    showAuthPrompt(form.dataset.authMessage||'Sign in or create an account to continue.',form.dataset.authRole||'tenant');
  },true);
});

const loginForm=document.querySelector('[data-login-form]');
if(loginForm){
  const message=loginForm.querySelector('.form-message');
  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    message.textContent='';
    const submit=loginForm.querySelector('[type="submit"]');
    submit.disabled=true;
    const values=Object.fromEntries(new FormData(loginForm));
    values.rememberMe=loginForm.elements.rememberMe.checked;
    try{
      const result=await authRequest('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':await authCsrf()},body:JSON.stringify(values)});
      if(result.mfaRequired){const field=loginForm.querySelector('[data-mfa-field]');field.hidden=false;field.querySelector('input').required=true;field.querySelector('input').focus();message.textContent='Enter the authenticator code for this account.';return}
      const roles=result.roles||[];
      location.assign(values.next|| (roles.includes('agent')?'/agent/':roles.includes('tenant')?'/account/dashboard/':'/'));
    }catch(error){message.textContent=error.message}
    finally{submit.disabled=false}
  });
  document.querySelector('[data-forgot-toggle]')?.addEventListener('click',()=>{
    const form=document.querySelector('[data-password-reset]');
    form.hidden=!form.hidden;
    if(!form.hidden){form.elements.email.value=loginForm.elements.email.value;form.elements.email.focus()}
  });
  document.querySelector('[data-password-reset]')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget,message=form.querySelector('.form-message');
    try{const result=await authRequest('/api/auth/password-reset/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value})});message.textContent=result.message||'If the account exists, recovery instructions are on their way.'}
    catch(error){message.textContent=error.message}
  });
}

const signupForm=document.querySelector('[data-signup-form]');
if(signupForm){
  const steps=[...signupForm.querySelectorAll('[data-signup-step]')];
  const progress=document.querySelector('[data-signup-progress]');
  const stepLabel=document.querySelector('[data-signup-label]');
  const roleInputs=[...signupForm.querySelectorAll('[name="role"]')];
  const agentFields=[...signupForm.querySelectorAll('[data-agent-only]')];
  const messages=[...signupForm.querySelectorAll('[data-signup-error]')];
  const stepNames=['Account type','Contact details','Secure your account'];
  let currentStep=0;
  const syncRole=()=>{const agent=signupForm.elements.role.value==='agent';agentFields.forEach(field=>{field.hidden=!agent})};
  const showStep=index=>{currentStep=index;steps.forEach((step,stepIndex)=>{step.hidden=stepIndex!==index});progress.style.width=`${((index+1)/steps.length)*100}%`;stepLabel.textContent=`Step ${index+1} of ${steps.length} · ${stepNames[index]}`;steps[index].querySelector('input:not([type="hidden"]),select,textarea')?.focus()};
  const validateStep=index=>{for(const field of steps[index].querySelectorAll('input,select,textarea')){if(field.type==='radio'){if(!signupForm.querySelector(`[name="${field.name}"]:checked`))return false;continue}if(field.required&&!field.reportValidity())return false}return true};
  roleInputs.forEach(input=>input.addEventListener('change',syncRole));
  signupForm.querySelectorAll('[data-signup-next]').forEach(button=>button.addEventListener('click',()=>{if(!validateStep(currentStep))return;if(currentStep===0)syncRole();if(currentStep<steps.length-1)showStep(currentStep+1)}));
  signupForm.querySelectorAll('[data-signup-back]').forEach(button=>button.addEventListener('click',()=>showStep(Math.max(0,currentStep-1))));
  signupForm.addEventListener('input',()=>{
    const summary=document.querySelector('[data-signup-summary]');
    if(!summary)return;
    const role=signupForm.elements.role.value;
    const name=[signupForm.elements.firstName.value.trim(),signupForm.elements.lastName.value.trim()].filter(Boolean).join(' ');
    summary.querySelector('strong').textContent=name||'Your account';
    summary.querySelector('span').textContent=`${role==='agent'?'Property agent':'Tenant'} · ${signupForm.elements.city.value.trim()}`;
  });
  signupForm.addEventListener('submit',async event=>{
    event.preventDefault();
    messages.forEach(node=>node.textContent='');
    const data=Object.fromEntries(new FormData(signupForm));
    data.rememberMe=signupForm.elements.rememberMe.checked;
    if(data.password!==data.confirmPassword){messages[currentStep].textContent='Passwords do not match.';return}
    if(data.password.length<12){messages[currentStep].textContent='Use a password with at least 12 characters.';return}
    delete data.confirmPassword;
    const submit=signupForm.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      const result=await authRequest('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':await authCsrf()},body:JSON.stringify(data)});
      if(result.pendingApproval){signupForm.parentElement.innerHTML='<div class="signup-success"><p class="eyebrow">Application received</p><h2>Your agent profile is under review.</h2><p>We saved your contact and agency details. You’ll be able to list properties after approval.</p><a class="button primary" href="/login/">Continue to sign in</a></div>';return}
      location.assign(data.next||'/account/dashboard/');
    }catch(error){messages[currentStep].textContent=error.message}
    finally{submit.disabled=false}
  });
  syncRole();
  showStep(0);
}
