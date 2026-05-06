export const USERS = [
  { id: 'u1', name: 'Utkarsh Srivastava', role: 'founder', email: 'utkarsh@digichainpi.com', title: 'Founder & CEO', department: 'Leadership', phone: '+91 98765 43210', bio: 'Building the future of blockchain education.', joinDate: '2023-01-01', avatar: null, password: '1234' },
  { id: 'u2', name: 'Karan Singh',        role: 'employee', email: 'karan@digichainpi.com',   title: 'Backend Developer',  department: 'Engineering', phone: '+91 98765 43211', bio: 'Backend systems and smart contracts.', joinDate: '2023-06-01', avatar: null, password: '1234' },
  { id: 'u3', name: 'Riya Srivastava',    role: 'employee', email: 'riya@digichainpi.com',    title: 'Operations Manager', department: 'Operations',  phone: '+91 98765 43212', bio: 'Keeping everything running smoothly.', joinDate: '2023-07-15', avatar: null, password: '1234' },
  { id: 'u4', name: 'Ayush Khare',        role: 'employee', email: 'ayush@digichainpi.com',   title: 'Frontend Developer', department: 'Engineering', phone: '+91 98765 43213', bio: 'Crafting beautiful interfaces.', joinDate: '2023-08-01', avatar: null, password: '1234' },
  { id: 'u5', name: 'Gaurav Pandey',      role: 'employee', email: 'gaurav@digichainpi.com',  title: 'Blockchain Developer', department: 'Engineering', phone: '+91 98765 43214', bio: 'Solidity, audits, DeFi protocols.', joinDate: '2023-09-01', avatar: null, password: '1234' },
  { id: 'u6', name: 'Anaya Sharma',       role: 'intern',   email: 'anaya@digichainpi.com',   title: 'Dev Intern',         department: 'Engineering', phone: '+91 98765 43215', bio: 'Learning and building!', joinDate: '2026-01-15', avatar: null, password: '1234' },
];

export const LEAVE_TYPES = [
  { id: 'casual',  label: 'Casual Leave',  total: 12 },
  { id: 'sick',    label: 'Sick Leave',     total: 8  },
  { id: 'earned',  label: 'Earned Leave',   total: 18 },
  { id: 'wfh',     label: 'Work From Home', total: 20 },
  { id: 'unpaid',  label: 'Unpaid Leave',   total: 999 },
];

export const INITIAL_ATTENDANCE = [
  { id: 'a1', userId: 'u1', date: '2026-05-05', signIn: '09:32', signOut: '19:15', hours: '9h 43m', status: 'Present', location: 'Office' },
  { id: 'a2', userId: 'u2', date: '2026-05-05', signIn: '10:01', signOut: '18:45', hours: '8h 44m', status: 'Present', location: 'Office' },
  { id: 'a3', userId: 'u3', date: '2026-05-05', signIn: '09:45', signOut: '18:30', hours: '8h 45m', status: 'Remote', location: 'Home' },
  { id: 'a4', userId: 'u4', date: '2026-05-05', signIn: '10:15', signOut: '19:00', hours: '8h 45m', status: 'Present', location: 'Office' },
  { id: 'a5', userId: 'u5', date: '2026-05-05', signIn: '—',     signOut: '—',     hours: '—',      status: 'On Leave', location: '—' },
  { id: 'a6', userId: 'u1', date: '2026-05-04', signIn: '09:20', signOut: '20:10', hours: '10h 50m', status: 'Present', location: 'Office' },
  { id: 'a7', userId: 'u2', date: '2026-05-04', signIn: '09:55', signOut: '18:30', hours: '8h 35m', status: 'Present', location: 'Office' },
  { id: 'a8', userId: 'u3', date: '2026-05-04', signIn: '10:00', signOut: '18:00', hours: '8h 00m', status: 'Remote', location: 'Home' },
  { id: 'a9', userId: 'u4', date: '2026-05-03', signIn: '—',     signOut: '—',     hours: '—',      status: 'Absent', location: '—' },
  { id: 'a10',userId: 'u1', date: '2026-05-02', signIn: '09:10', signOut: '19:30', hours: '10h 20m', status: 'Present', location: 'Office' },
  { id: 'a11',userId: 'u2', date: '2026-05-02', signIn: '10:20', signOut: '18:50', hours: '8h 30m', status: 'Present', location: 'Office' },
  { id: 'a12',userId: 'u1', date: '2026-05-01', signIn: '09:30', signOut: '18:45', hours: '9h 15m', status: 'Present', location: 'Office' },
];

