require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId('6a7cd369736679814db904cf');

  const total = await db.collection('questions').countDocuments({ setId });
  const allQ = await db.collection('questions').find({ setId }, { projection: { qIndex: 1, _id: 0 } }).toArray();
  const qIndices = new Set(allQ.map(q => q.qIndex).filter(q => q != null));

  console.log(`Total questions in DB: ${total}`);
  console.log(`Unique qIndex values: ${qIndices.size}`);

  // Find missing 1-100
  const missing = [];
  for (let i = 1; i <= 100; i++) {
    if (!qIndices.has(i)) missing.push(i);
  }
  console.log(`\nMissing question numbers (Sl. No.): ${missing.length}`);
  console.log(missing.join(', '));

  // Find duplicates
  const seen = {};
  const dups = [];
  allQ.forEach(q => {
    if (q.qIndex != null) {
      seen[q.qIndex] = (seen[q.qIndex] || 0) + 1;
    }
  });
  Object.entries(seen).forEach(([k, v]) => { if (v > 1) dups.push(`Sl.No.${k}(×${v})`); });
  if (dups.length) console.log(`\nDuplicate qIndex: ${dups.join(', ')}`);
  else console.log(`\nNo duplicates ✅`);

  await mongoose.disconnect();
}).catch(e => console.error('Error:', e.message));
