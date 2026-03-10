import { chromium, Browser, BrowserContext, Page } from "playwright-core";

const BROWSER_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
  "--disable-dev-shm-usage",
  "--no-sandbox",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
  });

  return browserInstance;
}

export async function createStealthContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  const userAgent =
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "America/New_York",
    geolocation: { latitude: 40.7128, longitude: -74.006 },
    permissions: ["geolocation"],
  });

  // Anti-detection scripts
  await context.addInitScript(() => {
    // Override webdriver
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Chrome runtime
    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {},
      loadTimes: () => ({}),
      csi: () => ({}),
    };

    // Plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    // Languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  return context;
}

export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  return page;
}

export function randomDelay(min = 200, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function humanType(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  await page.click(selector);
  await randomDelay(100, 300);

  for (const char of text) {
    await page.keyboard.type(char, {
      delay: Math.floor(Math.random() * 100) + 30,
    });
  }
}

export async function dismissCookieConsent(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I Accept")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    '[id*="cookie"] button',
    '[class*="cookie"] button',
    '[id*="consent"] button',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await randomDelay(500, 1000);
        return;
      }
    } catch {
      // try next selector
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
