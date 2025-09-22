const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3000;

// 🔑 Your Gemini API Key
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

    fs.unlinkSync(filePath); // clean up uploaded file

    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process image" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
