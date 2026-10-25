const studentService = require('../services/student.service');

async function create(req, res) {
  res.status(201).json(await studentService.createStudent(req.body));
}

async function getOne(req, res) {
  res.json(await studentService.getStudent(req.params.regNo));
}

module.exports = { create, getOne };
