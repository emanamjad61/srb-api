const { Router } = require('express');
const students = require('../controllers/student.controller');
const bookingRoutes = require('./booking.routes');

const router = Router();

router.post('/', students.create);
router.get('/:regNo', students.getOne);
router.use('/:regNo/bookings', bookingRoutes);

module.exports = router;
