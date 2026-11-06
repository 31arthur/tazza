/// <reference types="node" />
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Plugin } from 'vite';
import puppeteer, { type Browser } from 'puppeteer-core';

/**
 * Dev-server companion that turns an edition into a PDF or page images with a real Chromium,
 * the engine that already shapes Telugu correctly on screen, so the file matches the preview.
 *
 * The app posts an edition bundle; the companion opens the app's /render page in a clean
 * headless browser, hands it the bundle, waits for fonts and pictures, then prints or captures.
 * Set CHROME_PATH to use a specific Chrome, Edge or Chromium.
 */

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const findChrome = (): string | undefined => {
  const fromEnv = process.env['CHROME_PATH'];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return CANDIDATES.find((p) => existsSync(p));
};

const readBody = (req: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

declare global {
  interface Window {
    __tazzaReady?: boolean;
    __tazzaImport?: (bundleJson: string) => Promise<void>;
  }
}

export function exportCompanion(): Plugin {
  let browser: Browser | undefined;

  const launch = async (): Promise<Browser> => {
    if (browser?.connected) return browser;
    const executablePath = findChrome();
    if (!executablePath) {
      throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its location.');
    }
    browser = await puppeteer.launch({ executablePath, headless: true });
    return browser;
  };

  return {
    name: 'tazza-export-companion',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__tazza/export', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        const url = new URL(req.url ?? '/', 'http://localhost');
        const format = url.searchParams.get('format') === 'png' ? 'png' : 'pdf';
        const marks = url.searchParams.get('marks') === '1';
        const pageNumber = Number(url.searchParams.get('page') ?? '1');
        const address = server.httpServer?.address() as AddressInfo | null;
        if (!address) {
          res.statusCode = 500;
          res.end('The dev server address is unknown.');
          return;
        }

        const bundle = await readBody(req);
        let page;
        try {
          page = await (await launch()).newPage();
          await page.setViewport({ width: 1300, height: 1700, deviceScaleFactor: 2 });
          await page.goto(`http://localhost:${address.port}/render?marks=${marks ? 1 : 0}`, {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForFunction(() => typeof window.__tazzaImport === 'function', {
            timeout: 30_000,
          });
          await page.evaluate((json) => window.__tazzaImport?.(json), bundle);
          await page.waitForFunction(() => window.__tazzaReady === true, { timeout: 60_000 });

          if (format === 'pdf') {
            const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
            res.setHeader('Content-Type', 'application/pdf');
            res.end(Buffer.from(pdf));
          } else {
            const target = await page.$(`#page-${pageNumber} .page-scale`);
            if (!target) throw new Error(`Page ${pageNumber} was not found.`);
            const png = await target.screenshot({ type: 'png' });
            res.setHeader('Content-Type', 'image/png');
            res.end(Buffer.from(png));
          }
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(error instanceof Error ? error.message : String(error));
        } finally {
          await page?.close().catch(() => undefined);
        }
      });

      server.httpServer?.once('close', () => void browser?.close());
    },
  };
}
