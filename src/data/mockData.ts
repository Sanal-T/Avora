export type MockEnquiry = {
  id: string
  code: string
  customerName: string
  company: string
  email: string
  phone: string
  requirement: string
  source: string
  status: 'pending' | 'qualified' | 'converted'
  budget: string
  assignedTo: string
  createdAt: string
  updatedAt: string
}

export type MockDesign = {
  id: string
  code: string
  enquiryCode: string
  title: string
  client: string
  designer: string
  version: string
  status: 'pending' | 'in_progress' | 'completed'
  dueDate: string
  completionRate: number
  filesCount: number
}

export type MockLineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxPct: number
}

export type MockQuotation = {
  id: string
  code: string
  enquiryCode: string
  client: string
  title: string
  status: 'pending' | 'approved' | 'converted' | 'rejected'
  version: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  dueDate: string
  author: string
  items: MockLineItem[]
}

export type MockWorkOrder = {
  id: string
  code: string
  quotationCode: string
  client: string
  title: string
  status: 'active' | 'completed' | 'delayed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  stage: 'Cutting' | 'Assembly' | 'Finishing' | 'Quality Check' | 'Installation'
  completionRate: number
  leadWorker: string
  startDate: string
  deliveryDate: string
  tasks: { id: string; title: string; completed: boolean }[]
}

export type MockFeedback = {
  id: string
  code: string
  workOrderCode: string
  client: string
  category: 'Quality' | 'Timeliness' | 'Communication' | 'Installation' | 'Pricing'
  rating: number
  status: 'received' | 'awaiting'
  sentiment: 'positive' | 'neutral' | 'negative'
  comments: string
  date: string
}

export type MockWorker = {
  id: string
  code: string
  name: string
  trade: 'Carpenter' | 'Welder' | 'Electrician' | 'Painter' | 'Installer' | 'Supervisor'
  status: 'available' | 'assigned' | 'unavailable'
  currentAssignment?: string
  phone: string
  efficiencyRating: string
  totalHours: number
}

export type MockNotification = {
  id: string
  title: string
  description: string
  category: 'enquiries' | 'designs' | 'quotations' | 'production' | 'feedback' | 'labour'
  timeAgo: string
  read: boolean
  link: string
}

// ──────────────── MOCK ENQUIRIES ────────────────
export const mockEnquiries: MockEnquiry[] = [
  {
    id: 'enq-1',
    code: 'ENQ-1048',
    customerName: 'Rohit Mehta',
    company: 'Acme Spaces',
    email: 'rohit@acmespaces.in',
    phone: '+91 98201 44521',
    requirement: 'Full interior fit-out for 4,500 sq ft commercial office space',
    source: 'Website',
    status: 'pending',
    budget: '₹14,50,000',
    assignedTo: 'Vikram Patel',
    createdAt: '2026-11-17 10:30',
    updatedAt: '2026-11-17 11:15',
  },
  {
    id: 'enq-2',
    code: 'ENQ-1046',
    customerName: 'Ananya Sharma',
    company: 'Aster Interiors',
    email: 'ananya@aster.design',
    phone: '+91 98450 12890',
    requirement: 'Modular workstation setup and executive conference pods',
    source: 'Referral',
    status: 'qualified',
    budget: '₹8,20,000',
    assignedTo: 'Vikram Patel',
    createdAt: '2026-11-16 14:20',
    updatedAt: '2026-11-17 09:40',
  },
  {
    id: 'enq-3',
    code: 'ENQ-1042',
    customerName: 'Sunil Rao',
    company: 'Northline Homes',
    email: 'sunil@northline.com',
    phone: '+91 97412 88390',
    requirement: 'Custom modular cabinetry and kitchen finishes for luxury villa',
    source: 'Direct',
    status: 'qualified',
    budget: '₹6,40,000',
    assignedTo: 'Priya Sundaram',
    createdAt: '2026-11-14 16:00',
    updatedAt: '2026-11-15 11:30',
  },
  {
    id: 'enq-4',
    code: 'ENQ-1035',
    customerName: 'Divya Nair',
    company: 'Zen Living',
    email: 'divya@zenliving.co',
    phone: '+91 99160 55412',
    requirement: 'Acoustic wall paneling and customized reception credenzas',
    source: 'Social',
    status: 'converted',
    budget: '₹4,90,000',
    assignedTo: 'Priya Sundaram',
    createdAt: '2026-11-10 11:15',
    updatedAt: '2026-11-13 16:50',
  },
  {
    id: 'enq-5',
    code: 'ENQ-1028',
    customerName: 'Karthik Menon',
    company: 'Urban Form',
    email: 'karthik@urbanform.in',
    phone: '+91 98860 33211',
    requirement: 'Retail outlet wall fixtures and display shelving',
    source: 'Website',
    status: 'converted',
    budget: '₹7,10,000',
    assignedTo: 'Vikram Patel',
    createdAt: '2026-11-04 15:45',
    updatedAt: '2026-11-08 14:00',
  },
  {
    id: 'enq-6',
    code: 'ENQ-1021',
    customerName: 'Neha Varma',
    company: 'Skyline Cafe',
    email: 'neha@skyline.org',
    phone: '+91 98220 99401',
    requirement: 'Bespoke hardwood tables, counter fronts and booth seating',
    source: 'Direct',
    status: 'converted',
    budget: '₹3,80,000',
    assignedTo: 'Priya Sundaram',
    createdAt: '2026-10-28 09:30',
    updatedAt: '2026-11-02 17:15',
  },
]

