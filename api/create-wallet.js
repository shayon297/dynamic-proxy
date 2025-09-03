export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success:false, error:'email required' });

    const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
    const secret = process.env.DYNAMIC_SECRET_KEY;
    if (!envId || !secret) return res.status(500).json({ success:false, error:'server missing env vars' });

    // 1) Create Dynamic user
    const userResp = await fetch('https://app.dynamic.xyz/api/v0/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({ email, environmentId: envId })
    });
    if (!userResp.ok) return fail(res, await userResp.text());
    const user = await userResp.json();
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
