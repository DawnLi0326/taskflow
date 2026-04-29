// api/sync.js
// Vercel Serverless Function - JSONBin 数据同步代理
// 作用：隐藏 API Key，所有请求通过此代理转发到 JSONBin

/**
 * JSONBin 同步处理函数
 * GET: 从 JSONBin 读取数据
 * PUT: 将数据写入 JSONBin
 * OPTIONS: 处理 CORS 预检请求
 */

const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b'

async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 获取环境变量
  const BIN_ID = process.env.BIN_ID
  const API_KEY = process.env.API_KEY

  // 验证环境变量
  if (!BIN_ID || !API_KEY) {
    console.error('缺少环境变量: BIN_ID 或 API_KEY')
    return res.status(500).json({
      error: '服务器配置错误：缺少必要的环境变量'
    })
  }

  const JSONBIN_URL = `${JSONBIN_BASE_URL}/${BIN_ID}`
  const headers = {
    'X-Master-Key': API_KEY,
    'Content-Type': 'application/json'
  }

  try {
    // GET 请求 - 从 JSONBin 读取数据
    if (req.method === 'GET') {
      console.info('📥 代理：从云端拉取数据')

      const response = await fetch(`${JSONBIN_URL}/latest`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ JSONBin GET 失败:', response.status, errorText)
        return res.status(response.status).json({
          error: `获取数据失败: ${response.status}`
        })
      }

      const data = await response.json()
      console.info('✅ 代理：成功获取云端数据')

      // 返回 record 字段（包含实际数据）
      return res.status(200).json(data.record || data)
    }

    // PUT 请求 - 将数据写入 JSONBin
    if (req.method === 'PUT') {
      const tasks = req.body?.tasks

      if (!tasks || !Array.isArray(tasks)) {
        console.error('❌ 代理：请求体缺少有效的 tasks 数组')
        return res.status(400).json({
          error: '请求体必须包含 tasks 数组'
        })
      }

      console.info('📤 代理：同步数据到云端，共', tasks.length, '条任务')

      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tasks })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ JSONBin PUT 失败:', response.status, errorText)
        return res.status(response.status).json({
          error: `保存数据失败: ${response.status}`
        })
      }

      const result = await response.json()
      console.info('✅ 代理：成功同步数据到云端')

      return res.status(200).json(result)
    }

    // 其他方法返回 405
    console.warn('⚠️ 代理：不支持的方法', req.method)
    return res.status(405).json({
      error: `不支持的请求方法: ${req.method}`
    })

  } catch (error) {
    console.error('❌ 代理：服务器错误', error.message)
    return res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    })
  }
}

module.exports = handler
