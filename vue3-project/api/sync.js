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
    const { BIN_ID, API_KEY, API_KEY_TYPE = 'master' } = process.env;

    // 验证环境变量
    if (!BIN_ID || !API_KEY) {
      console.error('❌ 缺少环境变量: BIN_ID 或 API_KEY');
      return res.status(500).json({
        error: '服务器配置错误：缺少必要的环境变量',
        details: '请在 Vercel 后台配置 BIN_ID 和 API_KEY'
      });
    }

    // 确定使用哪个 header
    const headerName = API_KEY_TYPE.toLowerCase() === 'access'
      ? 'X-Access-Key'
      : 'X-Master-Key';

    console.log(`🔧 配置信息: BIN_ID=${BIN_ID.slice(0, 8)}..., KeyType=${headerName}`);

    const url = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
    const headers = { [headerName]: API_KEY };

    if (req.method === 'GET') {
      console.log(`[GET] 正在从 JSONBin 获取数据...`);
      const response = await fetch(`${url}/latest`, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '未知错误' }));
        console.error(`❌ JSONBin GET 失败: ${response.status} - ${JSON.stringify(errorData)}`);

        const errorMessages = {
          401: 'API Key 无效或 Bin 不属于您的账户',
          404: 'Bin ID 不存在',
          429: '请求过于频繁，请稍后重试',
        };

        return res.status(response.status).json({
          error: errorMessages[response.status] || `获取数据失败: ${response.status}`,
          details: errorData.message
        });
      }

      const data = await response.json();
      const taskCount = data.record && Array.isArray(data.record) ? data.record.length : 0;
      console.log(`✅ GET 成功: ${taskCount} 条任务`);
      return res.status(200).json(data.record || []);
    }

    if (req.method === 'PUT') {
      const { tasks } = req.body;
      console.log(`[PUT] 正在同步 ${tasks?.length || 0} 条任务...`);

      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: '请求体必须包含 tasks 数组' });
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '未知错误' }));
        console.error(`❌ JSONBin PUT 失败: ${response.status} - ${JSON.stringify(errorData)}`);

        const errorMessages = {
          401: 'API Key 无效或 Bin 不属于您的账户',
          403: '没有写入权限',
          404: 'Bin ID 不存在',
        };

        return res.status(response.status).json({
          error: errorMessages[response.status] || `保存数据失败: ${response.status}`,
          details: errorData.message
        });
      }

      const result = await response.json();
      console.log('✅ PUT 成功');
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: '不支持的请求方法' });
  } catch (error) {
    console.error('❌ 服务器错误:', error);
    return res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
}