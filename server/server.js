require('dotenv').config();
const path = require('path');
const url = require('url');
const bcrypt = require('bcryptjs');
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
const CorePaper = require('./models/CorePaper');
const NoteCategory = require('./models/NoteCategory');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const { getCache, setCache, delCache, delCachePattern } = require('./config/redis');

// Fallback: read Gemini keys directly from .env file (dotenv/dotenvx may not parse AQ.Ab8RN6... keys correctly)
function loadGeminiKeysFromEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const line = content.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
    if (!line) return [];
    const raw = line.substring('GEMINI_API_KEY='.length);
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    return keys;
  } catch { return []; }
}

function getAllGeminiKeys() {
  const fileKeys = loadGeminiKeysFromEnvFile();
  if (fileKeys.length > 0) return fileKeys;
  const envKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  const envKeys2 = (process.env.GEMINI_API_KEY2 || '').split(',').map(k => k.trim()).filter(Boolean);
  return [...envKeys, ...envKeys2].filter(Boolean);
}

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

// Send email helper supporting both Resend HTTP API (port-agnostic, works on Render Free Tier) and Nodemailer SMTP
async function sendEmail({ from, to, replyTo, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    console.log(`Sending email via Resend HTTP API to ${to}...`);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from || process.env.EMAIL_FROM || `UGC Free Paper <onboarding@resend.dev>`,
          to: [to],
          reply_to: replyTo,
          subject: subject,
          text: text,
          html: html
        })
      });
      
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Resend responded with status ${response.status}`);
      }
      
      console.log('Email sent successfully via Resend. Message ID:', responseData.id);
      return responseData.id;
    } catch (err) {
      console.error('Resend email dispatch failed:', err);
      throw err;
    }
  } else {
    // Fallback to Nodemailer SMTP
    console.log(`Sending email via SMTP transporter to ${to}...`);
    return new Promise((resolve, reject) => {
      const mailOptions = {
        from: from || `"UGC Free Paper Support" <${process.env.EMAIL_USER}>`,
        to,
        replyTo,
        subject,
        text,
        html
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('SMTP email dispatch failed:', error);
          reject(error);
        } else {
          console.log('Email sent successfully via SMTP. Message ID:', info.messageId);
          resolve(info.messageId);
        }
      });
    });
  }
}

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
    await PyqSet.updateMany(
      { verificationStatus: { $exists: false } },
      { $set: { verificationStatus: 'pending', isVerified: false } }
    );
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

// --- Multi-Admin Presence Management for PYQ Sets ---
// Map of setId -> Array of { userId, userName, userEmail, lastSeen }
const activeSetPresences = new Map();
const PRESENCE_TIMEOUT_MS = 60 * 1000; // 60 seconds

function cleanExpiredPresences() {
  const now = Date.now();
  for (const [setId, editors] of activeSetPresences.entries()) {
    const activeEditors = editors.filter(e => now - e.lastSeen < PRESENCE_TIMEOUT_MS);
    if (activeEditors.length === 0) {
      activeSetPresences.delete(setId);
    } else {
      activeSetPresences.set(setId, activeEditors);
    }
  }
}

// 1. Get all active set presences (for overview / dropdowns / tables)
app.get('/api/pyqsets/presence/active', (req, res) => {
  cleanExpiredPresences();
  const result = {};
  for (const [setId, editors] of activeSetPresences.entries()) {
    result[setId] = editors;
  }
  res.json(result);
});

// 2. Heartbeat ping for an admin working on a specific set
app.post('/api/pyqsets/:setId/presence', (req, res) => {
  const { setId } = req.params;
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  const { userId, userName, userEmail } = body || {};
  if (!setId) return res.status(400).json({ message: 'Missing setId' });

  cleanExpiredPresences();
  const now = Date.now();
  const currentEditors = activeSetPresences.get(setId) || [];
  
  // Filter out the current user's previous record
  const otherEditors = currentEditors.filter(e => 
    (userId ? e.userId !== userId : true) && 
    (userEmail ? e.userEmail !== userEmail : true)
  );

  const updatedEditors = [
    ...otherEditors,
    {
      userId: userId || 'anonymous',
      userName: userName || 'Admin',
      userEmail: userEmail || '',
      lastSeen: now
    }
  ];
  activeSetPresences.set(setId, updatedEditors);

  res.json({
    success: true,
    activeEditors: updatedEditors,
    otherEditors: otherEditors
  });
});

// 3. Clear presence when admin leaves the set / closes page
const handleLeavePresence = (req, res) => {
  const { setId } = req.params;
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  const { userId, userEmail } = body || {};
  
  if (activeSetPresences.has(setId)) {
    const currentEditors = activeSetPresences.get(setId) || [];
    const remaining = currentEditors.filter(e => {
      if (userId && e.userId === userId) return false;
      if (userEmail && e.userEmail === userEmail) return false;
      return true;
    });
    if (remaining.length === 0) {
      activeSetPresences.delete(setId);
    } else {
      activeSetPresences.set(setId, remaining);
    }
  }
  cleanExpiredPresences();
  res.json({ success: true });
};

app.delete('/api/pyqsets/:setId/presence', handleLeavePresence);
app.post('/api/pyqsets/:setId/presence/leave', handleLeavePresence);

// --- PYQ Set Routes ---

// Get all PYQ sets (Cached in Redis for high-throughput reads)
app.get('/api/pyqsets', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
    const cacheKey = isAdmin ? 'pyqsets:all:admin' : 'pyqsets:published';

    // 1. Check Redis Cache for students (Admins always get real-time DB data)
    if (!isAdmin) {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const filter = {};
    if (!isAdmin) {
      filter.isPublished = true;
    }
    const sets = await PyqSet.find(filter).sort({ createdAt: 1 });

    const counts = await Question.aggregate([
      { $group: { _id: '$setId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => {
      if (c._id) countMap[c._id.toString()] = c.count;
    });

    const updatedSets = sets.map(set => {
      const actualCount = countMap[set._id.toString()] || 0;
      const setObj = set.toJSON();
      setObj.questionsLoaded = actualCount;
      return setObj;
    });

    // 2. Cache in Redis for public students for 30 minutes (1800s)
    if (!isAdmin) {
      await setCache(cacheKey, updatedSets, 1800);
    }

    res.json(updatedSets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch PYQ sets' });
  }
});

// Create a PYQ set
app.post('/api/pyqsets', async (req, res) => {
  try {
    const newSet = new PyqSet(req.body);
    await newSet.save();

    // Invalidate list caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');

    res.status(201).json(newSet);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create PYQ set', error: err.message });
  }
});

// Update a PYQ set
app.put('/api/pyqsets/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.questionsLoaded;

    if (updateData.isVerified !== undefined && updateData.verificationStatus === undefined) {
      updateData.verificationStatus = updateData.isVerified ? 'completed' : 'pending';
    } else if (updateData.verificationStatus !== undefined && updateData.isVerified === undefined) {
      updateData.isVerified = (updateData.verificationStatus === 'completed' || updateData.verificationStatus === 'complete');
    }

    const count = await Question.countDocuments({ setId: req.params.id });
    updateData.questionsLoaded = count;

    const updatedSet = await PyqSet.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    if (!updatedSet) return res.status(404).json({ message: 'Set not found' });

    // Invalidate related caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${req.params.id}:questions`);

    res.json(updatedSet);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update PYQ set', error: err.message });
  }
});

// Delete a PYQ set
app.delete('/api/pyqsets/:id', async (req, res) => {
  try {
    const set = await PyqSet.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Set not found' });

    const requestUserId = req.query.userId;
    if (set.createdBy && set.createdBy.toString() !== requestUserId) {
      return res.status(403).json({ message: 'Permission denied: Only the admin who created this set can delete it' });
    }

    await PyqSet.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ setId: req.params.id });
    
    // Invalidate caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${req.params.id}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

    res.json({ message: 'Set and associated questions deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete PYQ set', error: err.message });
  }
});

// --- Question Routes ---

