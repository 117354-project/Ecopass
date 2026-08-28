(function () {
  'use strict';
  const D = window.ECOPASS_DATA;
  const $app = document.getElementById('app');
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem('ecopass-demo-state') || '{}'); } catch (_) { return {}; } })();
  const state = Object.assign({
    registration: { lead: '', mobile: '', address: '', arrival: '2026-08-28', departure: '2026-08-30', groups: { regular: 1, senior: 0, pwd: 0, student: 0, child: 0 }, consent: false },
    errors: {}, payment: 'idle', passStatus: 'unpaid', scanCode: '', activated: false, adminRange: '7', tableState: 'data', toast: ''
  }, saved);

  const esc = value => String(value == null ? '' : value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const peso = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0);
  const persist = () => { try { sessionStorage.setItem('ecopass-demo-state', JSON.stringify(state)); } catch (_) {} };
  const route = () => (location.hash || '#/demo').replace(/^#/, '');
  const go = path => { location.hash = path.startsWith('#') ? path : `#${path}`; };
  const icon = name => ({ home: '⌂', pass: '▦', help: '?', profile: '●', scan: '⌗', activity: '☷', today: '◷', dashboard: '▥', rankings: '≡', reports: '▤', manage: '⚙', check: '✓', warn: '!', error: '×', wifi: '⌁' }[name] || '•');
  const status = key => D.statuses[key] || D.statuses.unpaid;
  const badge = (label, tone = 'neutral', symbol = '•') => `<span class="badge tone-${tone}"><span aria-hidden="true">${esc(symbol)}</span>${esc(label)}</span>`;
  const alertBox = (tone, title, text, symbol) => `<div class="alert tone-${tone}" role="${tone === 'error' ? 'alert' : 'status'}"><span class="alert-symbol" aria-hidden="true">${esc(symbol || (tone === 'error' ? '×' : tone === 'warning' ? '!' : '✓'))}</span><p><strong>${esc(title)}</strong>${esc(text)}</p></div>`;
  const button = (label, action, kind = 'primary', attrs = '') => `<button class="btn btn-${kind}" type="button" data-action="${esc(action)}" ${attrs}>${label}</button>`;
  const demoBar = () => `<div class="demo-bar"><span aria-hidden="true">◆</span><strong>Prototype / Demo</strong><span>Mock data and simulated actions only. No real payment or QR validation.</span></div>`;
  const logo = () => `<a class="logo" href="#/demo" aria-label="EcoPass prototype home"><span class="logo-mark" aria-hidden="true">▦</span><span>EcoPass<small>Scan. Pay. Protect.</small></span></a>`;

  function mobileNav(role, active) {
    const items = role === 'officer' ? [['scan', 'Scan', '/officer/scan'], ['activity', 'Activity', '/officer/activity'], ['profile', 'Account', '/officer/account']]
      : role === 'destination' ? [['scan', 'Scan', '/destination/scan'], ['today', 'Today', '/destination/today'], ['profile', 'Account', '/destination/account']]
      : [['home', 'Home', '/tourist/welcome'], ['pass', 'My EcoPass', '/tourist/pass'], ['help', 'Help', '/tourist/help'], ['profile', 'Profile', '/tourist/profile']];
    return `<nav class="mobile-nav" aria-label="${esc(role)} navigation">${items.map(([i, l, href]) => `<a href="#${href}" class="${active.includes(href.split('/').pop()) ? 'active' : ''}"><b aria-hidden="true">${icon(i)}</b>${l}</a>`).join('')}</nav>`;
  }

  function publicShell(content, role = 'tourist') {
    const labels = { tourist: 'Tourist', officer: 'Entry Officer', destination: 'Destination Staff' };
    return `${demoBar()}<header class="app-header"><div class="header-inner">${logo()}<div class="top-actions"><span class="role-chip"><i class="role-dot"></i><span>${labels[role]}</span></span><a class="btn btn-ghost" href="#/demo">Switch demo role</a></div></div></header><div class="shell"><main class="main" id="main-content" tabindex="-1">${content}</main></div>${mobileNav(role, route())}${toast()}${dialogHost()}`;
  }

  const adminLinks = [
    ['dashboard', 'Dashboard'], ['rankings', 'Rankings'], ['reports', 'Reports'], ['destinations', 'Destinations'],
    ['checkpoints', 'Checkpoints'], ['users', 'Users'], ['fee-rules', 'Fee Rules'], ['audit', 'Audit Logs'], ['settings', 'Settings']
  ];
  function adminShell(content, active) {
    return `${demoBar()}<div class="admin-shell"><aside class="admin-side">${logo()}<nav class="admin-nav" aria-label="Administrator navigation">${adminLinks.map(([id, label]) => `<a class="${active === id ? 'active' : ''}" href="#/admin/${id}"><span aria-hidden="true">${icon(id === 'dashboard' ? 'dashboard' : id === 'rankings' ? 'rankings' : id === 'reports' ? 'reports' : 'manage')}</span>${label}</a>`).join('')}</nav><div class="admin-side-foot">Prototype administrator<br><strong>No real credentials</strong></div></aside><section class="admin-main"><header class="admin-top"><strong>EcoPass Administration</strong>${badge('Demo environment', 'warning', '!')}</header><main class="admin-content" id="main-content" tabindex="-1">${content}</main></section>${adminMobileNav(active)}</div>${toast()}${dialogHost()}`;
  }
  function adminMobileNav(active) {
    return `<nav class="mobile-nav" aria-label="Administrator navigation">${adminLinks.slice(0, 5).map(([id, label]) => `<a class="${active === id ? 'active' : ''}" href="#/admin/${id}"><b>${icon(id === 'dashboard' ? 'dashboard' : id === 'rankings' ? 'rankings' : id === 'reports' ? 'reports' : 'manage')}</b>${label}</a>`).join('')}</nav>`;
  }
  function toast() { return `<div class="toast" role="status" ${state.toast ? '' : 'hidden'}><strong>${esc(state.toast || '')}</strong></div>`; }
  function dialogHost() { return `<dialog id="confirmDialog" aria-labelledby="dialogTitle"><div class="dialog-body"><h2 id="dialogTitle">Confirm activation</h2><p>Activate this EcoPass for <strong>${groupTotal()}</strong> visitors at ${esc(D.samplePass.checkpoint)}?</p>${alertBox('warning', 'Check details before continuing', 'Activation cannot be presented as payment confirmation.', '!')}</div><div class="dialog-actions"><button class="btn btn-ghost" value="cancel" data-action="close-dialog">Cancel</button><button class="btn btn-primary" value="confirm" data-action="confirm-activation">Activate EcoPass</button></div></dialog>`; }

  function groupTotal() { return Object.values(state.registration.groups).reduce((sum, q) => sum + Number(q || 0), 0); }
  function feeLines() {
    return D.feeCategories.map(cat => {
      const qty = Number(state.registration.groups[cat.id] || 0), gross = qty * cat.rate, discount = Math.round(gross * cat.discount / 100);
      return Object.assign({}, cat, { qty, gross, discount, total: gross - discount });
    }).filter(x => x.qty > 0);
  }
  function feeTotal() { return feeLines().reduce((sum, line) => sum + line.total, 0); }
  function progress(step) {
    return `<div class="progress" aria-label="Registration progress">${['Visit details', 'Group', 'Review'].map((label, i) => `<div class="progress-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}"><span class="progress-dot">${i + 1 < step ? '✓' : i + 1}</span><span>${label}</span></div>`).join('')}</div>`;
  }
  const fieldError = key => state.errors[key] ? `<span class="error-text" role="alert">${esc(state.errors[key])}</span>` : '';

  function demoHome() {
    return `<main class="main" id="main-content"><div class="page-head"><div><p class="eyebrow">EcoPass UI/UX prototype</p><h1>Choose a demo role</h1><p class="lead">Explore the complete responsive front-end using development-only mock data. No real authentication, payment, or QR validation occurs.</p></div></div><div class="grid grid-4">
      ${roleCard('Tourist', 'Mobile-first registration, GCash simulation, and one EcoPass QR.', '/tourist/welcome', 'Start tourist demo')}
      ${roleCard('Entry Officer', 'Verify payment eligibility and activate a paid EcoPass.', '/officer/scan', 'Open checkpoint scanner')}
      ${roleCard('Destination Staff', 'Accept active passes and block duplicate or offline scans.', '/destination/scan', 'Open destination scanner')}
      ${roleCard('Administrator', 'Dashboard, rankings, reports, and management UI.', '/admin/dashboard', 'Open admin dashboard')}
    </div><div class="card flat" style="margin-top:22px"><h2>Development fixtures</h2><p class="muted">Use these codes in either scanner to preview every important state.</p><div class="fixture-grid">${D.fixtures.map(x => `<code class="fixture">${x}</code>`).join('')}</div></div></main>`;
  }
  function roleCard(title, text, href, cta) { return `<article class="card"><span class="badge tone-info">Demo role</span><h2 style="margin-top:16px">${title}</h2><p class="muted">${text}</p><a class="btn btn-primary btn-block" href="#${href}">${cta}</a></article>`; }

  function touristWelcome() {
    const action = state.passStatus === 'unpaid' && groupTotal() <= 1 ? ['Register a Visit', '/tourist/register/visit'] : state.passStatus === 'unpaid' ? ['Complete Payment', '/tourist/payment'] : state.passStatus === 'paid' ? ['View EcoPass', '/tourist/pass'] : ['Show My EcoPass', '/tourist/pass'];
    return publicShell(`<section class="hero-panel card"><div class="hero-copy"><p class="eyebrow">Welcome to EcoPass</p><h1>Scan. Pay.<br>Protect.</h1><p class="lead">One digital pass for a simpler visitor journey—from registration to checkpoint verification and destination entry.</p><div class="steps-inline"><div class="mini-step"><span>1</span>Register</div><div class="mini-step"><span>2</span>Pay with GCash</div><div class="mini-step"><span>3</span>Present one QR</div></div><div class="button-row mobile-stack"><a class="btn btn-primary" href="#${action[1]}">${action[0]}</a><a class="btn btn-outline" href="#/tourist/pass">View demo pass</a></div><p class="tiny muted" style="margin-top:18px">Already registered? <a href="#/tourist/profile">Sign in (simulated)</a></p></div><div class="hero-art" aria-hidden="true"></div></section>`, 'tourist');
  }

  function visitStep() {
    const r = state.registration;
    return publicShell(`<div class="page-head"><div><p class="eyebrow">Tourist registration</p><h1>Tell us about your visit</h1><p class="lead">Your information is kept only in this browser for the prototype.</p></div></div>${progress(1)}<section class="card"><form id="visitForm" class="form-grid" novalidate>
      ${field('lead', 'Lead tourist name', r.lead, 'Juan Dela Cruz', 'text', 'full')}
      ${field('mobile', 'Philippine mobile number', r.mobile, '09XX XXX XXXX', 'tel')}
      ${field('address', 'Address', r.address, 'Barangay, city/province', 'text')}
      ${field('arrival', 'Arrival date', r.arrival, '', 'date')}
      ${field('departure', 'Departure / valid-until date', r.departure, '', 'date')}
    </form><div class="button-row end" style="margin-top:22px"><a class="btn btn-ghost" href="#/tourist/welcome">Cancel</a>${button('Continue to Group', 'visit-next')}</div></section>`, 'tourist');
  }
  function field(key, label, value, placeholder, type, cls = '') { return `<div class="field ${cls}"><label for="${key}">${label}</label><input class="input" id="${key}" name="${key}" data-bind="${key}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" aria-invalid="${state.errors[key] ? 'true' : 'false'}">${fieldError(key)}</div>`; }

  function groupStep() {
    return publicShell(`<div class="page-head"><div><p class="eyebrow">Tourist registration</p><h1>Add your group</h1><p class="lead">Choose each visitor category. Quantities cannot be negative.</p></div></div>${progress(2)}<div class="grid grid-2"><section class="card"><div class="category-list">${D.feeCategories.map(categoryRow).join('')}</div></section><aside class="card"><h2>Group estimate</h2><div class="summary-list"><div class="summary-row"><span>Total visitors</span><strong>${groupTotal()}</strong></div><div class="summary-row"><span>Sample estimated fee</span><strong>${peso(feeTotal())}</strong></div></div>${alertBox('warning', 'Demo fee values', D.feeNotice, '!')}<div class="button-row mobile-stack"><a class="btn btn-ghost" href="#/tourist/register/visit">Back</a>${button('Review registration', 'group-next')}</div>${fieldError('group')}</aside></div>`, 'tourist');
  }
  function categoryRow(cat) {
    const q = state.registration.groups[cat.id] || 0;
    return `<article class="category"><div><h3>${cat.label}</h3><p class="tiny muted">Sample rate ${peso(cat.rate)}${cat.discount ? ` · ${cat.discount}% demo discount` : ''}</p></div><div class="stepper" aria-label="${cat.label} quantity"><button type="button" data-action="qty" data-id="${cat.id}" data-delta="-1" aria-label="Remove ${cat.label}" ${q <= 0 ? 'disabled' : ''}>−</button><span class="qty" aria-live="polite">${q}</span><button type="button" data-action="qty" data-id="${cat.id}" data-delta="1" aria-label="Add ${cat.label}">+</button></div></article>`;
  }

  function reviewStep() {
    const r = state.registration, lines = feeLines();
    return publicShell(`<div class="page-head"><div><p class="eyebrow">Tourist registration</p><h1>Review your visit</h1><p class="lead">Confirm the information before continuing to the simulated GCash payment.</p></div></div>${progress(3)}<div class="grid grid-2"><section class="card"><div class="card-header"><div><h2>Visit details</h2><p class="tiny muted">Lead tourist and validity</p></div><a href="#/tourist/register/visit">Edit</a></div><div class="summary-list"><div class="summary-row"><span>Lead tourist</span><strong>${esc(r.lead)}</strong></div><div class="summary-row"><span>Mobile</span><strong>${esc(r.mobile)}</strong></div><div class="summary-row"><span>Address</span><strong>${esc(r.address)}</strong></div><div class="summary-row"><span>Visit dates</span><strong>${esc(r.arrival)} — ${esc(r.departure)}</strong></div></div><div class="card-header" style="margin-top:25px"><div><h2>Group</h2><p class="tiny muted">${groupTotal()} visitor(s)</p></div><a href="#/tourist/register/group">Edit</a></div>${lines.map(x => `<div class="summary-row"><span>${x.label} × ${x.qty}${x.discount ? ` (${x.discount}% demo discount)` : ''}</span><strong>${peso(x.total)}</strong></div>`).join('')}</section><aside class="card"><h2>Fee breakdown</h2>${lines.map(x => `<div class="summary-row"><span>${x.qty} × ${peso(x.rate)}${x.discount ? `<br><small class="muted">−${peso(x.discount)} discount</small>` : ''}</span><strong>${peso(x.total)}</strong></div>`).join('')}<div class="summary-row"><strong>Total due</strong><strong style="font-size:24px;color:var(--primary)">${peso(feeTotal())}</strong></div>${alertBox('warning', 'Sample values only', D.feeNotice, '!')}<label class="check-row"><input type="checkbox" data-bind-check="consent" ${r.consent ? 'checked' : ''}><span>I confirm that the details are accurate and understand this is a privacy-conscious front-end demo.</span></label>${fieldError('consent')}<div class="button-row mobile-stack" style="margin-top:20px"><a class="btn btn-ghost" href="#/tourist/register/group">Back</a>${button('Proceed to GCash', 'review-next')}</div></aside></div>`, 'tourist');
  }

  function paymentScreen() {
    const views = {
      idle: ['Continue to GCash', 'Review the amount and continue to the simulated GCash handoff.', 'Continue to GCash', 'payment-start', 'info'],
      processing: ['Checking payment', 'Please wait while the demo checks the payment result.', 'Check Again', 'payment-check', 'info'],
      success: ['Payment confirmed', 'Your payment is confirmed. Checkpoint verification is still required.', 'View My EcoPass', 'view-pass', 'success'],
      pending: ['Payment not yet confirmed', 'The demo payment remains pending. No pass activation has occurred.', 'Check Again', 'payment-check', 'warning'],
      failed: ['Payment unsuccessful', 'No payment was recorded. Try the simulated handoff again.', 'Try Again', 'payment-start', 'error'],
      cancelled: ['Payment not completed', 'The payment session was cancelled or expired.', 'Start New Payment', 'payment-reset', 'warning']
    }, v = views[state.payment] || views.idle;
    return publicShell(`<div class="page-head"><div><p class="eyebrow">GCash payment · Demo</p><h1>${v[0]}</h1><p class="lead">${v[1]}</p></div>${badge(state.payment === 'success' ? 'Paid' : state.payment === 'idle' ? 'Ready' : state.payment, v[4], state.payment === 'success' ? '✓' : '!')}</div><div class="grid grid-2"><section class="card"><h2>Payment summary</h2><div class="summary-list"><div class="summary-row"><span>Amount</span><strong>${peso(feeTotal() || D.samplePass.amount)}</strong></div><div class="summary-row"><span>Pass ID</span><strong class="pass-id">${D.samplePass.id}</strong></div><div class="summary-row"><span>Payment method</span><strong>GCash only</strong></div></div>${alertBox('info', 'Safe simulated handoff', 'EcoPass will never request your GCash PIN, OTP, password, or card details.', 'i')}<div class="button-row mobile-stack">${button(v[2], v[3], state.payment === 'failed' ? 'danger' : 'primary', state.payment === 'processing' ? 'disabled' : '')}<button class="btn btn-ghost" type="button" data-action="payment-state" data-state="pending">Preview pending</button><button class="btn btn-ghost" type="button" data-action="payment-state" data-state="failed">Preview failed</button></div></section><aside class="card center"><div class="result-icon tone-${v[4]}">${state.payment === 'success' ? '✓' : state.payment === 'processing' ? '…' : 'G'}</div><h2>GCash</h2><p class="muted">Simulated external payment screen</p><p class="tiny">No financial credentials are collected.</p></aside></div>`, 'tourist');
  }

  function passScreen() {
    const s = status(state.passStatus), pass = Object.assign({}, D.samplePass, { status: state.passStatus, groupSize: groupTotal() || D.samplePass.groupSize, amount: feeTotal() || D.samplePass.amount, lead: state.registration.lead || D.samplePass.lead, arrival: state.registration.arrival || D.samplePass.arrival, validUntil: state.registration.departure || D.samplePass.validUntil });
    return publicShell(`<div class="page-head"><div><p class="eyebrow">My EcoPass</p><h1>${esc(s.label)}</h1><p class="lead">${esc(s.instruction)}</p></div>${badge(s.label, s.tone, s.icon)}</div><div class="pass-layout"><article class="pass-card"><strong>EcoPass</strong><span style="float:right">${badge(state.passStatus.toUpperCase(), s.tone, s.icon)}</span><div class="pass-card-inner"><h2>One EcoPass QR</h2><div class="qr-box" role="img" aria-label="Demo EcoPass QR pattern"></div><div class="pass-id">${pass.id}</div><p class="tiny muted">Use this same QR throughout the pass lifecycle.</p></div></article><section class="card"><h2>Pass details</h2><div class="summary-list"><div class="summary-row"><span>Lead tourist</span><strong>${esc(pass.lead)}</strong></div><div class="summary-row"><span>Group size</span><strong>${pass.groupSize} visitors</strong></div><div class="summary-row"><span>Validity</span><strong>${pass.arrival} — ${pass.validUntil}</strong></div><div class="summary-row"><span>Amount paid</span><strong>${state.passStatus === 'unpaid' ? 'Not paid' : peso(pass.amount)}</strong></div><div class="summary-row"><span>Next instruction</span><strong>${esc(s.instruction)}</strong></div></div>${state.passStatus === 'paid' ? alertBox('warning', 'Checkpoint verification required', 'Payment alone does not activate destination entry.', '!') : ''}<div class="button-row mobile-stack" style="margin-top:20px"><button class="btn btn-outline" onclick="window.print()">Print pass</button>${button('Save pass (simulated)', 'save-pass', 'ghost')}<a class="btn btn-primary" href="#/demo">Try another role</a></div><div class="state-tabs" style="margin-top:24px" aria-label="Demo pass states">${Object.keys(D.statuses).map(k => `<button class="${state.passStatus === k ? 'active' : ''}" data-action="pass-state" data-state="${k}">${D.statuses[k].short || D.statuses[k].label}</button>`).join('')}</div></section></div>`, 'tourist');
  }

  function simpleTourist(title, text) { return publicShell(`<div class="page-head"><div><p class="eyebrow">Tourist</p><h1>${title}</h1><p class="lead">${text}</p></div></div><section class="card"><h2>Prototype information</h2><p>This screen intentionally contains no real account, contact, or authentication data.</p><a class="btn btn-primary" href="#/tourist/welcome">Return home</a></section>`, 'tourist'); }

  function render() {
    const r = route();
    if (r === '/demo') $app.innerHTML = `${demoBar()}${demoHome()}${toast()}`;
    else if (r === '/tourist/welcome') $app.innerHTML = touristWelcome();
    else if (r === '/tourist/register/visit') $app.innerHTML = visitStep();
    else if (r === '/tourist/register/group') $app.innerHTML = groupStep();
    else if (r === '/tourist/register/review') $app.innerHTML = reviewStep();
    else if (r === '/tourist/payment') $app.innerHTML = paymentScreen();
    else if (r === '/tourist/pass') $app.innerHTML = passScreen();
    else if (r === '/tourist/help') $app.innerHTML = simpleTourist('Help', 'Guidance for registration, payment status, checkpoint verification, and destination use.');
    else if (r === '/tourist/profile') $app.innerHTML = simpleTourist('Profile', 'A simulated tourist profile. Real authentication is outside this prototype.');
    else if (r.startsWith('/officer/')) $app.innerHTML = officerRoute(r);
    else if (r.startsWith('/destination/')) $app.innerHTML = destinationRoute(r);
    else if (r.startsWith('/admin/')) $app.innerHTML = adminRoute(r);
    else go('/demo');
    restoreFocus();
  }

  function restoreFocus() { requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })); }
  function showToast(message) { state.toast = message; render(); setTimeout(() => { state.toast = ''; const t = document.querySelector('.toast'); if (t) t.hidden = true; }, 2200); }

  document.addEventListener('input', event => {
    const key = event.target.dataset.bind;
    if (key) { state.registration[key] = event.target.value; delete state.errors[key]; persist(); }
  });
  document.addEventListener('change', event => {
    if (event.target.dataset.bindCheck) { state.registration[event.target.dataset.bindCheck] = event.target.checked; delete state.errors.consent; persist(); }
    if (event.target.dataset.adminRange) { state.adminRange = event.target.value; persist(); render(); }
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    const action = target.dataset.action;
    if (action === 'visit-next') validateVisit();
    else if (action === 'qty') { const id = target.dataset.id, delta = Number(target.dataset.delta); state.registration.groups[id] = Math.max(0, Number(state.registration.groups[id] || 0) + delta); delete state.errors.group; persist(); render(); }
    else if (action === 'group-next') { if (groupTotal() < 1) { state.errors.group = 'Add at least one visitor.'; render(); } else go('/tourist/register/review'); }
    else if (action === 'review-next') { if (!state.registration.consent) { state.errors.consent = 'Confirm the accuracy and privacy statement to continue.'; render(); } else { state.payment = 'idle'; persist(); go('/tourist/payment'); } }
    else if (action === 'payment-start') simulatePayment();
    else if (action === 'payment-check') simulatePayment();
    else if (action === 'payment-reset') { state.payment = 'idle'; render(); }
    else if (action === 'payment-state') { state.payment = target.dataset.state; persist(); render(); }
    else if (action === 'view-pass') { state.passStatus = 'paid'; persist(); go('/tourist/pass'); }
    else if (action === 'pass-state') { state.passStatus = target.dataset.state; persist(); render(); }
    else if (action === 'save-pass') showToast('Pass saved locally (simulated).');
    else if (action === 'scan-fixture') openScanResult(target.dataset.role, target.dataset.code);
    else if (action === 'manual-scan') manualScan(target.dataset.role);
    else if (action === 'open-activation') document.getElementById('confirmDialog')?.showModal();
    else if (action === 'close-dialog') document.getElementById('confirmDialog')?.close();
    else if (action === 'confirm-activation') { state.activated = true; state.passStatus = 'active'; persist(); document.getElementById('confirmDialog')?.close(); go('/officer/result/ACTIVATED'); }
    else if (action === 'table-state') { state.tableState = target.dataset.state; render(); }
    else if (action === 'fake-export') showToast('Export prepared (simulated only).');
    else if (action === 'refresh') showToast('Mock data refreshed.');
  });
  function validateVisit() {
    const r = state.registration, errors = {};
    if (r.lead.trim().length < 3) errors.lead = 'Enter the lead tourist’s full name.';
    if (!/^09\d{9}$/.test(r.mobile.replace(/\s/g, ''))) errors.mobile = 'Enter an 11-digit Philippine mobile number beginning with 09.';
    if (r.address.trim().length < 5) errors.address = 'Enter a complete address.';
    if (!r.arrival) errors.arrival = 'Choose an arrival date.';
    if (!r.departure) errors.departure = 'Choose a departure date.';
    if (r.arrival && r.departure && r.departure < r.arrival) errors.departure = 'Departure cannot be earlier than arrival.';
    state.errors = errors; persist(); Object.keys(errors).length ? render() : go('/tourist/register/group');
  }
  async function simulatePayment() { state.payment = 'processing'; persist(); render(); const result = await window.EcoPassServices.payment.check('success'); state.payment = result.state; state.passStatus = result.state === 'success' ? 'paid' : 'unpaid'; persist(); render(); }
  function manualScan(role) { const input = document.getElementById('manualCode'), code = (input?.value || '').trim().toUpperCase(); if (!code) { showToast('Enter a demo Pass ID.'); return; } openScanResult(role, code); }
  async function openScanResult(role, code) { const result = await window.EcoPassServices.pass.verify(code); state.scanCode = result.code; persist(); go(`/${role}/result/${encodeURIComponent(result.code)}`); }

  function scannerPage(role) {
    const isOfficer = role === 'officer', label = isOfficer ? 'Entry Officer' : 'Destination Staff', assignment = isOfficer ? 'Official Entry Checkpoint 1' : 'Demo Coastal Site A';
    return publicShell(`<div class="scanner-shell"><div class="page-head"><div><p class="eyebrow">${label}</p><h1>Scan EcoPass QR</h1><p class="lead">Assigned ${isOfficer ? 'checkpoint' : 'destination'}: <strong>${assignment}</strong></p></div><span class="connection"><i></i>Online</span></div><section class="card"><div class="scan-frame"><span class="scan-line" aria-hidden="true"></span></div><div class="button-row"><button class="btn btn-outline" type="button" aria-label="Toggle camera flash">☀ Flash</button><button class="btn btn-ghost" type="button" data-action="refresh">Request camera permission</button></div>${alertBox('info', 'Camera permission', 'Camera access is used only to read an EcoPass QR. Use manual entry if permission is denied or unsupported.', 'i')}<div class="field"><label for="manualCode">Enter Pass ID manually</label><div class="button-row"><input class="input" id="manualCode" placeholder="Example: DEMO-PAID" style="flex:1"><button class="btn btn-primary" data-action="manual-scan" data-role="${role}" type="button">Verify</button></div></div><h2 style="margin-top:24px">Demo scan states</h2><div class="fixture-grid">${D.fixtures.map(code => `<button class="fixture" type="button" data-action="scan-fixture" data-role="${role}" data-code="${code}">${code}</button>`).join('')}</div><p class="tiny muted" style="margin-top:14px">Processing, permission-denied, unsupported-camera, offline, and manual-entry states are simulated in this front-end.</p></section></div>`, role);
  }

  function officerRoute(r) {
    if (r === '/officer/scan') return scannerPage('officer');
    if (r === '/officer/activity') return officerActivity();
    if (r === '/officer/account') return publicShell(`<div class="page-head"><div><p class="eyebrow">Entry Officer</p><h1>Account</h1><p class="lead">Assigned to Official Entry Checkpoint 1.</p></div></div>${alertBox('info', 'Demo account', 'No real credentials, permissions, or personal data are stored.', 'i')}`, 'officer');
    if (r.startsWith('/officer/result/')) return officerResult(decodeURIComponent(r.split('/').pop()).toUpperCase());
    return scannerPage('officer');
  }

  function officerResult(code) {
    const base = { title: 'QR Not Recognized', detail: 'This code does not match a known EcoPass.', tone: 'error', symbol: '×', action: 'Scan Next Pass', actionHref: '#/officer/scan' };
    const map = {
      PAID: { title: 'Payment Confirmed', detail: 'This paid EcoPass is eligible for checkpoint activation.', tone: 'success', symbol: '✓', primary: button('Activate EcoPass', 'open-activation') },
      ACTIVATED: { title: 'EcoPass Activated', detail: 'The pass is now active for destination entry.', tone: 'success', symbol: '✓', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      ACTIVE: { title: 'Previously Verified', detail: 'This EcoPass is already active. No second activation was recorded.', tone: 'info', symbol: 'i', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      CHECKIN: { title: 'Previously Verified', detail: 'This EcoPass is already active and has destination activity.', tone: 'info', symbol: 'i', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      UNPAID: { title: 'Payment Not Confirmed', detail: 'The environmental fee has not been confirmed. No activation is allowed.', tone: 'warning', symbol: '!', primary: '<a class="btn btn-outline" href="#/tourist/payment">GCash Instructions</a><a class="btn btn-primary" href="#/officer/scan">Check Again</a>' },
      EXPIRED: { title: 'Pass Expired', detail: 'The EcoPass is outside its validity dates and cannot be activated.', tone: 'error', symbol: '×', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      INVALID: base,
      SUSPENDED: { title: 'Pass Cannot Be Used', detail: 'This EcoPass is suspended. No override is available.', tone: 'error', symbol: '×', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      REFUNDED: { title: 'Pass Cannot Be Used', detail: 'The payment was refunded. No activation is allowed.', tone: 'error', symbol: '×', action: 'Scan Next Pass', actionHref: '#/officer/scan' },
      OFFLINE: { title: 'Unable to Verify', detail: 'The device is offline. No successful verification or activation was recorded.', tone: 'error', symbol: '⌁', action: 'Retry', actionHref: '#/officer/scan' }
    };
    const x = map[code] || base, pass = Object.assign({}, D.samplePass, { groupSize: groupTotal() || D.samplePass.groupSize });
    return publicShell(`<section class="card result-hero"><div class="result-icon tone-${x.tone}">${x.symbol}</div><p class="eyebrow">Checkpoint result</p><h1>${x.title}</h1><p class="lead" style="margin:auto">${x.detail}</p><div class="result-details"><div class="summary-list"><div class="summary-row"><span>Pass ID</span><strong class="pass-id">${pass.id}</strong></div><div class="summary-row"><span>Lead tourist</span><strong>${pass.maskedLead}</strong></div><div class="summary-row"><span>Group size</span><strong>${pass.groupSize} visitors</strong></div><div class="summary-row"><span>Validity</span><strong>${pass.arrival} — ${pass.validUntil}</strong></div><div class="summary-row"><span>Amount</span><strong>${peso(pass.amount)}</strong></div><div class="summary-row"><span>Checkpoint</span><strong>${pass.checkpoint}</strong></div></div><div class="button-row" style="justify-content:center;margin-top:24px">${x.primary || `<a class="btn btn-primary" href="${x.actionHref}">${x.action}</a>`}</div></div></section>`, 'officer');
  }

  function officerActivity() {
    return publicShell(`<div class="page-head"><div><p class="eyebrow">Official Entry Checkpoint 1</p><h1>Today’s activity</h1><p class="lead">Searchable mock checkpoint activity for the current shift.</p></div>${button('Refresh', 'refresh', 'outline')}</div><div class="grid grid-4"><article class="card metric"><span class="metric-label">Groups</span><div class="metric-value">38</div></article><article class="card metric"><span class="metric-label">Visitor arrivals</span><div class="metric-value">124</div></article><article class="card metric"><span class="metric-label">Unpaid results</span><div class="metric-value">7</div></article><article class="card metric"><span class="metric-label">Rejected scans</span><div class="metric-value">3</div></article></div><section class="card" style="margin-top:20px"><div class="card-header"><div><h2>Recent activity</h2><p class="tiny muted">Mock data · last updated 10:10</p></div><input class="input" aria-label="Search recent activity" placeholder="Search Pass ID" style="max-width:240px"></div>${activityTable(D.activity)}</section>`, 'officer');
  }
  function activityTable(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Pass</th><th>Result</th><th>Visitors added</th></tr></thead><tbody>${rows.map(x => `<tr><td>${x.time}</td><td class="pass-id">${x.pass}</td><td>${badge(x.result, x.tone, x.tone === 'success' ? '✓' : x.tone === 'error' ? '×' : '!')}</td><td>${x.visitors}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function destinationRoute(r) {
    if (r === '/destination/scan') return scannerPage('destination');
    if (r === '/destination/today') return destinationToday();
    if (r === '/destination/account') return publicShell(`<div class="page-head"><div><p class="eyebrow">Destination Staff</p><h1>Account</h1><p class="lead">Assigned destination: Demo Coastal Site A. Staff cannot select another destination.</p></div></div>${alertBox('info', 'Assignment enforced', 'Destination assignment is fixed in the prototype interface.', 'i')}`, 'destination');
    if (r.startsWith('/destination/result/')) return destinationResult(decodeURIComponent(r.split('/').pop()).toUpperCase());
    return scannerPage('destination');
  }

  function destinationResult(code) {
    const base = { title: 'Check-in Rejected', detail: 'The QR is invalid. No check-in was recorded.', tone: 'error', symbol: '×', visitors: 0 };
    const map = {
      ACTIVE: { title: 'Check-in Accepted', detail: 'Destination entry was recorded for the actual party size.', tone: 'success', symbol: '✓', visitors: groupTotal() || 4 },
      CHECKIN: { title: 'Check-in Accepted', detail: 'Destination entry was recorded for the actual party size.', tone: 'success', symbol: '✓', visitors: groupTotal() || 4 },
      DUPLICATE: { title: 'Already Checked In Today', detail: 'No additional visitors were added.', tone: 'warning', symbol: '!', visitors: 0 },
      PAID: { title: 'Checkpoint Verification Required', detail: 'The pass is paid but inactive. No check-in was recorded.', tone: 'warning', symbol: '!', visitors: 0 },
      UNPAID: { title: 'Check-in Rejected', detail: 'Payment is not confirmed and the pass is inactive. No check-in was recorded.', tone: 'error', symbol: '×', visitors: 0 },
      EXPIRED: { title: 'Check-in Rejected', detail: 'The EcoPass is expired. No check-in was recorded.', tone: 'error', symbol: '×', visitors: 0 },
      INVALID: base,
      SUSPENDED: { title: 'Check-in Rejected', detail: 'The EcoPass is suspended. No override is available.', tone: 'error', symbol: '×', visitors: 0 },
      REFUNDED: { title: 'Check-in Rejected', detail: 'The payment was refunded. No check-in was recorded.', tone: 'error', symbol: '×', visitors: 0 },
      OFFLINE: { title: 'Unable to Verify', detail: 'The device is offline. No successful check-in was recorded.', tone: 'error', symbol: '⌁', visitors: 0 }
    }, x = map[code] || base;
    return publicShell(`<section class="card result-hero"><div class="result-icon tone-${x.tone}">${x.symbol}</div><p class="eyebrow">Destination scan result</p><h1>${x.title}</h1><p class="lead" style="margin:auto">${x.detail}</p><div class="result-details"><div class="summary-list"><div class="summary-row"><span>Destination</span><strong>Demo Coastal Site A</strong></div><div class="summary-row"><span>Lead tourist</span><strong>${D.samplePass.maskedLead}</strong></div><div class="summary-row"><span>Party size</span><strong>${groupTotal() || 4} visitors</strong></div><div class="summary-row"><span>Visitors added</span><strong>${x.visitors}</strong></div><div class="summary-row"><span>Time</span><strong>10:08</strong></div></div><div class="button-row" style="justify-content:center;margin-top:24px"><a class="btn btn-primary" href="#/destination/scan">Scan Next Pass</a></div></div></section>`, 'destination');
  }

  function destinationToday() {
    return publicShell(`<div class="page-head"><div><p class="eyebrow">Demo Coastal Site A</p><h1>Today</h1><p class="lead">Destination activity with loading, empty, error, and refresh demo states.</p></div>${button('Refresh', 'refresh', 'outline')}</div><div class="grid grid-2"><article class="card metric"><span class="metric-label">Groups checked in</span><div class="metric-value">31</div></article><article class="card metric"><span class="metric-label">Visitor entries</span><div class="metric-value">108</div></article></div><section class="card" style="margin-top:20px"><div class="card-header"><div><h2>Recent activity</h2><p class="tiny muted">Last updated 10:10</p></div></div>${activityTable(D.destinationActivity)}</section>`, 'destination');
  }

  function adminRoute(r) {
    const active = r.split('/')[2] || 'dashboard';
    if (active === 'dashboard') return adminDashboard();
    if (active === 'rankings') return adminRankings();
    if (active === 'reports') return adminReports();
    return adminManagement(active);
  }

  function adminDashboard() {
    const factor = state.adminRange === '30' ? 3.82 : state.adminRange === 'today' ? .15 : 1, d = D.dashboard, mul = n => Math.round(n * factor);
    return adminShell(`<div class="page-head"><div><p class="eyebrow">Administrator</p><h1>Dashboard</h1><p class="lead">All widgets update from the same mock date filter.</p></div></div><div class="filter-bar"><div class="field"><label for="range">Date range</label><select class="select" id="range" data-admin-range><option value="today" ${state.adminRange === 'today' ? 'selected' : ''}>Today</option><option value="7" ${state.adminRange === '7' ? 'selected' : ''}>Last 7 days</option><option value="30" ${state.adminRange === '30' ? 'selected' : ''}>Last 30 days</option></select></div>${badge('All widgets filtered', 'success', '✓')}</div><div class="grid grid-4"><article class="card metric"><span class="metric-label">Verified tourist arrivals</span><div class="metric-value">${mul(d.verifiedArrivals).toLocaleString()}</div><span class="metric-change">Mock filtered total</span></article><article class="card metric"><span class="metric-label">Gross / net collection</span><div class="metric-value">${peso(mul(d.grossCollection))}</div><span class="tiny muted">Net ${peso(mul(d.netCollection))}</span></article><article class="card metric"><span class="metric-label">Destination visitor entries</span><div class="metric-value">${mul(d.checkins).toLocaleString()}</div></article><article class="card metric"><span class="metric-label">Active checkpoints</span><div class="metric-value">${d.activeCheckpoints}</div></article></div><div class="grid grid-2" style="margin-top:20px"><section class="card"><div class="card-header"><div><h2>Weekly arrivals</h2><p class="tiny muted">Verified visitors</p></div></div><div class="chart" aria-label="Weekly arrivals bar chart">${d.weekly.map((n, i) => `<div class="bar" style="height:${Math.max(12, n / Math.max(...d.weekly) * 100)}%" title="${n}"><span>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span></div>`).join('')}</div></section><section class="card"><h2>Fee category summary</h2><div class="summary-list">${d.categories.map(([l, n]) => `<div class="summary-row"><span>${l}</span><strong>${mul(n).toLocaleString()}</strong></div>`).join('')}</div></section><section class="card"><h2>Top destinations</h2>${D.destinations.slice(0, 3).map((x, i) => `<div class="summary-row"><span><strong>#${i + 1}</strong> ${x.name}</span><strong>${mul(x.entries).toLocaleString()}</strong></div>`).join('')}</section><section class="card"><h2>Collection by checkpoint</h2>${d.checkpoints.map(([l, n]) => `<div class="summary-row"><span>${l}</span><strong>${peso(mul(n))}</strong></div>`).join('')}</section></div>`, 'dashboard');
  }

  function adminRankings() {
    let last = null, rank = 0;
    const rows = D.destinations.map((x, i) => { if (x.entries !== last) rank = i + 1; last = x.entries; return Object.assign({}, x, { rank }); });
    return adminShell(`<div class="page-head"><div><p class="eyebrow">Administrator</p><h1>Destination rankings</h1><p class="lead">Equal visitor totals receive the same rank.</p></div></div><div class="filter-bar"><div class="field"><label>Date range</label><select class="select"><option>Last 30 days</option></select></div><div class="field"><label>Search</label><input class="input" placeholder="Search destination"></div></div><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Destination</th><th>Visitor entries</th><th>Group check-ins</th><th>Share</th><th>Trend</th></tr></thead><tbody>${rows.map(x => `<tr><td class="rank">${x.rank}</td><td><strong>${x.name}</strong></td><td>${x.entries.toLocaleString()}</td><td>${x.groups}</td><td>${x.share}</td><td>${badge(x.trend, x.trend.startsWith('-') ? 'warning' : 'success', x.trend.startsWith('-') ? '↓' : '↑')}</td></tr>`).join('')}</tbody></table></div>`, 'rankings');
  }

  function adminReports() {
    return adminShell(`<div class="page-head"><div><p class="eyebrow">Administrator</p><h1>Reports</h1><p class="lead">Preview mock reports. CSV and PDF exports are clearly simulated.</p></div><div class="button-row">${button('Simulate CSV export', 'fake-export', 'outline')}${button('Simulate PDF export', 'fake-export', 'primary')}</div></div><div class="filter-bar"><div class="field"><label>From</label><input class="input" type="date" value="2026-08-01"></div><div class="field"><label>To</label><input class="input" type="date" value="2026-08-28"></div><div class="field"><label>Checkpoint</label><select class="select"><option>All checkpoints</option></select></div></div><div class="grid grid-2">${D.reports.map((name, i) => `<article class="report-item card"><div><h3>${name}</h3><p class="tiny muted">Mock report preview ${i + 1}</p></div><button class="btn btn-ghost" data-action="fake-export">Preview</button></article>`).join('')}</div><section class="card" style="margin-top:20px"><h2>Preview table</h2>${activityTable(D.activity)}</section>`, 'reports');
  }

  function adminManagement(active) {
    const labels = { destinations: 'Destinations', checkpoints: 'Checkpoints', users: 'Users and assignments', 'fee-rules': 'Fee-rule versions', audit: 'Audit logs', settings: 'Settings' }, label = labels[active] || 'Management';
    const rows = active === 'users' ? D.users : active === 'checkpoints' ? D.checkpoints : active === 'destinations' ? D.destinations.map(x => ({ name: x.name, area: 'Demo area', status: 'Enabled' })) : [{ name: `${label} demo record`, area: 'Prototype only', status: 'Enabled' }];
    return adminShell(`<div class="page-head"><div><p class="eyebrow">Administrator · Management</p><h1>${label}</h1><p class="lead">Responsive mock table with search, filters, pagination, and state previews.</p></div><button class="btn btn-primary" data-action="refresh">Add ${active === 'users' ? 'user' : 'record'} (simulated)</button></div><div class="filter-bar"><div class="field"><label>Search</label><input class="input" placeholder="Search ${label.toLowerCase()}"></div><div class="field"><label>Status</label><select class="select"><option>All</option><option>Enabled</option><option>Disabled</option></select></div></div><div class="state-tabs" aria-label="Table state preview">${['data', 'loading', 'empty', 'error', 'no-results'].map(s => `<button class="${state.tableState === s ? 'active' : ''}" data-action="table-state" data-state="${s}">${s}</button>`).join('')}</div>${managementTable(rows)}<div class="button-row end" style="margin-top:14px"><button class="btn btn-ghost" disabled>Previous</button><span class="tiny">Page 1 of 1</span><button class="btn btn-ghost" disabled>Next</button></div>`, active);
  }
  function managementTable(rows) {
    if (state.tableState === 'loading') return `<div class="card"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
    if (state.tableState === 'empty') return `<div class="card empty"><h2>No records yet</h2><p>Add a record to begin.</p></div>`;
    if (state.tableState === 'error') return `<div class="card">${alertBox('error', 'Unable to load records', 'Retry the simulated request.', '×')}${button('Retry', 'table-state', 'primary', 'data-state="data"')}</div>`;
    if (state.tableState === 'no-results') return `<div class="card empty"><h2>No matching results</h2><p>Clear or change the current filters.</p></div>`;
    return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Assignment / area</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(x => `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.assignment || x.area || '—')}</td><td>${badge(x.status || 'Enabled', 'success', '✓')}</td><td><button class="btn btn-ghost" data-action="refresh">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  window.addEventListener('hashchange', render);
  render();
})();
