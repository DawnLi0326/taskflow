// api/sync.js - JSONBin 数据同步代理
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
      throw new Error('Missing environment variables: BIN_ID or API_KEY');
    }

    const url = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    // 根据 API Key 前缀判断使用哪个请求头
    // $2a$ 开头的是 Access Key，需要使用 X-Access-Key
    // $2b$ 开头的是 Master Key，需要使用 X-Master-Key
    const headers = {
      'Content-Type': 'application/json'
    };

    if (API_KEY.startsWith('$2a$')) {
      // Access Key
      headers['X-Access-Key'] = API_KEY;
    } else {
      // Master Key 或其他类型
      headers['X-Master-Key'] = API_KEY;
    }

    if (req.method === 'GET') {
      console.info('🔄 从 JSONBin 读取数据...');
      const response = await fetch(`${url}/latest`, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('❌ JSONBin GET 失败:', response.status, errorData);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      console.info('✅ JSONBin GET 成功');
      return res.status(200).json(data.record || data);
    }

    if (req.method === 'PUT') {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: '请求体必须包含 tasks 数组' });
      }

      console.info('🔄 写入数据到 JSONBin，共', tasks.length, '条任务');
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('❌ JSONBin PUT 失败:', response.status, errorData);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      console.info('✅ JSONBin PUT 成功');
      return res.status(200).json(data.record || data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ 服务器错误:', error.message);
    return res.status(500).json({ error: error.message });
  }
}