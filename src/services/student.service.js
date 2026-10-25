const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { requireFields, pick } = require('../utils/validate');

async function createStudent(body) {
  requireFields(body, ['regNo', 'name', 'email']);
  return Student.create(pick(body, ['regNo', 'name', 'email']));
}

async function getStudent(regNo) {
  const student = await Student.findOne({ regNo: String(regNo).trim().toUpperCase() });
  if (!student) throw ApiError.notFound(`Student ${regNo} not found`, 'STUDENT_NOT_FOUND');
  return student;
}

module.exports = { createStudent, getStudent };
