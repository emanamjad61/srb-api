# srb-api: Study Room Booking Service

CSC337 Advanced Web Technologies, Assignment 1.

This is the backend for a small study room booking system. Each room has two-hour time slots and a student can book a seat in a slot. One Node.js process serves:

- a REST API under `/api/v1` (Express 5 + Mongoose),
- a GraphQL API at `POST /graphql` (Apollo Server 5), which uses the same services as REST,
- live seat boards over Socket.IO (`/board.html`, plus an `/admin` namespace for announcements).

## Setup

You need Node.js 20 or newer and a MongoDB server (local or Atlas).

```bash
npm install
cp .env.example .env      # then edit MONGODB_URL and ADMIN_KEY
npm run seed              # 3 rooms, 12 slots, 3 students, one full slot
npm run dev               # or: npm start
```

`.env` holds the following values. It is ignored by Git; `.env.example` is the committed template.

| Variable | Meaning |
| --- | --- |
| `PORT` | HTTP port (default 3000) |
| `MONGODB_URL` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/srb` |
| `ADMIN_KEY` | Key the `/admin` Socket.IO namespace requires |

## Project structure

```
srb-api/
├── src/
│   ├── app.js              # builds the Express app (middleware, routes, /graphql, 404, error handler)
│   ├── server.js           # connects MongoDB, creates the HTTP server, attaches Socket.IO, listens
│   ├── config/             # env.js (.env loading), db.js (Mongoose connection)
│   ├── routes/             # URL → controller wiring
│   ├── controllers/        # read req, call a service, send the status code
│   ├── services/           # business rules (shared by REST, GraphQL and Socket.IO)
│   ├── models/             # Mongoose schemas: Room, Slot, Student, Booking
│   ├── middleware/         # requestLogger, notFound, errorHandler
│   ├── graphql/            # typeDefs, resolvers, Apollo setup
│   ├── realtime/           # Socket.IO server (boards + /admin namespace)
│   └── utils/              # ApiError, input validation helpers
├── public/                 # board.html, admin.html, index.html
├── scripts/seed.js         # sample data
├── docs/srb-architecture.drawio   # deployment, ER and sequence diagrams (3 pages)
├── postman/srb-api.postman_collection.json
└── dashboard.graphql
```

## Question 1: Express setup

- `GET /health` returns `{ "status": "ok" }`.
- `requestLogger` prints every request as `METHOD URL STATUS TIMEms`, for example `POST /api/v1/students/FA23-BCS-045/bookings 201 14.2ms`.
- Unknown routes get a 404. Every error, from any layer, goes through one error handler and comes back in the same shape:

```json
{ "error": { "status": 404, "message": "Route not found", "code": "ROUTE_NOT_FOUND" } }
```

The handler maps malformed JSON to 400, Mongoose validation errors to 422, duplicate keys to 409, and anything unexpected to 500.

## Question 2: Diagrams

`docs/srb-architecture.drawio` has three pages. Open it at [app.diagrams.net](https://app.diagrams.net) or in the draw.io desktop app.

1. **Deployment**: browser (board/admin pages), Postman, the Node.js server (Express, Apollo, Socket.IO, services, Mongoose), and MongoDB, with the protocols between them (HTTP/JSON, WebSocket, TCP 27017).
2. **ER diagram**: Room 1–N Slot (by `roomCode`), Student 1–N Booking, Slot 1–N Booking, and a unique `(student, slot)` index.
3. **Sequence**: a student books a slot through REST, with an `alt` frame for the success path (seat taken, `slot:updated` pushed to the room's boards, 201) and the full-slot path (atomic update matches nothing, 409 `SLOT_FULL`).

## Question 3: REST API

All routes are under `/api/v1`.

| Method | Path | Success | Notes |
| --- | --- | --- | --- |
| GET | `/rooms` | 200 | all rooms |
| GET | `/rooms/:roomCode` | 200 | 404 if missing |
| POST | `/rooms` | 201 | 400 missing fields, 422 invalid, 409 duplicate code |
| PUT | `/rooms/:roomCode` | 200 | replaces name, building, seats (all required) |
| PATCH | `/rooms/:roomCode` | 200 | partial update |
| DELETE | `/rooms/:roomCode` | 204 | 409 if any of its slots have bookings |
| POST | `/slots` | 201 | `{ roomCode, date: "YYYY-MM-DD", startHour }`; seats copied from the room, `booked` = 0 |
| GET | `/slots/:id` | 200 | 400 bad id, 404 missing |
| GET | `/slots?roomCode=&date=&hasSeats=true&page=1&limit=10` | 200 | returns `{ data, page, limit, total, totalPages }` |
| POST | `/students` | 201 | `{ regNo, name, email }` |
| GET | `/students/:regNo` | 200 | 404 if missing |
| POST | `/students/:regNo/bookings` | 201 | `{ "slotId": "..." }` |
| GET | `/students/:regNo/bookings` | 200 | each booking has room name, date, start hour |
| DELETE | `/students/:regNo/bookings/:slotId` | 204 | 404 if there is no such booking |

If a PUT or PATCH body contains a different `roomCode`, the API returns **422** `ROOM_CODE_IMMUTABLE`.

### Booking rules

- Unknown student: 404 `STUDENT_NOT_FOUND`. Unknown slot: 404 `SLOT_NOT_FOUND`.
- The same student booking the same slot again: 409 `ALREADY_BOOKED`. A unique index on `(student, slot)` backs this up at the database level.
- No free seat: 409 `SLOT_FULL`.
- A seat is taken with one atomic update, so two students can never both get the last seat:

```js
Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ['$booked', '$seats'] } },
  { $inc: { booked: 1 } },
  { returnDocument: 'after' }
);
```

If the filter matches nothing, the slot was full at that instant and the request gets `SLOT_FULL`. If writing the booking row then fails, the seat is given back.

### Sample data and Postman

`npm run seed` wipes the database and inserts 3 rooms, 12 slots (today and tomorrow), and 3 students. It also books the ROOM-03 08:00 slot to capacity so the full-slot case can be demonstrated.

Import `postman/srb-api.postman_collection.json` into Postman. It has 40 requests in 7 folders, covering both success and failure cases (400, 404, 409 `SLOT_FULL` and `ALREADY_BOOKED`, 422, 204), and each request has test assertions. Run `npm run seed`, then run the whole collection with the Collection Runner. Earlier requests store `slotId` and `fullSlotId` in collection variables for later requests to use.

## Question 4: GraphQL

`POST /graphql` (Apollo Server). Schema:

```graphql
type Query {
  rooms: [Room!]!
  slots(roomCode: String, date: String): [Slot!]!
  student(regNo: String!): Student          # Student.bookings: [Booking!]!
}
type Mutation {
  bookSlot(regNo: String!, slotId: ID!): Booking!
  cancelBooking(regNo: String!, slotId: ID!): Boolean!
}
```

The resolvers in `src/graphql/resolvers.js` contain no business logic. They call the Question 3 functions `bookingService.bookSlot` and `bookingService.cancelBooking`, along with the room, slot and student services. As a result, GraphQL bookings follow the same atomic seat rule, return the same error codes (in `errors[0].extensions.code`, e.g. `SLOT_FULL`), and update the live boards the same way.

`dashboard.graphql` fetches a student's details and all of their bookings in a single request:

```graphql
query StudentDashboard($regNo: String!) {
  student(regNo: $regNo) {
    regNo name email
    bookings { slotId roomCode roomName date startHour bookedAt }
  }
}
```

### Advantage over REST

With REST, a dashboard needs at least two round trips: `GET /students/:regNo` for the details and `GET /students/:regNo/bookings` for the list. Showing anything extra about a room would mean more calls, one per room. Each endpoint also returns its fixed shape, including fields the page never uses (over-fetching).

With GraphQL, the client sends one request, and it names exactly the fields it wants. The server resolves the student and the bookings (joined with slot and room in one aggregation) and returns them together. The result is less network latency, smaller responses, and no client-side stitching. When the page needs a new field, only the query changes, not the server's endpoints.

## Question 5: Socket.IO live boards

Booking still happens through REST (or GraphQL). Socket.IO only pushes the changes.

- **`/board.html?room=ROOM-01`** shows that room's slots and the seats left in each.
- When the page connects it emits **`join:room`** with the roomCode. The server puts the socket in the Socket.IO room `room:ROOM-01` and returns the current slots in the **acknowledgement**.
- When a booking is made or cancelled, the booking service emits an internal event and the Socket.IO layer sends **`slot:updated` `{ slotId, seatsLeft }`** with `io.to('room:<roomCode>')`. Only boards for that room receive it.
- **`/admin` namespace**: the client connects with `io('/admin', { auth: { adminKey } })`. Namespace middleware compares the key with `ADMIN_KEY` from `.env` and refuses a wrong key with `Invalid admin key` (or `Admin key is required` if none is sent), which `admin.html` displays. An admin emits **`announce`** with a message, and every connected board shows it.
- The board header shows **Connected / Disconnected**. Socket.IO reconnects by itself, and because `join:room` is sent on every `connect` event, a restarted server gives the page fresh seat counts without a refresh.
- All text from users or the database is inserted with **`textContent`**; there is no `innerHTML` anywhere.

### Testing the live boards

1. `npm run seed`, then `npm run dev`.
2. Open `http://localhost:3000/board.html?room=ROOM-01` in two tabs and `http://localhost:3000/board.html?room=ROOM-02` in a third.
3. In Postman, book a ROOM-01 slot (`POST /api/v1/students/FA23-BCS-045/bookings` with its `slotId`). Both ROOM-01 boards update within a second; the ROOM-02 board does not change.
4. Open `http://localhost:3000/admin.html`, connect with the key from `.env`, and send an announcement. It appears on all three boards. A wrong key is refused.
5. Stop the server (the boards show Disconnected), then start it again. The boards reconnect and show the correct seats.