export const INITIAL_LEAVES = [
  { id: 'lv1', userId: 'u5', type: 'casual',  fromDate: '2026-05-05', toDate: '2026-05-06', days: 2, reason: 'Personal commitment', status: 'Approved', approverId: 'u1', appliedOn: '2026-04-28' },
  { id: 'lv2', userId: 'u3', type: 'sick',    fromDate: '2026-04-22', toDate: '2026-04-22', days: 1, reason: 'Fever', status: 'Approved', approverId: 'u1', appliedOn: '2026-04-22' },
  { id: 'lv3', userId: 'u2', type: 'earned',  fromDate: '2026-06-10', toDate: '2026-06-15', days: 4, reason: 'Family vacation', status: 'Pending', approverId: 'u1', appliedOn: '2026-05-01' },
  { id: 'lv4', userId: 'u4', type: 'wfh',     fromDate: '2026-05-08', toDate: '2026-05-09', days: 2, reason: 'Home renovation', status: 'Pending', approverId: 'u1', appliedOn: '2026-05-03' },
  { id: 'lv5', userId: 'u6', type: 'casual',  fromDate: '2026-05-20', toDate: '2026-05-20', days: 1, reason: 'Exam', status: 'Pending', approverId: 'u1', appliedOn: '2026-05-04' },
  { id: 'lv6', userId: 'u3', type: 'earned',  fromDate: '2026-03-15', toDate: '2026-03-20', days: 4, reason: 'Vacation', status: 'Approved', approverId: 'u1', appliedOn: '2026-03-01' },
];

export const LEAVE_USAGE = {
  u1: { casual: 2, sick: 0, earned: 3, wfh: 5, unpaid: 0 },
  u2: { casual: 1, sick: 1, earned: 0, wfh: 3, unpaid: 0 },
  u3: { casual: 2, sick: 1, earned: 4, wfh: 6, unpaid: 0 },
  u4: { casual: 0, sick: 2, earned: 1, wfh: 2, unpaid: 0 },
  u5: { casual: 4, sick: 2, earned: 0, wfh: 4, unpaid: 0 },
  u6: { casual: 0, sick: 0, earned: 0, wfh: 1, unpaid: 0 },
};

export const INITIAL_TASKS = [
  { id: 'TASK-1042', title: 'Ship token contract audit fixes', description: 'Apply four medium-severity fixes from the audit report — reentrancy guard, integer overflow check, and gas-cost regression on the batch path.', priority: 'High',   dueDate: '2026-05-06', status: 'In Progress', assigneeId: 'u1', reporterId: 'u1', tags: ['Smart Contract', 'Security'], comments: [], createdAt: '2026-04-28' },
  { id: 'TASK-1041', title: 'Review Q1 attendance report',   description: 'Compile and review Q1 attendance data for all team members.', priority: 'Medium', dueDate: '2026-05-07', status: 'In Progress', assigneeId: 'u3', reporterId: 'u1', tags: ['HR', 'Operations'], comments: [], createdAt: '2026-04-29' },
  { id: 'TASK-1040', title: 'Indexer performance optimization', description: 'Optimize batch RPC calls on the blockchain indexer to reduce p95 latency below 300ms.', priority: 'High',   dueDate: '2026-05-08', status: 'Pending',    assigneeId: 'u2', reporterId: 'u1', tags: ['Backend', 'Performance'], comments: [], createdAt: '2026-04-30' },
  { id: 'TASK-1039', title: 'Rewrite onboarding email flow', description: 'Update all onboarding email templates for new intern cohort.', priority: 'Low',    dueDate: '2026-05-15', status: 'Pending',    assigneeId: 'u3', reporterId: 'u1', tags: ['Marketing', 'Ops'], comments: [], createdAt: '2026-05-01' },
  { id: 'TASK-1038', title: 'Set up Sentry error monitoring', description: 'Integrate Sentry into the main dashboard app for error tracking.', priority: 'Medium', dueDate: '2026-05-10', status: 'Review',     assigneeId: 'u4', reporterId: 'u2', tags: ['Frontend', 'DevOps'], comments: [], createdAt: '2026-05-01' },
  { id: 'TASK-1037', title: 'Write DeFi protocol documentation', description: 'Document the yield aggregator contract interfaces and usage examples.', priority: 'Medium', dueDate: '2026-05-12', status: 'Pending',    assigneeId: 'u5', reporterId: 'u1', tags: ['Docs', 'DeFi'], comments: [], createdAt: '2026-05-02' },
  { id: 'TASK-1036', title: 'Intern onboarding setup',      description: 'Set up local environment for new intern and assign starter tasks.', priority: 'Low',    dueDate: '2026-05-09', status: 'Completed',  assigneeId: 'u2', reporterId: 'u1', tags: ['HR', 'Mentoring'], comments: [], createdAt: '2026-05-02' },
  { id: 'TASK-1035', title: 'Fix mobile layout on dashboard', description: 'Several layout issues exist on mobile viewport for the stats section.', priority: 'Medium', dueDate: '2026-05-14', status: 'Pending',    assigneeId: 'u4', reporterId: 'u4', tags: ['Frontend', 'Bug'], comments: [], createdAt: '2026-05-03' },
];

