const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { attachOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

// ---- Email format check: name@domain.com (e.g. aimenume2002@gmail.com) ----
const EMAIL_REGEX = /^[a-z0-9]+([._%+-][a-z0-9]+)*@[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*\.[a-z]{2,}$/i;
// removes spaces and makes lowercase: "  Ume@Gmail.com " -> "ume@gmail.com"
const cleanEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => email.length <= 254 && EMAIL_REGEX.test(email);

const MAX_OTP_ATTEMPTS = 5;

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, isVerified: u.isVerified });

// POST /auth/register  -> creates unverified user and sends OTP
exports.register = async (req, res, next) => {
  try {
    const { name, password, phone } = req.body;
    const email = cleanEmail(req.body.email);
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address (e.g. name@gmail.com)' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    if (user) {
      // registered earlier but never verified: let them start again
      user.name = name;
      user.password = password;
      user.phone = phone;
    } else {
      user = new User({ name, email, password, phone });
    }

    const otp = await attachOtp(user);
    await user.save();
    await sendOtpEmail(user.email, otp);

    res.status(201).json({
      message: 'Registered. Check your email for the 6-digit OTP.',
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/verify-otp  { email, otp }
exports.verifyOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const email = cleanEmail(req.body.email);
    if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });

    const user = await User.findOne({ email }).select('+otpHash +otpExpires +otpAttempts');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified, please login' });
    if (!user.otpHash || !user.otpExpires) {
      return res.status(400).json({ message: 'No OTP requested. Use resend-otp.' });
    }
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many wrong attempts. Request a new OTP.' });
    }
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }

    const ok = await bcrypt.compare(String(otp), user.otpHash);
    if (!ok) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({ message: 'Email verified', token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// POST /auth/resend-otp  { email }
exports.resendOtp = async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    if (!email) return res.status(400).json({ message: 'email is required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified, please login' });

    const otp = await attachOtp(user);
    await user.save();
    await sendOtpEmail(user.email, otp);
    res.json({ message: 'A new OTP has been sent' });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = cleanEmail(req.body.email);
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified. Please verify your OTP.' });
    }

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};
