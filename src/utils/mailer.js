const nodemailer = require('nodemailer');

// Sends the OTP by email. If EMAIL_USER is empty, prints it in the terminal instead (dev mode).
exports.sendOtpEmail = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`\n[DEV MODE] OTP for ${to}: ${otp}\n`);
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"CIVIS" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your CIVIS verification code',
    text: `Your CIVIS verification code is ${otp}. It expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
  });
};
