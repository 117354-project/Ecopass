(function () {
  const today = '2026-08-28';
  window.ECOPASS_DATA = Object.freeze({
    demo: true,
    feeNotice: 'Sample/demo values only — not official Sipalay City rates.',
    statuses: {
      unpaid: { label: 'Payment Required', tone: 'warning', icon: '!', instruction: 'Complete payment first.' },
      paid: { label: 'Paid — Checkpoint Verification Required', short: 'Paid — Verification Required', tone: 'success', icon: '✓', instruction: 'Present QR at an official checkpoint.' },
      active: { label: 'Active EcoPass', tone: 'success', icon: '✓', instruction: 'Present QR at participating destinations.' },
      expired: { label: 'Pass Expired', tone: 'error', icon: '×', instruction: 'This pass is no longer valid.' },
      suspended: { label: 'Pass Unavailable', tone: 'error', icon: '×', instruction: 'Contact authorized support.' },
      refunded: { label: 'Payment Refunded', tone: 'error', icon: '↩', instruction: 'This pass cannot be used.' }
    },
    fixtures: [
      'DEMO-PAID', 'DEMO-ACTIVE', 'DEMO-UNPAID', 'DEMO-EXPIRED', 'DEMO-SUSPENDED',
      'DEMO-REFUNDED', 'DEMO-INVALID', 'DEMO-CHECKIN', 'DEMO-DUPLICATE', 'DEMO-OFFLINE'
    ],
    feeCategories: [
      { id: 'regular', label: 'Regular', rate: 100, discount: 0 },
      { id: 'senior', label: 'Senior', rate: 100, discount: 20 },
      { id: 'pwd', label: 'PWD', rate: 100, discount: 20 },
      { id: 'student', label: 'Student', rate: 100, discount: 10 },
      { id: 'child', label: 'Child', rate: 0, discount: 100 }
    ],
    samplePass: {
      id: 'ECP-260828-000451', lead: 'Juan Dela Cruz', maskedLead: 'J*** D*** C***', groupSize: 4,
      arrival: today, validUntil: '2026-08-30', amount: 330, status: 'paid', checkpoint: 'Official Entry Checkpoint 1'
    },
    destinations: [
      { id: 1, name: 'Demo Coastal Site A', entries: 1284, groups: 391, share: '29.8%', trend: '+8.4%' },
      { id: 2, name: 'Demo Nature Site B', entries: 1118, groups: 344, share: '25.9%', trend: '+5.1%' },
      { id: 3, name: 'Demo Community Site C', entries: 1118, groups: 329, share: '25.9%', trend: '+2.7%' },
      { id: 4, name: 'Demo Heritage Site D', entries: 794, groups: 241, share: '18.4%', trend: '-1.2%' }
    ],
    dashboard: {
      verifiedArrivals: 4314, grossCollection: 418700, netCollection: 401950,
      checkins: 3268, activeCheckpoints: 4,
      weekly: [410, 525, 486, 612, 721, 834, 726],
      categories: [
        ['Regular', 2840], ['Senior', 506], ['PWD', 298], ['Student', 470], ['Child', 200]
      ],
      checkpoints: [['Checkpoint 1', 152400], ['Checkpoint 2', 118300], ['Checkpoint 3', 88900], ['Tourism Office', 59100]]
    },
    activity: [
      { time: '09:42', pass: 'ECP-…451', result: 'Activated', visitors: 4, tone: 'success' },
      { time: '09:36', pass: 'ECP-…508', result: 'Payment Not Confirmed', visitors: 2, tone: 'warning' },
      { time: '09:24', pass: 'ECP-…390', result: 'Previously Verified', visitors: 3, tone: 'neutral' },
      { time: '09:11', pass: 'Unknown', result: 'QR Not Recognized', visitors: 0, tone: 'error' }
    ],
    destinationActivity: [
      { time: '10:08', pass: 'ECP-…451', result: 'Accepted', visitors: 4, tone: 'success' },
      { time: '10:01', pass: 'ECP-…237', result: 'Already Checked In Today', visitors: 0, tone: 'warning' },
      { time: '09:48', pass: 'ECP-…119', result: 'Checkpoint Verification Required', visitors: 0, tone: 'warning' }
    ],
    users: [
      { name: 'A. Santos', role: 'Entry Officer', assignment: 'Checkpoint 1', status: 'Enabled' },
      { name: 'M. Reyes', role: 'Destination Staff', assignment: 'Demo Coastal Site A', status: 'Enabled' },
      { name: 'L. Garcia', role: 'Administrator', assignment: 'Tourism Office', status: 'Enabled' }
    ],
    checkpoints: [
      { name: 'Official Entry Checkpoint 1', area: 'North entry', status: 'Active' },
      { name: 'Official Entry Checkpoint 2', area: 'South entry', status: 'Active' },
      { name: 'Tourism Office', area: 'City center', status: 'Active' }
    ],
    reports: [
      'Daily collection', 'Monthly tourist arrivals', 'Destination performance',
      'Discount/exemption summary', 'Checkpoint summary', 'QR verification log'
    ]
  });
})();
