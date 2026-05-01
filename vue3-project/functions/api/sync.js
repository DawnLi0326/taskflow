export async function onRequest(context) {
  const { request, env } = context;

  const BIN_ID = env.BIN_ID;
  const API_KEY = env.API_KEY;

  if (!BIN_ID || !API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

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
      console.log('🔄 GET /api/sync - Fetching from JSONBin:', JSONBIN_URL);

      const resp = await fetch(JSONBIN_URL, {
        headers: { 'X-Master-Key': API_KEY },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('❌ JSONBin GET failed:', resp.status, errorText);
        return new Response(JSON.stringify({ error: `JSONBin error: ${resp.status}` }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const data = await resp.json();
      const tasks = data.record?.tasks || [];

      console.log('✅ GET /api/sync - Found', tasks.length, 'tasks');

      return new Response(JSON.stringify({ tasks }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (request.method === 'PUT') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        console.error('❌ Invalid JSON body:', e.message);
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const { tasks } = body;

      if (!Array.isArray(tasks)) {
        return new Response(JSON.stringify({ error: 'tasks must be an array' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      console.log('🔄 PUT /api/sync - Saving', tasks.length, 'tasks to JSONBin');

      const resp = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify({ tasks }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('❌ JSONBin PUT failed:', resp.status, errorText);
        return new Response(JSON.stringify({ error: `JSONBin error: ${resp.status}` }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const data = await resp.json();
      const savedTasks = data.record?.tasks || [];

      console.log('✅ PUT /api/sync - Successfully saved');

      return new Response(JSON.stringify({ tasks: savedTasks }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('❌ Server error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}