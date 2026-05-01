// functions/api/sync.js
export async function onRequest(context) {
  const { request, env } = context;
  const BIN_ID = env.BIN_ID;
  const API_KEY = env.API_KEY;
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    if (request.method === 'GET') {
      const resp = await fetch(JSONBIN_URL, {
        headers: { 'X-Master-Key': API_KEY },
      });
      const data = await resp.json();
      const tasks = data.record?.tasks || [];
      return new Response(JSON.stringify({ tasks }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (request.method === 'PUT') {
      const { tasks } = await request.json();
      const resp = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify({ tasks }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify({ tasks: data.record?.tasks || [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}