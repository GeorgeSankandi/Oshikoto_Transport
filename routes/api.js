const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Service = require('../models/Service');

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Handle chat messages
// @route   POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const userQuery = req.body.query;
    if (!userQuery) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    // --- 1. Get Context from the Database ---
    // Search for services that match keywords in the user's query
    const matchingServices = await Service.find(
        { $text: { $search: userQuery } },
        { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(3) // Get the top 3 most relevant services
    .lean();

    let context = "No specific individual service listings found matching the query in the database, but rely on general company knowledge.";
    if (matchingServices.length > 0) {
        context = "Here are some specific database listings that might be relevant: \n" +
            matchingServices.map(s => `- Title: "${s.title}", Category: ${s.category}, Price: N$${s.price}, Description: "${s.description.substring(0, 100)}..."`).join("\n");
    }

    // --- 2. Construct the Prompt for Gemini ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});
    const prompt = `You are the intelligent virtual assistant for **Oshikoto Transport and Investment CC**, a leading Namibian service provider.
    
    **Company Overview:**
    We specialize in:
    1. **Transportation:** Large fleet management, staff transport, and logistics.
    2. **Construction:** Civil and building construction, road works, and renovations.
    3. **Technical Services:** Plumbing, electrical, welding, and mechanical repairs.
    4. **General Supply:** Cleaning, catering, and security services.

    **Your Goal:**
    Provide helpful, professional, and concise answers to client inquiries. You are knowledgeable about Namibian geography (Windhoek, Lafrenz, etc.).

    **Navigation Capabilities:**
    If the user explicitly asks to go to a page, or if the best way to answer is to show them a page, you MUST append a navigation tag at the very end of your response in this format: ||NAVIGATE:/url||
    
    **Valid URLs:**
    - Home: /
    - About Us / Team: /about
    - Contact / Map / Location: /contact
    - News / Articles: /articles
    - Transportation / Fleet: /transportation
    - Construction: /construction
    - Technical / Repairs: /technical
    - General Services / Supply: /general-supply
    - Login: /login
    - Register: /register

    **Context from Database:**
    ---
    ${context}
    ---

    **User's Question:** "${userQuery}"

    **Your Answer (Remember to be polite and append ||NAVIGATE:/url|| ONLY if a page change is helpful):**`;

    // --- 3. Call the Gemini API ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    res.json({ reply: aiText });

  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: 'Something went wrong with the AI assistant.' });
  }
});

module.exports = router;