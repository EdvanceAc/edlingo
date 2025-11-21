const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
});
  const page = await browser.newPage();
  await page.goto('http://localhost:3002/admin');

  // Check for login form
  let needsLogin = false;
  try {
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    needsLogin = true;
  } catch (e) {
    console.log('No login form detected.');
  }

  if (needsLogin) {
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    console.log('Logged in.');
  }

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Click the first Edit button using evaluation
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (let btn of buttons) {
      if (btn.textContent.trim() === 'Edit') {
        btn.click();
        return;
      }
    }
  });

  // Check if modal appears
  try {
    await page.waitForSelector('div.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 5000 });
    console.log('Modal appeared successfully.');
  } catch (e) {
    console.log('Modal did not appear.');
  }

  await browser.close();
})();