export const INITIAL_MESSAGES = {
  channels: [
    { id: 'ch-general', type: 'channel', name: '#general',       memberIds: ['u1','u2','u3','u4','u5','u6'], description: 'Company-wide updates' },
    { id: 'ch-eng',     type: 'channel', name: '#engineering',    memberIds: ['u1','u2','u4','u5','u6'], description: 'Engineering team' },
    { id: 'ch-ops',     type: 'channel', name: '#operations',     memberIds: ['u1','u3'], description: 'Ops & HR' },
    { id: 'ch-random',  type: 'channel', name: '#random',         memberIds: ['u1','u2','u3','u4','u5','u6'], description: 'Fun & casual' },
  ],
  dms: [
    { id: 'dm-u1-u2', type: 'dm', memberIds: ['u1','u2'] },
    { id: 'dm-u1-u3', type: 'dm', memberIds: ['u1','u3'] },
    { id: 'dm-u1-u4', type: 'dm', memberIds: ['u1','u4'] },
    { id: 'dm-u1-u5', type: 'dm', memberIds: ['u1','u5'] },
    { id: 'dm-u1-u6', type: 'dm', memberIds: ['u1','u6'] },
    { id: 'dm-u2-u5', type: 'dm', memberIds: ['u2','u5'] },
  ],
  messages: {
    'ch-general': [
      { id: 'm1', senderId: 'u1', text: 'Hey team! Welcome to our new workspace. 🚀 This is where we keep everything organized.', timestamp: '2026-05-06T09:00:00', reactions: [{ emoji: '🚀', userIds: ['u2','u3','u4'] }, { emoji: '❤️', userIds: ['u5','u6'] }] },
      { id: 'm2', senderId: 'u3', text: 'Love it! Finally everything in one place.', timestamp: '2026-05-06T09:05:00', reactions: [] },
      { id: 'm3', senderId: 'u2', text: 'Mainnet deploy on Friday — let\'s lock it in clean!', timestamp: '2026-05-06T09:10:00', reactions: [{ emoji: '💪', userIds: ['u1','u5'] }] },
      { id: 'm4', senderId: 'u4', text: 'Dashboard UI is looking really clean with the new design.', timestamp: '2026-05-06T09:20:00', reactions: [] },
    ],
    'ch-eng': [
      { id: 'm5', senderId: 'u2', text: 'Pushed the batch RPC optimization. p95 down from 480ms to 280ms.', timestamp: '2026-05-06T10:42:00', reactions: [{ emoji: '🔥', userIds: ['u1','u5'] }] },
      { id: 'm6', senderId: 'u5', text: 'Nice! Let me run the audit suite on it before we merge.', timestamp: '2026-05-06T10:44:00', reactions: [] },
      { id: 'm7', senderId: 'u4', text: 'Sentry is integrated on staging. Will push to prod after review.', timestamp: '2026-05-06T11:00:00', reactions: [{ emoji: '✅', userIds: ['u1'] }] },
    ],
    'ch-random': [
      { id: 'm8', senderId: 'u6', text: 'Anyone up for chai break at 4pm? ☕', timestamp: '2026-05-06T15:30:00', reactions: [{ emoji: '☕', userIds: ['u2','u3','u4'] }] },
      { id: 'm9', senderId: 'u3', text: 'Always 😄', timestamp: '2026-05-06T15:31:00', reactions: [] },
    ],
    'dm-u1-u2': [
      { id: 'm10', senderId: 'u2', text: 'Hey, reviewed the Certik diff. Found two more edge cases in the staking contract.', timestamp: '2026-05-06T08:30:00', reactions: [] },
      { id: 'm11', senderId: 'u1', text: 'Good catch. Can you raise a task for it?', timestamp: '2026-05-06T08:35:00', reactions: [] },
      { id: 'm12', senderId: 'u2', text: 'Done — TASK-1043. Assigned to Gaurav.', timestamp: '2026-05-06T08:37:00', reactions: [{ emoji: '👍', userIds: ['u1'] }] },
    ],
    'dm-u1-u3': [
      { id: 'm13', senderId: 'u3', text: 'Laptop reimbursement policy updated in Docs. Please review before Friday.', timestamp: '2026-05-06T09:00:00', reactions: [] },
      { id: 'm14', senderId: 'u1', text: 'Thanks Riya, will check it today.', timestamp: '2026-05-06T09:02:00', reactions: [] },
    ],
    'dm-u1-u6': [
      { id: 'm15', senderId: 'u6', text: 'Hi Utkarsh! I can\'t run the indexer locally. Getting a module not found error.', timestamp: '2026-05-06T11:00:00', reactions: [] },
      { id: 'm16', senderId: 'u1', text: 'Check if you ran npm install in the /indexer dir specifically. Also tag Karan, he set it up.', timestamp: '2026-05-06T11:05:00', reactions: [] },
    ],
    'dm-u2-u5': [],
    'dm-u1-u4': [],
    'dm-u1-u5': [],
    'ch-ops': [],
  },
};

