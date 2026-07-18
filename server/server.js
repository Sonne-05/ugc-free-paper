require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const Note = require('./models/Note');
const PyqSet = require('./models/PyqSet');
const Question = require('./models/Question');
const Setting = require('./models/Setting');
const User = require('./models/User');
const Traffic = require('./models/Traffic');
const ContactMessage = require('./models/ContactMessage');
const nodemailer = require('nodemailer');

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PORT = process.env.PORT || 5000;

// Configure Nodemailer for Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtppro.zoho.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 465,
  secure: (process.env.EMAIL_PORT === '465' || !process.env.EMAIL_PORT), // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Get notes data for a unit
app.get('/api/notes/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const note = await Note.findOne({ unitId });
    if (note) {
      res.json(note);
    } else {
      res.status(404).json({ message: 'Notes not found for this unit.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Save notes data for a unit
app.post('/api/notes/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { unitTitle, subtitle, htmlContent } = req.body;
    
    await Note.findOneAndUpdate(
      { unitId },
      { unitTitle, subtitle, htmlContent },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, message: 'Notes saved successfully!' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save notes.' });
  }
});

// --- PYQ Set Routes ---

// Get all PYQ sets
app.get('/api/pyqsets', async (req, res) => {
  try {
    const sets = await PyqSet.find().sort({ createdAt: 1 });
    res.json(sets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch PYQ sets' });
  }
});

// Create a PYQ set
app.post('/api/pyqsets', async (req, res) => {
  try {
    const newSet = new PyqSet(req.body);
    await newSet.save();
    res.status(201).json(newSet);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create PYQ set', error: err.message });
  }
});

// Update a PYQ set
app.put('/api/pyqsets/:id', async (req, res) => {
  try {
    const updatedSet = await PyqSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSet) return res.status(404).json({ message: 'Set not found' });
    res.json(updatedSet);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update PYQ set', error: err.message });
  }
});

// Delete a PYQ set
app.delete('/api/pyqsets/:id', async (req, res) => {
  try {
    const deletedSet = await PyqSet.findByIdAndDelete(req.params.id);
    if (!deletedSet) return res.status(404).json({ message: 'Set not found' });
    
    await Question.deleteMany({ setId: req.params.id });
    
    res.json({ message: 'Set and associated questions deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete PYQ set', error: err.message });
  }
});

// --- Question Routes ---

// Get all questions for a set
app.get('/api/pyqsets/:setId/questions', async (req, res) => {
  try {
    const questions = await Question.find({ setId: req.params.setId }).sort({ createdAt: 1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

// Bulk add questions
app.post('/api/questions/bulk', async (req, res) => {
  try {
    const { setId, questions } = req.body;
    const inserted = await Question.insertMany(questions.map(q => ({ ...q, setId })));
    
    const count = await Question.countDocuments({ setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(setId, { questionsLoaded: count }, { new: true });
    
    res.status(201).json({ inserted, updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to bulk insert questions', error: err.message });
  }
});

// Add a single question
app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    
    const count = await Question.countDocuments({ setId: req.body.setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(req.body.setId, { questionsLoaded: count }, { new: true });
    
    res.status(201).json({ question: newQuestion, updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create question', error: err.message });
  }
});

// Update a question
app.put('/api/questions/:id', async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Question not found' });
    
    const count = await Question.countDocuments({ setId: updated.setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(updated.setId, { questionsLoaded: count }, { new: true });
    
    res.json({ question: updated, updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update question', error: err.message });
  }
});

// Delete a question
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    
    const count = await Question.countDocuments({ setId: deleted.setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(deleted.setId, { questionsLoaded: count }, { new: true });
    
    res.json({ message: 'Question deleted', updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete question', error: err.message });
  }
});

// --- Settings Routes ---
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { maintenanceMode, adsenseEnabled, passPercentage, timerDuration } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({ maintenanceMode, adsenseEnabled, passPercentage, timerDuration });
    } else {
      if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
      if (adsenseEnabled !== undefined) settings.adsenseEnabled = adsenseEnabled;
      if (passPercentage !== undefined) settings.passPercentage = passPercentage;
      if (timerDuration !== undefined) settings.timerDuration = timerDuration;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// --- Notes Management Routes ---
app.get('/api/notes', async (req, res) => {
  try {
    let notes = await Note.find();
    if (notes.length === 0) {
      const defaultNotes = [
        { unitId: '1', unitTitle: 'Unit 1: Teaching Aptitude Notes', subtitle: 'Complete teaching aptitude study guide', htmlContent: '' },
        { unitId: '2', unitTitle: 'Unit 2: Research Aptitude Notes', subtitle: 'Methodology, thesis writing, and ethics guides', htmlContent: '' },
        { unitId: '3', unitTitle: 'Unit 3: Comprehension Notes', subtitle: 'Passage comprehension strategies and practice guides', htmlContent: '' },
        { unitId: '4', unitTitle: 'Unit 4: Communication Notes', subtitle: 'Effective communication patterns and barriers guides', htmlContent: '' },
        { unitId: '5', unitTitle: 'Unit 5: Mathematical Reasoning and Aptitude Notes', subtitle: 'Mathematical series, fractions, and reasoning guides', htmlContent: '' },
        { unitId: '6', unitTitle: 'Unit 6: Logical Reasoning Notes', subtitle: 'Arguments, venn diagrams, and pramanas guides', htmlContent: '' },
        { unitId: '7', unitTitle: 'Unit 7: Data Interpretation Notes', subtitle: 'Quantitative data sets, bar charts, and table charts guides', htmlContent: '' },
        { unitId: '8', unitTitle: 'Unit 8: Information and Communication Technology (ICT) Notes', subtitle: 'Internet basics, email, and digital initiatives guides', htmlContent: '' },
        { unitId: '9', unitTitle: 'Unit 9: People, Development and Environment Notes', subtitle: 'MDGs, SDGs, natural hazards, and pollution guides', htmlContent: '' },
        { unitId: '10', unitTitle: 'Unit 10: Higher Education System Notes', subtitle: 'Governance, policy, and ancient learning systems guides', htmlContent: '' }
      ];
      await Note.insertMany(defaultNotes);
      notes = await Note.find();
    }
    
    // Sort notes numerically by unitId
    notes.sort((a, b) => {
      const numA = parseInt(a.unitId.replace(/^\D+/g, ''), 10) || 0;
      const numB = parseInt(b.unitId.replace(/^\D+/g, ''), 10) || 0;
      return numA - numB;
    });
    
    // Map to match the frontend expectations: { id, title, fileName }
    const formattedNotes = notes.map(note => ({
      id: note.unitId,
      title: note.unitTitle,
      fileName: note.htmlContent ? 'Custom Rich Content' : ''
    }));
    
    res.json(formattedNotes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { title } = req.body;
    const allNotes = await Note.find();
    let maxId = 0;
    allNotes.forEach(n => {
      const idNum = parseInt(n.unitId.replace(/^\D+/g, ''), 10) || 0;
      if (idNum > maxId) maxId = idNum;
    });
    const newId = maxId + 1;
    const newNote = new Note({
      unitId: String(newId),
      unitTitle: title,
      subtitle: 'Custom Added Study Guide',
      htmlContent: ''
    });
    await newNote.save();
    res.status(201).json({
      id: newNote.unitId,
      title: newNote.unitTitle,
      fileName: ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create note', error: err.message });
  }
});

app.delete('/api/notes/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const deleted = await Note.findOneAndDelete({ unitId });
    if (!deleted) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
});

// --- User Authentication & Management Routes ---
app.get('/api/users', async (req, res) => {
  try {
    let users = await User.find();
    if (users.length === 0) {
      const defaultUsers = [
        { name: 'Ranjeet Kumar', email: 'ranjeet@gmail.com', role: 'student', status: 'Active' },
        { name: 'Sunita Sharma', email: 'sunita@gmail.com', role: 'student', status: 'Active' },
        { name: 'Amit Singh', email: 'amit.admin@netprep.com', role: 'admin', status: 'Active' }
      ];
      await User.insertMany(defaultUsers);
      users = await User.find();
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'student';
    const newUser = new User({ name, email, role, status: 'Active' });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      const name = email.split('@')[0];
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'student';
      user = new User({ name, email, role, status: 'Active' });
      await user.save();
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

app.post('/api/users/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Invalid token payload: email is missing' });
    }

    // Find or create user in DB
    let user = await User.findOne({ email });
    if (!user) {
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'student';
      user = new User({ 
        name: name || email.split('@')[0], 
        email, 
        role, 
        status: 'Active',
        avatar: picture
      });
      await user.save();
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    res.json(user);
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ message: 'Google authentication failed', error: err.message });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.role = user.role === 'admin' ? 'student' : 'admin';
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

app.post('/api/users/:id/attempts', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { setId, title, score, timeSpent, status, breakdown } = req.body;
    const newAttempt = {
      id: new mongoose.Types.ObjectId().toString(),
      setId,
      title,
      score,
      timeSpent,
      status: status || 'Completed',
      breakdown: breakdown || {},
      createdAt: new Date()
    };
    user.attempts = user.attempts || [];
    user.attempts.push(newAttempt);
    user.markModified('attempts');

    // Calculate total hours studied from attempts duration
    let totalMins = 0;
    user.attempts.forEach(att => {
      if (att.timeSpent) {
        const match = att.timeSpent.match(/(\d+)\s*mins?/i);
        if (match) {
          totalMins += parseInt(match[1], 10);
        }
      }
    });
    user.hoursStudied = parseFloat((totalMins / 60).toFixed(1));

    // Calculate current daily streak from attempts history
    let currentStreak = 0;
    if (user.attempts.length > 0) {
      const dates = user.attempts
        .map(att => new Date(att.createdAt).toDateString())
        .map(dString => new Date(dString).getTime());
      
      const uniqueSortedTimestamps = [...new Set(dates)].sort((a, b) => b - a);
      
      if (uniqueSortedTimestamps.length > 0) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const todayTime = new Date(today).getTime();
        const yesterdayTime = new Date(yesterday).getTime();
        
        const mostRecent = uniqueSortedTimestamps[0];
        if (mostRecent === todayTime || mostRecent === yesterdayTime) {
          currentStreak = 1;
          let checkTime = mostRecent;
          for (let i = 1; i < uniqueSortedTimestamps.length; i++) {
            const nextTime = uniqueSortedTimestamps[i];
            if (checkTime - nextTime === 86400000) {
              currentStreak++;
              checkTime = nextTime;
            } else {
              break;
            }
          }
        }
      }
    }
    user.streak = currentStreak;

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save attempt', error: err.message });
  }
});

app.post('/api/users/:id/progress', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { unitId } = req.body;
    user.progress = user.progress || [];
    let newProgress = [...user.progress];
    if (newProgress.includes(unitId)) {
      newProgress = newProgress.filter(id => id !== unitId);
    } else {
      newProgress.push(unitId);
    }
    user.progress = newProgress;
    user.markModified('progress');
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update progress', error: err.message });
  }
});

// --- Contact Message Routes ---

// Submit contact message
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    const newMessage = new ContactMessage({ name, email, message });
    await newMessage.save();

    // Send email notification via Zoho if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const mailOptions = {
        from: `"UGC Free Paper Contact Form" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send email to yourself (support@ugcfreepaper.com)
        replyTo: email, // Allow replying directly to the user
        subject: `New Contact Form Message from ${name}`,
        text: `You have received a new contact message:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}\n\nThis message has also been saved to your dashboard database.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 0;">New Contact Form Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin-top: 15px;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
              This message was sent from the Contact Us form on ugcfreepaper.com and has been stored in your administration dashboard.
            </p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Failed to send contact notification email:', error);
        } else {
          console.log('Contact notification email sent:', info.messageId);
        }
      });
    } else {
      console.warn('SMTP email credentials not set. Skipping contact email notification.');
    }

    res.status(201).json({ success: true, message: 'Message saved successfully!' });
  } catch (err) {
    console.error('Contact message error:', err);
    res.status(500).json({ message: 'Failed to process message', error: err.message });
  }
});

// Fetch all contact messages (Admin only)
app.get('/api/contact', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch contact messages' });
  }
});

// Update contact message status (Admin only)
app.put('/api/contact/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['unread', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update message status' });
  }
});

