const { Router } = require('express');

const router = Router();

router.use('/rooms', require('./room.routes'));
router.use('/slots', require('./slot.routes'));
router.use('/students', require('./student.routes'));

module.exports = router;
