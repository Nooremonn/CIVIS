const crypto = require('crypto');
const bcrypt = require('bcryptjs');

exports.generateOtp = () => crypto.randomInt(100000, 1000000).toString(); // 6 digits

// Saves a fresh hashed OTP on the user document (does not call save())
exports.attachOtp = async (user) => {
  const otp = exports.generateOtp();
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
  user.otpHash = await bcrypt.hash(otp, 8);
  user.otpExpires = new Date(Date.now() + minutes * 60 * 1000);
  user.otpAttempts = 0;
  return otp;
};
