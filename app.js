require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/webhook', async (req, res) => {
  const { challengeCode } = req.query;

  if (challengeCode) {
    // LinkedIn webhook validation
    const challengeResponse = generateChallengeResponse(challengeCode);
    return res.json({ challengeCode, challengeResponse });
  }

  // Process the incoming comment
  const comment = req.body;
  try {
    await processComment(comment);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing comment:', error);
    res.sendStatus(500);
  }
});

async function processComment(comment) {
  // Analyze comment with OpenAI
  const aiResponse = await analyzeWithOpenAI(comment.message.text);
  
  // Post response to LinkedIn
  await postResponseToLinkedIn(comment.object, aiResponse);
}

async function analyzeWithOpenAI(commentText) {
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: `Analyze and respond to this LinkedIn comment: "${commentText}"`,
      max_tokens: 100
    });
    return completion.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    throw error;
  }
}

async function postResponseToLinkedIn(postUrn, responseText) {
  try {
    const response = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${postUrn}/comments`,
      {
        actor: `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`,
        message: {
          text: responseText
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );
    console.log('Response posted successfully:', response.data);
  } catch (error) {
    console.error('Error posting response to LinkedIn:', error.response ? error.response.data : error.message);
    throw error;
  }
}

function generateChallengeResponse(challengeCode) {
  // Implement the challenge response logic as per LinkedIn documentation
  // This is a placeholder and needs to be properly implemented
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.LINKEDIN_CLIENT_SECRET);
  hmac.update(challengeCode);
  return hmac.digest('hex');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));