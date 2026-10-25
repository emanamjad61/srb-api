const { Router } = require('express');
const bookings = require('../controllers/booking.controller');

// mergeParams lets this router read :regNo from the parent /students/:regNo path.
const router = Router({ mergeParams: true });

router.route('/').get(bookings.list).post(bookings.create);
router.delete('/:slotId', bookings.remove);

module.exports = router;
