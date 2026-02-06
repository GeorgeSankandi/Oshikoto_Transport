const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Check file type function
function checkFileType(file, cb) {
  // Allowed extensions: images and PDF
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images or PDFs Only!');
  }
}

// Single upload for Articles/Services
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, 
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('serviceImage'); 

// Multi-field upload for Site Content
const uploadSiteContent = multer({
  storage: storage,
  limits: { fileSize: 5000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).fields([
    // Hero Images
    { name: 'home_hero_image', maxCount: 1 },
    { name: 'about_hero_image', maxCount: 1 },
    { name: 'services_hero_image', maxCount: 1 },
    { name: 'articles_hero_image', maxCount: 1 },
    { name: 'contact_hero_image', maxCount: 1 },
    
    // Service Pillar Images
    { name: 'transport_section_image', maxCount: 1 },
    { name: 'construction_section_image', maxCount: 1 },
    { name: 'technical_section_image', maxCount: 1 },
    { name: 'general_section_image', maxCount: 1 },

    // About/Home About Content
    { name: 'home_about_image', maxCount: 1 },
    { name: 'about_mission_image', maxCount: 1 },
    { name: 'about_vision_image', maxCount: 1 },
    { name: 'about_team_1_image', maxCount: 1 },
    { name: 'about_team_2_image', maxCount: 1 },
    { name: 'about_team_3_image', maxCount: 1 },

    // Fleet PDF Documents
    { name: 'fleet_doc_1', maxCount: 1 },
    { name: 'fleet_doc_2', maxCount: 1 },
    { name: 'fleet_doc_3', maxCount: 1 },
    { name: 'fleet_doc_4', maxCount: 1 },
    { name: 'fleet_doc_5', maxCount: 1 },

    // Featured Projects Portfolio
    { name: 'project1_image', maxCount: 1 },
    { name: 'project2_image', maxCount: 1 },
    { name: 'project3_image', maxCount: 1 }
]);

module.exports = {
    upload,
    uploadSiteContent
};

// Upload configuration for creating/editing a Service including fleet documents
const uploadService = multer({
  storage: storage,
  limits: { fileSize: 5000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).any();

module.exports.uploadService = uploadService;