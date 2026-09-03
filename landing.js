'use strict';
let registrationContact='info@ecopass.ph';
const getPath=(object,path)=>{const normalized=path.replace(/^destinations\.(\d+)\./,'destinations.items.$1.');return normalized.split('.').reduce((value,key)=>value?.[Number.isInteger(Number(key))?Number(key):key],object)};
async function loadContent(){if(location.protocol==='file:')return;try{const response=await fetch('/api/content',{headers:{Accept:'application/json'}});if(!response.ok)throw new Error();const content=await response.json();document.querySelectorAll('[data-content]').forEach(element=>{const value=getPath(content,element.dataset.content);if(typeof value==='string')element.textContent=value});document.querySelectorAll('[data-image]').forEach(image=>{const value=getPath(content,image.dataset.image);if(typeof value==='string'&&value)image.src=value});document.querySelectorAll('[data-link]').forEach(element=>{const value=getPath(content,element.dataset.link);if(typeof value!=='string'||!value)return;const allowed=/^(?:https?:|mailto:|tel:|#|\/)/i.test(value);if(!allowed)return;if(element.tagName==='IFRAME'){if(/^https?:/i.test(value))element.src=value}else element.href=value});const favicon=document.querySelector('[data-favicon]');if(favicon&&content.brand.faviconImage){const joiner=content.brand.faviconImage.includes('?')?'&':'?';favicon.href=`${content.brand.faviconImage}${joiner}v=${encodeURIComponent(content.updatedAt||'default')}`}registrationContact=content.brand.contact||registrationContact;document.querySelectorAll('[data-contact]').forEach(contact=>contact.href=`mailto:${content.brand.contact}`);document.title=`${content.brand.name} — Sipalay City`}catch{const status=document.querySelector('.page-status');status.textContent='Live content is temporarily unavailable. Showing the latest built-in version.';status.hidden=false}}
const howModal=document.querySelector('#how-modal');
const howModalClose=howModal?.querySelector('.how-modal-close');
let howModalTrigger=null;
function closeHowModal(){if(!howModal)return;if(typeof howModal.close==='function'&&howModal.open)howModal.close();else howModal.removeAttribute('open')}
function openHowModal(trigger){if(!howModal)return;howModalTrigger=trigger||document.activeElement;if(typeof howModal.showModal==='function'){if(!howModal.open)howModal.showModal()}else howModal.setAttribute('open','');document.body.classList.add('modal-open')}
document.querySelectorAll('[data-how-modal-open]').forEach(trigger=>trigger.addEventListener('click',event=>{event.preventDefault();openHowModal(trigger)}));
howModalClose?.addEventListener('click',closeHowModal);
howModal?.addEventListener('click',event=>{if(event.target===howModal)closeHowModal()});
howModal?.addEventListener('close',()=>{document.body.classList.remove('modal-open');howModalTrigger?.focus();howModalTrigger=null});
howModal?.addEventListener('cancel',()=>document.body.classList.remove('modal-open'));
if(location.hash==='#how-modal')openHowModal();
const passModal=document.querySelector('#pass-modal');
const passModalClose=passModal?.querySelector('.pass-modal-close');
const passForm=document.querySelector('#passForm');
const passCancel=passForm?.querySelector('.pass-cancel');
const arrivalInput=passForm?.elements.arrival;
const departureInput=passForm?.elements.departure;
const passFormStatus=document.querySelector('#passFormStatus');
let passModalTrigger=null;
function closePassModal(){if(!passModal)return;if(typeof passModal.close==='function'&&passModal.open)passModal.close();else passModal.removeAttribute('open')}
function openPassModal(trigger){if(!passModal)return;passModalTrigger=trigger||document.activeElement;passFormStatus.textContent='';passFormStatus.classList.remove('success');const today=new Date();const localToday=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);arrivalInput.min=localToday;departureInput.min=arrivalInput.value||localToday;if(typeof passModal.showModal==='function'){if(!passModal.open)passModal.showModal()}else passModal.setAttribute('open','');document.body.classList.add('modal-open')}
document.querySelectorAll('[data-pass-modal-open]').forEach(trigger=>trigger.addEventListener('click',event=>{event.preventDefault();openPassModal(trigger)}));
arrivalInput?.addEventListener('change',()=>{departureInput.min=arrivalInput.value;if(departureInput.value&&departureInput.value<arrivalInput.value)departureInput.value='' });
passForm?.addEventListener('submit',event=>{event.preventDefault();passFormStatus.classList.remove('success');if(departureInput.value<arrivalInput.value){passFormStatus.textContent='Departure date must be the same as or later than the arrival date.';departureInput.focus();return}const values=new FormData(passForm);const subject='EcoPass tour details request';const body=[`Number of guests: ${values.get('guests')}`,`Arrival date: ${values.get('arrival')}`,`Departure date: ${values.get('departure')}`,`Purpose of travel: ${values.get('purpose')}`,`Visitor email: ${values.get('email')}`].join('\n');passFormStatus.textContent='Your email app is opening with the completed EcoPass request.';passFormStatus.classList.add('success');window.location.href=`mailto:${registrationContact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`});
passModalClose?.addEventListener('click',closePassModal);passCancel?.addEventListener('click',closePassModal);
passModal?.addEventListener('click',event=>{if(event.target===passModal)closePassModal()});
passModal?.addEventListener('close',()=>{document.body.classList.remove('modal-open');passModalTrigger?.focus();passModalTrigger=null});
passModal?.addEventListener('cancel',()=>document.body.classList.remove('modal-open'));
if(location.hash==='#pass-modal')openPassModal();
const menu=document.querySelector('.menu-button');menu?.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));document.querySelector('.nav').classList.toggle('open',!expanded)});document.querySelectorAll('.nav a').forEach(link=>link.addEventListener('click',()=>{menu?.setAttribute('aria-expanded','false');document.querySelector('.nav').classList.remove('open')}));loadContent();
