const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedCollection(label, items, upsert) {
  for (const item of items) {
    await upsert(item);
  }
  console.log(`  ✓ ${items.length} ${label}`);
}

async function seedUsers() {
  const seedPassword = process.env.SEED_USER_PASSWORD;

  if (!seedPassword) {
    console.log('  - Skipping user seeding because SEED_USER_PASSWORD is not set');
    return;
  }

  const hash = await bcrypt.hash(seedPassword, 10);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'utkarsh@digichainpi.com' },
      update: {},
      create: {
        id: 'u1',
        name: 'Utkarsh Srivastava',
        email: 'utkarsh@digichainpi.com',
        password: hash,
        role: 'founder',
        title: 'Founder & CEO',
        department: 'Leadership',
        phone: '+91 98765 43210',
        bio: 'Building the future of blockchain education.',
        joinDate: '2023-01-01',
      },
    }),
    prisma.user.upsert({
      where: { email: 'karan@digichainpi.com' },
      update: {},
      create: {
        id: 'u2',
        name: 'Karan Singh',
        email: 'karan@digichainpi.com',
        password: hash,
        role: 'employee',
        title: 'Backend Developer',
        department: 'Engineering',
        phone: '+91 98765 43211',
        bio: 'Backend systems and smart contracts.',
        joinDate: '2023-06-01',
      },
    }),
    prisma.user.upsert({
      where: { email: 'riya@digichainpi.com' },
      update: {},
      create: {
        id: 'u3',
        name: 'Riya Srivastava',
        email: 'riya@digichainpi.com',
        password: hash,
        role: 'employee',
        title: 'Operations Manager',
        department: 'Operations',
        phone: '+91 98765 43212',
        bio: 'Keeping everything running smoothly.',
        joinDate: '2023-07-15',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ayush@digichainpi.com' },
      update: {},
      create: {
        id: 'u4',
        name: 'Ayush Khare',
        email: 'ayush@digichainpi.com',
        password: hash,
        role: 'employee',
        title: 'Frontend Developer',
        department: 'Engineering',
        phone: '+91 98765 43213',
        bio: 'Crafting beautiful interfaces.',
        joinDate: '2023-08-01',
      },
    }),
    prisma.user.upsert({
      where: { email: 'gaurav@digichainpi.com' },
      update: {},
      create: {
        id: 'u5',
        name: 'Gaurav Pandey',
        email: 'gaurav@digichainpi.com',
        password: hash,
        role: 'employee',
        title: 'Blockchain Developer',
        department: 'Engineering',
        phone: '+91 98765 43214',
        bio: 'Solidity, audits, DeFi protocols.',
        joinDate: '2023-09-01',
      },
    }),
    prisma.user.upsert({
      where: { email: 'anaya@digichainpi.com' },
      update: {},
      create: {
        id: 'u6',
        name: 'Anaya Sharma',
        email: 'anaya@digichainpi.com',
        password: hash,
        role: 'intern',
        title: 'Dev Intern',
        department: 'Engineering',
        phone: '+91 98765 43215',
        bio: 'Learning and building!',
        joinDate: '2026-01-15',
      },
    }),
  ]);

  console.log(`  ✓ ${users.length} users`);
}

async function main() {
  console.log('Seeding database...');

  await seedUsers();

  const attendanceData = [];
  const leavesData = [];
  const tasksData = [];
  const channelsData = [];
  const messagesData = [];
  const announcementsData = [];
  const documentsData = [];
  const meetingsData = [];

  await seedCollection('attendance records', attendanceData, (item) =>
    prisma.attendance.upsert({
      where: { userId_date: { userId: item.userId, date: item.date } },
      update: {},
      create: item,
    })
  );

  await seedCollection('leaves', leavesData, (item) =>
    prisma.leave.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('tasks', tasksData, (item) =>
    prisma.task.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('channels', channelsData, (item) =>
    prisma.channel.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('messages', messagesData, (item) =>
    prisma.message.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('announcements', announcementsData, (item) =>
    prisma.announcement.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('documents', documentsData, (item) =>
    prisma.document.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  await seedCollection('meetings', meetingsData, (item) =>
    prisma.meeting.upsert({ where: { id: item.id }, update: {}, create: item })
  );

  console.log('\nSeed complete.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
