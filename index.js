const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Enable CORS so your app can talk to this server
app.use(cors());

// Cleanup helper
const cleanup = (files) => {
  files.forEach(file => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
};

app.post('/merge', upload.single('video_file'), async (req, res) => {
  // 1. Validate Inputs
  if (!req.file || !req.body.audio_url) {
    return res.status(400).send('Missing video_file or audio_url');
  }

  const videoPath = req.file.path;
  const audioUrl = req.body.audio_url;
  const outputPath = `uploads/output_${Date.now()}.mp4`;

  console.log(`Processing: Video Size: ${req.file.size}, Audio URL: ${audioUrl}`);

  // 2. FFmpeg Command
  // We use spawn to run FFmpeg directly
  const ffmpeg = spawn('ffmpeg', [
    '-y',                     // Overwrite output
    '-i', videoPath,          // Input 1: The video file you uploaded
    '-i', audioUrl,           // Input 2: The Audio URL (Mux/HLS)
    '-map', '0:v',            // Take Video from Input 0
    '-map', '1:a',            // Take Audio from Input 1
    '-c:v', 'copy',           // Copy Video (Don't re-encode, super fast)
    '-c:a', 'aac',            // Encode Audio to AAC (Standard for MP4)
    '-shortest',              // Stop when the shortest stream ends
    '-movflags', '+faststart',// Optimize for web playback
    outputPath                // Output file
  ]);

  // Log FFmpeg output (optional, for debugging)
  ffmpeg.stderr.on('data', (data) => {
    // console.log(`FFmpeg: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log('Merge successful, sending file...');
      
      // 3. Send the file back to the App
      res.download(outputPath, 'merged_video.mp4', (err) => {
        // 4. Cleanup temp files after sending
        cleanup([videoPath, outputPath]);
        if (err) console.error("Error sending file:", err);
      });
    } else {
      console.error('FFmpeg failed with code', code);
      cleanup([videoPath]);
      res.status(500).send('Video processing failed');
    }
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg spawn error:', err);
    cleanup([videoPath]);
    res.status(500).send('System error');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Video Merger Service running on port ${PORT}`);
});
