const http = require('http');

function testURL(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET'
    };

    console.log(`\n🔍 Testing ${description}: http://localhost:3002${path}`);

    const req = http.request(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Content Length: ${data.length} characters`);
        if (data.length > 0) {
          console.log(`   First 100 chars: ${data.substring(0, 100).replace(/\n/g, '\\n')}`);
        }
        
        if (res.statusCode === 200) {
          console.log(`   ✅ ${description} is accessible`);
        } else {
          console.log(`   ❌ ${description} returned status ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Error accessing ${description}: ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`   ⏰ Timeout accessing ${description}`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing server responses...\n');
  
  await testURL('/', 'Root URL');
  await testURL('/admin-login.html', 'Admin Login Page');
  await testURL('/admin-dashboard.html', 'Admin Dashboard Page');
  await testURL('/index.html', 'Index Page');
  
  console.log('\n✅ All tests completed!');
}

runTests();