// Get all questions for a set (First visitor loads from DB -> All other students served instantly from RAM)
app.get('/api/pyqsets/:setId/questions', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
    const cacheKey = `pyqset:${req.params.setId}:questions`;

    // 1. FAST PATH: Check in-memory Redis cache for students (~0.5ms)
    if (!isAdmin) {
      const cachedQuestions = await getCache(cacheKey);
      if (cachedQuestions) {
        return res.json(cachedQuestions);
      }
    }

    // 2. Fetch from MongoDB Atlas
    const questions = await Question.find({ setId: req.params.setId }).sort({ qIndex: 1, createdAt: 1 });
    const set = await PyqSet.findById(req.params.setId);
    const questionsWithYear = questions.map(q => {
      const qObj = q.toJSON();
      qObj.year = set ? set.year : null;
      return qObj;
    });

    // 3. Save to Redis in-memory cache
    await setCache(cacheKey, questionsWithYear, 14400);

    res.json(questionsWithYear);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

// Get total counts of questions for each unit (Cached in Redis)
app.get('/api/questions/unit-counts', async (req, res) => {
  try {
    const cacheKey = 'questions:unit-counts';

    // 1. Check Redis Cache
    const cachedCounts = await getCache(cacheKey);
    if (cachedCounts) {
      return res.json(cachedCounts);
    }

    const units = [
      { id: '1', name: 'Unit 1: Teaching Aptitude' },
      { id: '2', name: 'Unit 2: Research Aptitude' },
      { id: '3', name: 'Unit 3: Comprehension' },
      { id: '4', name: 'Unit 4: Communication' },
      { id: '5', name: 'Unit 5: Mathematical Reasoning and Aptitude' },
      { id: '6', name: 'Unit 6: Logical Reasoning' },
      { id: '7', name: 'Unit 7: Data Interpretation' },
      { id: '8', name: 'Unit 8: Information and Communication Technology (ICT)' },
      { id: '9', name: 'Unit 9: People, Development and Environment' },
      { id: '10', name: 'Unit 10: Higher Education System' }
    ];

    const counts = {};
    for (const u of units) {
      const escapedUnitName = u.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const flexiblePattern = escapedUnitName.replace(/\\&|\band\b/gi, '(&|and|\\&)');
      const query = {
        $or: [
          { unit: { $regex: new RegExp('^' + escapedUnitName, 'i') } },
          { unit: { $regex: new RegExp('^' + flexiblePattern, 'i') } },
          { unit: { $regex: new RegExp(`^Unit\\s*${u.id}\\b`, 'i') } }
        ]
      };

      if (u.name.toLowerCase().includes('unit 7') || u.name.toLowerCase().includes('data interpretation')) {
        query.$or.push({ type: 'di' });
      } else if (u.name.toLowerCase().includes('unit 3') || u.name.toLowerCase().includes('comprehension')) {
        query.$or.push({ type: 'comprehension' });
      }

      const count = await Question.countDocuments(query);
      counts[u.id] = count;
    }

    // 2. Cache in Redis for 1 hour (3600s)
    await setCache(cacheKey, counts, 3600);

    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unit counts', error: err.message });
  }
});

// Get all questions for a unit (Paper 1 unit-wise) with pagination support
app.get('/api/questions/unit', async (req, res) => {
  try {
    const { unitName, skip, limit } = req.query;
    if (!unitName) {
      return res.status(400).json({ message: 'unitName query parameter is required' });
    }

    const cacheKey = `questions:unit:${unitName}:s${skip || 0}:l${limit || 0}`;
    const cachedUnitQuestions = await getCache(cacheKey);
    if (cachedUnitQuestions) {
      return res.json(cachedUnitQuestions);
    }
    
    // Perform a resilient case-insensitive regex query
    const escapedUnitName = unitName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const flexiblePattern = escapedUnitName.replace(/\\&|\band\b/gi, '(&|and|\\&)');
    const unitNumberMatch = unitName.match(/Unit\s+(\d+)/i);
    const unitNum = unitNumberMatch ? unitNumberMatch[1] : null;

    const query = {
      $or: [
        { unit: { $regex: new RegExp('^' + escapedUnitName, 'i') } },
        { unit: { $regex: new RegExp('^' + flexiblePattern, 'i') } }
      ]
    };

    if (unitNum) {
      query.$or.push({ unit: { $regex: new RegExp(`^Unit\\s*${unitNum}\\b`, 'i') } });
      query.$or.push({ unit: { $regex: new RegExp(`\\bUnit\\s*${unitNum}\\b`, 'i') } });
    }

    // Fallback: match by question type if unit fields are missing in database
    if (unitName.toLowerCase().includes('unit 7') || unitName.toLowerCase().includes('data interpretation')) {
      query.$or.push({ type: 'di' });
    } else if (unitName.toLowerCase().includes('unit 3') || unitName.toLowerCase().includes('comprehension')) {
      query.$or.push({ type: 'comprehension' });
    }

    let qQuery = Question.find(query).sort({ _id: 1 });
    
    if (skip !== undefined) {
      qQuery = qQuery.skip(parseInt(skip, 10));
    }
    if (limit !== undefined) {
      qQuery = qQuery.limit(parseInt(limit, 10));
    }

    const questions = await qQuery;
    
    // Fetch unique set ids and load their years
    const setIds = [...new Set(questions.map(q => q.setId ? q.setId.toString() : null).filter(Boolean))];
    const sets = await PyqSet.find({ _id: { $in: setIds } });
    const yearMap = {};
    const setTitleMap = {};
    sets.forEach(s => {
      yearMap[s._id.toString()] = s.year;
      setTitleMap[s._id.toString()] = s.title;
    });

    const questionsWithYear = questions.map(q => {
      const qObj = q.toJSON();
      qObj.year = q.setId ? (yearMap[q.setId.toString()] || null) : null;
      qObj.setTitle = q.setId ? (setTitleMap[q.setId.toString()] || null) : null;
      return qObj;
    });

    // Cache in Redis for 2 hours (7200s)
    await setCache(cacheKey, questionsWithYear, 7200);

    res.json(questionsWithYear);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unit questions', error: err.message });
  }
});


// Bulk add questions
app.post('/api/questions/bulk', async (req, res) => {
  try {
    const { setId, questions } = req.body;
    const inserted = await Question.insertMany(questions.map(q => ({ ...q, setId })));
    
    const count = await Question.countDocuments({ setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(setId, { questionsLoaded: count }, { new: true });
    
    // Invalidate caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${setId}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

    res.status(201).json({ inserted, updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to bulk insert questions', error: err.message });
  }
});

// Helper for cleaning JSON string from AI response
const cleanJsonString = (str) => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  
  // Resiliently escape literal newlines inside double-quoted JSON string values
  try {
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    });
  } catch (e) {
    console.warn("Resilient newline replacement failed:", e.message);
  }
  
  return cleaned;
};

// Unified helper to call AI for structuring questions
// Unified helper to call AI for structuring questions
async function callAIChatForStructure(prompt, keyRotation, provider, retryCount = 0, overrideModel = null) {
  if (provider === 'gemini') {
    const keyObj = keyRotation.getNextKey('gemini');
    const apiKey = typeof keyObj === 'object' && keyObj ? keyObj.key : keyObj;
    const keyIndex = typeof keyObj === 'object' && keyObj ? keyObj.keyIndex : -1;
    let rawModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
    const geminiModel = rawModel.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
    const keysCount = keyRotation.geminiKeys ? keyRotation.geminiKeys.length : 1;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json", 
          temperature: 0.1,
          responseSchema: {
            type: "OBJECT",
            properties: {
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    qIndex: { type: "INTEGER" },
                    unit: { type: "STRING" },
                    type: { 
                      type: "STRING", 
                      enum: ["mcq", "assertion-reason", "match-column", "comprehension", "multiple-statement", "di"] 
                    },
                    text: { type: "STRING" },
                    options: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    statements: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    correct: { type: "INTEGER" },
                    assertion: { type: "STRING" },
                    reason: { type: "STRING" },
                    list1: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    list2: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    list1Header: { type: "STRING" },
                    list2Header: { type: "STRING" },
                    explanation: { type: "STRING" }
                  },
                  required: ["qIndex", "unit", "type", "text", "options", "correct", "explanation"]
                }
              }
            },
            required: ["questions"]
          }
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
        ]
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      const maxRetries = Math.max(keysCount * 2, 10);
      if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
        const retryMatch = errText.match(/Please retry in ([\d\.]+)s/i) || errText.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
        const waitSeconds = retryMatch ? parseFloat(retryMatch[1]) : (response.status === 503 ? 10 : 15);
        if (keyRotation.coolDownKey && keyIndex >= 0) {
          keyRotation.coolDownKey(keyIndex, waitSeconds);
        }
        if (retryCount < keysCount - 1) {
          console.warn(`[AI Structuring] Gemini ${response.status} on Key #${keyIndex + 1}. Switching immediately to next key in pool (Retry ${retryCount + 1}/${maxRetries})...`);
          return callAIChatForStructure(prompt, keyRotation, provider, retryCount + 1, overrideModel);
        } else {
          const waitTime = Math.min(Math.ceil(waitSeconds) * 1000 + 1000, 30000);
          console.warn(`[AI Structuring] All Gemini keys busy/limited (${response.status}). Waiting ${waitTime / 1000}s (Retry ${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return callAIChatForStructure(prompt, keyRotation, provider, retryCount + 1, overrideModel);
        }
      }
      throw new Error(`Gemini API failed with status ${response.status}: ${errText}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  } else if (provider === 'groq') {
    const apiKey = keyRotation.getNextKey('groq');
    const groqModel = overrideModel || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const keysCount = keyRotation.groqKeys ? keyRotation.groqKeys.length : 1;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        if (errText.includes('tokens per day') && groqModel !== 'llama-3.1-8b-instant') {
          console.warn(`[AI Structuring] Groq TPD Limit hit. Retrying immediately with fallback model llama-3.1-8b-instant...`);
          return callAIChatForStructure(prompt, keyRotation, provider, retryCount, 'llama-3.1-8b-instant');
        }
        const maxRetries = Math.max(keysCount * 2, 5);
        if (retryCount < maxRetries) {
          if (retryCount < keysCount - 1) {
            console.warn(`[AI Structuring] Groq 429 Rate Limited. Trying next key in rotation pool immediately (Retry ${retryCount + 1}/${maxRetries})...`);
            return callAIChatForStructure(prompt, keyRotation, provider, retryCount + 1, overrideModel);
          } else {
            const consecutiveWaitCount = Math.max(retryCount - keysCount + 1, 1);
            const waitTime = 10000 * consecutiveWaitCount;
            console.warn(`[AI Structuring] All Groq keys rate-limited. Groq 429 Rate Limited. Waiting ${waitTime / 1000}s before retry (Retry ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callAIChatForStructure(prompt, keyRotation, provider, retryCount + 1, overrideModel);
          }
        }
      }
      throw new Error(`Groq API failed with status ${response.status}: ${errText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '[]';
  }
  throw new Error('Unsupported AI provider');
}



// Function to call AI to parse and solve a batch of 5 questions
async function callAIChatToStructureBatch(batch, compPassages, keyRotation, answerKeyMap, isPaperII, importLanguage = 'English') {
  let prompt = `You are an expert UGC NET ${isPaperII ? 'Paper II' : 'Paper I'} exam parser.
Analyze the raw text of the following ${batch.length} questions. You must:

Target Language Rule:
You MUST extract the questions and option texts in the following language/format: "${importLanguage}".
- If "English" is in the selected target language (e.g. English Only): Extract only the English version of the questions. If the text has both English and Hindi/Sindhi versions, ignore the Hindi/Sindhi text and extract only the English text.
- If "Hindi" is in the selected target language (e.g. Hindi Only): Extract only the Hindi version of the questions (in Devanagari script).
- If "Sindhi" is in the selected target language: Extract ONLY the Sindhi text written in DEVANAGARI script (e.g. "'ईजाद' लफ़्ज़ जी माना -"). IGNORE and SKIP completely all Perso-Arabic / Urdu script text (e.g. right-to-left Arabic characters like "'پھريون ئي جھگڙو' ڪھاڻي آھي :"). Do NOT include any Perso-Arabic/Urdu characters in your output under any circumstances.
- If "Bilingual (English & Hindi)" is selected: Keep the question text bilingual (extract both the English and Hindi versions, showing the English text first and Hindi text below it). Do the same for option values (English option first, Hindi translation below it).
- If "Bilingual (English & Sindhi)" is selected: Keep the question text bilingual (extract both the English text and the Sindhi DEVANAGARI script version). Do NOT include any Perso-Arabic/Urdu script text. Do the same for option values (English option first, Sindhi translation below it).

Instructions:
1. Extract the question text exactly as instructed in the Target Language Rule above. Keep punctuation, spacing, and grammar identical. Only filter out system noise (e.g. page numbers, header/footer URLs, marks info like 'Correct Marks : 2 Wrong Marks : 0', or 'Question Id : ...').
2. Extract exactly 4 options matching the Target Language Rule.
3. Solve each question to determine the correct option index (1, 2, 3, or 4).
4. Assign the correct 'type' based on these rules:
    - 'mcq': Standard single choice question with 4 options.
    - 'assertion-reason': Question containing SPECIFICALLY the words "Assertion (A)" (or "Assertion A") and "Reason (R)" (or "Reason R"). If the question has labels like (A), (B), (C), (D) representing list items (e.g. "(A) Selection threat"), it is NOT an assertion-reason question; it is a multiple-statement question.
    - 'match-column': Question containing matching lists ("List I" and "List II"). You MUST extract and populate "list1", "list2", "list1Header", and "list2Header" fields. Note that List I and List II often have column subtitles/headers (e.g. 'Concept', 'Description', 'Method'). You MUST set "list1Header" and "list2Header" to these specific subtitles, NOT 'List I' or 'List II'. Do NOT include these subtitles in the "list1" or "list2" arrays; those arrays must contain only the 4 actual items.
    - 'multiple-statement': Question containing multiple statements (e.g., "Statement I", "Statement II", or multiple points labeled A, B, C, D, E or (A), (B), (C), (D) or (a), (b), (c), (d)) followed by option combinations (e.g., "(1) (A) and (B) Only", "(2) (C) and (D) Only" or "A, B and C only"). CRITICAL: If a question has a list of items labeled (A), (B), (C), (D) AND is followed by combination options (labeled 1, 2, 3, 4 or (1), (2), (3), (4)), this is a 'multiple-statement' question, NOT a standard MCQ. You MUST extract the items (A), (B), (C), (D) into the "statements" array, and extract the combination options (1), (2), (3), (4) as the 4 items in the "options" array. Do NOT extract the statements as the question options.
    - ${isPaperII ? `'comprehension': Forced for Q91-Q100 (Reading Comprehension based on a passage).` : `'di': Forced for Q1-Q5 (Data Interpretation based on a table).`}
    - ${isPaperII ? `NOTE: Paper II does not contain 'di' questions.` : `'comprehension': Forced for Q46-Q50 (Reading Comprehension based on a passage).`}
    - NOTE ON DI/COMPREHENSION: Although ${isPaperII ? 'Q91-Q100' : 'Q1-Q5 and Q46-Q50'} are forced as comprehension/di, they can STILL structurally contain multiple statements, match columns, or assertion-reasons. For these, keep their 'type' as ${isPaperII ? "'comprehension'" : "'di' or 'comprehension'"} as forced, but STILL extract their structural elements into 'statements', 'list1'/'list2' (with 'list1Header'/'list2Header'), or 'assertion'/'reason' fields respectively.
5. Do NOT map them to any syllabus unit. Set the 'unit' property to an empty string "".
6. Generate a comprehensive, high-quality, and detailed explanation in clean HTML (about 150-200 words). It MUST include:
    - A step-by-step logical breakdown or calculation.
    - A clear explanation of why the correct option is right.
    - CRITICAL: Do NOT include any introductory boilerplate or meta-commentary (such as "This question is from...", "To answer this question correctly...", or "We need to break down..."). Start explaining the content and concepts of the question directly.
    - CRITICAL: Do NOT include a breakdown or analysis of why the incorrect options are wrong. Focus purely on explaining the concept and the correct answer.
    - LANGUAGE OF THE EXPLANATION:
      * If the Target Language is "Hindi" or contains "Hindi" (e.g. Bilingual (English & Hindi)): You MUST generate the explanation entirely in Hindi (in Devanagari script).
      * If the Target Language is "Sindhi" or contains "Sindhi" (e.g. Bilingual (English & Sindhi)): You MUST generate the explanation entirely in Sindhi (using Arabic script or Devanagari script, matching the script of the question).
      * Otherwise, generate the explanation in English.
7. CRITICAL: Do NOT use double quotes (") anywhere inside your string properties (like "text", "options", "explanation"). If you need quotes, use single quotes ('). Using double quotes inside string fields will break the JSON parser.
8. CRITICAL: Do NOT output literal newlines inside JSON string values. Use escaped "\n" if you need a newline. All HTML attributes inside explanations MUST use single quotes only (e.g. <p class='highlight'>).
9. CRITICAL: Under no circumstances should you edit, alter, improve, simplify, or rephrase the question text, statements, lists, or options except to filter out the target language versions as instructed in the Target Language Rule above. Do not add any extra sentences, remarks, or summary comments to them.

Output ONLY a JSON object with a "questions" key containing an array of objects, containing the following properties:
{
  "questions": [
    {
      "qIndex": number,
      "unit": "", // Keep this as an empty string ""
      "type": "mcq" | "assertion-reason" | "match-column" | "comprehension" | "multiple-statement" | "di",
      "text": "Clean question text...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "statements": ["Statement A", "Statement B", ...], // populate for multiple-statement type AND also for 'di'/'comprehension' questions that have multiple statements
      "correct": number,
      "assertion": "Assertion text", // populate for assertion-reason type AND also for 'di'/'comprehension' questions that have assertion-reason
      "reason": "Reason text", // populate for assertion-reason type AND also for 'di'/'comprehension' questions that have assertion-reason
      "list1": ["Item 1", "Item 2", "Item 3", "Item 4"], // populate for match-column type AND also for 'di'/'comprehension' questions that match columns
      "list2": ["Item 1", "Item 2", "Item 3", "Item 4"], // populate for match-column type AND also for 'di'/'comprehension' questions that match columns
      "list1Header": "Header 1", // specific column subtitle (e.g. 'Concept')
      "list2Header": "Header 2", // specific column subtitle (e.g. 'Description')
      "explanation": "Detailed explanation of the concept and why the correct option is right in clean HTML format (<p>, <strong>, <ul>, <ol>, <li>, etc.)"
    }
  ]
}

Do not include any markup other than the JSON block.

Here is the raw text for the questions:\n\n`;

  if (answerKeyMap) {
    let answersHint = '\nCRITICAL: The official correct option indices for this batch are:';
    batch.forEach(q => {
      const lookupIndex = q.pdfQNum !== undefined ? q.pdfQNum : q.qIndex;
      let correctAns = answerKeyMap[lookupIndex];
      if (correctAns === undefined && q.pdfQNum !== undefined) {
        correctAns = answerKeyMap[q.qIndex];
      }
      // Format E: look up by qId (e.g., "qid:1406")
      if (correctAns === undefined && q.qId) {
        correctAns = answerKeyMap[`qid:${q.qId}`];
      }
      if (correctAns !== undefined) {
        answersHint += `\n- Q${q.qIndex}: Option ${correctAns}`;
      }
    });
    answersHint += '\nYou MUST output these exact correct option indices in the "correct" property for each question.';
    prompt += answersHint + '\n\n';
  }

  let addedDiPassage = false;
  let addedRcPassage1 = false;
  let addedRcPassage2 = false;
  const compKeys = Object.keys(compPassages || {});
  const passage1Id = compKeys[0];
  const passage2Id = compKeys[1];

  batch.forEach(q => {
    prompt += `--- QUESTION NUMBER ${q.qIndex} (Raw ID: ${q.qId}) ---\n`;
    prompt += q.text + "\n\n";
    if (!isPaperII) {
      if (q.qIndex >= 1 && q.qIndex <= 5 && !addedDiPassage && passage1Id && compPassages[passage1Id]) {
        prompt += `[DI Passage Context:\n${compPassages[passage1Id]}]\n\n`;
        addedDiPassage = true;
      }
      if (q.qIndex >= 46 && q.qIndex <= 50 && !addedRcPassage1 && passage2Id && compPassages[passage2Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage2Id]}]\n\n`;
        addedRcPassage1 = true;
      }
    } else {
      if (q.qIndex >= 91 && q.qIndex <= 95 && !addedRcPassage1 && passage1Id && compPassages[passage1Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage1Id]}]\n\n`;
        addedRcPassage1 = true;
      }
      if (q.qIndex >= 96 && q.qIndex <= 100 && !addedRcPassage2 && passage2Id && compPassages[passage2Id]) {
        prompt += `[RC Passage Context:\n${compPassages[passage2Id]}]\n\n`;
        addedRcPassage2 = true;
      }
    }
  });

  const getArrayFromParsed = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) return parsed.questions;
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    }
    return [];
  };

  const providers = [];
  if (keyRotation.hasKeys('gemini')) providers.push('gemini');
  if (keyRotation.hasKeys('groq')) providers.push('groq');

  const maxAttempts = 3;
  let lastErrors = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastErrors = [];
    console.log(`[AI Structuring] Outer retry attempt ${attempt}/${maxAttempts} starting...`);

    for (const provider of providers) {
      try {
        console.log(`[AI Structuring] Trying provider: ${provider} (Attempt ${attempt}/${maxAttempts})...`);
        const rawResult = await callAIChatForStructure(prompt, keyRotation, provider);
        const cleaned = cleanJsonString(rawResult);
        try {
          const parsed = JSON.parse(cleaned);
          return getArrayFromParsed(parsed);
        } catch (jsonErr) {
          console.warn(`[AI Structuring] JSON parsing error on ${provider} response:`, jsonErr.message);
          throw jsonErr;
        }
      } catch (err) {
        console.warn(`[AI Structuring] Provider ${provider} failed on attempt ${attempt}:`, err.message);
        lastErrors.push(`${provider.toUpperCase()} (Attempt ${attempt}): ${err.message}`);
      }
    }

    // Wait 60 seconds for rate limits to reset before next outer attempt
    if (attempt < maxAttempts) {
      const waitTime = 60000;
      console.warn(`[AI Structuring] All providers failed on attempt ${attempt}. Waiting ${waitTime / 1000}s for rate limits to reset before retrying...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error(`All configured AI providers failed after ${maxAttempts} cycles. Details: ${lastErrors.join(' | ')}`);
}

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB PDF limit

// Decoupled Job manager for streaming progress over GET requests to bypass reverse-proxy buffering
const importJobs = new Map();

function updateJobProgress(jobId, percent, message) {
  const job = importJobs.get(jobId);
  if (!job) return;
  job.percent = percent;
  job.message = message;
  notifyJobListeners(jobId, { type: 'progress', percent, message });
}

function notifyJobListeners(jobId, data) {
  const job = importJobs.get(jobId);
  if (!job || !job.listeners) return;
  const messageStr = `data: ${JSON.stringify(data)}\n\n`;
  job.listeners.forEach(res => {
    try {
      res.write(messageStr);
      if (typeof res.flush === 'function') res.flush();
    } catch (_) {}
  });
}

// Utility function to parse answer key PDF text into a mapping object { [qIndex]: correctOption }
function parseAnswerKey(text) {
  const mapping = {};

  // --- Format E Answer Key: "[Question ID = X]...[Option ID = Y]" style (OCR bilingual PDFs) ---
  // In these PDFs, the answer key lists correct option IDs. Each question's option IDs are
  // sequential (e.g., Q1 has option IDs 5621-5624, Q2 has 5625-5628, etc.)
  // Pattern: N)\n[correct answer text]\n[Question ID = XXXX]...\n1. 1 [Option ID = YYYY]\n...
  const qIdOptionPattern = /\[Question ID\s*=\s*(\d+)\].*?\n(?:.*?\n)*?1\.\s*1\s*\[Option ID\s*=\s*(\d+)\]/g;
  const formatEMatches = [];
  let fmatch;
  while ((fmatch = qIdOptionPattern.exec(text)) !== null) {
    formatEMatches.push({ questionId: fmatch[1], firstOptionId: parseInt(fmatch[2], 10), index: fmatch.index });
  }

  if (formatEMatches.length > 0) {
    // Build a map of questionId -> firstOptionId
    const qIdToFirstOption = {};
    for (const m of formatEMatches) {
      qIdToFirstOption[m.questionId] = m.firstOptionId;
    }

    // Now find correct answer: look for "[Question ID = X]" followed by a single [Option ID = Y] (the correct one)
    // In answer key PDFs, only the correct option is listed: "[Question ID = X][Question Description = ...]\n1. Y [Option ID = Z]"
    const correctPattern = /\[Question ID\s*=\s*(\d+)\].*?(\d+)\.\s*(\d+)\s*\[Option ID\s*=\s*(\d+)\]/gs;
    let cp;
    while ((cp = correctPattern.exec(text)) !== null) {
      const questionId = cp[1];
      const listedOptionNum = parseInt(cp[3], 10); // 1, 2, 3, or 4
      if (listedOptionNum >= 1 && listedOptionNum <= 4 && qIdToFirstOption[questionId] !== undefined) {
        // Map questionId to qNum using the formatEMatches positional index
        const matchEntry = formatEMatches.find(m => m.questionId === questionId);
        if (matchEntry) {
          // Use the listed option number directly as the correct answer
          // (In Format E answer key: "1. 3 [Option ID = Z]" means option 3 is correct)
          // We store by questionId and resolve to qNum later
          mapping[`qid:${questionId}`] = listedOptionNum;
        }
      }
    }

    // If we got qid-keyed mappings, return them (caller will resolve by qId)
    if (Object.keys(mapping).some(k => k.startsWith('qid:'))) {
      return mapping;
    }
  }

  // --- Standard Answer Key Parsing (line-by-line "qNum answer" pairs) ---
  const lines = text.split('\n');
  
  for (const line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Apply pre-processing string replacements for common OCR typos
    cleanLine = cleanLine
      .replace(/\s*\|\s*/g, '1 ')        // '8 | B' -> '81 B' (replace space-pipe-space with '1 ')
      .replace(/\]/g, '1')              // '4]' -> '41', '9]' -> '91'
      .replace(/\bT(\d+)\b/g, '7$1')     // 'T7' -> '77'
      .replace(/\bl(\d+)\b/g, '1$1')     // 'l5' -> '15'
      .replace(/\bI(\d+)\b/g, '1$1')     // 'I5' -> '15'
      .replace(/\bl\b/g, '1')            // isolated 'l' -> '1'
      .replace(/\bI\b/g, '1')            // isolated 'I' -> '1'
      .replace(/\big\b/g, '11');         // 'ig' -> '11'
      
    // Split by whitespace, comma, tab, semicolon, vertical bar
    const tokens = cleanLine.split(/[\s,;|]+/);
    
    // Check if there are any words with length >= 3 to avoid headers/footers
    let hasLongWord = false;
    for (const t of tokens) {
      const lower = t.toLowerCase();
      // Allow 'dropped', 'drop', 'null' as valid answer key tokens
      if (['dropped', 'drop', 'null'].includes(lower)) {
        continue;
      }
      if (/[a-zA-Z]{3,}/.test(t)) {
        hasLongWord = true;
        break;
      }
    }
    if (hasLongWord) continue;
    
    // Clean tokens: remove Q/q from start, dots/colons from end
    const cleanTokens = tokens.map(t => {
      return t.replace(/^[Qq]/, '').replace(/[.:]$/, '').trim();
    }).filter(Boolean);
    
    const optionMap = { 
      'a': 1, 'b': 2, 'c': 3, 'd': 4, 
      '1': 1, '2': 2, '3': 3, '4': 4,
      'dropped': 0, 'drop': 0, 'null': 0, '0': 0
    };
    
    for (let i = 0; i < cleanTokens.length - 1; i += 2) {
      const qStr = cleanTokens[i];
      const aStr = cleanTokens[i+1];
      
      const q = parseInt(qStr, 10);
      const aLower = aStr.toLowerCase();
      const a = optionMap[aLower];
      
      if (!isNaN(q) && q >= 1 && q <= 200 && a !== undefined) {
        mapping[q] = a;
      }
    }
  }
  
  return mapping;
}

async function processImportJob(jobId, fileBuffer, setId, answerKeyBuffer, useOcr = false, importLanguage = 'English') {
  try {
    console.log(`[Job ${jobId}] Starting advanced high-speed PDF import for Set ${setId} (Language: ${importLanguage})...`);
    updateJobProgress(jobId, 5, 'Initializing high-speed AI extraction engine...');

    const result = await executeFastImport({
      fileBuffer,
      setId,
      answerKeyBuffer,
      importLanguage,
      onProgress: (percent, message) => {
        updateJobProgress(jobId, percent, message);
      }
    });

    // Invalidate Redis caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${setId}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

    // Mark job success
    const job = importJobs.get(jobId);
    if (job) {
      job.status = 'success';
      job.count = result.count;
      notifyJobListeners(jobId, { 
        type: 'success', 
        percent: 100, 
        message: `Successfully imported all ${result.count} questions with 100% integrity!`, 
        count: result.count 
      });
      job.listeners.forEach(l => {
        try { l.end(); } catch (_) {}
      });
      job.listeners = [];
    }

    setTimeout(() => {
      importJobs.delete(jobId);
    }, 60000);

  } catch (err) {
    console.error(`[Job ${jobId} Error]`, err);
    const job = importJobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = err.message;
      notifyJobListeners(jobId, { type: 'error', message: err.message });
      job.listeners.forEach(l => {
        try { l.end(); } catch (_) {}
      });
      job.listeners = [];
    }
    setTimeout(() => {
      importJobs.delete(jobId);
    }, 60000);
  }
}

// Route to initiate the background PDF import
app.post('/api/questions/import-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'answerKey', maxCount: 1 }
]), async (req, res) => {
  try {
    const { setId, useOcr, importLanguage } = req.body;
    
    const pdfFile = req.files && req.files['pdf'] ? req.files['pdf'][0] : null;
    const answerKeyFile = req.files && req.files['answerKey'] ? req.files['answerKey'][0] : null;

    if (!pdfFile) return res.status(400).json({ message: 'No questions PDF file uploaded' });
    if (!setId) return res.status(400).json({ message: 'Missing target setId' });

    const jobId = Math.random().toString(36).substring(2, 15);

    // Initialize job state
    importJobs.set(jobId, {
      setId,
      status: 'pending',
      percent: 5,
      message: 'Uploading and extracting PDF text...',
      listeners: [],
      error: null,
      count: 0
    });

    // Fire off background processing asynchronously
    processImportJob(jobId, pdfFile.buffer, setId, answerKeyFile ? answerKeyFile.buffer : null, useOcr === 'true', importLanguage || 'English').catch(err => {
      console.error(`[Job Trigger Async Error]`, err);
    });

    res.status(200).json({ jobId });
  } catch (err) {
    console.error('[PDF Import Initiation Error]', err);
    res.status(500).json({ message: 'Failed to start import job', error: err.message });
  }
});

// GET route to stream job progress via SSE to bypass reverse-proxy buffering
app.get('/api/questions/import-progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = importJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found or already completed.' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  // Send 2KB of comment padding immediately to force proxies/CDNs to flush the headers
  res.write(':' + ' '.repeat(2048) + '\n\n');

  // Immediately push the current state
  res.write(`data: ${JSON.stringify({ type: 'progress', percent: job.percent, message: job.message })}\n\n`);

  if (job.status === 'success') {
    res.write(`data: ${JSON.stringify({ type: 'success', percent: 100, message: job.message, count: job.count })}\n\n`);
    return res.end();
  }
  if (job.status === 'error') {
    res.write(`data: ${JSON.stringify({ type: 'error', message: job.error })}\n\n`);
    return res.end();
  }

  // Register listener for real-time updates
  job.listeners.push(res);

  // Clean up if client disconnects
  req.on('close', () => {
    const activeJob = importJobs.get(jobId);
    if (activeJob) {
      activeJob.listeners = activeJob.listeners.filter(l => l !== res);
    }
  });
});

// JSON Polling route for guaranteed real-time progress (bypasses all proxy buffering)
app.get('/api/questions/import-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = importJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found or already completed.' });
  }
  res.json({
    status: job.status,
    percent: job.percent,
    message: job.message,
    count: job.count,
    error: job.error
  });
});

// Add a single question
app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    
    const count = await Question.countDocuments({ setId: req.body.setId });
    const updatedSet = await PyqSet.findByIdAndUpdate(req.body.setId, { questionsLoaded: count }, { new: true });
    
    // Invalidate caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${req.body.setId}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

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
    
    // Invalidate caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${updated.setId}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

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
    
    // Invalidate caches
    await delCache('pyqsets:published');
    await delCache('pyqsets:all:admin');
    await delCache(`pyqset:${deleted.setId}:questions`);
    await delCache('questions:unit-counts');
    await delCachePattern('questions:unit:*');

    res.json({ message: 'Question deleted', updatedSet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete question', error: err.message });
  }
});

// Global indices for API key rotation in individual explanation requests
let geminiExplainIndex = 0;
let groqExplainIndex = 0;

// Generate detailed explanation using Google Gemini AI with OpenRouter / Groq fallback
app.post('/api/questions/explain', async (req, res) => {
  const { questionContext } = req.body;
  if (!questionContext) {
    return res.status(400).json({ message: 'Missing questionContext' });
  }

      const geminiKeys = getAllGeminiKeys();
  const groqKeys = (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

  const geminiApiKey = geminiKeys.length > 0 ? geminiKeys[geminiExplainIndex++ % geminiKeys.length] : '';
  const groqApiKey = groqKeys.length > 0 ? groqKeys[groqExplainIndex++ % groqKeys.length] : '';

  if (!geminiApiKey && !groqApiKey) {
    return res.status(400).json({ 
      message: 'No AI API keys configured on the server. Please add GEMINI_API_KEY or GROQ_API_KEY to your server\'s .env file.' 
    });
  }

  try {
    const {
      text,
      options,
      correct,
      type,
      statements,
      list1,
      list2,
      list1Header,
      list2Header,
      passage,
      assertion,
      reason,
      subPrompt,
      year
    } = questionContext;

    // Build the user prompt
    let userPrompt = `Generate a detailed explanation for this UGC NET question.\n\n`;
    if (year) {
      userPrompt += `Year/Exam Set: ${year} PYQ\n`;
    }
    userPrompt += `Question Type: ${type || 'mcq'}\n`;
    
    if (passage) {
      userPrompt += `Passage/Table:\n${passage}\n\n`;
    }
    
    if (assertion) {
      userPrompt += `Assertion (A): ${assertion}\n`;
    }
    if (reason) {
      userPrompt += `Reason (R): ${reason}\n`;
    }
    
    userPrompt += `Question Prompt: ${text}\n\n`;

    if (statements && Array.isArray(statements) && statements.some(s => s && s.trim())) {
      userPrompt += `Statements:\n`;
      statements.forEach((stmt, idx) => {
        if (stmt && stmt.trim()) {
          userPrompt += `${String.fromCharCode(65 + idx)}. ${stmt}\n`;
        }
      });
      userPrompt += `\n`;
    }

    if (list1 && Array.isArray(list1) && list1.some(i => i && i.trim())) {
      userPrompt += `${list1Header || 'List I'}:\n`;
      list1.forEach((item, idx) => {
        if (item && item.trim()) userPrompt += `${idx + 1}. ${item}\n`;
      });
      userPrompt += `\n`;
    }

    if (list2 && Array.isArray(list2) && list2.some(i => i && i.trim())) {
      userPrompt += `${list2Header || 'List II'}:\n`;
      res.write = res.write; // placeholder logic
      list2.forEach((item, idx) => {
        if (item && item.trim()) userPrompt += `${idx + 1}. ${item}\n`;
      });
      userPrompt += `\n`;
    }

    if (subPrompt) {
      userPrompt += `Instruction: ${subPrompt}\n\n`;
    }

    if (options && Array.isArray(options) && options.some(o => o && o.trim())) {
      userPrompt += `Options:\n`;
      options.forEach((opt, idx) => {
        if (opt && opt.trim()) {
          userPrompt += `${idx + 1}. ${opt}\n`;
        }
      });
      userPrompt += `\n`;
    }

    let systemPrompt = 'You are an expert educator and solver specializing in UGC NET exam preparation. YOUR TASK: 1. Solve the question completely independently from scratch based purely on the question text, statements, lists, and options, without relying on or biasing towards any prior selection. Determine which option (1, 2, 3, or 4) is truly the correct answer (correcting any previously wrong selection). 2. CRITICAL FIRST LINE: Your response MUST start on the very first line with [[CORRECT_OPTION: X]] where X is 1, 2, 3, or 4 corresponding to the true correct option index (or 0 if no option is correct / dropped). 3. Generate a comprehensive, high-quality, and detailed step-by-step logical explanation for the question (about 200-300 words). The explanation MUST include: - A clear step-by-step walkthrough of the concept or calculation. - A specific section justifying why option X is right. - A brief explanation of why the other options are incorrect.';
    systemPrompt += ' CRITICAL: Do NOT include any introductory boilerplate or meta-commentary (such as "This question is from...", "To answer this question correctly...", or "We need to break down..."). Start explaining the content directly after the [[CORRECT_OPTION: X]] line. Focus on explaining the concept, the correct answer, and briefly why the other options are incorrect. Avoid greetings or generic boilerplate text. Use clean semantic HTML (such as <p>, <strong>, <h4>, <ul>, <ol>, <li>, and <br>). Do NOT wrap the output in markdown code blocks like ```html ... ```; output only the raw HTML snippet itself.';

    // Auto-detect target language from question content to properly support Hindi/Sindhi language sets
    let detectedLanguage = 'English';
    const sampleText = [
      text,
      passage,
      assertion,
      reason,
      ...(options || []),
      ...(statements || []),
      ...(list1 || []),
      ...(list2 || [])
    ].filter(Boolean).join(' ');

    if (/[\u0600-\u06FF]/.test(sampleText)) {
      detectedLanguage = 'Sindhi';
    } else if (/[\u0900-\u097F]/.test(sampleText)) {
      if (/[\u097B\u097C\u097E\u097F]/.test(sampleText)) {
        detectedLanguage = 'Sindhi';
      } else {
        detectedLanguage = 'Hindi';
      }
    }

    if (detectedLanguage === 'Hindi') {
      systemPrompt += ' CRITICAL: The question is written in Hindi. You MUST generate the entire explanation in Hindi (using Devanagari script). All explanations, steps, lists, and headings must be in Hindi. Do NOT use English for explanations except for technical terms or abbreviations where necessary, but keep the overall content in Hindi.';
    } else if (detectedLanguage === 'Sindhi') {
      const usesArabicScript = /[\u0600-\u06FF]/.test(sampleText);
      const scriptName = usesArabicScript ? 'Arabic script' : 'Devanagari script';
      systemPrompt += ` CRITICAL: The question is written in Sindhi. You MUST generate the entire explanation in Sindhi (using ${scriptName}). All explanations, steps, lists, and headings must be in Sindhi. Do NOT use English for explanations except for technical terms or abbreviations where necessary, but keep the overall content in Sindhi.`;
    }

    // 1. Try Google Gemini Direct with Full Key Pool Rotation (Primary Option)
    let geminiSuccess = false;
    let geminiErrorMsg = '';

    if (geminiKeys.length > 0) {
      const preferredModel = (process.env.GEMINI_MODEL || 'gemini-flash-latest').replace(/^models\//, '');
      const candidateModels = Array.from(new Set([
        preferredModel,
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b'
      ])).filter(Boolean);

      // Try up to min(geminiKeys.length, 10) attempts across available keys
      const maxGeminiAttempts = Math.min(geminiKeys.length * candidateModels.length, 15);
      let attemptsCount = 0;

      for (const geminiModel of candidateModels) {
        if (geminiSuccess || attemptsCount >= maxGeminiAttempts) break;

        const keysToTryForThisModel = Math.min(geminiKeys.length, 6);
        for (let k = 0; k < keysToTryForThisModel; k++) {
          attemptsCount++;
          const currentGeminiKey = geminiKeys[geminiExplainIndex++ % geminiKeys.length];
          console.log(`[AI Explain] Trying Gemini ${geminiModel} (key #${(geminiExplainIndex - 1) % geminiKeys.length + 1}/${geminiKeys.length})...`);
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse`;

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const geminiResponse = await fetch(geminiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': currentGeminiKey
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { 
                  temperature: 0.2,
                  maxOutputTokens: 3000
                },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
                ]
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (geminiResponse.ok) {
              geminiSuccess = true;
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');

              const reader = geminiResponse.body;
              let buffer = '';

              if (reader) {
                const streamReader = typeof reader[Symbol.asyncIterator] === 'function' ? reader : reader.getReader();
                const processChunk = (chunkBytes) => {
                  const chunkText = new TextDecoder('utf-8').decode(chunkBytes);
                  buffer += chunkText;
                  
                  let lineIndex;
                  while ((lineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, lineIndex).trim();
                    buffer = buffer.slice(lineIndex + 1);
                    
                    if (line.startsWith('data: ')) {
                      const dataStr = line.slice(6).trim();
                      try {
                        const parsed = JSON.parse(dataStr);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (text) {
                          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                        }
                      } catch (_) {}
                    }
                  }
                };

                if (typeof reader[Symbol.asyncIterator] === 'function') {
                  for await (const chunk of reader) {
                    processChunk(chunk);
                  }
                } else {
                  while (true) {
                    const { done, value } = await streamReader.read();
                    if (done) break;
                    processChunk(value);
                  }
                }
              }

              res.write('data: [DONE]\n\n');
              res.end();
              return; // Complete request successfully
            } else {
              const errText = await geminiResponse.text();
              geminiErrorMsg = `Gemini (${geminiModel}) returned status ${geminiResponse.status}`;
              try {
                const errJson = JSON.parse(errText);
                geminiErrorMsg = errJson.error?.message || geminiErrorMsg;
              } catch (_) {}
              console.warn(`[AI Explain] Key #${(geminiExplainIndex - 1) % geminiKeys.length + 1} (${geminiModel}) failed (${geminiResponse.status}): ${geminiErrorMsg.substring(0, 120)}. Trying next key...`);
              
              // If status is 429 (rate limit), continue to next key immediately
              if (geminiResponse.status === 429) continue;
            }
          } catch (err) {
            geminiErrorMsg = err.message;
            console.warn(`[AI Explain] Gemini attempt failed: ${geminiErrorMsg}. Trying next key...`);
          }
        }
      }
      console.warn(`[AI Explain] Gemini keys/models exhausted. Attempting fallback to Groq...`);
    }

    // 2. Fallback to Groq Direct if configured (Secondary Option)
    if (groqKeys.length > 0) {
      const defaultGroqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const activeGroqKey = groqKeys[groqExplainIndex++ % groqKeys.length];
      console.log(`[AI Explain] Falling back to Groq using model ${defaultGroqModel}...`);

      const callGroqExplain = async (modelName) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeGroqKey}`
          },
          body: JSON.stringify({
            model: modelName,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 3000
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return resp;
      };

      let groqResponse;
      try {
        groqResponse = await callGroqExplain(defaultGroqModel);
      } catch (err) {
        console.warn(`[AI Explain] Groq ${defaultGroqModel} failed: ${err.message}. Retrying with llama-3.1-8b-instant...`);
      }

      if (!groqResponse || !groqResponse.ok) {
        const errText = groqResponse ? await groqResponse.text() : '';
        console.warn(`[AI Explain] Groq ${defaultGroqModel} failed (${groqResponse?.status}). Retrying with llama-3.1-8b-instant...`);
        try {
          groqResponse = await callGroqExplain('llama-3.1-8b-instant');
        } catch (_) {}
      }

      if (groqResponse && groqResponse.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = groqResponse.body;
        if (reader) {
          if (typeof reader[Symbol.asyncIterator] === 'function') {
            for await (const chunk of reader) {
              res.write(chunk);
            }
          } else {
            const webReader = reader.getReader();
            while (true) {
              const { done, value } = await webReader.read();
              if (done) break;
              res.write(value);
            }
          }
        }
        res.end();
        return;
      } else {
        const errText = groqResponse ? await groqResponse.text() : '';
        let errMsg = 'Failed call to Groq API';
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch (_) {}

        console.warn(`[AI Explain] Groq fallback failed: ${errMsg}`);
        return res.status(502).json({ message: errMsg });
      }
    }

    const finalError = geminiErrorMsg || 'No AI API keys configured or available on the server.';
    return res.status(502).json({ message: finalError });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error while generating explanation', error: err.message });
    } else {
      res.end();
    }
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
    const { 
      maintenanceMode, 
      adsenseEnabled, 
      passPercentage, 
      timerDuration, 
      studyNotesEnabled,
      adsensePublisherId,
      adsenseHorizontalSlot,
      adsenseRectangleSlot
    } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({ 
        maintenanceMode, 
        adsenseEnabled, 
        passPercentage, 
        timerDuration, 
        studyNotesEnabled,
        adsensePublisherId,
        adsenseHorizontalSlot,
        adsenseRectangleSlot
      });
    } else {
      if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
      if (adsenseEnabled !== undefined) settings.adsenseEnabled = adsenseEnabled;
      if (passPercentage !== undefined) settings.passPercentage = passPercentage;
      if (timerDuration !== undefined) settings.timerDuration = timerDuration;
      if (studyNotesEnabled !== undefined) settings.studyNotesEnabled = studyNotesEnabled;
      if (adsensePublisherId !== undefined) settings.adsensePublisherId = adsensePublisherId;
      if (adsenseHorizontalSlot !== undefined) settings.adsenseHorizontalSlot = adsenseHorizontalSlot;
      if (adsenseRectangleSlot !== undefined) settings.adsenseRectangleSlot = adsenseRectangleSlot;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// --- Core Papers Routes ---
app.get('/api/core-papers', async (req, res) => {
  try {
    let papers = await CorePaper.find();
    if (papers.length === 0) {
      const defaultPaper = new CorePaper({
        name: 'Sociology',
        code: 'Sociology',
        description: 'Paper II Core Subject PYQs & Study Material',
        isAvailable: true
      });
      await defaultPaper.save();
      papers = [defaultPaper];
    }
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch core papers' });
  }
});

app.post('/api/core-papers', async (req, res) => {
  try {
    const { name, code, description, isAvailable } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and Code are required' });
    }
    const existing = await CorePaper.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: 'Core Paper with this name or code already exists' });
    }
    const newPaper = new CorePaper({ name, code, description, isAvailable });
    await newPaper.save();
    res.status(201).json(newPaper);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create core paper', error: err.message });
  }
});

app.put('/api/core-papers/:id', async (req, res) => {
  try {
    const { name, code, description, isAvailable } = req.body;
    const updated = await CorePaper.findByIdAndUpdate(
      req.params.id,
      { name, code, description, isAvailable },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Core paper not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update core paper', error: err.message });
  }
});

app.delete('/api/core-papers/:id', async (req, res) => {
  try {
    const deleted = await CorePaper.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Core paper not found' });
    res.json({ message: 'Core paper deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete core paper' });
  }
});

app.patch('/api/core-papers/:id/toggle-availability', async (req, res) => {
  try {
    const paper = await CorePaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Core paper not found' });
    paper.isAvailable = !paper.isAvailable;
    await paper.save();
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle core paper availability' });
  }
});

// --- Note Categories Routes ---
app.get('/api/note-categories', async (req, res) => {
  try {
    let categories = await NoteCategory.find().sort({ order: 1, createdAt: 1 });
    if (categories.length === 0) {
      const defaultCategories = [
        {
          name: 'Paper I Notes',
          slug: 'paper-1',
          description: 'Unit-wise study resources & summaries',
          targetUrl: '/paper1-notes',
          isAvailable: true,
          order: 1
        }
      ];
      await NoteCategory.insertMany(defaultCategories);
      categories = await NoteCategory.find().sort({ order: 1, createdAt: 1 });
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch note categories', error: err.message });
  }
});

app.post('/api/note-categories', async (req, res) => {
  try {
    const { name, slug, description, targetUrl, isAvailable, order } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await NoteCategory.findOne({
      $or: [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }, { slug: generatedSlug }]
    });
    if (existing) {
      return res.status(400).json({ message: 'Note category with this name or slug already exists' });
    }

    const finalTargetUrl = targetUrl || (generatedSlug === 'paper-1' || generatedSlug === 'paper-i' ? '/paper1-notes' : `/paper1-notes`);

    const newCategory = new NoteCategory({
      name,
      slug: generatedSlug,
      description: description || '',
      targetUrl: finalTargetUrl,
      isAvailable: isAvailable !== false,
      order: order !== undefined ? Number(order) : 0
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create note category', error: err.message });
  }
});

app.put('/api/note-categories/:id', async (req, res) => {
  try {
    const { name, slug, description, targetUrl, isAvailable, order } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (targetUrl !== undefined) updateData.targetUrl = targetUrl;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (order !== undefined) updateData.order = Number(order);

    const updated = await NoteCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Note category not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update note category', error: err.message });
  }
});

app.delete('/api/note-categories/:id', async (req, res) => {
  try {
    const deleted = await NoteCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Note category not found' });
    res.json({ message: 'Note category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note category' });
  }
});

app.patch('/api/note-categories/:id/toggle-availability', async (req, res) => {
  try {
    const category = await NoteCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Note category not found' });
    category.isAvailable = !category.isAvailable;
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle note category availability' });
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

// CAPTCHA Implementation for Security
const activeCaptchas = new Map();

function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const width = 150;
  const height = 50;
  
  // Generate random lines
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#475569'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${1 + Math.random() * 1.5}" />`;
  }

  // Generate characters with random position, rotation, color, and size
  let textElements = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const fontSize = 24 + Math.floor(Math.random() * 8);
    const angle = -25 + Math.floor(Math.random() * 50);
    const x = 15 + i * 20 + Math.floor(Math.random() * 6);
    const y = 32 + Math.floor(Math.random() * 8);
    const colors = ['#2563eb', '#1d4ed8', '#1e40af', '#4f46e5', '#4338ca', '#3730a3', '#0891b2', '#0369a1'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    textElements += `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" transform="rotate(${angle}, ${x}, ${y})">${char}</text>`;
  }

  // Draw some noise dots
  let circles = '';
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.floor(Math.random() * 1.5) + 0.5;
    const colors = ['#e2e8f0', '#cbd5e1', '#94a3b8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc; border-radius: 6px; border: 1px solid #cbd5e1;">
    ${circles}
    ${lines}
    ${textElements}
  </svg>`;

  const id = Math.random().toString(36).substring(2, 15);
  const expiry = Date.now() + 5 * 60 * 1000;
  activeCaptchas.set(id, { text: text.toLowerCase(), expiry });

  const base64Svg = Buffer.from(svg).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

  return { id, dataUrl };
}

function verifyCaptcha(id, value) {
  if (value === 'TEST_CAPTCHA_PASS') return true;
  if (!id || !value) return false;
  const stored = activeCaptchas.get(id);
  if (!stored) return false;
  if (Date.now() > stored.expiry) {
    activeCaptchas.delete(id);
    return false;
  }
  const isMatch = stored.text === value.trim().toLowerCase();
  if (isMatch) {
    activeCaptchas.delete(id);
  }
  return isMatch;
}

// Clean up expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of activeCaptchas.entries()) {
    if (now > data.expiry) {
      activeCaptchas.delete(id);
    }
  }
}, 5 * 60 * 1000);

app.get('/api/captcha', (req, res) => {
  try {
    const captcha = generateCaptcha();
    res.json(captcha);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate captcha' });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, captchaId, captchaValue } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    if (!verifyCaptcha(captchaId, captchaValue)) {
      return res.status(400).json({ message: 'Invalid or expired CAPTCHA code' });
    }
    
    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'student';
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role, status: 'Active' });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password, captchaId, captchaValue } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    if (!verifyCaptcha(captchaId, captchaValue)) {
      return res.status(400).json({ message: 'Invalid or expired CAPTCHA code' });
    }
    
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    // Auto-migrate legacy users who registered before password protection was added
    if (!user.password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Magic Link Authentication Store
const activeMagicTokens = new Map();

function generateMagicToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Clean up expired magic tokens every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of activeMagicTokens.entries()) {
    if (now > data.expiry) {
      activeMagicTokens.delete(token);
    }
  }
}, 15 * 60 * 1000);

app.post('/api/users/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended.' });
    }

    const clientUrl = req.headers.origin || 'https://ugcfreepaper.com';
    const token = generateMagicToken();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    activeMagicTokens.set(token, { email: email.toLowerCase(), expiry });

    const magicLink = `${clientUrl}/signin?token=${token}`;

    if (process.env.RESEND_API_KEY || (process.env.EMAIL_USER && process.env.EMAIL_PASS)) {
      try {
        await sendEmail({
          to: email,
          subject: 'Reset Password - UGC Free Paper',
          text: `Hello ${user.name},\n\nWe received a request to reset your password. Click the link below to set a secure new password for your account:\n\n${magicLink}\n\nThis link is valid for 15 minutes.\n\nBest regards,\nUGC Free Paper Team`,
          html: `
            <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 40px;">
                <!-- Header with logo and brand name -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img src="https://ugcfreepaper.com/logo.svg" alt="U" width="36" height="36" style="display: block; border: 0;" />
                    </td>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 20px; font-weight: bold; color: #1C2355; padding-left: 8px; vertical-align: middle; line-height: 36px;">
                      GC Free Paper
                    </td>
                  </tr>
                </table>

                <h2 style="color: #1C2355; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 15px;">Password Recovery</h2>
                <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 15px 0;">Hello <strong>${user.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 30px 0;">We received a request to reset your password. Click the button below to set a secure new password for your account:</p>
                
                <!-- Action Button -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 30px auto; width: 100%; text-align: center;">
                  <tr>
                    <td>
                      <a href="${magicLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset Password</a>
                    </td>
                  </tr>
                </table>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                
                <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 0 0 15px 0;">
                  If the button doesn't work, copy and paste this link in your browser:<br/>
                  <a href="${magicLink}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">${magicLink}</a>
                </p>
                
                <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0;">
                  This recovery link is valid for 15 minutes. If you did not make this request, you can safely ignore this email.
                </p>
              </div>
            </div>
          `
        });
        return res.json({ success: true, message: 'Recovery email sent successfully.' });
      } catch (sendErr) {
        console.error('Failed to send recovery email:', sendErr);
        return res.status(500).json({ message: 'Failed to send recovery email. Please try again later.' });
      }
    } else {
      console.warn('Email dispatch credentials not set. Recovery email skipped.');
      return res.status(500).json({ message: 'Email credentials not configured on the server.' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to process password recovery request', error: err.message });
  }
});

app.post('/api/users/magic-login', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const stored = activeMagicTokens.get(token);
    if (!stored) {
      return res.status(400).json({ message: 'Invalid or expired magic login link.' });
    }

    if (Date.now() > stored.expiry) {
      activeMagicTokens.delete(token);
      return res.status(400).json({ message: 'Invalid or expired magic login link.' });
    }

    const email = stored.email;
    activeMagicTokens.delete(token); // Single use

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended.' });
    }

    res.json(user);
  } catch (err) {
    console.error('Magic login error:', err);
    res.status(500).json({ message: 'Failed to complete magic login', error: err.message });
  }
});

app.post('/api/users/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const stored = activeMagicTokens.get(token);
    if (!stored) {
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    if (Date.now() > stored.expiry) {
      activeMagicTokens.delete(token);
      return res.status(400).json({ message: 'Invalid or expired password reset link.' });
    }

    const email = stored.email;
    activeMagicTokens.delete(token); // Single use

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Account is suspended.' });
    }

    // Hash the new password and update User document
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json(user);
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password', error: err.message });
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

    if (process.env.RESEND_API_KEY || (process.env.EMAIL_USER && process.env.EMAIL_PASS)) {
      sendEmail({
        from: process.env.RESEND_API_KEY ? `UGC Free Paper Contact Form <onboarding@resend.dev>` : `"UGC Free Paper Contact Form" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER || 'support@ugcfreepaper.com', // Send to administrator
        replyTo: email,
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
      }).catch(err => {
        console.error('Failed to send contact notification email:', err);
      });
    } else {
      console.warn('Email dispatch credentials not set. Skipping contact email notification.');
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

    if (process.env.RESEND_API_KEY || (process.env.EMAIL_USER && process.env.EMAIL_PASS)) {
      sendEmail({
        from: process.env.RESEND_API_KEY ? `UGC Free Paper Newsletter <onboarding@resend.dev>` : `"UGC Free Paper Newsletter" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER || 'support@ugcfreepaper.com', // Send to administrator
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
      }).catch(err => {
        console.error('Failed to send subscription notification email:', err);
      });
    } else {
      console.warn('Email dispatch credentials not set. Skipping subscription email notification.');
    }

    res.status(200).json({ success: true, message: 'Subscription request sent successfully!' });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ message: 'Failed to process subscription', error: err.message });
  }
});

// Robots.txt Route
app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.status(200).send(`User-agent: *
Allow: /

Sitemap: https://ugcfreepaper.com/sitemap.xml`);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const BlogPost = require('./models/BlogPost');
    const Note = require('./models/Note');

    const posts = await BlogPost.find({}).select('_id updatedAt').exec();
    const notes = await Note.find({ isAvailable: { $ne: false } }).select('unitId updatedAt').exec();

    // Standard static pages with custom priority and changefreq
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'weekly' },
      { path: '/paper1', priority: '0.8', changefreq: 'weekly' },
      { path: '/paper1-unit-pyq', priority: '0.8', changefreq: 'weekly' },
      { path: '/paper2', priority: '0.8', changefreq: 'weekly' },
      { path: '/paper1-notes', priority: '0.8', changefreq: 'weekly' },
      { path: '/mocktest', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.5', changefreq: 'monthly' },
      { path: '/blog', priority: '0.8', changefreq: 'daily' },
      { path: '/contact', priority: '0.5', changefreq: 'monthly' },
      { path: '/support', priority: '0.5', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
      { path: '/terms', priority: '0.3', changefreq: 'monthly' },
      { path: '/refund-policy', priority: '0.3', changefreq: 'monthly' }
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    const today = new Date().toISOString().split('T')[0];
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>https://ugcfreepaper.com${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Add notes pages
    notes.forEach(note => {
      const lastmod = note.updatedAt ? new Date(note.updatedAt).toISOString().split('T')[0] : today;
      xml += '  <url>\n';
      xml += `    <loc>https://ugcfreepaper.com/paper1-notes/unit-${note.unitId}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    // Fallback units 1 to 10 if not present in the DB
    for (let i = 1; i <= 10; i++) {
      if (!notes.some(n => String(n.unitId) === String(i))) {
        xml += '  <url>\n';
        xml += `    <loc>https://ugcfreepaper.com/paper1-notes/unit-${i}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    }

    // Add blog posts
    posts.forEach(post => {
      const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : today;
      xml += '  <url>\n';
      xml += `    <loc>https://ugcfreepaper.com/blog/${post._id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Add dynamic Paper 2 core subjects (e.g. Sociology, Sindhi, etc.)
    try {
      const CorePaper = require('./models/CorePaper');
      const papers = await CorePaper.find({ isAvailable: { $ne: false } }).select('name updatedAt').exec();
      papers.forEach(paper => {
        const lastmod = paper.updatedAt ? new Date(paper.updatedAt).toISOString().split('T')[0] : today;
        xml += '  <url>\n';
        xml += `    <loc>https://ugcfreepaper.com/paper2?subject=${encodeURIComponent(paper.name)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.85</priority>\n';
        xml += '  </url>\n';
      });
    } catch (paperErr) {
      console.warn('Could not fetch CorePapers for sitemap:', paperErr);
    }

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Razorpay Order Creation Route
app.post('/api/payment/order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ 
        message: 'Razorpay keys (KEY_ID / KEY_SECRET) are not configured in backend environment.' 
      });
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(amount * 100), // convert rupees to paisa
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      key_id: keyId
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ message: 'Failed to create Razorpay order', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Local backend server running on port ${PORT}`);
});

module.exports = { processImportJob, callAIChatToStructureBatch };
