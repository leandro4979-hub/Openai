// index.js
const core = require('@actions/core');
const fetch = require('node-fetch');

async function run() {
  try {
    const apiKey = core.getInput('fal_key');
    const prompt = core.getInput('prompt');
    const subjectId = core.getInput('subject_id');

    // Your Gemini API call (or FAL.ai) – modify as needed
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, subject_id: subjectId })
    });
    const data = await response.json();
    const imageUrl = data.imageUrl || data.url; // adjust based on actual response

    core.setOutput('image_url', imageUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}
{
  "name": "nexus-omni-engine",
  "main": "index.js",
  "dependencies": {
    "@actions/core": "^1.10.0",
    "node-fetch": "^2.6.7"
  }
}
run();