export const INITIAL_ANNOUNCEMENTS = [
  { id: 'ann1', authorId: 'u1', title: 'Mainnet Deploy — Friday 10 AM IST', body: 'Team, our mainnet deployment is locked in for Friday May 8th at 10:00 AM IST. All code changes must be merged by Thursday EOD. Gaurav and Karan will be on standby for the deployment window. Let\'s land it clean!', createdAt: '2026-05-06T09:00:00', pinned: true, category: 'Important', reactions: [{ emoji: '🚀', userIds: ['u2','u3','u4','u5','u6'] }, { emoji: '💪', userIds: ['u2','u5'] }] },
  { id: 'ann2', authorId: 'u3', title: 'Laptop Reimbursement Policy Updated', body: 'The laptop reimbursement policy has been updated effective May 1st. Employees can now claim up to ₹80,000 for a laptop purchase with a 3-year retention commitment. Full policy document is available in the Documents section under HR Policies.', createdAt: '2026-05-05T14:00:00', pinned: false, category: 'HR', reactions: [{ emoji: '👍', userIds: ['u1','u2','u4'] }] },
  { id: 'ann3', authorId: 'u1', title: 'Intern Cohort — May 2026', body: 'We are onboarding 3 new interns starting May 15th. Please help them get settled. Karan and Ayush are the primary mentors. Please review the intern onboarding checklist in the Documents section.', createdAt: '2026-05-04T11:00:00', pinned: false, category: 'Team', reactions: [{ emoji: '🎉', userIds: ['u2','u3','u4','u5'] }] },
  { id: 'ann4', authorId: 'u3', title: 'Office Timings Reminder', body: 'A reminder that official office hours are 10 AM – 7 PM IST. Attendance sign-in after 10:30 AM will be marked as late. For WFH days, please ensure you are signed in on the workspace by 10 AM.', createdAt: '2026-05-02T10:00:00', pinned: false, category: 'Policy', reactions: [{ emoji: '✅', userIds: ['u2','u4','u5'] }] },
];

