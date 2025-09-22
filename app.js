const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const twilio = require("twilio");

const app = express();
const port = 3000;

// ---------------- GEMINI CONFIG ----------------
const genAI = new GoogleGenerativeAI("AIzaSyDt5fYfAIbBu1YjrdL1sdHRAECS1UnYFVs");

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Multer for image uploads
const upload = multer({ dest: "uploads/" });

// Build prompt with language context
function buildPrompt(language, userText) {
  return `
  You are an AI assistant specialized only in:
  1. Agriculture and farming in India
  2. Indian government schemes
  3. Weather in India
  4. Mandi (market) prices

  Response Rules:
  - Always greet politely at the start in ${language}.
  - Always respond in ${language}.
  - Keep the answer short (max 4–5 lines).
  - If outside topics, reply: "माफ़ कीजिए, मैं केवल कृषि, सरकारी योजनाएँ, मौसम और मंडी भाव से जुड़े सवालों का उत्तर दे सकता हूँ।"

  Question: ${userText}
  `;
}

// 📌 Text-only endpoint
app.post("/ask", async (req, res) => {
  try {
    const { userText, language } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent(buildPrompt(language, userText));
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get response" });
  }
});

// 📌 Image + text endpoint
app.post("/ask-image", upload.single("image"), async (req, res) => {
  try {
    const { userText, language } = req.body;
    const filePath = req.file.path;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imageData = {
      inlineData: {
        data: fs.readFileSync(filePath).toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const result = await model.generateContent([
      { text: buildPrompt(language, userText) },
      imageData,
    ]);

    fs.unlinkSync(filePath); // cleanup
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// ---------------- TWILIO CONFIG ----------------
// Put your Twilio credentials in environment variables (.env)
// 🔑 Twilio credentials (HARD-CODED)
const accountSid = "ACaf4eaea2623629c862002c6f325ada33";   // Your Twilio Account SID
const authToken = "85ae55a65e1e697ac8b34d00a72112e7";               // Your Twilio Auth Token
const twilioNumber = "+19802762434";                    // Your Twilio purchased number
const agentNumber = "+17622488436";                    // The agent’s real mobile/landline


const client = twilio(accountSid, authToken);

// 📌 Route to initiate call
app.post("/call", async (req, res) => {
  try {
    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml", // can be replaced by your own TwiML
      to: agentNumber,
      from: twilioNumber,
    });
    res.json({ success: true, sid: call.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Call failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
