const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const twilio = require("twilio");

const app = express();
const port = 3000;

// 🌐 Middleware
app.use(express.json());
app.use(express.static("public"));

// 🔑 Gemini setup
const genAI = new GoogleGenerativeAI("AIzaSyDt5fYfAIbBu1YjrdL1sdHRAECS1UnYFVs");

// ☎️ Twilio setup (hardcoded for now)
const accountSid = "ACaf4eaea2623629c862002c6f325ada33";
const authToken = "85ae55a65e1e697ac8b34d00a72112e7";
const twilioNumber = "+19802762434"; // Your purchased Twilio number
const agentNumber = "+17622488436"; // Agent / your personal number
const client = twilio(accountSid, authToken);

// 📂 Multer for uploads
const upload = multer({ dest: "uploads/" });

// 📝 Build prompt for Gemini
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

// 📌 Text-only chatbot
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

// 📌 Chat with image
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

// 📌 Twilio Call
app.post("/make-call", async (req, res) => {
  try {
    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml", // You can replace with your custom TwiML
      to: agentNumber,
      from: twilioNumber,
    });

    res.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error("Twilio Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
