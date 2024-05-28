const express = require('express');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });
const speechClient = new SpeechClient();

app.use(express.json());

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);

    const audio = {
      content: fs.readFileSync(filePath).toString('base64'),
    };

    const request = {
      audio: audio,
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // Delete the file after processing
    fs.unlinkSync(filePath);

    res.json({ transcription: transcription });
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).send('Error during transcription');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
