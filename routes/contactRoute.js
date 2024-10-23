const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  findDuplicates,
  mergeContacts,
  exportContacts,
  importContacts,
} = require("../controllers/contactController");

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== ".vcf") {
      return cb(new Error("Only VCF files are allowed!"), false);
    }
    cb(null, true);
  },
});

// router.post("/upload", upload.single("contactFile"), importContacts);
router.get("/", getContacts);
router.post("/save", addContact);
router.post("/update", updateContact);
router.post("/delete", deleteContact);
router.get("/duplicates", findDuplicates);
router.post("/merge", mergeContacts);
router.get("/export", exportContacts);
router.post("/import", upload.single("file"), importContacts);

module.exports = router;
