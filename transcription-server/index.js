const express = require("express");
const multer = require("multer");
const { SpeechClient } = require("@google-cloud/speech");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

var app = express();
var cors = require('cors');
app.use(cors());
const port = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });
const speechClient = new SpeechClient();

app.use(express.json());

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);
    const audioBytes = fs.readFileSync(filePath).toString("base64");

    console.log(`Received file: ${req.file.originalname}`);
    console.log(`File mimetype: ${req.file.mimetype}`);

    // Automatic encoding detection based on content analysis
    const inferredEncoding = await speechClient.recognize({
      config: {
        encoding: "ENCODING_UNSPECIFIED",
      },
      audio: {
        content: audioBytes,
      },
    });

    const encoding = inferredEncoding.audioChannelType === 1 ? "LINEAR16" : "AAC"; // Adjust based on channel type

    console.log(`Using encoding: ${encoding}`);

    const recognize = async (audioBytes, encoding) => {
      const audio = {
        content: audioBytes,
      };

      const [response] = await speechClient.longRunningRecognize({
        audio: audio,
        config: {
          model: "latest_long",
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          languageCode: "en-IN",
          encoding: encoding, // Use detected encoding
        },
      });

      return response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    };

    const transcription = await recognize(audioBytes, encoding);

    // Delete the file after processing
    fs.unlinkSync(filePath);

    console.log(`Transcription: ${transcription}`);

    res.json({ transcription: transcription });
  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).send("Error during transcription");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
