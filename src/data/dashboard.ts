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

const baseDepartments: Department[] = [
  { id: 'enquiries', name: 'Enquiries', icon: '◌', accent: 'blue', primary: '0', primaryLabel: 'Total enquiries', metrics: [], description: 'Track new customer opportunities and conversion progress.', trend: '' },
  { id: 'designs', name: 'Designs', icon: '✦', accent: 'violet', primary: '0', primaryLabel: 'Total designs', metrics: [], description: 'Follow design proposals, assignments, and completion.', trend: '' },
  { id: 'quotations', name: 'Quotations', icon: '▤', accent: 'orange', primary: '₹0', primaryLabel: 'Quotation value', metrics: [], description: 'Manage follow-ups, approvals, and production handover.', trend: '' },
  { id: 'production', name: 'Production', icon: '▧', accent: 'teal', primary: '0', primaryLabel: 'Work orders', metrics: [], description: 'Monitor schedules, production progress, and installation.', trend: '' },
  { id: 'feedback', name: 'Feedback', icon: '♡', accent: 'rose', primary: '0', primaryLabel: 'Feedback records', metrics: [], description: 'Review customer sentiment and close feedback requests.', trend: '' },
  { id: 'labour', name: 'Labour', icon: '◒', accent: 'gold', primary: '0', primaryLabel: 'Total workers', metrics: [], description: 'Coordinate workers, requests, and field allocation.', trend: '' },
]

export const departmentsByRange: Record<RangeKey, Department[]> = {
  '7d': baseDepartments,
  '30d': baseDepartments,
  'month': baseDepartments,
}

export const departments: Department[] = baseDepartments

export const activitiesByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [],
  '30d': [],
  'month': [],
}

export const activities = activitiesByRange['30d']

export const actionItemsByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [],
  '30d': [],
  'month': [],
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
        ['Approval rate', '50.0%', '+2.1%'],
        ['Pending follow-ups', '3', '1 due today'],
        ['Approved value', '₹0.95L', '+₹0.2L'],
      ],
      queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail'],
    },
    production: {
      title: 'Production management',
      subtitle: 'Work orders, schedules, and installation progress (Last 7 days)',
      stats: [
        ['On-time completion', '90.9%', '+2.5%'],
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
        ['Approval rate', '50.0%', '+2.9%'],
        ['Pending follow-ups', '7', '3 due today'],
        ['Approved value', '₹1.9L', '+₹0.3L'],
      ],
      queue: ['Q-2052 · Aster Interiors', 'Q-2049 · Lakeview Retail', 'Q-2045 · Urban Form'],
    },
    production: {
      title: 'Production management',
      subtitle: 'Work orders, schedules, and installation progress (This month)',
      stats: [
        ['On-time completion', '84.6%', '+2.1%'],
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
        ['Approval rate', '50.8%', '+3.8%'],
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
