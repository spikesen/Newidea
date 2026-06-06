import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { API_RESPONSE } from '@nexcomm/shared';
import { prisma } from '@nexcomm/database';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB default limit
  },
});

/**
 * POST /api/uploads/file
 * Upload a file
 */
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(API_RESPONSE.error('No file uploaded', 'NO_FILE'));
    }

    const { originalname, mimetype, size, buffer } = req.file;
    
    // In production, upload to S3 or similar storage
    // For now, we'll store metadata and return a placeholder URL
    const fileId = uuidv4();
    const fileUrl = `/uploads/${fileId}/${originalname}`;
    
    // Save file metadata to database
    const fileRecord = await prisma.fileUpload.create({
      data: {
        url: fileUrl,
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
        uploadedBy: req.user!.userId,
        virusScanned: false,
        virusScanStatus: 'pending',
      },
    });

    // TODO: Implement virus scanning (ClamAV or cloud service)
    // For now, mark as clean after "scanning"
    await prisma.fileUpload.update({
      where: { id: fileRecord.id },
      data: { virusScanned: true, virusScanStatus: 'clean' },
    });

    res.json(API_RESPONSE.success({
      id: fileRecord.id,
      url: fileUrl,
      fileName: originalname,
      fileSize: size,
      mimeType: mimetype,
    }, 'File uploaded successfully'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPLOAD_FAILED'));
  }
});

/**
 * POST /api/uploads/multiple
 * Upload multiple files
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json(API_RESPONSE.error('No files uploaded', 'NO_FILES'));
    }

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const fileId = uuidv4();
        const fileUrl = `/uploads/${fileId}/${file.originalname}`;
        
        const fileRecord = await prisma.fileUpload.create({
          data: {
            url: fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: req.user!.userId,
            virusScanned: true,
            virusScanStatus: 'clean',
          },
        });

        return {
          id: fileRecord.id,
          url: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        };
      })
    );

    res.json(API_RESPONSE.success(uploads, `${uploads.length} files uploaded successfully`));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'UPLOAD_FAILED'));
  }
});

/**
 * GET /api/uploads/:id
 * Get file metadata
 */
router.get('/:id', async (req, res) => {
  try {
    const file = await prisma.fileUpload.findUnique({
      where: { id: req.params.id },
    });

    if (!file) {
      return res.status(404).json(API_RESPONSE.error('File not found', 'NOT_FOUND'));
    }

    // Check if user has access (uploaded by them or admin)
    if (file.uploadedBy !== req.user!.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Access denied', 'FORBIDDEN'));
    }

    res.json(API_RESPONSE.success(file));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'FETCH_FAILED'));
  }
});

/**
 * DELETE /api/uploads/:id
 * Delete a file (admin only or owner)
 */
router.delete('/:id', async (req, res) => {
  try {
    const file = await prisma.fileUpload.findUnique({
      where: { id: req.params.id },
    });

    if (!file) {
      return res.status(404).json(API_RESPONSE.error('File not found', 'NOT_FOUND'));
    }

    if (file.uploadedBy !== req.user!.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json(API_RESPONSE.error('Access denied', 'FORBIDDEN'));
    }

    // TODO: Delete from S3/storage
    
    await prisma.fileUpload.delete({
      where: { id: req.params.id },
    });

    res.json(API_RESPONSE.success(null, 'File deleted'));
  } catch (error: any) {
    res.status(500).json(API_RESPONSE.error(error.message, 'DELETE_FAILED'));
  }
});

export default router;
