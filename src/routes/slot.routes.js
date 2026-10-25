const { Router } = require('express');
const slots = require('../controllers/slot.controller');

const router = Router();

router.route('/').get(slots.list).post(slots.create);
router.get('/:id', slots.getOne);

module.exports = router;
