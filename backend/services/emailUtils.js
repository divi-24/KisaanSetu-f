const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider here
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verificationLink = `https://kisaan-setu-f.vercel.app/verify-email?token=${token}`;

  const mailOptions = {
    from: 'KisaanSetu',
    to: email,
    subject: 'Account Verification',
    text: `Please verify your account by clicking on the following link: ${verificationLink}`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