// ──────────────── MOCK DESIGNS ────────────────
export const mockDesigns: MockDesign[] = [
  {
    id: 'des-1',
    code: 'D-619',
    enquiryCode: 'ENQ-1046',
    title: 'Executive Conference Pods & Acoustic Layout',
    client: 'Aster Interiors',
    designer: 'Maya Krishnan',
    version: 'v2.1',
    status: 'completed',
    dueDate: '2026-11-18',
    completionRate: 100,
    filesCount: 6,
  },
  {
    id: 'des-2',
    code: 'D-616',
    enquiryCode: 'ENQ-1042',
    title: 'Luxury Villa Modular Cabinetry CAD Drafting',
    client: 'Northline Homes',
    designer: 'Arjun Sen',
    version: 'v1.4',
    status: 'in_progress',
    dueDate: '2026-11-20',
    completionRate: 75,
    filesCount: 4,
  },
  {
    id: 'des-3',
    code: 'D-614',
    enquiryCode: 'ENQ-1048',
    title: 'Commercial Open Floorplan & Workstations',
    client: 'Acme Spaces',
    designer: 'Maya Krishnan',
    version: 'v1.0',
    status: 'in_progress',
    dueDate: '2026-11-22',
    completionRate: 40,
    filesCount: 2,
  },
  {
    id: 'des-4',
    code: 'D-608',
    enquiryCode: 'ENQ-1035',
    title: 'Acoustic Panel System & Reception Counter 3D',
    client: 'Zen Living',
    designer: 'Arjun Sen',
    version: 'v2.0',
    status: 'completed',
    dueDate: '2026-11-12',
    completionRate: 100,
    filesCount: 8,
  },
]

