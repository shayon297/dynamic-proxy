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

    // Test Dynamic API endpoints based on JWKS path structure
    console.log('🔍 Testing Dynamic API endpoints for sandbox environment...');
    console.log('🔍 JWKS endpoint confirms envId structure: /api/v0/sdk/{envId}/.well-known/jwks');
    
    const endpoints = [
      // Based on JWKS path pattern, try environment-specific endpoints
      `https://app.dynamic.xyz/api/v0/sdk/${envId}/users`,
      `https://app.dynamic.xyz/api/v0/environments/${envId}/users`,
      // Standard admin endpoints (might need environment in body instead)
      'https://app.dynamic.xyz/api/v0/users',
      'https://api.dynamic.xyz/v0/users'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`🧪 Testing endpoint: ${endpoint}`);
      try {
        const body = endpoint.includes(envId) 
          ? { email } // Environment in URL, just email in body
          : { email, environmentId: envId }; // Environment in body
          
        const testResp = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${secret}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        console.log(`📧 ${endpoint} - Status: ${testResp.status}`);
        const responseText = await testResp.text();
        console.log(`📧 ${endpoint} - Body: ${responseText.substring(0, 200)}...`);
        
        if (testResp.ok) {
          console.log(`✅ SUCCESS with endpoint: ${endpoint}`);
          const userData = JSON.parse(responseText);
          
          // Now try to create a wallet for this user
          const userId = userData?.id || userData?.data?.id || userData?.user?.id;
          if (userId) {
            console.log(`🔑 Creating wallet for user: ${userId}`);
            const walletEndpoint = endpoint.replace('/users', '/wallets');
            const walletResp = await fetch(walletEndpoint, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${secret}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                userId,
                chain: 'solana',
                walletType: 'embedded'
              })
            });
            
            console.log(`🔑 Wallet creation status: ${walletResp.status}`);
            const walletText = await walletResp.text();
            console.log(`🔑 Wallet response: ${walletText.substring(0, 200)}...`);
            
            if (walletResp.ok) {
              const walletData = JSON.parse(walletText);
              const address = walletData?.address || walletData?.data?.address || walletData?.wallet?.address;
              return ok(res, { 
                success: true, 
                userId, 
                address,
                endpoint: endpoint,
                message: 'Dynamic wallet created successfully!'
              });
            } else {
              return ok(res, { 
                success: true, 
                userId,
                endpoint: endpoint,
                userCreated: true,
                walletError: walletText,
                message: 'User created but wallet creation failed'
              });
            }
          }
          
          return ok(res, { 
            success: true, 
            endpoint: endpoint,
            response: responseText,
            message: 'User endpoint works but no userId found'
          });
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
    
    // If we get here, none of the endpoints worked
    return fail(res, 'All Dynamic API endpoints returned 404 - sandbox environment may need domain configuration');
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
