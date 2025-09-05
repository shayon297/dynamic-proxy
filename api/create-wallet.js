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

    // 1) Create Dynamic user
    console.log('📧 Creating Dynamic user for:', email);
    const userResp = await fetch('https://app.dynamic.xyz/api/v0/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({ email, environmentId: envId })
    });
    console.log('📧 User creation response status:', userResp.status);
    if (!userResp.ok) {
      const errorText = await userResp.text();
      console.log('❌ User creation failed:', errorText);
      return fail(res, errorText);
    }
    const user = await userResp.json();
    console.log('✅ User created:', user);
    const userId = user?.id || user?.data?.id;

    // 2) Create embedded Solana wallet
    const walletResp = await fetch('https://app.dynamic.xyz/api/v0/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({ userId, chain: 'solana', walletType: 'embedded', environmentId: envId })
    });
    if (!walletResp.ok) return fail(res, await walletResp.text());
    const wallet = await walletResp.json();

    const address = wallet?.address || wallet?.data?.address || wallet?.wallet?.address;
    return ok(res, { success:true, userId, address });
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
