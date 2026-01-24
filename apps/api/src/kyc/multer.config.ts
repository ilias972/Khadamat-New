import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Multer Configuration pour KYC Uploads
 *
 * Sécurité :
 * - Stockage local dans ./uploads/kyc/
 * - Accepte uniquement images (jpg, jpeg, png, webp)
 * - Limite : 5MB par fichier
 * - Renommage automatique avec UUID
 */
export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/kyc',
    filename: (req, file, callback) => {
      // Générer un nom unique avec UUID
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req, file, callback) => {
    // Accepter uniquement les images
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Format non autorisé. Accepté : JPG, PNG, WebP'),
        false,
      );
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
