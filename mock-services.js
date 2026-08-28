(function () {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = code => String(code || '').trim().toUpperCase().replace(/^DEMO-/, '');
  window.EcoPassServices = Object.freeze({
    payment: {
      async check(outcome = 'success') {
        await wait(900);
        return { state: outcome, provider: 'GCash', simulated: true };
      }
    },
    pass: {
      async verify(code) {
        await wait(250);
        return { code: normalize(code), simulated: true, verifiedOnline: normalize(code) !== 'OFFLINE' };
      }
    },
    destination: {
      async checkIn(code, partySize) {
        await wait(250);
        const value = normalize(code);
        return { code: value, visitorsAdded: value === 'ACTIVE' || value === 'CHECKIN' ? partySize : 0, simulated: true };
      }
    },
    reports: {
      async exportPreview(format) {
        await wait(300);
        return { format, simulated: true, created: false };
      }
    }
  });
})();
