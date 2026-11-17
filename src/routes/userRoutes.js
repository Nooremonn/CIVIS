const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMe, updateMe, updateLocation, saveFcmToken } = require('../controllers/userController');

router.use(auth); // every route below needs a valid token

router.get('/me', getMe);
router.patch('/me', updateMe);
router.post('/location', updateLocation);
router.post('/fcm-token', saveFcmToken);

module.exports = router;
