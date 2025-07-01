import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/send-email', async (req, res) => {
  const { hospitalName, newWaitTime } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'nealsinghrai@gmail.com',
    subject: `Wait Time Update Request: ${hospitalName}`,
    text: `A user has submitted a new wait time for ${hospitalName}:

${newWaitTime}

Please review and verify.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});