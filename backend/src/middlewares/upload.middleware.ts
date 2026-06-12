import multer from 'multer';

const avatarStorage = multer.memoryStorage();

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('Chỉ chấp nhận file ảnh.'));
};

export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
