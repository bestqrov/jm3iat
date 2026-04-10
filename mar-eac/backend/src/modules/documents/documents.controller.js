const prisma = require('../../config/database');
const fs = require('fs');
const path = require('path');

const getAll = async (req, res) => {
  try {
    const { type, meetingId, projectId } = req.query;
    const where = { organizationId: req.organization.id };

    if (type) where.type = type;
    if (meetingId) where.meetingId = meetingId;
    if (projectId) where.projectId = projectId;

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { title, type, meetingId, projectId } = req.body;

    const doc = await prisma.document.create({
      data: {
        organizationId: req.organization.id,
        title: title || req.file.originalname,
        type: type || 'OTHER',
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname,
        size: req.file.size,
        meetingId: meetingId || null,
        projectId: projectId || null,
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const remove = async (req, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Delete physical file
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filename = doc.url.split('/uploads/')[1];
    if (filename) {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const download = async (req, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.organization.id },
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filename = doc.url.split('/uploads/')[1];
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.download(filePath, doc.filename || filename);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getById, upload, remove, download };
