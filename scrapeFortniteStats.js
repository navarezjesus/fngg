const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium', // Path to Chromium
    headless: true, // or false if you want to see the browser UI
    args: ['--no-sandbox'], // Add this line
  });

  const page = await browser.newPage();

  // Spoof browser fingerprinting
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  console.log("Navigating to the page...");
  await page.goto('https://fortnite.gg/creative?creator=jelty', { waitUntil: 'networkidle2', timeout: 0 });

  try {
    console.log("Waiting for PLAYER COUNT button...");
    await page.waitForSelector('.accordion-header.chart-week-multi-header', { timeout: 15000 });
    await page.click('.accordion-header.chart-week-multi-header');

    console.log("Waiting for the table to load...");
    await page.waitForSelector('#chart-month-table tbody tr', { timeout: 15000 });
    console.log("✅ Table loaded.");

    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#chart-month-table tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(cell => cell.innerText.trim());
      });
    });

    console.log("📊 Extracted Data:\n", tableData);
  } catch (err) {
    console.log('❌ Failed:', err.message);
  }

  await browser.close();
})();
