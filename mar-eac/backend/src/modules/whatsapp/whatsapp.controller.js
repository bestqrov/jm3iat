const prisma = require('../../config/database');
const axios  = require('axios');

const evo = () => ({
  url:      process.env.EVOLUTION_API_URL  || '',
  key:      process.env.EVOLUTION_API_KEY  || '',
});

const evoHttp = () => {
  const { url, key } = evo();
  if (!url || !key) throw new Error('Evolution API not configured');
  return { url, headers: { apikey: key, 'Content-Type': 'application/json' } };
};

// Derive a stable instance name from org id (max 32 chars, alphanumeric + dash)
const instanceName = (orgId) => `org-${orgId}`.slice(0, 32);

// ── GET /api/whatsapp/status ──────────────────────────────────────────────────
const getStatus = async (req, res) => {
  try {
    const { url, headers } = evoHttp();
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
// Creates instance if not yet created, then returns QR base64
const getQr = async (req, res) => {
  try {
    const { url, headers } = evoHttp();
    const name = instanceName(req.organization.id);

    // Try to create instance (idempotent — if exists, some versions return 200 anyway)
    try {
      await axios.post(`${url}/instance/create`, {
        instanceName: name,
        token: process.env.EVOLUTION_API_KEY,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }, { headers, timeout: 10000 });
    } catch (createErr) {
      // 409 = already exists — that's fine
      if (createErr.response?.status !== 409 && createErr.response?.status !== 400) {
        throw createErr;
      }
    }

    // Get QR code
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
// Called by frontend after polling confirms state=open → saves instance to org
const confirmConnected = async (req, res) => {
  try {
    const { url, headers } = evoHttp();
    const name = instanceName(req.organization.id);

    const r = await axios.get(`${url}/instance/connectionState/${name}`, { headers, timeout: 8000 });
    const state = r.data?.instance?.state || r.data?.state || 'close';

    if (state !== 'open') return res.status(400).json({ message: 'Not connected yet', state });

    // Save instance name to org
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
    const { url, headers } = evoHttp();
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
