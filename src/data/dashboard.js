export const departments = [
  { id: 'enquiries', name: 'Enquiries', icon: '◌', accent: 'blue', primary: '148', primaryLabel: 'Total enquiries', metrics: [['Qualified', '82'], ['Pending', '41'], ['Converted', '25']], description: 'Track new customer opportunities and conversion progress.', trend: '+12% this month' },
  { id: 'designs', name: 'Designs', icon: '✦', accent: 'violet', primary: '67', primaryLabel: 'Total designs', metrics: [['Pending', '14'], ['In progress', '28'], ['Completed', '25']], description: 'Follow design proposals, assignments, and completion.', trend: '8 due this week' },
  { id: 'quotations', name: 'Quotations', icon: '▤', accent: 'orange', primary: '₹12.4L', primaryLabel: 'Quotation value', metrics: [['Approved', '18'], ['Pending', '29'], ['Converted', '12']], description: 'Manage follow-ups, approvals, and production handover.', trend: '₹3.1L approved' },
  { id: 'production', name: 'Production', icon: '▧', accent: 'teal', primary: '42', primaryLabel: 'Work orders', metrics: [['Active', '19'], ['Completed', '17'], ['Delayed', '6']], description: 'Monitor schedules, production progress, and installation.', trend: '6 need attention' },
  { id: 'feedback', name: 'Feedback', icon: '♡', accent: 'rose', primary: '86', primaryLabel: 'Feedback records', metrics: [['Received', '63'], ['Awaiting', '23']], description: 'Review customer sentiment and close feedback requests.', trend: '73% response rate' },
  { id: 'labour', name: 'Labour', icon: '◒', accent: 'gold', primary: '54', primaryLabel: 'Total workers', metrics: [['Available', '21'], ['Assigned', '27'], ['Requests', '6']], description: 'Coordinate workers, requests, and field allocation.', trend: '4 approvals pending' },
]

export const activities = [
  ['Quotation Q-2048 approved', 'Quotation', '12 min ago', 'orange'],
  ['Design D-619 marked complete', 'Design', '38 min ago', 'violet'],
  ['Installation scheduled for WO-0842', 'Production', '1 hr ago', 'teal'],
  ['New enquiry from Aster Interiors', 'Enquiry', '2 hrs ago', 'blue'],
]

export const actionItems = [
  ['6 delayed work orders', 'Review production schedule', 'production'],
  ['11 quotations need follow-up', 'Contact customers this week', 'quotations'],
  ['14 designs awaiting completion', 'Review design assignments', 'designs'],
]

export const departmentDetails = {
  enquiries: { title: 'Enquiry management', subtitle: 'Customer opportunities and follow-up activity', stats: [['Conversion rate', '16.9%', '+2.4%'], ['Open enquiries', '41', '12 due today'], ['Avg. response time', '3.2h', '-0.8h']], queue: ['ENQ-1048 · Acme Spaces', 'ENQ-1046 · Aster Interiors', 'ENQ-1042 · Northline Homes'] },
  designs: { title: 'Design management', subtitle: 'Design proposals, assignments, and delivery status', stats: [['Completion rate', '37.3%', '+5.1%'], ['In progress', '28', '6 due today'], ['Avg. cycle time', '4.6 days', '-0.7 days']], queue: ['D-619 · Office fit-out', 'D-616 · Kitchen renovation', 'D-614 · Retail display'] },
  quotations: { title: 'Quotation management', subtitle: 'Pricing, customer approvals, and production handover', stats: [['Approval rate', '31.0%', '+3.8%'], ['Pending follow-ups', '11', '5 due today'], ['Approved value', '₹3.1L', '+₹0.4L']], queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail', 'Q-2045 · Urban Form'] },
  production: { title: 'Production management', subtitle: 'Work orders, schedules, and installation progress', stats: [['On-time completion', '85.7%', '+1.9%'], ['Active work orders', '19', '6 at risk'], ['Installations this week', '8', '+2']], queue: ['WO-0842 · Aster Interiors', 'WO-0838 · Lakeview Retail', 'WO-0837 · Urban Form'] },
  feedback: { title: 'Feedback management', subtitle: 'Customer responses and service quality', stats: [['Response rate', '73.3%', '+4.2%'], ['Awaiting response', '23', '7 overdue'], ['Satisfaction score', '—', 'Needs definition']], queue: ['FB-321 · Aster Interiors', 'FB-318 · Green Space', 'FB-316 · Urban Form'] },
  labour: { title: 'Labour management', subtitle: 'Worker availability, allocation, and requests', stats: [['Utilization', '50.0%', '+3.2%'], ['Available workers', '21', '5 needed tomorrow'], ['Pending requests', '6', '4 approvals']], queue: ['LR-140 · Production team A', 'LR-138 · Installation team B', 'LR-136 · Design support'] },
}
