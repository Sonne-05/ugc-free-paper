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
const ContactMessage = require('./models/ContactMessage');
const BlogPost = require('./models/BlogPost');
const nodemailer = require('nodemailer');

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PORT = process.env.PORT || 5000;

// Configure Nodemailer for Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.zoho.in',
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
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  // Migrate existing PYQ sets to have isPublished: true if not specified
  try {
    const result = await PyqSet.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Migrated ${result.modifiedCount} existing PYQ sets to isPublished: true`);
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
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
    const filter = {};
    if (req.query.admin !== 'true') {
      filter.isPublished = true;
    }
    const sets = await PyqSet.find(filter).sort({ createdAt: 1 });
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
    const questions = await Question.find({ setId: req.params.setId }).sort({ qIndex: 1, createdAt: 1 });
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
    
    // Map to match the frontend expectations: { id, title, fileName, isAvailable }
    const formattedNotes = notes.map(note => ({
      id: note.unitId,
      title: note.unitTitle,
      fileName: note.htmlContent ? 'Custom Rich Content' : '',
      isAvailable: note.isAvailable !== false
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
      htmlContent: '',
      isAvailable: true
    });
    await newNote.save();
    res.status(201).json({
      id: newNote.unitId,
      title: newNote.unitTitle,
      fileName: '',
      isAvailable: true
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create note', error: err.message });
  }
});

// Toggle availability for a unit
app.patch('/api/notes/:unitId/toggle-availability', async (req, res) => {
  try {
    const { unitId } = req.params;
    const note = await Note.findOne({ unitId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    note.isAvailable = note.isAvailable === false ? true : false;
    await note.save();
    res.json({ success: true, isAvailable: note.isAvailable });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle availability.' });
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

// --- Blog Management Routes ---
app.get('/api/posts', async (req, res) => {
  try {
    let posts = await BlogPost.find().sort({ createdAt: -1 });
    if (posts.length === 0) {
      const defaultPosts = [
        {
          title: "UGC NET Paper 1 Preparation Strategy: Scoring 80+ Marks",
          category: "Strategy",
          date: "July 15, 2026",
          readTime: "6 min read",
          author: "Aditi Sharma",
          excerpt: "Learn the exact unit-wise strategy, topic weights, and mock test routines to score more than 80 marks in the General Paper I.",
          content: "<p>Scoring high in UGC NET Paper 1 is one of the most reliable ways to secure your Junior Research Fellowship (JRF). While many candidates focus heavily on their subject-specific Paper 2, Paper 1 consists of 50 questions that can easily push your overall percentage past the cutoff if prepared correctly.</p><h3>1. Understand the Weightage</h3><p>Paper 1 has 10 units, and NTA guidelines state that 5 questions are asked from each unit. However, in reality, the distribution can vary slightly. Units like Data Interpretation (DI), Reading Comprehension (RC), and Mathematical Reasoning are \"sure-shot\" units where you can score 100% accuracy with practice.</p><h3>2. Unit-Wise Master Plan</h3><ul><li><strong>Teaching & Research Aptitude:</strong> Focus on levels of teaching, learner characteristics, research methodologies, and thesis/ethics structures.</li><li><strong>Communication:</strong> Understand barriers to effective communication, classroom communication dynamics, and types of communication.</li><li><strong>ICT & People-Environment:</strong> Keep short notes on digital initiatives in higher education, MDGs & SDGs, pollutants, and international protocols (Paris Agreement, Kyoto Protocol).</li></ul><h3>3. The Mock Test Routine</h3><p>Do not wait until you finish the syllabus to start mock tests. Attempting previous years' questions (PYQ) under simulated time limits is crucial. Spend at least 1 hour reviewing your mistakes after each test to build conceptual clarity.</p>",
          isFeatured: true
        },
        {
          title: "Cracking Research Aptitude: Key Methodologies & Ethics",
          category: "Study Guide",
          date: "July 10, 2026",
          readTime: "8 min read",
          author: "Dr. Rajesh Verma",
          excerpt: "Research Aptitude is one of the most high-yield units in Paper 1. Master qualitative vs. quantitative methods, positivism, and publication ethics.",
          content: "<p>Research Aptitude forms the backbone of postgraduate scholarship and is a core component of the UGC NET exam. Many students struggle with the abstract nature of research philosophy. Here is a simplified breakdown to help you master this unit.</p><h3>1. Research Paradigels: Positivism vs. Post-Positivism</h3><p><strong>Positivism:</strong> Advocates for scientific, objective methods. It assumes there is a single, objective reality that can be measured.</p><p><strong>Post-Positivism:</strong> Assumes that our knowledge of reality is always incomplete and subjective. It relies more on qualitative methods and recognizes observer bias.</p><h3>2. Types of Research</h3><ul><li><strong>Experimental Research:</strong> Establishes cause-and-effect relationships by manipulating independent variables.</li><li><strong>Descriptive Research:</strong> Describes characteristics of a population or phenomenon without manipulation.</li><li><strong>Fundamental vs. Applied:</strong> Fundamental research aims to add theory, while Applied research solves immediate, practical problems.</li></ul><h3>3. Research Ethics</h3><p>Ethical violations in research are frequently queried by NTA. Be thorough with concepts of plagiarism, fabrication, falsification, and citation guidelines. Remember that research ethics are critical at both data collection and reporting stages.</p>",
          isFeatured: false
        },
        {
          title: "Effective Time Management Secrets for Exam Day",
          category: "Tips",
          date: "July 05, 2026",
          readTime: "5 min read",
          author: "Vikram Malhotra",
          excerpt: "Time is your biggest enemy in UGC NET. Discover how to allocate your 180 minutes across Paper 1 and Paper 2 to avoid leaving questions unanswered.",
          content: "<p>UGC NET is a continuous 3-hour (180 minutes) computer-based test with no breaks. With 150 questions to solve, you get an average of 1.2 minutes per question. Poor time management is the number one reason candidates miss out on qualifying, even when they know the syllabus.</p><h3>1. The Two-Pass Strategy</h3><p>Never get stuck on a single question. If a math or logic question takes more than 2 minutes, mark it for review and move on. In the first pass, answer all direct and theoretical questions. In the second pass, tackle the remaining marked questions.</p><h3>2. Time Allocation Plan</h3><ul><li><strong>First 60 Minutes:</strong> Dedicate this to Paper 1. Complete RCs, Communication, ICT, and Teaching Aptitude. Leave the complex DI and Math questions for the end of this hour.</li><li><strong>Next 100 Minutes:</strong> Solve Paper 2 (your core subject). Since these questions require deep domain knowledge, stay focused and try to complete them with 20 minutes to spare.</li><li><strong>Last 20 Minutes:</strong> Revisit marked questions in both papers and review your answers. Since there is no negative marking, ensure all 150 questions have an option selected!</li></ul>",
          isFeatured: false
        },
        {
          title: "How to Solve Data Interpretation (DI) Without Fear",
          category: "Tips",
          date: "June 28, 2026",
          readTime: "7 min read",
          author: "Priya Nair",
          excerpt: "Data Interpretation doesn't have to be hard. Learn the shortcut tricks for ratio, percentage, and averages that solve any table chart in under 2 minutes.",
          content: "<p>Data Interpretation is a guaranteed source of 10 marks (5 questions) in UGC NET Paper 1. Many candidates fear DI due to a lack of math confidence, but net prep DI relies on basic mathematical arithmetic rather than high-level algebra. Master these simple tricks to score full marks.</p><h3>1. Learn Percentages & Ratios</h3><p>The majority of DI questions ask for percentage increase/decrease, ratios between columns, or average values. Memorize fraction-to-percentage conversions (e.g., 1/8 = 12.5%, 1/6 = 16.67%) to calculate values in your head instead of using long division.</p><h3>2. Use Approximation</h3><p>NTA options are often spaced far enough apart. If you need to calculate 2345 as a percentage of 5689, approximate it as 2300 / 5700. This saves valuable scratchpad time and points you straight to the correct option.</p><h3>3. Read Table Headers Carefully</h3><p>Always check the units (e.g., \"in lakhs\", \"in millions\", \"percentage of total\"). A common mistake is selecting an option that has the right digit value but incorrect decimal scale due to ignoring header units.</p>",
          isFeatured: false
        }
      ];
      await BlogPost.insertMany(defaultPosts);
      posts = await BlogPost.find().sort({ createdAt: -1 });
    }
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blog posts', error: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blog post' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, category, author, readTime, excerpt, content, isFeatured } = req.body;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);

    const newPost = new BlogPost({
      title,
      category,
      date: dateStr,
      author,
      readTime: readTime || '5 min read',
      excerpt,
      content,
      isFeatured: !!isFeatured
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create blog post', error: err.message });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, category, author, readTime, excerpt, content, isFeatured } = req.body;
    const updated = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { title, category, author, readTime, excerpt, content, isFeatured: !!isFeatured },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Post not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update blog post', error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deleted = await BlogPost.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete blog post' });
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

// Newsletter Subscription Route
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    // Save as a Contact Message to MongoDB so it appears in the Admin Dashboard
    const newSubscriptionMsg = new ContactMessage({
      name: 'Newsletter Subscriber',
      email: email,
      message: `User subscribed to NetPrep Insights newsletter. Email: ${email}`
    });
    await newSubscriptionMsg.save();

    // Check if SMTP is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const mailOptions = {
        from: `"UGC Free Paper Newsletter" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send email to Zoho account
        replyTo: email,
        subject: `New Newsletter Subscription - ${email}`,
        text: `You have received a new newsletter subscription:\n\nEmail: ${email}\n\nPlease add this email to your newsletter contact list.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 0;">New Newsletter Subscription</h2>
            <p><strong>Email Address:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
              This subscription request was submitted on ugcfreepaper.com.
            </p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Failed to send subscription notification email:', error);
        } else {
          console.log('Subscription notification email sent:', info.messageId);
        }
      });
    } else {
      console.warn('SMTP email credentials not set. Skipping subscription email notification.');
    }

    res.status(200).json({ success: true, message: 'Subscription request sent successfully!' });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ message: 'Failed to process subscription', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Local backend server running on port ${PORT}`);
});
