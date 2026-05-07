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
  const seedPassword = '1234';

  const hash = await bcrypt.hash(seedPassword, 10);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'varun@digichain.com' },
      update: {},
      create: {
        id: 'u1',
        name: 'Varun Gupta',
        email: 'varun@digichain.com',
        password: hash,
        role: 'founder',
        title: 'Founder & CEO',
        department: 'Leadership',
        phone: '+91 98765 43210',
        bio: 'Leading DigiChain Workspace.',
        joinDate: '2026-01-01',
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
