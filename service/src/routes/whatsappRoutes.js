const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.all('/connect', whatsappController.handleConnect);
router.get('/status', whatsappController.handleStatus);
router.post('/disconnect', whatsappController.handleDisconnect);

module.exports = router;
