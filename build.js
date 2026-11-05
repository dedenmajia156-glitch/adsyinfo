const fs = require('fs');

const helpers = `
function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': \`Bearer \${token || SUPABASE_ANON_KEY}\`,
    'Prefer': 'return=representation'
  };
}

async function sbGet(path, query = '', token) {
  const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${path}\${query}\`, { headers: getHeaders(token) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbPost(table, body, token) {
  const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\`, {
    method: 'POST', headers: getHeaders(token), body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbPatch(table, query, body, token) {
  const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\${query}\`, {
    method: 'PATCH',
    headers: { ...getHeaders(token), 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbDelete(table, query, token) {
  const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\${query}\`, {
    method: 'DELETE', headers: getHeaders(token)
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbCount(table, query, token) {
  const r = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\${query}\`, {
    headers: { ...getHeaders(token), 'Prefer': 'count=exact', 'Range': '0-0' }
  });
  if (!r.ok) throw new Error(await r.text());
  const range = r.headers.get('content-range') || '';
  const match = range.match(/\\/(\\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

async function authSignIn(email, password) {
  const r = await fetch(\`\${SUPABASE_URL}/auth/v1/token?grant_type=password\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error_description || e.msg || 'Login gagal'); }
  return r.json();
}

async function authSignUp(email, password) {
  const r = await fetch(\`\${SUPABASE_URL}/auth/v1/signup\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error_description || e.msg || 'Registrasi gagal'); }
  return r.json();
}

async function authGetUser() {
  const token = getToken();
  if (!token) return null;
  const r = await fetch(\`\${SUPABASE_URL}/auth/v1/user\`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${token}\` }
  });
  if (!r.ok) return null;
  return r.json();
}

async function authSignOut() {
  const token = getToken();
  if (token) {
    await fetch(\`\${SUPABASE_URL}/auth/v1/logout\`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': \`Bearer \${token}\` }
    });
  }
  localStorage.removeItem('kpi_session');
}

function saveSession(session) {
  localStorage.setItem('kpi_session', JSON.stringify({
    access_token: session.access_token,
    user_id: session.user.id
  }));
}

function getToken() {
  try { return JSON.parse(localStorage.getItem('kpi_session'))?.access_token; } catch { return null; }
}

function getUserId() {
  try { return JSON.parse(localStorage.getItem('kpi_session'))?.user_id; } catch { return null; }
}

function isLoggedIn() { return !!getToken(); }
`.trim();

fs.writeFileSync('js/config.js',
  `const SUPABASE_URL="${process.env.SUPABASE_URL||''}";` +
  `const SUPABASE_ANON_KEY="${process.env.SUPABASE_ANON_KEY||''}";\n` +
  helpers
);
console.log('config.js generated successfully');
