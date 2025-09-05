export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
  const secret = process.env.DYNAMIC_SECRET_KEY;
  
  return res.status(200).json({
    success: true,
    message: 'API is working',
    method: req.method,
    hasEnvId: !!envId,
    hasSecret: !!secret,
    envIdPreview: envId ? envId.substring(0, 8) + '...' : 'missing'
  });
}
