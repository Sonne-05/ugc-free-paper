require('dotenv').config();
const mongoose = require('mongoose');

const SET_ID = '6a7cd369736679814db904cf';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const setId = new mongoose.Types.ObjectId(SET_ID);

  // Show current Q1
  const current = await db.collection('questions').findOne({ setId, qIndex: 1 });
  console.log('Current Q1 text:', current?.text?.substring(0, 100));
  console.log('Current Q1 options:', current?.options);

  // Update Q1 with correct content from PDF (Sl. No.1, QBID:5001)
  const result = await db.collection('questions').updateOne(
    { setId, qIndex: 1 },
    {
      $set: {
        text: 'The First wave of feminism was synonymous with:',
        options: [
          "'Me-too' movement",
          "1960's Civil Rights Movement",
          "Queer Movement",
          "Women's Suffragette Movement"
        ],
        type: 'mcq',
        correct: 4,       // Women's Suffragette Movement (first wave of feminism)
        ntaQuestionId: '5001'
      }
    }
  );

  console.log('\n✅ Q1 updated. Modified count:', result.modifiedCount);

  // Verify
  const updated = await db.collection('questions').findOne({ setId, qIndex: 1 });
  console.log('\nUpdated Q1:');
  console.log('  Text   :', updated.text);
  console.log('  Options:', updated.options);
  console.log('  Correct:', updated.correct, '→', updated.options[updated.correct - 1]);

  await mongoose.disconnect();
}).catch(e => console.error('Error:', e.message));