// ──────────────── MOCK QUOTATIONS ────────────────
export const mockQuotations: MockQuotation[] = [
  {
    id: 'q-1',
    code: 'Q-2052',
    enquiryCode: 'ENQ-1046',
    client: 'Aster Interiors',
    title: 'Workstation & Conference Pod Quotation',
    status: 'approved',
    version: 2,
    subtotal: 720000,
    discountTotal: 36000,
    taxTotal: 123120,
    grandTotal: 807120,
    dueDate: '2026-11-24',
    author: 'Vikram Patel',
    items: [
      { id: 'item-1', description: 'Dual-sided Ergonomic Desking (12-pack)', quantity: 2, unitPrice: 180000, discountPct: 5, taxPct: 18 },
      { id: 'item-2', description: 'Acoustic Soundproof Booth (4-seater)', quantity: 2, unitPrice: 160000, discountPct: 5, taxPct: 18 },
      { id: 'item-3', description: 'Cable Management Trays & Spine Kits', quantity: 24, unitPrice: 1666, discountPct: 0, taxPct: 18 },
    ],
  },
  {
    id: 'q-2',
    code: 'Q-2049',
    enquiryCode: 'ENQ-1048',
    client: 'Acme Spaces',
    title: 'Full Commercial Office Fit-out Estimate',
    status: 'pending',
    version: 1,
    subtotal: 1280000,
    discountTotal: 64000,
    taxTotal: 218880,
    grandTotal: 1434880,
    dueDate: '2026-11-25',
    author: 'Vikram Patel',
    items: [
      { id: 'item-4', description: 'Modular Partition Wall System (Linear Mtr)', quantity: 45, unitPrice: 12000, discountPct: 5, taxPct: 18 },
      { id: 'item-5', description: 'Executive Suite Custom Veneer Desk & Credenza', quantity: 4, unitPrice: 95000, discountPct: 5, taxPct: 18 },
      { id: 'item-6', description: 'Breakout Lounge High Tables with Bar Stools', quantity: 6, unitPrice: 60000, discountPct: 5, taxPct: 18 },
    ],
  },
  {
    id: 'q-3',
    code: 'Q-2045',
    enquiryCode: 'ENQ-1042',
    client: 'Northline Homes',
    title: 'Villa Kitchen & Wardrobe Joinery Quotation',
    status: 'pending',
    version: 1,
    subtotal: 580000,
    discountTotal: 29000,
    taxTotal: 99180,
    grandTotal: 650180,
    dueDate: '2026-11-28',
    author: 'Priya Sundaram',
    items: [
      { id: 'item-7', description: 'Island Counter Modular Cabinets with Quartz Top', quantity: 1, unitPrice: 320000, discountPct: 5, taxPct: 18 },
      { id: 'item-8', description: 'Floor-to-Ceiling Master Wardrobe with Tinted Glass', quantity: 2, unitPrice: 130000, discountPct: 5, taxPct: 18 },
    ],
  },
  {
    id: 'q-4',
    code: 'Q-2035',
    enquiryCode: 'ENQ-1035',
    client: 'Zen Living',
    title: 'Acoustic Panel System & Reception Counter',
    status: 'converted',
    version: 3,
    subtotal: 440000,
    discountTotal: 22000,
    taxTotal: 75240,
    grandTotal: 493240,
    dueDate: '2026-11-15',
    author: 'Priya Sundaram',
    items: [
      { id: 'item-9', description: 'Fabric Wrapped Slatted Acoustic Wall System', quantity: 30, unitPrice: 9000, discountPct: 5, taxPct: 18 },
      { id: 'item-10', description: 'Solid Surface Curved Reception Counter', quantity: 1, unitPrice: 170000, discountPct: 5, taxPct: 18 },
    ],
  },
]

// ──────────────── MOCK WORK ORDERS ────────────────
export const mockWorkOrders: MockWorkOrder[] = [
  {
    id: 'wo-1',
    code: 'WO-0842',
    quotationCode: 'Q-2052',
    client: 'Aster Interiors',
    title: 'Executive Conference Pods Assembly & Installation',
    status: 'active',
    priority: 'high',
    stage: 'Installation',
    completionRate: 85,
    leadWorker: 'Ramesh Gowda',
    startDate: '2026-11-12',
    deliveryDate: '2026-11-20',
    tasks: [
      { id: 't1', title: 'Timber framework pre-cutting & edge banding', completed: true },
      { id: 't2', title: 'Acoustic insulation core lining', completed: true },
      { id: 't3', title: 'Electrical conduit and data wiring', completed: true },
      { id: 't4', title: 'On-site anchor assembly and glass fitting', completed: false },
      { id: 't5', title: 'Final QC and clean handover', completed: false },
    ],
  },
  {
    id: 'wo-2',
    code: 'WO-0839',
    quotationCode: 'Q-2035',
    client: 'Zen Living',
    title: 'Acoustic Slatted Wall System Fabrication',
    status: 'completed',
    priority: 'medium',
    stage: 'Quality Check',
    completionRate: 100,
    leadWorker: 'Murugan S',
    startDate: '2026-11-05',
    deliveryDate: '2026-11-16',
    tasks: [
      { id: 't6', title: 'MDF slatted panel CNC machining', completed: true },
      { id: 't7', title: 'Natural oak veneer pressing & sanding', completed: true },
      { id: 't8', title: 'Polyurethane matte lacquer spray coat', completed: true },
      { id: 't9', title: 'Site delivery and installation', completed: true },
    ],
  },
  {
    id: 'wo-3',
    code: 'WO-0831',
    quotationCode: 'Q-2028',
    client: 'Skyline Cafe',
    title: 'Custom Hardwood Tables and Booth Millwork',
    status: 'delayed',
    priority: 'urgent',
    stage: 'Finishing',
    completionRate: 60,
    leadWorker: 'Ramesh Gowda',
    startDate: '2026-11-02',
    deliveryDate: '2026-11-14',
    tasks: [
      { id: 't10', title: 'Kiln dried teak wood sizing', completed: true },
      { id: 't11', title: 'Tenon and mortise joinery for table bases', completed: true },
      { id: 't12', title: 'Upholstered backrest fabric delivery', completed: false },
      { id: 't13', title: 'Protective epoxy coating and assembly', completed: false },
    ],
  },
]

