const prisma = require('../../config/database');
const axios  = require('axios');

const evoConfig = async () => {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { in: ['evolution_api_url', 'evolution_api_key'] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    url: map['evolution_api_url'] || process.env.EVOLUTION_API_URL || '',
    key: map['evolution_api_key'] || process.env.EVOLUTION_API_KEY || '',
  };
};

const evoHttp = async () => {
  const { url, key } = await evoConfig();
  if (!url || !key) throw new Error('Evolution API not configured');
  return { url, key, headers: { apikey: key, 'Content-Type': 'application/json' } };
};

// Derive a stable instance name from org id (max 32 chars, alphanumeric + dash)
const instanceName = (orgId) => `org-${orgId}`.slice(0, 32);

// ── GET /api/whatsapp/status ──────────────────────────────────────────────────
const getStatus = async (req, res) => {
  try {
    const { url, headers } = await evoHttp();
    const name = req.organization.evolutionInstance || instanceName(req.organization.id);

    const r = await axios.get(`${url}/instance/connectionState/${name}`, { headers, timeout: 8000 });
    const state = r.data?.instance?.state || r.data?.state || 'close';

    res.json({ instance: name, state, connected: state === 'open' });
  } catch (err) {
    if (err.response?.status === 404) return res.json({ instance: null, state: 'not_created', connected: false });
    console.error('[WA status]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/whatsapp/qr ──────────────────────────────────────────────────────
const getQr = async (req, res) => {
  try {
    const { url, key, headers } = await evoHttp();
    const name = instanceName(req.organization.id);

    try {
      await axios.post(`${url}/instance/create`, {
        instanceName: name,
        token: key,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }, { headers, timeout: 10000 });
    } catch (createErr) {
      if (createErr.response?.status !== 409 && createErr.response?.status !== 400) {
        throw createErr;
      }
    }

    const qrRes = await axios.get(`${url}/instance/connect/${name}`, { headers, timeout: 10000 });
    const base64 = qrRes.data?.base64 || qrRes.data?.qrcode?.base64 || null;

    if (!base64) return res.status(202).json({ message: 'QR not ready yet, try again in 2s', instance: name });

    res.json({ instance: name, base64 });
  } catch (err) {
    console.error('[WA qr]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/whatsapp/confirm ─────────────────────────────────────────────────
const confirmConnected = async (req, res) => {
  try {
    const { url, headers } = await evoHttp();
    const name = instanceName(req.organization.id);

    const r = await axios.get(`${url}/instance/connectionState/${name}`, { headers, timeout: 8000 });
    const state = r.data?.instance?.state || r.data?.state || 'close';

    if (state !== 'open') return res.status(400).json({ message: 'Not connected yet', state });

    await prisma.organization.update({
      where: { id: req.organization.id },
      data: { evolutionInstance: name },
    });

    res.json({ success: true, instance: name });
  } catch (err) {
    console.error('[WA confirm]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/whatsapp/disconnect ───────────────────────────────────────────
const disconnect = async (req, res) => {
  try {
    const { url, headers } = await evoHttp();
    const name = req.organization.evolutionInstance || instanceName(req.organization.id);

    try {
      await axios.delete(`${url}/instance/delete/${name}`, { headers, timeout: 8000 });
    } catch (delErr) {
      if (delErr.response?.status !== 404) throw delErr;
    }

    await prisma.organization.update({
      where: { id: req.organization.id },
      data: { evolutionInstance: null },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[WA disconnect]', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStatus, getQr, confirmConnected, disconnect };
