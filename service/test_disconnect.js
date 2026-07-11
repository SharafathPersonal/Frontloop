require('dotenv').config({ path: '../.env.local' });
const controller = require('./src/controllers/whatsappController.js');

const mockReq = { body: { shop_id: '4ada7745-4bb5-47eb-9e2b-a6fc38ba6238' } };
const mockRes = {
    status: (code) => ({
        json: (data) => console.log('Mock Response:', code, data)
    }),
    json: (data) => console.log('Mock Response:', 200, data)
};

(async () => {
    console.log('Testing handleDisconnect...');
    await controller.handleDisconnect(mockReq, mockRes);
})();
