const typeDefs = /* GraphQL */ `
  type Room {
    roomCode: String!
    name: String!
    building: String!
    seats: Int!
  }

  type Slot {
    id: ID!
    roomCode: String!
    date: String!
    startHour: Int!
    seats: Int!
    booked: Int!
    seatsLeft: Int!
    room: Room
  }

  type Booking {
    slotId: ID!
    roomCode: String!
    roomName: String
    date: String!
    startHour: Int!
    bookedAt: String
  }

  type Student {
    regNo: String!
    name: String!
    email: String!
    bookings: [Booking!]!
  }

  type Query {
    rooms: [Room!]!
    slots(roomCode: String, date: String): [Slot!]!
    student(regNo: String!): Student
  }

  type Mutation {
    bookSlot(regNo: String!, slotId: ID!): Booking!
    cancelBooking(regNo: String!, slotId: ID!): Boolean!
  }
`;

module.exports = typeDefs;
