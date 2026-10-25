const { Server } = require('socket.io');
const events = require('../services/events');
const slotService = require('../services/slot.service');
const roomService = require('../services/room.service');

const MAX_ANNOUNCEMENT = 500;

function channel(roomCode) {
  return `room:${roomCode}`;
}

function slotView(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    startHour: slot.startHour,
    seats: slot.seats,
    seatsLeft: slot.seats - slot.booked,
  };
}

function initSocket(httpServer, { adminKey }) {
  const io = new Server(httpServer);

  // --- Boards (default namespace) ---------------------------------------
  io.on('connection', (socket) => {
    socket.on('join:room', async (roomCode, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const room = await roomService.getRoom(String(roomCode || ''));
        // A board shows one room, so leave any room it joined before.
        for (const r of socket.rooms) if (r.startsWith('room:')) socket.leave(r);
        socket.join(channel(room.roomCode));
        const slots = await slotService.findSlots({ roomCode: room.roomCode });
        reply({ ok: true, room: { roomCode: room.roomCode, name: room.name, building: room.building }, slots: slots.map(slotView) });
      } catch (err) {
        reply({ ok: false, error: err.status ? err.message : 'Could not load room' });
      }
    });
  });

  // Bookings and cancellations come from the services (REST or GraphQL).
  // Only sockets in that room's Socket.IO room receive the update.
  events.on('slot:updated', ({ slotId, roomCode, seatsLeft }) => {
    io.to(channel(roomCode)).emit('slot:updated', { slotId, seatsLeft });
  });

  // --- Admin namespace ----------------------------------------------------
  const admin = io.of('/admin');

  admin.use((socket, next) => {
    const key = socket.handshake.auth && socket.handshake.auth.adminKey;
    if (!key) return next(new Error('Admin key is required'));
    if (key !== adminKey) return next(new Error('Invalid admin key'));
    return next();
  });

  admin.on('connection', (socket) => {
    socket.on('announce', (message, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const text = typeof message === 'string' ? message.trim() : '';
      if (!text) return reply({ ok: false, error: 'Message cannot be empty' });
      if (text.length > MAX_ANNOUNCEMENT) {
        return reply({ ok: false, error: `Message must be at most ${MAX_ANNOUNCEMENT} characters` });
      }
      io.of('/').emit('announce', { message: text, at: new Date().toISOString() });
      return reply({ ok: true });
    });
  });

  return io;
}

module.exports = { initSocket };
