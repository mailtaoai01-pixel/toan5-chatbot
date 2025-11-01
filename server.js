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
  try {
    const userMsg = (req.body.message || '').toString().trim();
    const context = Array.isArray(req.body.context) ? req.body.context : null; // [{id, text, options}]
    const answers = Array.isArray(req.body.answers) ? req.body.answers : null; // [0,null,2,...] or undefined

    if (!userMsg) return res.status(400).json({ error: 'No message' });

    // --- Tạo văn bản tóm tắt ngữ cảnh (những câu học sinh đang làm) ---
    let contextText = '';
    if (context && context.length) {
      contextText += 'Các câu hỏi học sinh đang làm (dạng tóm tắt):\n';
      context.forEach((q, idx) => {
        const opts = Array.isArray(q.options) ? q.options.join(' | ') : '';
        // nếu answers có giá trị cho câu đó, thêm trạng thái
        const ans = (answers && typeof answers[idx] === 'number') ? ` (HS chọn: ${String.fromCharCode(65+answers[idx])})` : '';
        contextText += `${q.id || (idx+1)}. ${q.text}  [${opts}]${ans}\n`;
      });
      contextText += '\n';
    }

    // --- Tạo prompt cho model ---
    // --- Tạo prompt cho model (tùy chỉnh cho học sinh lớp 5) ---
cconst systemPrompt = ``;


const userPrompt = `
${contextText}
Học sinh hỏi: "${userMsg}"
Hãy trả lời thật ngắn gọn, rõ ràng, đúng cấp tiểu học (Toán lớp 5).
`;

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.15
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
    let reply = j.choices?.[0]?.message?.content || 'Xin lỗi, tôi chưa có phản hồi.';

// ⚙️ Làm sạch ký hiệu toán học và các ký tự khó đọc
reply = reply
  .replace(/\\\[.*?\\\]/gs, '')          // bỏ các khối toán kiểu \[ ... \]
  .replace(/\\\((.*?)\\\)/g, '$1')       // bỏ dấu \( \)
  .replace(/\\text\{(.*?)\}/g, '$1')     // bỏ \text{...}
  .replace(/\*\*(.*?)\*\*/g, '$1')       // bỏ **in đậm**
  .replace(/\*/g, '')                    // bỏ dấu * đơn lẻ
  .replace(/\$(.*?)\$/g, '$1')           // bỏ ký hiệu LaTeX $...$
  .replace(/\\[a-zA-Z]+/g, '')           // bỏ các lệnh \alpha, \frac, v.v.
  .replace(/\s+/g, ' ')                  // gọn khoảng trắng
  .trim();

// Gửi phản hồi về client
res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, ()=> console.log(`Proxy server running on http://localhost:${PORT}`));
