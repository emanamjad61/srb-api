const { GraphQLError } = require('graphql');
const roomService = require('../services/room.service');
const slotService = require('../services/slot.service');
const studentService = require('../services/student.service');
const bookingService = require('../services/booking.service');
const { toApiError } = require('../middleware/errorHandler');

// Resolvers only call the Question 3 services. Errors are converted with the same
// mapping the REST error handler uses, so codes like SLOT_FULL match in both APIs.
function wrap(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.status >= 500) console.error(err);
      throw new GraphQLError(apiError.message, {
        extensions: { code: apiError.code, status: apiError.status },
      });
    }
  };
}

const resolvers = {
  Query: {
    rooms: wrap(() => roomService.listRooms()),
    slots: wrap((_parent, { roomCode, date }) => slotService.findSlots({ roomCode, date })),
    student: wrap(async (_parent, { regNo }) => {
      try {
        return await studentService.getStudent(regNo);
      } catch (err) {
        if (err.status === 404) return null; // a missing student is just null in GraphQL
        throw err;
      }
    }),
  },

  Mutation: {
    bookSlot: wrap((_parent, { regNo, slotId }) => bookingService.bookSlot(regNo, slotId)),
    cancelBooking: wrap((_parent, { regNo, slotId }) => bookingService.cancelBooking(regNo, slotId)),
  },

  Slot: {
    id: (slot) => String(slot._id),
    seatsLeft: (slot) => slot.seats - slot.booked,
    room: wrap(async (slot) => {
      try {
        return await roomService.getRoom(slot.roomCode);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    }),
  },

  Student: {
    bookings: wrap((student) => bookingService.listBookingsForStudentId(student._id)),
  },

  Booking: {
    bookedAt: (b) => (b.bookedAt ? new Date(b.bookedAt).toISOString() : null),
  },
};

module.exports = resolvers;
