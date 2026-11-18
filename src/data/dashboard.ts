export type Accent = 'blue' | 'violet' | 'orange' | 'teal' | 'rose' | 'gold'

export type Department = {
  id: string
  name: string
  icon: string
  accent: Accent
  primary: string
  primaryLabel: string
  metrics: [string, string][]
  description: string
  trend: string
}

export type RangeKey = '7d' | '30d' | 'month'

export const departmentsByRange: Record<RangeKey, Department[]> = {
  '7d': [
    {
      id: 'enquiries',
      name: 'Enquiries',
      icon: '◌',
      accent: 'blue',
      primary: '38',
      primaryLabel: 'Total enquiries',
      metrics: [['Qualified', '21'], ['Pending', '12'], ['Converted', '5']],
      description: 'Track new customer opportunities and conversion progress.',
      trend: '+8% vs last week',
    },
    {
      id: 'designs',
      name: 'Designs',
      icon: '✦',
      accent: 'violet',
      primary: '18',
      primaryLabel: 'Total designs',
      metrics: [['Pending', '4'], ['In progress', '8'], ['Completed', '6']],
      description: 'Follow design proposals, assignments, and completion.',
      trend: '3 due this week',
    },
    {
      id: 'quotations',
      name: 'Quotations',
      icon: '▤',
      accent: 'orange',
      primary: '₹3.4L',
      primaryLabel: 'Quotation value',
      metrics: [['Approved', '5'], ['Pending', '8'], ['Converted', '3']],
      description: 'Manage follow-ups, approvals, and production handover.',
      trend: '₹95k approved',
    },
    {
      id: 'production',
      name: 'Production',
      icon: '▧',
      accent: 'teal',
      primary: '11',
      primaryLabel: 'Work orders',
      metrics: [['Active', '6'], ['Completed', '4'], ['Delayed', '1']],
      description: 'Monitor schedules, production progress, and installation.',
      trend: '1 delayed',
    },
    {
      id: 'feedback',
      name: 'Feedback',
      icon: '♡',
      accent: 'rose',
      primary: '22',
      primaryLabel: 'Feedback records',
      metrics: [['Received', '17'], ['Awaiting', '5']],
      description: 'Review customer sentiment and close feedback requests.',
      trend: '77% response rate',
    },
    {
      id: 'labour',
      name: 'Labour',
      icon: '◒',
      accent: 'gold',
      primary: '54',
      primaryLabel: 'Total workers',
      metrics: [['Available', '29'], ['Assigned', '22'], ['Requests', '3']],
      description: 'Coordinate workers, requests, and field allocation.',
      trend: '2 approvals pending',
    },
  ],
  'month': [
    {
      id: 'enquiries',
      name: 'Enquiries',
      icon: '◌',
      accent: 'blue',
      primary: '89',
      primaryLabel: 'Total enquiries',
      metrics: [['Qualified', '51'], ['Pending', '24'], ['Converted', '14']],
      description: 'Track new customer opportunities and conversion progress.',
      trend: '+12% this month',
    },
    {
      id: 'designs',
      name: 'Designs',
      icon: '✦',
      accent: 'violet',
      primary: '41',
      primaryLabel: 'Total designs',
      metrics: [['Pending', '9'], ['In progress', '17'], ['Completed', '15']],
      description: 'Follow design proposals, assignments, and completion.',
      trend: '5 due this week',
    },
    {
      id: 'quotations',
      name: 'Quotations',
      icon: '▤',
      accent: 'orange',
      primary: '₹7.8L',
      primaryLabel: 'Quotation value',
      metrics: [['Approved', '11'], ['Pending', '18'], ['Converted', '7']],
      description: 'Manage follow-ups, approvals, and production handover.',
      trend: '₹1.9L approved',
    },
    {
      id: 'production',
      name: 'Production',
      icon: '▧',
      accent: 'teal',
      primary: '26',
      primaryLabel: 'Work orders',
      metrics: [['Active', '12'], ['Completed', '10'], ['Delayed', '4']],
      description: 'Monitor schedules, production progress, and installation.',
      trend: '4 need attention',
    },
    {
      id: 'feedback',
      name: 'Feedback',
      icon: '♡',
      accent: 'rose',
      primary: '53',
      primaryLabel: 'Feedback records',
      metrics: [['Received', '39'], ['Awaiting', '14']],
      description: 'Review customer sentiment and close feedback requests.',
      trend: '74% response rate',
    },
    {
      id: 'labour',
      name: 'Labour',
      icon: '◒',
      accent: 'gold',
      primary: '54',
      primaryLabel: 'Total workers',
      metrics: [['Available', '24'], ['Assigned', '25'], ['Requests', '5']],
      description: 'Coordinate workers, requests, and field allocation.',
      trend: '3 approvals pending',
    },
  ],
  '30d': [
    {
      id: 'enquiries',
      name: 'Enquiries',
      icon: '◌',
      accent: 'blue',
      primary: '148',
      primaryLabel: 'Total enquiries',
      metrics: [['Qualified', '82'], ['Pending', '41'], ['Converted', '25']],
      description: 'Track new customer opportunities and conversion progress.',
      trend: '+16% vs prior 30d',
    },
    {
      id: 'designs',
      name: 'Designs',
      icon: '✦',
      accent: 'violet',
      primary: '67',
      primaryLabel: 'Total designs',
      metrics: [['Pending', '14'], ['In progress', '28'], ['Completed', '25']],
      description: 'Follow design proposals, assignments, and completion.',
      trend: '8 due this week',
    },
    {
      id: 'quotations',
      name: 'Quotations',
      icon: '▤',
      accent: 'orange',
      primary: '₹12.4L',
      primaryLabel: 'Quotation value',
      metrics: [['Approved', '18'], ['Pending', '29'], ['Converted', '12']],
      description: 'Manage follow-ups, approvals, and production handover.',
      trend: '₹3.1L approved',
    },
    {
      id: 'production',
      name: 'Production',
      icon: '▧',
      accent: 'teal',
      primary: '42',
      primaryLabel: 'Work orders',
      metrics: [['Active', '19'], ['Completed', '17'], ['Delayed', '6']],
      description: 'Monitor schedules, production progress, and installation.',
      trend: '6 need attention',
    },
    {
      id: 'feedback',
      name: 'Feedback',
      icon: '♡',
      accent: 'rose',
      primary: '86',
      primaryLabel: 'Feedback records',
      metrics: [['Received', '63'], ['Awaiting', '23']],
      description: 'Review customer sentiment and close feedback requests.',
      trend: '73% response rate',
    },
    {
      id: 'labour',
      name: 'Labour',
      icon: '◒',
      accent: 'gold',
      primary: '54',
      primaryLabel: 'Total workers',
      metrics: [['Available', '21'], ['Assigned', '27'], ['Requests', '6']],
      description: 'Coordinate workers, requests, and field allocation.',
      trend: '4 approvals pending',
    },
  ],
}

