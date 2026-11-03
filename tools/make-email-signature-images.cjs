// Builds the small PNG images used by the email signature (public/email/).
// Email programs don't reliably show SVG, so each icon is drawn once here and
// saved as a PNG at 2x size for sharp display on phones and retina screens.
// Run with: node tools/make-email-signature-images.cjs
const { chromium } = require('playwright');
const path = require('path');

const MAROON = '#751726';
const out = path.join(__dirname, '..', 'public', 'email');

// Social icons: white symbol in a maroon circle (shown at 28px).
const social = {
  instagram: `<rect x="7" y="7" width="14" height="14" rx="4" fill="none" stroke="#fff" stroke-width="1.8"/>
    <circle cx="14" cy="14" r="3.4" fill="none" stroke="#fff" stroke-width="1.8"/>
    <circle cx="18.2" cy="9.8" r="1.1" fill="#fff"/>`,
  x: `<path d="M8.5 8h3.4l3 4.2L18.6 8h1.6l-4.6 5.3L20.5 20h-3.4l-3.3-4.6L9.8 20H8.2l4.9-5.6z" fill="#fff"/>`,
};
// Small contact icons: maroon line drawings (shown at 14px).
const contact = {
  globe: `<circle cx="14" cy="14" r="10" fill="none" stroke="${MAROON}" stroke-width="2.2"/>
    <ellipse cx="14" cy="14" rx="4.5" ry="10" fill="none" stroke="${MAROON}" stroke-width="2"/>
    <path d="M4.5 11h19M4.5 17h19" stroke="${MAROON}" stroke-width="2"/>`,
  mail: `<rect x="3.5" y="6.5" width="21" height="15" rx="2" fill="none" stroke="${MAROON}" stroke-width="2.2"/>
    <path d="M4.5 8l9.5 7 9.5-7" fill="none" stroke="${MAROON}" stroke-width="2.2"/>`,
  pin: `<path d="M14 25s-7.5-8-7.5-13.2a7.5 7.5 0 0 1 15 0C21.5 17 14 25 14 25z" fill="none" stroke="${MAROON}" stroke-width="2.2"/>
    <circle cx="14" cy="11.8" r="2.8" fill="none" stroke="${MAROON}" stroke-width="2"/>`,
  phone: `<path d="M8 4.5h3.5l1.8 5-2.4 1.6a12 12 0 0 0 6 6l1.6-2.4 5 1.8V20a3 3 0 0 1-3 3A16.5 16.5 0 0 1 5 7.5a3 3 0 0 1 3-3z" fill="none" stroke="${MAROON}" stroke-width="2.2" stroke-linejoin="round"/>`,
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  async function render(name, inner, px, circle) {
    const bg = circle ? `<circle cx="14" cy="14" r="14" fill="${MAROON}"/>` : '';
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">
      <svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 28 28">${bg}${inner}</svg></body></html>`);
    await page.locator('svg').screenshot({ path: path.join(out, `${name}.png`), omitBackground: true });
  }
  for (const [n, s] of Object.entries(social)) await render(n, s, 56, true);
  for (const [n, s] of Object.entries(contact)) await render(n, s, 28, false);
  await browser.close();
})();
