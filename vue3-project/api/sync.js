// api/sync.js - 正确的 ESM 语法
export default async function handler(req, res) {
  // 设置 CORS 和 JSON 响应头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { BIN_ID, API_KEY } = process.env;
    if (!BIN_ID || !API_KEY) {
      throw new Error('Missing environment variables');
    }

    const url = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    if (req.method === 'GET') {
      const response = await fetch(url, {
        headers: { 'X-Master-Key': API_KEY },
      });
      const data = await response.json();
      return res.status(200).json(data.record);
    }

    if (req.method === 'PUT') {
      const { tasks } = req.body;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify({ tasks }),
      });
      const data = await response.json();
      return res.status(200).json(data.record);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}