export const departments: Department[] = departmentsByRange['30d']

export const activitiesByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [
    ['Quotation Q-2048 approved', 'Quotation', '12 min ago'],
    ['Design D-619 marked complete', 'Design', '38 min ago'],
    ['Installation scheduled for WO-0842', 'Production', '1 hr ago'],
    ['New enquiry from Aster Interiors', 'Enquiry', '2 hrs ago'],
  ],
  'month': [
    ['Quotation Q-2048 approved', 'Quotation', '12 min ago'],
    ['Design D-619 marked complete', 'Design', '38 min ago'],
    ['Installation scheduled for WO-0842', 'Production', '1 hr ago'],
    ['Work order WO-0839 completed', 'Production', '3 days ago'],
    ['New enquiry from Aster Interiors', 'Enquiry', '5 days ago'],
    ['Quotation Q-2035 converted', 'Quotation', '1 week ago'],
  ],
  '30d': [
    ['Quotation Q-2048 approved', 'Quotation', '12 min ago'],
    ['Design D-619 marked complete', 'Design', '38 min ago'],
    ['Installation scheduled for WO-0842', 'Production', '1 hr ago'],
    ['Work order WO-0839 completed', 'Production', '3 days ago'],
    ['Quotation Q-2035 converted', 'Quotation', '2 weeks ago'],
    ['Design proposal approved for Lakeview', 'Design', '3 weeks ago'],
  ],
}

export const activities = activitiesByRange['30d']

