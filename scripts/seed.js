// Resets the database and inserts sample rooms, slots, students and bookings.
// Run with: npm run seed
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const Room = require('../src/models/Room');
const Slot = require('../src/models/Slot');
const Student = require('../src/models/Student');
const Booking = require('../src/models/Booking');

function isoDay(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const rooms = [
  { roomCode: 'ROOM-01', name: 'Quiet Study Room', building: 'Library Block', seats: 6 },
  { roomCode: 'ROOM-02', name: 'Group Discussion Room', building: 'CS Block', seats: 4 },
  { roomCode: 'ROOM-03', name: 'Small Focus Pod', building: 'Library Block', seats: 2 },
];

const students = [
  { regNo: 'FA23-BCS-045', name: 'Ali Raza', email: 'ali.raza@example.edu' },
  { regNo: 'FA23-BCS-046', name: 'Sara Khan', email: 'sara.khan@example.edu' },
  { regNo: 'FA23-BCS-047', name: 'Ayesha Malik', email: 'ayesha.malik@example.edu' },
];

async function seed() {
  await connectDB(env.mongoUrl);
  await Promise.all([Booking.deleteMany({}), Slot.deleteMany({}), Student.deleteMany({}), Room.deleteMany({})]);

  const createdRooms = await Room.insertMany(rooms);
  const seatsOf = Object.fromEntries(createdRooms.map((r) => [r.roomCode, r.seats]));

  const today = isoDay(0);
  const tomorrow = isoDay(1);
  const slotPlan = [
    ...Slot.START_HOURS.map((h) => ['ROOM-01', today, h]),
    ['ROOM-01', tomorrow, 8],
    ['ROOM-01', tomorrow, 10],
    ['ROOM-02', today, 8],
    ['ROOM-02', today, 12],
    ['ROOM-02', today, 16],
    ['ROOM-03', today, 8],
    ['ROOM-03', today, 10],
  ];
  const slots = await Slot.insertMany(
    slotPlan.map(([roomCode, date, startHour]) => ({ roomCode, date, startHour, seats: seatsOf[roomCode], booked: 0 }))
  );

  const createdStudents = await Student.insertMany(students);

  // Fill the ROOM-03 08:00 slot completely so the SLOT_FULL case can be shown.
  const fullSlot = slots.find((s) => s.roomCode === 'ROOM-03' && s.startHour === 8);
  await Booking.insertMany(createdStudents.slice(0, fullSlot.seats).map((st) => ({ student: st._id, slot: fullSlot._id })));
  await Slot.updateOne({ _id: fullSlot._id }, { $set: { booked: fullSlot.seats } });

  console.log(`Inserted ${createdRooms.length} rooms, ${slots.length} slots, ${createdStudents.length} students.`);
  console.log(`Full slot (ROOM-03 ${today} 08:00): ${fullSlot._id}`);
  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  await disconnectDB();
  process.exit(1);
});