// ──────────────── MOCK FEEDBACK ────────────────
export const mockFeedback: MockFeedback[] = [
  {
    id: 'fb-1',
    code: 'FB-321',
    workOrderCode: 'WO-0839',
    client: 'Zen Living',
    category: 'Quality',
    rating: 5,
    status: 'received',
    sentiment: 'positive',
    comments: 'The acoustic slat panels turned out stunning. Client loved the natural oak finish and zero smell.',
    date: '2026-11-17',
  },
  {
    id: 'fb-2',
    code: 'FB-318',
    workOrderCode: 'WO-0831',
    client: 'Skyline Cafe',
    category: 'Timeliness',
    rating: 3,
    status: 'received',
    sentiment: 'neutral',
    comments: 'Table craftsmanship is great, but delivery was pushed back by 4 days due to upholstery delay.',
    date: '2026-11-15',
  },
  {
    id: 'fb-3',
    code: 'FB-315',
    workOrderCode: 'WO-0824',
    client: 'Aster Interiors',
    category: 'Installation',
    rating: 5,
    status: 'received',
    sentiment: 'positive',
    comments: 'Installation crew was exceptionally fast, polite, and cleaned the premises spotless before leaving.',
    date: '2026-11-11',
  },
  {
    id: 'fb-4',
    code: 'FB-310',
    workOrderCode: 'WO-0842',
    client: 'Aster Interiors',
    category: 'Communication',
    rating: 4,
    status: 'awaiting',
    sentiment: 'positive',
    comments: 'Awaiting survey feedback on new conference pod commissioning.',
    date: '2026-11-18',
  },
]

// ──────────────── MOCK WORKERS (LABOUR) ────────────────
export const mockWorkers: MockWorker[] = [
  {
    id: 'wrk-1',
    code: 'WRK-101',
    name: 'Ramesh Gowda',
    trade: 'Supervisor',
    status: 'assigned',
    currentAssignment: 'WO-0842 (Aster Interiors)',
    phone: '+91 99001 22310',
    efficiencyRating: '4.9 / 5',
    totalHours: 184,
  },
  {
    id: 'wrk-2',
    code: 'WRK-102',
    name: 'Murugan S',
    trade: 'Carpenter',
    status: 'available',
    phone: '+91 98451 88712',
    efficiencyRating: '4.8 / 5',
    totalHours: 168,
  },
  {
    id: 'wrk-3',
    code: 'WRK-103',
    name: 'Anil Kumar',
    trade: 'Painter',
    status: 'assigned',
    currentAssignment: 'WO-0831 (Skyline Cafe)',
    phone: '+91 97400 44109',
    efficiencyRating: '4.6 / 5',
    totalHours: 152,
  },
  {
    id: 'wrk-4',
    code: 'WRK-104',
    name: 'Mohammad Tariq',
    trade: 'Installer',
    status: 'available',
    phone: '+91 99166 77215',
    efficiencyRating: '4.7 / 5',
    totalHours: 160,
  },
  {
    id: 'wrk-5',
    code: 'WRK-105',
    name: 'Suresh Babu',
    trade: 'Electrician',
    status: 'available',
    phone: '+91 98800 11984',
    efficiencyRating: '4.9 / 5',
    totalHours: 172,
  },
]

// ──────────────── MOCK NOTIFICATIONS ────────────────
export const mockNotifications: MockNotification[] = [
  {
    id: 'notif-1',
    title: 'Quotation Q-2052 Approved',
    description: 'Aster Interiors accepted quotation ₹8.07L. Ready for work order generation.',
    category: 'quotations',
    timeAgo: '15 min ago',
    read: false,
    link: '/quotations/q-1',
  },
  {
    id: 'notif-2',
    title: 'Work Order WO-0831 Delayed',
    description: 'Fabric delivery overdue. Finish stage at risk.',
    category: 'production',
    timeAgo: '1 hr ago',
    read: false,
    link: '/production/wo-3',
  },
  {
    id: 'notif-3',
    title: 'New Enquiry Received',
    description: 'Acme Spaces submitted commercial office requirement (₹14.5L).',
    category: 'enquiries',
    timeAgo: '3 hrs ago',
    read: true,
    link: '/enquiries/enq-1',
  },
  {
    id: 'notif-4',
    title: 'Design D-619 Marked Complete',
    description: 'Maya Krishnan submitted v2.1 for Aster Interiors pods.',
    category: 'designs',
    timeAgo: '5 hrs ago',
    read: true,
    link: '/designs/des-1',
  },
]
