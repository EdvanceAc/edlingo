// Test script to check admin-login.html accessibility
const http = require('http');

const testUrl = 'http://localhost:3002/admin-login.html';

console.log(`Testing access to: ${testUrl}`);

const req = http.get(testUrl, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ Admin login page is accessible');
            console.log(`Content length: ${data.length} characters`);
            console.log('First 200 characters of response:');
            console.log(data.substring(0, 200));
        } else {
            console.log('❌ Admin login page is not accessible');
            console.log('Response body:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Error accessing admin login page:', err.message);
});

req.setTimeout(5000, () => {
    console.error('❌ Request timeout');
    req.destroy();
});