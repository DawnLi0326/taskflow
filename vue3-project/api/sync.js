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
      console.error('❌ 缺少环境变量: BIN_ID =', BIN_ID, ', API_KEY =', API_KEY ? '[已设置]' : '[未设置]');
      return res.status(500).json({ error: '服务器配置错误：缺少必要的环境变量' });
    }

    const url = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    console.info('📡 JSONBin URL:', url);

    // 根据 API Key 前缀判断使用哪个请求头
    // $2a$ 开头的是 Access Key，需要使用 X-Access-Key
    // $2b$ 开头的是 Master Key，需要使用 X-Master-Key
    const headers = {
      'Content-Type': 'application/json'
    };

    if (API_KEY.startsWith('$2a$')) {
      // Access Key
      headers['X-Access-Key'] = API_KEY;
      console.info('🔑 使用 X-Access-Key (Access Key)');
    } else {
      // Master Key 或其他类型
      headers['X-Master-Key'] = API_KEY;
      console.info('🔑 使用 X-Master-Key (Master Key)');
    }

    // ========== GET 请求 ==========
    if (req.method === 'GET') {
      console.info('🔄 从 JSONBin 读取数据...');
      const response = await fetch(`${url}/latest`, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('❌ JSONBin GET 失败:', response.status, errorData);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();
      console.info('✅ JSONBin GET 成功，数据记录:', data.record ? '存在' : '不存在');
      return res.status(200).json(data.record);
    }

    // ========== PUT 请求 ==========
    if (req.method === 'PUT') {
      const { tasks } = req.body;

      console.info('📋 请求体内容:', JSON.stringify(req.body).substring(0, 200));
      console.info('📋 tasks 类型:', typeof tasks, Array.isArray(tasks));

      if (!tasks || !Array.isArray(tasks)) {
        console.warn('⚠️ 请求体格式错误，缺少 tasks 数组');
        return res.status(400).json({ error: '请求体必须包含 tasks 数组' });
      }

      console.info('🔄 写入数据到 JSONBin，共', tasks.length, '条任务');
      console.debug('📋 待写入数据:', JSON.stringify(tasks).substring(0, 300));

      // PUT 请求：直接使用基础 URL，不需要 /latest
      // JSONBin v3 API 会自动更新该 Bin 的数据
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tasks }),
      });

      console.info('📡 JSONBin PUT 响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ JSONBin PUT 失败:', response.status, errorText);
        return res.status(response.status).json({ error: `保存数据失败: ${response.status}`, details: errorText });
      }

      const result = await response.json();
      console.info('✅ JSONBin PUT 成功');
      console.debug('📦 PUT 结果:', JSON.stringify(result).substring(0, 200));

      return res.status(200).json(result);
    }

    // ========== 其他方法 ==========
    console.warn('⚠️ 不支持的请求方法:', req.method);
    return res.status(405).json({ error: `不支持的请求方法: ${req.method}` });

  } catch (error) {
    console.error('❌ 服务器错误:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    return res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
}