export const actionItemsByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [
    ['1 delayed work order', 'Review production schedule', 'production'],
    ['3 quotations need follow-up', 'Contact customers this week', 'quotations'],
    ['4 designs awaiting completion', 'Review design assignments', 'designs'],
  ],
  'month': [
    ['4 delayed work orders', 'Review production schedule', 'production'],
    ['7 quotations need follow-up', 'Contact customers this week', 'quotations'],
    ['9 designs awaiting completion', 'Review design assignments', 'designs'],
  ],
  '30d': [
    ['6 delayed work orders', 'Review production schedule', 'production'],
    ['11 quotations need follow-up', 'Contact customers this week', 'quotations'],
    ['14 designs awaiting completion', 'Review design assignments', 'designs'],
  ],
}

export const actionItems = actionItemsByRange['30d']

export const departmentDetailsByRange: Record<
  RangeKey,
  Record<string, { title: string; subtitle: string; stats: [string, string, string][]; queue: string[] }>
> = {
  '7d': {
    enquiries: {
      title: 'Enquiry management',
      subtitle: 'Customer opportunities and follow-up activity (Last 7 days)',
      stats: [
        ['Conversion rate', '13.2%', '+1.1%'],
        ['Open enquiries', '12', '3 due today'],
        ['Avg. response time', '2.4h', '-0.5h'],
      ],
      queue: ['ENQ-1048 · Acme Spaces', 'ENQ-1046 · Aster Interiors'],
    },
    designs: {
      title: 'Design management',
      subtitle: 'Design proposals, assignments, and delivery status (Last 7 days)',
      stats: [
        ['Completion rate', '33.3%', '+3.2%'],
        ['In progress', '8', '2 due today'],
        ['Avg. cycle time', '3.8 days', '-0.4 days'],
      ],
      queue: ['D-619 · Office fit-out', 'D-616 · Kitchen renovation'],
    },
    quotations: {
      title: 'Quotation management',
      subtitle: 'Pricing, customer approvals, and production handover (Last 7 days)',
      stats: [
        ['Approval rate', '31.2%', '+2.1%'],
        ['Pending follow-ups', '3', '1 due today'],
        ['Approved value', '₹0.95L', '+₹0.2L'],
      ],
      queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail'],
    },
    production: {
      title: 'Production management',
      subtitle: 'Work orders, schedules, and installation progress (Last 7 days)',
      stats: [
        ['On-time completion', '88.0%', '+2.5%'],
        ['Active work orders', '6', '1 at risk'],
        ['Installations this week', '3', '+1'],
      ],
      queue: ['WO-0842 · Aster Interiors'],
    },
    feedback: {
      title: 'Feedback management',
      subtitle: 'Customer responses and service quality (Last 7 days)',
      stats: [
        ['Response rate', '77.3%', '+5.1%'],
        ['Awaiting response', '5', '1 overdue'],
        ['Satisfaction score', '4.6 / 5', '+0.2'],
      ],
      queue: ['FB-321 · Aster Interiors'],
    },
    labour: {
      title: 'Labour management',
      subtitle: 'Worker availability, allocation, and requests (Last 7 days)',
      stats: [
        ['Utilization', '40.7%', '+2.0%'],
        ['Available workers', '29', '3 needed tomorrow'],
        ['Pending requests', '3', '2 approvals'],
      ],
      queue: ['LR-140 · Production team A', 'LR-138 · Installation team B'],
    },
  },
  'month': {
    enquiries: {
      title: 'Enquiry management',
      subtitle: 'Customer opportunities and follow-up activity (This month)',
      stats: [
        ['Conversion rate', '15.7%', '+1.8%'],
        ['Open enquiries', '24', '7 due today'],
        ['Avg. response time', '2.9h', '-0.6h'],
      ],
      queue: ['ENQ-1048 · Acme Spaces', 'ENQ-1046 · Aster Interiors', 'ENQ-1042 · Northline Homes'],
    },
    designs: {
      title: 'Design management',
      subtitle: 'Design proposals, assignments, and delivery status (This month)',
      stats: [
        ['Completion rate', '36.6%', '+4.5%'],
        ['In progress', '17', '4 due today'],
        ['Avg. cycle time', '4.2 days', '-0.5 days'],
      ],
      queue: ['D-619 · Office fit-out', 'D-616 · Kitchen renovation', 'D-614 · Retail display'],
    },
    quotations: {
      title: 'Quotation management',
      subtitle: 'Pricing, customer approvals, and production handover (This month)',
      stats: [
        ['Approval rate', '30.5%', '+2.9%'],
        ['Pending follow-ups', '7', '3 due today'],
        ['Approved value', '₹1.9L', '+₹0.3L'],
      ],
      queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail', 'Q-2045 · Urban Form'],
    },
    production: {
      title: 'Production management',
      subtitle: 'Work orders, schedules, and installation progress (This month)',
      stats: [
        ['On-time completion', '86.4%', '+2.1%'],
        ['Active work orders', '12', '3 at risk'],
        ['Installations this week', '5', '+2'],
      ],
      queue: ['WO-0842 · Aster Interiors', 'WO-0838 · Lakeview Retail'],
    },
    feedback: {
      title: 'Feedback management',
      subtitle: 'Customer responses and service quality (This month)',
      stats: [
        ['Response rate', '73.6%', '+4.5%'],
        ['Awaiting response', '14', '4 overdue'],
        ['Satisfaction score', '4.5 / 5', '+0.1'],
      ],
      queue: ['FB-321 · Aster Interiors', 'FB-318 · Green Space'],
    },
    labour: {
      title: 'Labour management',
      subtitle: 'Worker availability, allocation, and requests (This month)',
      stats: [
        ['Utilization', '46.3%', '+2.8%'],
        ['Available workers', '24', '4 needed tomorrow'],
        ['Pending requests', '5', '3 approvals'],
      ],
      queue: ['LR-140 · Production team A', 'LR-138 · Installation team B', 'LR-136 · Design support'],
    },
  },
  '30d': {
    enquiries: {
      title: 'Enquiry management',
      subtitle: 'Customer opportunities and follow-up activity (Last 30 days)',
      stats: [
        ['Conversion rate', '16.9%', '+2.4%'],
        ['Open enquiries', '41', '12 due today'],
        ['Avg. response time', '3.2h', '-0.8h'],
      ],
      queue: ['ENQ-1048 · Acme Spaces', 'ENQ-1046 · Aster Interiors', 'ENQ-1042 · Northline Homes', 'ENQ-1035 · Zen Living'],
    },
    designs: {
      title: 'Design management',
      subtitle: 'Design proposals, assignments, and delivery status (Last 30 days)',
      stats: [
        ['Completion rate', '37.3%', '+5.1%'],
        ['In progress', '28', '6 due today'],
        ['Avg. cycle time', '4.6 days', '-0.7 days'],
      ],
      queue: ['D-619 · Office fit-out', 'D-616 · Kitchen renovation', 'D-614 · Retail display', 'D-608 · Studio Loft'],
    },
    quotations: {
      title: 'Quotation management',
      subtitle: 'Pricing, customer approvals, and production handover (Last 30 days)',
      stats: [
        ['Approval rate', '31.0%', '+3.8%'],
        ['Pending follow-ups', '11', '5 due today'],
        ['Approved value', '₹3.1L', '+₹0.4L'],
      ],
      queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail', 'Q-2045 · Urban Form', 'Q-2038 · Skyline Cafe'],
    },
    production: {
      title: 'Production management',
      subtitle: 'Work orders, schedules, and installation progress (Last 30 days)',
      stats: [
        ['On-time completion', '85.7%', '+1.9%'],
        ['Active work orders', '19', '6 at risk'],
        ['Installations this week', '8', '+2'],
      ],
      queue: ['WO-0842 · Aster Interiors', 'WO-0838 · Lakeview Retail', 'WO-0837 · Urban Form', 'WO-0831 · Skyline Cafe'],
    },
    feedback: {
      title: 'Feedback management',
      subtitle: 'Customer responses and service quality (Last 30 days)',
      stats: [
        ['Response rate', '73.3%', '+4.2%'],
        ['Awaiting response', '23', '7 overdue'],
        ['Satisfaction score', '4.4 / 5', 'Consistent'],
      ],
      queue: ['FB-321 · Aster Interiors', 'FB-318 · Green Space', 'FB-316 · Urban Form', 'FB-310 · Prime Tech'],
    },
    labour: {
      title: 'Labour management',
      subtitle: 'Worker availability, allocation, and requests (Last 30 days)',
      stats: [
        ['Utilization', '50.0%', '+3.2%'],
        ['Available workers', '21', '5 needed tomorrow'],
        ['Pending requests', '6', '4 approvals'],
      ],
      queue: ['LR-140 · Production team A', 'LR-138 · Installation team B', 'LR-136 · Design support', 'LR-131 · Warehouse load'],
    },
  },
}

export const departmentDetails = departmentDetailsByRange['30d']
