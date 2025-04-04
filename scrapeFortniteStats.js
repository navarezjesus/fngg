// Filename: fortniteScraper.js (or your preferred name)

// Use standard puppeteer
const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  let browser; // Declare browser outside try block for finally

  try {
    browser = await puppeteer.launch({
      headless: 'new', // Use the new headless mode
      // No 'product: firefox' - we are using the default Chromium

      // Puppeteer *should* find the Snap installation automatically on Ubuntu.
      // If it FAILS to launch, uncomment the line below and try:
      // executablePath: '/snap/bin/chromium',

      // Essential args for running in Docker/servers/headless environments
      args: [
        '--no-sandbox', // Required in many environments, especially non-root
        '--disable-setuid-sandbox', // Additional sandbox disable
        '--disable-dev-shm-usage', // Crucial for Docker and limited /dev/shm environments
        '--disable-gpu', // Often needed for headless, avoids driver issues
        '--window-size=1920,1080', // Set a reasonable window size
        // '--no-zygote', // Can sometimes help with launch issues, try adding if needed
      ],
      // Increase protocol timeout for potentially slower server operations
      protocolTimeout: 60000,
    });

    console.log('Browser launched successfully.');
    const page = await browser.newPage();
    console.log('New page created.');

    // Set longer default timeouts for page operations (in milliseconds)
    page.setDefaultNavigationTimeout(60000); // 60 seconds
    page.setDefaultTimeout(60000); // 60 seconds

    // --- Standard Anti-Detection Measures ---
    // Set a common User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'); // Consider updating Chrome version periodically
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    // Hide the WebDriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // You can add other evasions here if needed later
    });
    // --- End Anti-Detection Measures ---

    const targetUrl = 'https://fortnite.gg/creative?creator=jelty';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      // 'domcontentloaded' is often faster and sufficient if you don't need *all* resources fully loaded
      // Use 'load' or 'networkidle2' if 'domcontentloaded' causes issues finding elements later
      waitUntil: 'domcontentloaded',
    });
    console.log('Page navigation finished.');

    // --- Interaction Logic ---
    console.log("Waiting for the PLAYER COUNT button...");
    // Use a specific selector that's less likely to change
    const playerCountButtonSelector = 'button.accordion-button.collapsed[data-bs-target="#chart-week-multi"]'; // Be more specific if possible
    // Alternative if the above is too strict: '.accordion-header.chart-week-multi-header';
    await page.waitForSelector(playerCountButtonSelector, { visible: true, timeout: 60000 }); // Wait up to 60s
    console.log("PLAYER COUNT button found. Clicking...");
    await page.click(playerCountButtonSelector);
    console.log("PLAYER COUNT button clicked.");

    console.log("Waiting for the table data to load...");
    // Add a small delay AFTER the click, sometimes helps JS render the table
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay

    const tableSelector = '#chart-month-table tbody tr'; // Selector for table rows
    await page.waitForSelector(tableSelector, { timeout: 60000 }); // Wait up to 60s for rows
    console.log('✅ Table rows found.');
    // --- End Interaction Logic ---


    // --- Data Extraction ---
    const tableData = await page.evaluate((selector) => {
      // This code runs in the browser's context
      const rows = Array.from(document.querySelectorAll(selector));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td')); // Get all cells in the row
        // Extract text content from each cell, trimming whitespace
        return cells.map(cell => cell.innerText.trim());
      });
    }, tableSelector); // Pass the selector into the evaluate function

    console.log('📊 Extracted Data:\n', JSON.stringify(tableData, null, 2)); // Pretty print JSON output
    // --- End Data Extraction ---


    // --- Add Your Logic Here ---
    // e.g., Send `tableData` to Notion via n8n HTTP Request node or another API call
    console.log('Script finished successfully. Add logic to send data here.');
    // --- ---

  } catch (err) {
    console.error('❌ Script Failed:', err); // Log the full error

    // Optional: Take a screenshot on error for debugging
    // Ensure 'page' exists before trying to take a screenshot
    if (typeof page !== 'undefined' && page) {
      try {
        const screenshotPath = 'error_screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved as ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError);
      }
    }
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
      console.log("Browser closed.");
    }
  }
})();
