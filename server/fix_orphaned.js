require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId('6a7cc0e7d960088af28cce87');

  // Get all orphaned questions (qIndex: null)
  const orphans = await db.collection('questions').find(
    { setId, qIndex: null },
    { projection: { text: 1, type: 1, qIndex: 1 } }
  ).toArray();

  console.log('Orphaned questions (qIndex=null):');
  orphans.forEach((q, i) => {
    console.log(`${i + 1}. [${q.type}] qIndex=${q.qIndex} | "${(q.text || '').substring(0, 80)}"`);
  });

  // Delete them
  const result = await db.collection('questions').deleteMany({ setId, qIndex: null });
  console.log(`\nDeleted ${result.deletedCount} orphaned questions.`);

  // Update questionsLoaded count
  const count = await db.collection('questions').countDocuments({ setId });
  await db.collection('pyqsets').updateOne({ _id: setId }, { $set: { questionsLoaded: count } });
  console.log(`Updated questionsLoaded to ${count}`);

  await mongoose.disconnect();
}).catch(e => console.error('Error:', e.message));
