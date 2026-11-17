const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { createReport, getMyReports, getReportById } = require('../controllers/reportController');

router.use(auth);

router.post('/', upload.single('image'), createReport);
router.get('/my', getMyReports); // must be before '/:id'
router.get('/:id', getReportById);

module.exports = router;
