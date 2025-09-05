export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });

  try {
    console.log('✅ Function called with method:', req.method);
    const { email } = req.body || {};
    console.log('✅ Email received:', email);
    if (!email) return res.status(400).json({ success:false, error:'email required' });

    const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
    const secret = process.env.DYNAMIC_SECRET_KEY;
    console.log('✅ Env vars - envId exists:', !!envId, 'secret exists:', !!secret);
    if (!envId || !secret) return res.status(500).json({ success:false, error:'server missing env vars' });

    // Test different Dynamic API endpoints
    console.log('🔍 Testing Dynamic API connectivity...');
    
    // Try the user creation endpoint first
    console.log('📧 Attempting user creation with endpoint: https://app.dynamic.xyz/api/v0/users');
    const testUserResp = await fetch('https://app.dynamic.xyz/api/v0/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${secret}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, environmentId: envId })
    });
    
    console.log('📧 Response status:', testUserResp.status);
    console.log('📧 Response headers:', Object.fromEntries(testUserResp.headers));
    
    const responseText = await testUserResp.text();
    console.log('📧 Response body:', responseText);
    
    if (!testUserResp.ok) {
      return fail(res, `Dynamic API error: ${testUserResp.status} - ${responseText}`);
    }
    
    // For now, just return success with the response we got
    return ok(res, { 
      success: true, 
      debug: true,
      status: testUserResp.status,
      response: responseText,
      message: 'API call successful but needs parsing'
    });
  } catch (e) {
    return fail(res, e?.message || String(e));
  }
}

function ok(res, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(JSON.stringify(body));
}
function fail(res, error) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(500).send(JSON.stringify({ success:false, error }));
}