export const INITIAL_DOCUMENTS = [
  { id: 'doc1', name: 'Employee Handbook 2026.pdf',       folderId: 'hr',       size: '2.4 MB',  uploadedBy: 'u3', uploadedAt: '2026-04-01', type: 'pdf',  pinned: true },
  { id: 'doc2', name: 'Laptop Reimbursement Policy.pdf',  folderId: 'hr',       size: '512 KB',  uploadedBy: 'u3', uploadedAt: '2026-05-01', type: 'pdf',  pinned: false },
  { id: 'doc3', name: 'Leave Policy 2026.pdf',            folderId: 'hr',       size: '320 KB',  uploadedBy: 'u3', uploadedAt: '2026-01-15', type: 'pdf',  pinned: false },
  { id: 'doc4', name: 'Offer Letter Template.docx',       folderId: 'hr',       size: '128 KB',  uploadedBy: 'u3', uploadedAt: '2026-03-01', type: 'docx', pinned: false },
  { id: 'doc5', name: 'Token Contract Audit Report.pdf',  folderId: 'tech',     size: '4.8 MB',  uploadedBy: 'u5', uploadedAt: '2026-04-20', type: 'pdf',  pinned: true },
  { id: 'doc6', name: 'Indexer Architecture.md',          folderId: 'tech',     size: '64 KB',   uploadedBy: 'u2', uploadedAt: '2026-04-25', type: 'md',   pinned: false },
  { id: 'doc7', name: 'DeFi Protocol Docs v2.pdf',        folderId: 'tech',     size: '3.2 MB',  uploadedBy: 'u5', uploadedAt: '2026-05-02', type: 'pdf',  pinned: false },
  { id: 'doc8', name: 'Q1 Attendance Summary.xlsx',       folderId: 'reports',  size: '156 KB',  uploadedBy: 'u3', uploadedAt: '2026-04-05', type: 'xlsx', pinned: false },
  { id: 'doc9', name: 'April Payslip — Karan.pdf',        folderId: 'payslips', size: '210 KB',  uploadedBy: 'u3', uploadedAt: '2026-05-01', type: 'pdf',  pinned: false },
  { id: 'doc10',name: 'NDA Template.docx',                folderId: 'legal',    size: '98 KB',   uploadedBy: 'u1', uploadedAt: '2026-02-01', type: 'docx', pinned: false },
  { id: 'doc11',name: 'Intern Onboarding Checklist.pdf',  folderId: 'hr',       size: '186 KB',  uploadedBy: 'u3', uploadedAt: '2026-04-30', type: 'pdf',  pinned: false },
];

export const FOLDERS = [
  { id: 'hr',       name: 'HR Policies',     icon: 'users',        color: '#2563eb', access: 'all' },
  { id: 'tech',     name: 'Technical Docs',  icon: 'code',         color: '#7B61FF', access: 'all' },
  { id: 'reports',  name: 'Reports',         icon: 'bar-chart-2',  color: '#16a371', access: 'all' },
  { id: 'payslips', name: 'Payslips',        icon: 'receipt',      color: '#d97706', access: 'self' },
  { id: 'legal',    name: 'Legal',           icon: 'scale',        color: '#e0364c', access: 'founder' },
];

export const INITIAL_MEETINGS = [
  { id: 'mt1', title: 'Weekly Sprint Sync',          hostId: 'u1', attendeeIds: ['u1','u2','u3','u4','u5'], date: '2026-05-07', time: '11:00 AM', duration: 45,  meetLink: 'https://meet.jit.si/digichain-weekly-sprint-sync', description: 'Weekly engineering and ops sync.', recurring: 'weekly', status: 'upcoming' },
  { id: 'mt2', title: 'Mainnet Deploy Briefing',     hostId: 'u1', attendeeIds: ['u1','u2','u5'], date: '2026-05-08', time: '09:30 AM', duration: 60,  meetLink: 'https://meet.jit.si/digichain-mainnet-deploy-briefing', description: 'Pre-deploy checklist review and go/no-go decision.', recurring: null, status: 'upcoming' },
  { id: 'mt3', title: 'Intern 1:1 — Anaya × Karan', hostId: 'u2', attendeeIds: ['u2','u6'], date: '2026-05-07', time: '03:00 PM', duration: 30,  meetLink: 'https://meet.jit.si/digichain-intern-1on1-anaya-karan', description: 'Weekly mentorship check-in.', recurring: 'weekly', status: 'upcoming' },
  { id: 'mt4', title: 'Audit Findings Review',       hostId: 'u1', attendeeIds: ['u1','u5'], date: '2026-05-06', time: '02:30 PM', duration: 60,  meetLink: 'https://meet.jit.si/digichain-audit-findings-review', description: 'Review remaining Certik audit items.', recurring: null, status: 'completed' },
  { id: 'mt5', title: 'Q1 Retrospective',            hostId: 'u1', attendeeIds: ['u1','u2','u3','u4','u5'], date: '2026-04-30', time: '05:00 PM', duration: 90,  meetLink: 'https://meet.jit.si/digichain-q1-retrospective', description: 'Q1 review and Q2 planning.', recurring: null, status: 'completed' },
  { id: 'mt6', title: 'Design Review — Dashboard',  hostId: 'u4', attendeeIds: ['u1','u4','u2'], date: '2026-05-09', time: '04:00 PM', duration: 45,  meetLink: 'https://meet.jit.si/digichain-design-review-dashboard', description: 'Review new dashboard designs.', recurring: null, status: 'upcoming' },
];
