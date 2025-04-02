// Use puppeteer-extra and the stealth plugin
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

// Or stick with regular puppeteer if stealth isn't needed yet
const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  let browser; // Declare browser outside try block for finally
  try {
    browser = await puppeteer.launch({
      product: 'firefox',
      headless: 'new',
      // Increase protocol timeout (e.g., to 60 seconds) for slower servers
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars', // Common argument
        '--disable-dev-shm-usage', // Often needed in Docker/limited environments
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--disable-gpu', // Sometimes helps in headless environments
        '--no-zygote' // Can sometimes help with launch issues
        // Consider removing '--disable-blink-features=AutomationControlled' if stealth plugin is used
      ]
    });

    const page = await browser.newPage();

    // Set longer default timeout for page operations (e.g., 60 seconds)
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    // Spoof browser fingerprinting (keep these)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // evaluateOnNewDocument can be resource intensive, keep if essential
    // If the ProtocolError persists, this might be a contributor on low-resource machines
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // Add other evasions if needed
      // Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      // Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    });

    console.log("Navigating to the page...");
    await page.goto('https://fortnite.gg/creative?creator=jelty', {
      // Try 'domcontentloaded' or 'load' first, less strict than 'networkidle2'
      waitUntil: 'domcontentloaded',
      // timeout: 0 // Keep infinite timeout for goto if necessary, but rely on default nav timeout
    });

    console.log("Page loaded or DOM content loaded!");

    // Add a small delay AFTER navigation sometimes helps ensure scripts have run
    // await new Promise(resolve => setTimeout(resolve, 3000)); // e.g., 3 seconds

    console.log("Waiting for the PLAYER COUNT button...");
    // Use the increased default timeout or set specific longer timeout
    const playerCountButtonSelector = '.accordion-header.chart-week-multi-header';
    await page.waitForSelector(playerCountButtonSelector, { visible: true, timeout: 60000 }); // Wait longer

    console.log("Clicking PLAYER COUNT button...");
    await page.click(playerCountButtonSelector);

    console.log("Waiting for the table to load...");
    // Add a small delay AFTER click sometimes helps dynamic content appear
    // await new Promise(resolve => setTimeout(resolve, 2000)); // e.g., 2 seconds

    const tableSelector = '#chart-month-table tbody tr';
    // Wait longer for table rows to appear after click
    await page.waitForSelector(tableSelector, { timeout: 60000 });
    console.log('✅ Table loaded.');

    const tableData = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(cell => cell.innerText.trim());
      });
    }, tableSelector); // Pass selector to evaluate

    console.log('📊 Extracted Data:\n', tableData);

  } catch (err) {
    console.error('❌ Script Failed:', err); // Log the full error
    // Optional: Take a screenshot on error for debugging
    if (typeof page !== 'undefined' && page) {
        try {
            await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
            console.log('📸 Screenshot saved as error_screenshot.png');
        } catch (screenshotError) {
            console.error('Failed to take screenshot:', screenshotError);
        }
    }
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
})();
