// server.js - simple proxy to OpenAI (Node.js + express)
// Usage:
// 1) npm init -y
// 2) npm install express node-fetch dotenv cors
// 3) create .env with OPENAI_API_KEY=sk-...
// 4) node server.js

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.error('Vui lòng đặt OPENAI_API_KEY trong file .env');
  process.exit(1);
}

app.use(cors()); // cho phép truy cập từ local
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const userMsg = (req.body.message || '').toString().trim();
  if (!userMsg) return res.status(400).json({ error: 'No message' });

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: 'Bạn là trợ lý giáo viên Toán lớp 5, giải thích ngắn gọn, đơn giản, từng bước.' },
        { role: 'user', content: userMsg }
      ],
      max_tokens: 400,
      temperature: 0.2
    };

    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!apiRes.ok) {
      const txt = await apiRes.text();
      console.error('OpenAI error:', txt);
      return res.status(500).json({ error: 'OpenAI error', detail: txt });
    }

    const j = await apiRes.json();
    const reply = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : 'Xin lỗi, không có phản hồi.';
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, ()=> console.log(`Proxy server running on http://localhost:${PORT}`));
