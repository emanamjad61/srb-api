const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    regNo: {
      type: String,
      required: [true, 'regNo is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^(FA|SP)\d{2}-[A-Z]{3}-\d{3}$/, 'regNo must look like FA23-BCS-045'],
    },
    name: { type: String, required: [true, 'name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email is not valid'],
    },
  },
  { timestamps: true, versionKey: false }
);

studentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Student', studentSchema);
