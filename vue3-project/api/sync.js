export default async function handler(req, res) {
  const BIN_ID = process.env.BIN_ID;
  const API_KEY = process.env.API_KEY;
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  // 设置 CORS 头（允许跨域）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(JSONBIN_URL, {
        headers: { 'X-Master-Key': API_KEY },
      });
      const data = await response.json();
      return res.status(200).json({ tasks: data.record.tasks || [] });
    }

    if (req.method === 'PUT') {
      const { tasks } = req.body;
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify({ tasks }),
      });
      const data = await response.json();
      return res.status(200).json({ tasks: data.record.tasks || [] });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}