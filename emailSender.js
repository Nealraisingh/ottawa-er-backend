import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Define schema and model
const waitTimeSchema = new mongoose.Schema({
  hospitalName: String,
  waitTime: Number,
  status: { type: String, default: 'pending' }, // pending / approved / rejected
  timestamp: { type: Date, default: Date.now },
});


const WaitTimeSubmission = mongoose.model('WaitTimeSubmission', waitTimeSchema);

// ✉️ (Optional) Email notifications
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
    text: `A user has submitted a new wait time for ${hospitalName}:\n\n${newWaitTime}\n\nPlease review and verify.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// ✅ Save submissions to MongoDB
app.post('/submit-wait-time', async (req, res) => {
  const { hospital, waitTime } = req.body;

  if (!hospital || !waitTime) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const newSubmission = new WaitTimeSubmission({
      hospitalName: hospital,
      waitTime: parseInt(waitTime),
    });

    await newSubmission.save();
    res.status(200).json({ success: true, message: 'Submission stored in database' });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ success: false, error: 'Failed to store submission' });
  }
});

// ✅ Get latest approved wait time per hospital
app.get('/wait-times', async (req, res) => {
  try {
    // Find all approved, sorted newest first
    const approvedTimes = await WaitTimeSubmission
      .find({ status: 'approved' })
      .sort({ timestamp: -1 });

    // Keep only the latest per hospital
    const latestPerHospital = {};
    approvedTimes.forEach(submission => {
      if (!latestPerHospital[submission.hospitalName]) {
        latestPerHospital[submission.hospitalName] = submission;
      }
    });

    res.json(Object.values(latestPerHospital));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch wait times' });
  }
});


// ✅ Get all pending submissions
app.get('/admin/submissions', async (req, res) => {
  try {
    const pending = await WaitTimeSubmission.find({ status: 'pending' });
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// ✅ Approve a submission
app.post('/admin/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await WaitTimeSubmission.findByIdAndUpdate(
      id,
      { status: 'approved' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    res.json({ success: true, message: 'Submission approved', updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to approve submission' });
  }
});

// ✅ Admin login check
app.post('/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Admin authenticated' });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect admin password' });
  }
});
// ✅ Delete a submission
app.delete('/admin/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await WaitTimeSubmission.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    res.json({ success: true, message: 'Submission deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to delete submission' });
  }
});
app.get('/admin/approved', async (req, res) => {
  try {
    const approved = await WaitTimeSubmission.find({ status: 'approved' });
    res.json(approved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch approved submissions' });
  }
});
// ✅ Get all approved submissions
app.get('/admin/approved', async (req, res) => {
  try {
    const approved = await WaitTimeSubmission.find({ status: 'approved' }).sort({ timestamp: -1 });
    res.json(approved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch approved submissions' });
  }
});

// ✅ Reject a submission
app.post('/admin/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await WaitTimeSubmission.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    res.json({ success: true, message: 'Submission rejected', updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to reject submission' });
  }
});
// Get wait time history for all hospitals
app.get('/wait-times/history', async (req, res) => {
  console.log('GET /wait-times/history called');
  try {
    const history = await WaitTimeSubmission.find({ status: 'approved' }).sort({ timestamp: 1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch wait time history' });
  }
});



app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
