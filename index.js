const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account.json'); // Replace with your Firebase service account file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory storage for device tokens
const deviceTokens = new Set();

const app = express();
app.use(bodyParser.json());

// Endpoint to register a device token
app.post('/register-device', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Device token is required' });
  }

  deviceTokens.add(token);
  return res.status(200).json({ message: 'Device token registered successfully' });
});

// Endpoint to send a message to Firebase and then to the Android app
app.post('/send-message', async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  if (deviceTokens.size === 0) {
    return res.status(400).json({ error: 'No registered device tokens' });
  }

  const message = {
    notification: {
      title,
      body,
    },
    tokens: Array.from(deviceTokens), // Send to all registered device tokens
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    return res.status(200).json({
      message: 'Message sent successfully',
      response,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});