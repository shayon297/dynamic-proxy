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

    // Test different Dynamic API endpoint variations
    console.log('🔍 Testing various Dynamic API endpoints...');
    
    const endpoints = [
      'https://app.dynamic.xyz/api/v0/users',
      'https://api.dynamic.xyz/v0/users', 
      'https://app.dynamic.xyz/api/users',
      'https://api.dynamic.xyz/users'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`🧪 Testing endpoint: ${endpoint}`);
      try {
        const testResp = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${secret}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, environmentId: envId })
        });
        
        console.log(`📧 ${endpoint} - Status: ${testResp.status}`);
        const responseText = await testResp.text();
        console.log(`📧 ${endpoint} - Body: ${responseText.substring(0, 200)}...`);
        
        if (testResp.ok) {
          console.log(`✅ SUCCESS with endpoint: ${endpoint}`);
          return ok(res, { 
            success: true, 
            endpoint: endpoint,
            status: testResp.status,
            response: responseText,
            message: 'Found working endpoint!'
          });
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
    
    // If we get here, none of the endpoints worked
    return fail(res, 'All Dynamic API endpoints returned 404 - check environment ID or API key permissions');
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
