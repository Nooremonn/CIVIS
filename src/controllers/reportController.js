const fs = require('fs');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const { detectHazard } = require('../services/aiService');
const { departmentFor } = require('../services/routingService');

const removeFile = (p) => p && fs.unlink(p, () => {});

// POST /reports   (multipart/form-data: image, latitude, longitude, capturedAt?, clientId?, description?)
exports.createReport = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ message: 'image is required (form field name: image)' });

    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      removeFile(file.path);
      return res.status(400).json({ message: 'valid latitude and longitude are required' });
    }

    const { clientId, description } = req.body;

    // Offline retry safety: same clientId -> return the report we already saved
    if (clientId) {
      const existing = await Report.findOne({ userId: req.user._id, clientId });
      if (existing) {
        removeFile(file.path);
        return res.status(200).json({ message: 'Report already submitted', duplicate: true, report: existing });
      }
    }

    // 1) ask the AI service
    const ai = await detectHazard(file.path, file.mimetype);
    const minConf = Number(process.env.MIN_CONFIDENCE) || 0.5;
    if (!ai.detected || ai.confidence < minConf) {
      removeFile(file.path);
      return res.status(422).json({
        message: 'No civic hazard detected in this photo. Please take a clearer photo of the hazard.',
        confidence: ai.confidence || 0,
      });
    }

    // 2) save as Pending
    const capturedAt = req.body.capturedAt ? new Date(req.body.capturedAt) : new Date();
    const report = await Report.create({
      userId: req.user._id,
      clientId,
      description,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      capturedAt: Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt,
      hazardType: ai.hazardType,
      confidence: ai.confidence,
      severity: ai.severity || 'medium',
      assignedDepartment: departmentFor(ai.hazardType),
      status: 'Pending',
    });

    res.status(201).json({ message: 'Report submitted', duplicate: false, report });
  } catch (err) {
    removeFile(file && file.path);
    next(err);
  }
};

// GET /reports/my?status=Pending&page=1&limit=20
exports.getMyReports = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Report.countDocuments(filter),
    ]);
    res.json({ page, limit, total, reports });
  } catch (err) {
    next(err);
  }
};

// GET /reports/:id
exports.getReportById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid report id' });
    }
    const report = await Report.findById(req.params.id).populate('userId', 'name');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ report });
  } catch (err) {
    next(err);
  }
};
