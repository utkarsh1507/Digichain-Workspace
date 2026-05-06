const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('1234', 10);
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: 'utkarsh@digichainpi.com' }, update: {}, create: { id: 'u1', name: 'Utkarsh Srivastava', email: 'utkarsh@digichainpi.com', password: hash, role: 'founder', title: 'Founder & CEO', department: 'Leadership', phone: '+91 98765 43210', bio: 'Building the future of blockchain education.', joinDate: '2023-01-01' } }),
    prisma.user.upsert({ where: { email: 'karan@digichainpi.com' },   update: {}, create: { id: 'u2', name: 'Karan Singh',        email: 'karan@digichainpi.com',   password: hash, role: 'employee', title: 'Backend Developer',    department: 'Engineering', phone: '+91 98765 43211', bio: 'Backend systems and smart contracts.', joinDate: '2023-06-01' } }),
    prisma.user.upsert({ where: { email: 'riya@digichainpi.com' },    update: {}, create: { id: 'u3', name: 'Riya Srivastava',    email: 'riya@digichainpi.com',    password: hash, role: 'employee', title: 'Operations Manager',   department: 'Operations',  phone: '+91 98765 43212', bio: 'Keeping everything running smoothly.', joinDate: '2023-07-15' } }),
    prisma.user.upsert({ where: { email: 'ayush@digichainpi.com' },   update: {}, create: { id: 'u4', name: 'Ayush Khare',        email: 'ayush@digichainpi.com',   password: hash, role: 'employee', title: 'Frontend Developer',   department: 'Engineering', phone: '+91 98765 43213', bio: 'Crafting beautiful interfaces.', joinDate: '2023-08-01' } }),
    prisma.user.upsert({ where: { email: 'gaurav@digichainpi.com' },  update: {}, create: { id: 'u5', name: 'Gaurav Pandey',      email: 'gaurav@digichainpi.com',  password: hash, role: 'employee', title: 'Blockchain Developer', department: 'Engineering', phone: '+91 98765 43214', bio: 'Solidity, audits, DeFi protocols.', joinDate: '2023-09-01' } }),
    prisma.user.upsert({ where: { email: 'anaya@digichainpi.com' },   update: {}, create: { id: 'u6', name: 'Anaya Sharma',       email: 'anaya@digichainpi.com',   password: hash, role: 'intern',   title: 'Dev Intern',           department: 'Engineering', phone: '+91 98765 43215', bio: 'Learning and building!', joinDate: '2026-01-15' } }),
  ]);
  console.log(`  ✓ ${users.length} users`);

  // ── Attendance ────────────────────────────────────────────────────────────
  const attendanceData = [
    { id: 'a1',  userId: 'u1', date: '2026-05-05', signIn: '09:32', signOut: '19:15', hours: '9h 43m',  status: 'Present',  location: 'Office' },
    { id: 'a2',  userId: 'u2', date: '2026-05-05', signIn: '10:01', signOut: '18:45', hours: '8h 44m',  status: 'Present',  location: 'Office' },
    { id: 'a3',  userId: 'u3', date: '2026-05-05', signIn: '09:45', signOut: '18:30', hours: '8h 45m',  status: 'Remote',   location: 'Home'   },
    { id: 'a4',  userId: 'u4', date: '2026-05-05', signIn: '10:15', signOut: '19:00', hours: '8h 45m',  status: 'Present',  location: 'Office' },
    { id: 'a5',  userId: 'u5', date: '2026-05-05', signIn: '—',     signOut: '—',     hours: '—',       status: 'On Leave', location: '—'      },
    { id: 'a6',  userId: 'u1', date: '2026-05-04', signIn: '09:20', signOut: '20:10', hours: '10h 50m', status: 'Present',  location: 'Office' },
    { id: 'a7',  userId: 'u2', date: '2026-05-04', signIn: '09:55', signOut: '18:30', hours: '8h 35m',  status: 'Present',  location: 'Office' },
    { id: 'a8',  userId: 'u3', date: '2026-05-04', signIn: '10:00', signOut: '18:00', hours: '8h 00m',  status: 'Remote',   location: 'Home'   },
    { id: 'a9',  userId: 'u4', date: '2026-05-03', signIn: '—',     signOut: '—',     hours: '—',       status: 'Absent',   location: '—'      },
    { id: 'a10', userId: 'u1', date: '2026-05-02', signIn: '09:10', signOut: '19:30', hours: '10h 20m', status: 'Present',  location: 'Office' },
    { id: 'a11', userId: 'u2', date: '2026-05-02', signIn: '10:20', signOut: '18:50', hours: '8h 30m',  status: 'Present',  location: 'Office' },
    { id: 'a12', userId: 'u1', date: '2026-05-01', signIn: '09:30', signOut: '18:45', hours: '9h 15m',  status: 'Present',  location: 'Office' },
  ];
  for (const a of attendanceData) {
    await prisma.attendance.upsert({ where: { userId_date: { userId: a.userId, date: a.date } }, update: {}, create: a });
  }
  console.log(`  ✓ ${attendanceData.length} attendance records`);

  // ── Leaves ────────────────────────────────────────────────────────────────
  const leavesData = [
    { id: 'lv1', userId: 'u5', type: 'Casual',  fromDate: '2026-05-05', toDate: '2026-05-06', days: 2, reason: 'Personal commitment', status: 'Approved', approverId: 'u1', appliedOn: '2026-04-28' },
    { id: 'lv2', userId: 'u3', type: 'Sick',    fromDate: '2026-04-22', toDate: '2026-04-22', days: 1, reason: 'Fever',               status: 'Approved', approverId: 'u1', appliedOn: '2026-04-22' },
    { id: 'lv3', userId: 'u2', type: 'Earned',  fromDate: '2026-06-10', toDate: '2026-06-15', days: 4, reason: 'Family vacation',      status: 'Pending',  approverId: null, appliedOn: '2026-05-01' },
    { id: 'lv4', userId: 'u4', type: 'WFH',     fromDate: '2026-05-08', toDate: '2026-05-09', days: 2, reason: 'Home renovation',      status: 'Pending',  approverId: null, appliedOn: '2026-05-03' },
    { id: 'lv5', userId: 'u6', type: 'Casual',  fromDate: '2026-05-20', toDate: '2026-05-20', days: 1, reason: 'Exam',                 status: 'Pending',  approverId: null, appliedOn: '2026-05-04' },
    { id: 'lv6', userId: 'u3', type: 'Earned',  fromDate: '2026-03-15', toDate: '2026-03-20', days: 4, reason: 'Vacation',             status: 'Approved', approverId: 'u1', appliedOn: '2026-03-01' },
  ];
  for (const l of leavesData) {
    await prisma.leave.upsert({ where: { id: l.id }, update: {}, create: l });
  }
  console.log(`  ✓ ${leavesData.length} leaves`);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const tasksData = [
    { id: 'TASK-1042', title: 'Ship token contract audit fixes',    description: 'Apply four medium-severity fixes from the audit report — reentrancy guard, integer overflow check, and gas-cost regression on the batch path.', priority: 'High',   dueDate: '2026-05-06', status: 'In Progress', assigneeId: 'u1', reporterId: 'u1', tags: JSON.stringify(['Smart Contract', 'Security']) },
    { id: 'TASK-1041', title: 'Review Q1 attendance report',        description: 'Compile and review Q1 attendance data for all team members.',                                                                                    priority: 'Medium', dueDate: '2026-05-07', status: 'In Progress', assigneeId: 'u3', reporterId: 'u1', tags: JSON.stringify(['HR', 'Operations']) },
    { id: 'TASK-1040', title: 'Indexer performance optimization',   description: 'Optimize batch RPC calls on the blockchain indexer to reduce p95 latency below 300ms.',                                                         priority: 'High',   dueDate: '2026-05-08', status: 'Pending',     assigneeId: 'u2', reporterId: 'u1', tags: JSON.stringify(['Backend', 'Performance']) },
    { id: 'TASK-1039', title: 'Rewrite onboarding email flow',      description: 'Update all onboarding email templates for new intern cohort.',                                                                                   priority: 'Low',    dueDate: '2026-05-15', status: 'Pending',     assigneeId: 'u3', reporterId: 'u1', tags: JSON.stringify(['Marketing', 'Ops']) },
    { id: 'TASK-1038', title: 'Set up Sentry error monitoring',     description: 'Integrate Sentry into the main dashboard app for error tracking.',                                                                               priority: 'Medium', dueDate: '2026-05-10', status: 'Review',      assigneeId: 'u4', reporterId: 'u2', tags: JSON.stringify(['Frontend', 'DevOps']) },
    { id: 'TASK-1037', title: 'Write DeFi protocol documentation',  description: 'Document the yield aggregator contract interfaces and usage examples.',                                                                          priority: 'Medium', dueDate: '2026-05-12', status: 'Pending',     assigneeId: 'u5', reporterId: 'u1', tags: JSON.stringify(['Docs', 'DeFi']) },
    { id: 'TASK-1036', title: 'Intern onboarding setup',            description: 'Set up local environment for new intern and assign starter tasks.',                                                                              priority: 'Low',    dueDate: '2026-05-09', status: 'Completed',   assigneeId: 'u2', reporterId: 'u1', tags: JSON.stringify(['HR', 'Mentoring']) },
    { id: 'TASK-1035', title: 'Fix mobile layout on dashboard',     description: 'Several layout issues exist on mobile viewport for the stats section.',                                                                         priority: 'Medium', dueDate: '2026-05-14', status: 'Pending',     assigneeId: 'u4', reporterId: 'u4', tags: JSON.stringify(['Frontend', 'Bug']) },
  ];
  for (const t of tasksData) {
    await prisma.task.upsert({ where: { id: t.id }, update: {}, create: t });
  }
  console.log(`  ✓ ${tasksData.length} tasks`);

  // ── Channels ──────────────────────────────────────────────────────────────
  const channelsData = [
    { id: 'ch-general', name: '#general',     type: 'channel', description: 'Company-wide updates',  memberIds: JSON.stringify(['u1','u2','u3','u4','u5','u6']) },
    { id: 'ch-eng',     name: '#engineering', type: 'channel', description: 'Engineering team',      memberIds: JSON.stringify(['u1','u2','u4','u5','u6']) },
    { id: 'ch-ops',     name: '#operations',  type: 'channel', description: 'Ops & HR',              memberIds: JSON.stringify(['u1','u3']) },
    { id: 'ch-random',  name: '#random',      type: 'channel', description: 'Fun & casual',          memberIds: JSON.stringify(['u1','u2','u3','u4','u5','u6']) },
    { id: 'dm-u1-u2', name: 'dm:u1:u2', type: 'dm', memberIds: JSON.stringify(['u1','u2']) },
    { id: 'dm-u1-u3', name: 'dm:u1:u3', type: 'dm', memberIds: JSON.stringify(['u1','u3']) },
    { id: 'dm-u1-u4', name: 'dm:u1:u4', type: 'dm', memberIds: JSON.stringify(['u1','u4']) },
    { id: 'dm-u1-u5', name: 'dm:u1:u5', type: 'dm', memberIds: JSON.stringify(['u1','u5']) },
    { id: 'dm-u1-u6', name: 'dm:u1:u6', type: 'dm', memberIds: JSON.stringify(['u1','u6']) },
    { id: 'dm-u2-u5', name: 'dm:u2:u5', type: 'dm', memberIds: JSON.stringify(['u2','u5']) },
  ];
  for (const c of channelsData) {
    await prisma.channel.upsert({ where: { id: c.id }, update: {}, create: c });
  }
  console.log(`  ✓ ${channelsData.length} channels`);

  // ── Messages ──────────────────────────────────────────────────────────────
  const messagesData = [
    { id: 'm1',  channelId: 'ch-general', senderId: 'u1', text: 'Hey team! Welcome to our new workspace. 🚀 This is where we keep everything organized.', timestamp: new Date('2026-05-06T09:00:00'), reactions: JSON.stringify([{ emoji: '🚀', userIds: ['u2','u3','u4'] }, { emoji: '❤️', userIds: ['u5','u6'] }]) },
    { id: 'm2',  channelId: 'ch-general', senderId: 'u3', text: 'Love it! Finally everything in one place.', timestamp: new Date('2026-05-06T09:05:00'), reactions: JSON.stringify([]) },
    { id: 'm3',  channelId: 'ch-general', senderId: 'u2', text: "Mainnet deploy on Friday — let's lock it in clean!", timestamp: new Date('2026-05-06T09:10:00'), reactions: JSON.stringify([{ emoji: '💪', userIds: ['u1','u5'] }]) },
    { id: 'm4',  channelId: 'ch-general', senderId: 'u4', text: 'Dashboard UI is looking really clean with the new design.', timestamp: new Date('2026-05-06T09:20:00'), reactions: JSON.stringify([]) },
    { id: 'm5',  channelId: 'ch-eng',     senderId: 'u2', text: 'Pushed the batch RPC optimization. p95 down from 480ms to 280ms.', timestamp: new Date('2026-05-06T10:42:00'), reactions: JSON.stringify([{ emoji: '🔥', userIds: ['u1','u5'] }]) },
    { id: 'm6',  channelId: 'ch-eng',     senderId: 'u5', text: 'Nice! Let me run the audit suite on it before we merge.', timestamp: new Date('2026-05-06T10:44:00'), reactions: JSON.stringify([]) },
    { id: 'm7',  channelId: 'ch-eng',     senderId: 'u4', text: 'Sentry is integrated on staging. Will push to prod after review.', timestamp: new Date('2026-05-06T11:00:00'), reactions: JSON.stringify([{ emoji: '✅', userIds: ['u1'] }]) },
    { id: 'm8',  channelId: 'ch-random',  senderId: 'u6', text: 'Anyone up for chai break at 4pm? ☕', timestamp: new Date('2026-05-06T15:30:00'), reactions: JSON.stringify([{ emoji: '☕', userIds: ['u2','u3','u4'] }]) },
    { id: 'm9',  channelId: 'ch-random',  senderId: 'u3', text: 'Always 😄', timestamp: new Date('2026-05-06T15:31:00'), reactions: JSON.stringify([]) },
    { id: 'm10', channelId: 'dm-u1-u2',   senderId: 'u2', text: 'Hey, reviewed the Certik diff. Found two more edge cases in the staking contract.', timestamp: new Date('2026-05-06T08:30:00'), reactions: JSON.stringify([]) },
    { id: 'm11', channelId: 'dm-u1-u2',   senderId: 'u1', text: 'Good catch. Can you raise a task for it?', timestamp: new Date('2026-05-06T08:35:00'), reactions: JSON.stringify([]) },
    { id: 'm12', channelId: 'dm-u1-u2',   senderId: 'u2', text: 'Done — TASK-1043. Assigned to Gaurav.', timestamp: new Date('2026-05-06T08:37:00'), reactions: JSON.stringify([{ emoji: '👍', userIds: ['u1'] }]) },
    { id: 'm13', channelId: 'dm-u1-u3',   senderId: 'u3', text: 'Laptop reimbursement policy updated in Docs. Please review before Friday.', timestamp: new Date('2026-05-06T09:00:00'), reactions: JSON.stringify([]) },
    { id: 'm14', channelId: 'dm-u1-u3',   senderId: 'u1', text: 'Thanks Riya, will check it today.', timestamp: new Date('2026-05-06T09:02:00'), reactions: JSON.stringify([]) },
    { id: 'm15', channelId: 'dm-u1-u6',   senderId: 'u6', text: "Hi Utkarsh! I can't run the indexer locally. Getting a module not found error.", timestamp: new Date('2026-05-06T11:00:00'), reactions: JSON.stringify([]) },
    { id: 'm16', channelId: 'dm-u1-u6',   senderId: 'u1', text: 'Check if you ran npm install in the /indexer dir specifically. Also tag Karan, he set it up.', timestamp: new Date('2026-05-06T11:05:00'), reactions: JSON.stringify([]) },
  ];
  for (const m of messagesData) {
    await prisma.message.upsert({ where: { id: m.id }, update: {}, create: m });
  }
  console.log(`  ✓ ${messagesData.length} messages`);

  // ── Announcements ─────────────────────────────────────────────────────────
  const announcementsData = [
    { id: 'ann1', authorId: 'u1', title: 'Mainnet Deploy — Friday 10 AM IST', content: "Team, our mainnet deployment is locked in for Friday May 8th at 10:00 AM IST. All code changes must be merged by Thursday EOD. Gaurav and Karan will be on standby for the deployment window. Let's land it clean!", pinned: true,  category: 'Important', reactions: JSON.stringify([{ emoji: '🚀', userIds: ['u2','u3','u4','u5','u6'] }, { emoji: '💪', userIds: ['u2','u5'] }]) },
    { id: 'ann2', authorId: 'u3', title: 'Laptop Reimbursement Policy Updated',  content: 'The laptop reimbursement policy has been updated effective May 1st. Employees can now claim up to ₹80,000 for a laptop purchase with a 3-year retention commitment. Full policy document is available in the Documents section under HR Policies.', pinned: false, category: 'HR',        reactions: JSON.stringify([{ emoji: '👍', userIds: ['u1','u2','u4'] }]) },
    { id: 'ann3', authorId: 'u1', title: 'Intern Cohort — May 2026',             content: 'We are onboarding 3 new interns starting May 15th. Please help them get settled. Karan and Ayush are the primary mentors. Please review the intern onboarding checklist in the Documents section.', pinned: false, category: 'Team',      reactions: JSON.stringify([{ emoji: '🎉', userIds: ['u2','u3','u4','u5'] }]) },
    { id: 'ann4', authorId: 'u3', title: 'Office Timings Reminder',              content: 'A reminder that official office hours are 10 AM – 7 PM IST. Attendance sign-in after 10:30 AM will be marked as late. For WFH days, please ensure you are signed in on the workspace by 10 AM.', pinned: false, category: 'Policy',    reactions: JSON.stringify([{ emoji: '✅', userIds: ['u2','u4','u5'] }]) },
  ];
  for (const a of announcementsData) {
    await prisma.announcement.upsert({ where: { id: a.id }, update: {}, create: a });
  }
  console.log(`  ✓ ${announcementsData.length} announcements`);

  // ── Documents ─────────────────────────────────────────────────────────────
  const documentsData = [
    { id: 'doc1',  name: 'Employee Handbook 2026.pdf',       type: 'PDF',        size: '2.4 MB',  folder: 'HR Policies',    uploaderId: 'u3', url: '#' },
    { id: 'doc2',  name: 'Laptop Reimbursement Policy.pdf',  type: 'PDF',        size: '512 KB',  folder: 'HR Policies',    uploaderId: 'u3', url: '#' },
    { id: 'doc3',  name: 'Leave Policy 2026.pdf',            type: 'PDF',        size: '320 KB',  folder: 'HR Policies',    uploaderId: 'u3', url: '#' },
    { id: 'doc4',  name: 'Offer Letter Template.docx',       type: 'Word',       size: '128 KB',  folder: 'HR Policies',    uploaderId: 'u3', url: '#' },
    { id: 'doc5',  name: 'Token Contract Audit Report.pdf',  type: 'PDF',        size: '4.8 MB',  folder: 'Technical Docs', uploaderId: 'u5', url: '#' },
    { id: 'doc6',  name: 'Indexer Architecture.md',          type: 'Other',      size: '64 KB',   folder: 'Technical Docs', uploaderId: 'u2', url: '#' },
    { id: 'doc7',  name: 'DeFi Protocol Docs v2.pdf',        type: 'PDF',        size: '3.2 MB',  folder: 'Technical Docs', uploaderId: 'u5', url: '#' },
    { id: 'doc8',  name: 'Q1 Attendance Summary.xlsx',       type: 'Excel',      size: '156 KB',  folder: 'Reports',        uploaderId: 'u3', url: '#' },
    { id: 'doc9',  name: 'April Payslip — Karan.pdf',        type: 'PDF',        size: '210 KB',  folder: 'Payslips',       uploaderId: 'u3', url: '#' },
    { id: 'doc10', name: 'NDA Template.docx',                type: 'Word',       size: '98 KB',   folder: 'Legal',          uploaderId: 'u1', url: '#' },
    { id: 'doc11', name: 'Intern Onboarding Checklist.pdf',  type: 'PDF',        size: '186 KB',  folder: 'HR Policies',    uploaderId: 'u3', url: '#' },
  ];
  for (const d of documentsData) {
    await prisma.document.upsert({ where: { id: d.id }, update: {}, create: d });
  }
  console.log(`  ✓ ${documentsData.length} documents`);

  // ── Meetings ──────────────────────────────────────────────────────────────
  const meetingsData = [
    { id: 'mt1', title: 'Weekly Sprint Sync',         organizerId: 'u1', attendeeIds: JSON.stringify(['u1','u2','u3','u4','u5']), date: '2026-05-07', time: '11:00 AM', duration: '45 min', meetLink: 'https://meet.jit.si/digichain-weekly-sprint-sync', description: 'Weekly engineering and ops sync.' },
    { id: 'mt2', title: 'Mainnet Deploy Briefing',    organizerId: 'u1', attendeeIds: JSON.stringify(['u1','u2','u5']),           date: '2026-05-08', time: '09:30 AM', duration: '60 min', meetLink: 'https://meet.jit.si/digichain-mainnet-deploy-briefing', description: 'Pre-deploy checklist review and go/no-go decision.' },
    { id: 'mt3', title: 'Intern 1:1 — Anaya × Karan',organizerId: 'u2', attendeeIds: JSON.stringify(['u2','u6']),               date: '2026-05-07', time: '03:00 PM', duration: '30 min', meetLink: 'https://meet.jit.si/digichain-intern-1on1-anaya-karan',  description: 'Weekly mentorship check-in.' },
    { id: 'mt4', title: 'Audit Findings Review',      organizerId: 'u1', attendeeIds: JSON.stringify(['u1','u5']),               date: '2026-05-06', time: '02:30 PM', duration: '60 min', meetLink: 'https://meet.jit.si/digichain-audit-findings-review', description: 'Review remaining Certik audit items.' },
    { id: 'mt5', title: 'Q1 Retrospective',           organizerId: 'u1', attendeeIds: JSON.stringify(['u1','u2','u3','u4','u5']),date: '2026-04-30', time: '05:00 PM', duration: '90 min', meetLink: 'https://meet.jit.si/digichain-q1-retrospective',     description: 'Q1 review and Q2 planning.' },
    { id: 'mt6', title: 'Design Review — Dashboard',  organizerId: 'u4', attendeeIds: JSON.stringify(['u1','u4','u2']),          date: '2026-05-09', time: '04:00 PM', duration: '45 min', meetLink: 'https://meet.jit.si/digichain-design-review-dashboard',  description: 'Review new dashboard designs.' },
  ];
  for (const m of meetingsData) {
    await prisma.meeting.upsert({ where: { id: m.id }, update: {}, create: m });
  }
  console.log(`  ✓ ${meetingsData.length} meetings`);

  console.log('\n✅ Seed complete!\n');
  console.log('   Login credentials (all users):');
  console.log('   Email: utkarsh@digichainpi.com  Password: 1234  (Founder)');
  console.log('   Email: karan@digichainpi.com    Password: 1234  (Employee)');
  console.log('   Email: anaya@digichainpi.com    Password: 1234  (Intern)\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
