const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utilites/appError.util');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });


const fileFilter = (req,file,cb)=>{
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedFiles= ['.png','.jpg','.jpeg'];
    if(!allowedFiles.includes(ext)){
      return  cb(new AppError('Only images allowed .png,.jpg,.jpeg', 400),false)
    }
    cb(null, true);
}

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null, UPLOAD_DIR)
    },
    filename:(req,file,cb)=>{
        cb(null, Date.now() + '_' + file.originalname.replace(/[^\w.\-]/g, '_'));
    }
})
const MB = 1024 * 1024
const upload = multer({
    storage,
    fileFilter,
    limits:{fileSize: 2 * MB}
});

module.exports = {upload};