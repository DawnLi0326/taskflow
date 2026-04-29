// api/sync.js - Vercel Serverless Function
export default async function handler(req, res) {
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
      console.error('Missing BIN_ID or API_KEY environment variables');
      return res.status(500).json({ error: '服务器配置错误：缺少环境变量' });
    }

    const url = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    if (req.method === 'GET') {
      console.log(`[GET] Fetching from ${url}`);
      const response = await fetch(url, {
        headers: { 'X-Master-Key': API_KEY },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JSONBin GET failed: ${response.status} - ${errorText}`);
        return res.status(response.status).json({ error: `获取数据失败: ${response.status}` });
      }

      const data = await response.json();
      console.log('[GET] Success:', data.record ? `${data.record.length} tasks` : 'empty');
      return res.status(200).json(data.record || []);
    }

    if (req.method === 'PUT') {
      const { tasks } = req.body;
      console.log(`[PUT] Syncing ${tasks?.length || 0} tasks`);

      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: '请求体必须包含 tasks 数组' });
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JSONBin PUT failed: ${response.status} - ${errorText}`);
        return res.status(response.status).json({ error: `保存数据失败: ${response.status}` });
      }

      const result = await response.json();
      console.log('[PUT] Success');
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}