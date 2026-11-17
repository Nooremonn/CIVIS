// GET /users/me
exports.getMe = (req, res) => {
  res.json({ user: req.user });
};

// PATCH /users/me
exports.updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name) req.user.name = name;
    if (phone) req.user.phone = phone;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};

// POST /users/location  { latitude, longitude }
exports.updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ message: 'latitude and longitude must be numbers' });
    }
    req.user.lastKnownLocation = { type: 'Point', coordinates: [longitude, latitude] };
    await req.user.save();
    res.json({ message: 'Location updated' });
  } catch (err) {
    next(err);
  }
};

// POST /users/fcm-token  { fcmToken }
exports.saveFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });
    req.user.fcmToken = fcmToken;
    await req.user.save();
    res.json({ message: 'Token saved' });
  } catch (err) {
    next(err);
  }
};
