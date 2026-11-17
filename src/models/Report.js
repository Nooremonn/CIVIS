const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String }, // unique ID created by the app (offline retry safety)

    imageUrl: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    capturedAt: { type: Date, default: Date.now },
    description: { type: String, trim: true },

    // --- result from the AI service ---
    hazardType: { type: String, enum: ['pothole', 'open_manhole', 'broken_streetlight'], required: true },
    confidence: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

    // --- workflow ---
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    assignedDepartment: { type: String, enum: ['Roads (C&W)', 'WASA', 'LG&CD'], required: true },
    confirmationCount: { type: Number, default: 1 },
    resolutionImages: {
      before: { type: String },
      after: { type: String },
    },
  },
  { timestamps: true }
);

reportSchema.index({ location: '2dsphere' });
// same user cannot create two reports with the same clientId
reportSchema.index({ userId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

module.exports = mongoose.model('Report', reportSchema);