// Delete contact message (Admin only)
app.delete('/api/contact/:id', async (req, res) => {
  try {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// --- Analytics & Traffic Tracking Routes ---
app.post('/api/analytics/hit', async (req, res) => {
  try {
    const { path, referrer, userAgent } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const hit = new Traffic({ path, ip, userAgent, referrer });
    await hit.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record hit' });
  }
});

app.get('/api/analytics/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const distinctIps = await Traffic.distinct('ip', { timestamp: { $gte: thirtyDaysAgo } });
    const visitors = distinctIps.length;
    
    const pageViews = await Traffic.countDocuments({ timestamp: { $gte: thirtyDaysAgo } });
    
    const hitsPerIp = await Traffic.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$ip', count: { $sum: 1 } } }
    ]);
    
    const totalIps = hitsPerIp.length;
    const singleHits = hitsPerIp.filter(item => item.count === 1).length;
    const bounceRate = totalIps > 0 ? (singleHits / totalIps) * 100 : 0;
    
    let avgSessionMinutes = 0;
    const sessions = await Traffic.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: {
          _id: '$ip',
          minTime: { $min: '$timestamp' },
          maxTime: { $max: '$timestamp' }
        }
      }
    ]);
    
    let totalDurationMs = 0;
    let multiHitSessionsCount = 0;
    sessions.forEach(s => {
      const diff = s.maxTime - s.minTime;
      if (diff > 0) {
        totalDurationMs += diff;
        multiHitSessionsCount++;
      }
    });
    
    if (multiHitSessionsCount > 0) {
      avgSessionMinutes = (totalDurationMs / multiHitSessionsCount) / 1000 / 60;
    } else {
      avgSessionMinutes = 2.5; // fallback average
    }
    
    const mins = Math.floor(avgSessionMinutes);
    const secs = Math.floor((avgSessionMinutes - mins) * 60);
    const sessionDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const allHits = await Traffic.find({ timestamp: { $gte: thirtyDaysAgo } });
    let organicCount = 0;
    let directCount = 0;
    let socialCount = 0;
    let referralCount = 0;
    const totalHits = allHits.length;
    
    allHits.forEach(hit => {
      const ref = hit.referrer ? hit.referrer.toLowerCase() : '';
      if (!ref || ref.trim() === '') {
        directCount++;
      } else if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo') || ref.includes('duckduckgo') || ref.includes('search')) {
        organicCount++;
      } else if (ref.includes('facebook') || ref.includes('twitter') || ref.includes('t.co') || ref.includes('instagram') || ref.includes('linkedin') || ref.includes('reddit') || ref.includes('youtube')) {
        socialCount++;
      } else {
        referralCount++;
      }
    });
    
    const sources = {
      organic: totalHits > 0 ? Math.round((organicCount / totalHits) * 100) : 40,
      direct: totalHits > 0 ? Math.round((directCount / totalHits) * 100) : 30,
      social: totalHits > 0 ? Math.round((socialCount / totalHits) * 100) : 20,
      referral: totalHits > 0 ? Math.round((referralCount / totalHits) * 100) : 10
    };
    
    res.json({
      visitors,
      pageViews,
      sessionDuration,
      bounceRate,
      sources
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Local backend server running on port ${PORT}`);
});
