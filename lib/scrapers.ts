import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * NOTE: This code is designed to run on a Node.js SERVER.
 * If run in the browser, it will fail due to CORS (Cross-Origin Resource Sharing) policies.
 * Vinted and eBay block direct browser requests from other domains.
 */

// User-Agent rotation to avoid simple blocking
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Zustand-Mapping: Vinted → Standardisiert
 */
function mapVintedCondition(vintedCondition: string): string {
  const normalized = vintedCondition.toLowerCase();
  if (normalized.includes('neu') && normalized.includes('etikett')) return 'Neu mit Etikett';
  if (normalized.includes('neu')) return 'Neu';
  if (normalized.includes('sehr gut')) return 'Sehr gut';
  if (normalized.includes('gut')) return 'Gut';
  if (normalized.includes('akzeptabel')) return 'Akzeptabel';
  return 'Gebraucht';
}

/**
 * Scraped Vinted Katalog-URLs direkt (z.B. für spezifische Kategorien)
 * Mit Rate Limiting um Bot-Schutz zu umgehen
 */
export const scrapeVintedCatalogUrl = async (catalogUrl: string) => {
  try {
    // Rate Limiting: 2-5 Sekunden Delay zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    const { data } = await axios.get(catalogUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.vinted.de/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(data);
    const items: any[] = [];

    // Vinted Selektoren - mehrere Varianten für Robustheit
    // Vinted nutzt verschiedene Selektoren je nach Seite
    const selectors = [
      '.feed-grid__item',
      '[data-testid="item-box"]',
      '.item-box',
      '.new-item-box',
      'article[data-testid="item-box"]'
    ];

    let foundItems = false;
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        foundItems = true;
        elements.each((_, element) => {
          const $el = $(element);
          
          // Titel extrahieren
          const title = $el.find('[data-testid="item-box-title"], .item-box__title, h3').first().text().trim();
          
          // Preis extrahieren
          const priceText = $el.find('[data-testid="item-box-price"], .item-box__price, .price').first().text().trim();
          const priceMatch = priceText.match(/[\d,]+/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : null;
          
          // URL extrahieren
          const relativeUrl = $el.find('a').first().attr('href');
          const url = relativeUrl 
            ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.vinted.de${relativeUrl}`)
            : null;
          
          // Bild extrahieren
          const img = $el.find('img').first().attr('src') || 
                      $el.find('img').first().attr('data-src') ||
                      $el.find('img').first().attr('data-lazy-src') ||
                      '';
          
          // Zustand extrahieren
          const conditionText = $el.find('[data-testid="item-box-condition"], .item-box__condition, .condition').first().text().trim();
          const condition = conditionText ? mapVintedCondition(conditionText) : 'Sehr gut';

          if (title && price !== null && url && !isNaN(price)) {
            items.push({
              title,
              price,
              url,
              imageUrl: img,
              condition,
              platform: 'vinted'
            });
          }
        });
        break; // Ersten funktionierenden Selektor verwenden
      }
    }

    if (!foundItems) {
      console.warn('No items found with standard selectors, trying fallback...');
      // Fallback: Suche nach allen Links die zu /items/ führen
      $('a[href*="/items/"]').each((_, element) => {
        const $el = $(element);
        const title = $el.text().trim();
        const url = $el.attr('href');
        if (title && url && title.length > 5) {
          // Versuche Preis aus dem umgebenden Element zu finden
          const priceText = $el.closest('div, article').find('.price, [class*="price"]').first().text().trim();
          const priceMatch = priceText.match(/[\d,]+/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : null;
          
          if (price !== null && !isNaN(price)) {
            items.push({
              title,
              price,
              url: url.startsWith('http') ? url : `https://www.vinted.de${url}`,
              imageUrl: '',
              condition: 'Sehr gut',
              platform: 'vinted'
            });
          }
        }
      });
    }

    console.log(`Scraped ${items.length} items from Vinted`);
    return items;
  } catch (error) {
    console.error("Vinted Catalog Scrape Error:", error);
    throw new Error(`Failed to scrape Vinted catalog: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const scrapeRealVinted = async (searchTerm: string) => {
  try {
    const url = `https://www.vinted.de/catalog?search_text=${encodeURIComponent(searchTerm)}&order=newest_first`;
    
    // In a real server environment, you might need a proxy here
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const $ = cheerio.load(data);
    const items: any[] = [];

    // Vinted selector strategy (Note: Class names change frequently)
    // Looking for grid items
    $('.feed-grid__item').each((_, element) => {
      const $el = $(element);
      const title = $el.find('[data-testid="item-box-title"]').text().trim();
      const priceText = $el.find('[data-testid="item-box-price"]').text().trim();
      const url = $el.find('a').attr('href');
      const img = $el.find('img').attr('src');

      if (title && priceText && url) {
        items.push({
          title,
          price: parseFloat(priceText.replace('€', '').replace(',', '.').trim()),
          url: url.startsWith('http') ? url : `https://www.vinted.de${url}`,
          imageUrl: img,
          platform: 'vinted'
        });
      }
    });

    return items;
  } catch (error) {
    console.error("Real Vinted Scrape Error:", error);
    throw new Error("Failed to scrape Vinted. Bot protection might be active.");
  }
};

export const scrapeRealEbay = async (searchTerm: string) => {
  try {
    // LH_Sold=1 filters for SOLD items to get realistic market value
    const url = `https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&LH_Sold=1&LH_Complete=1`;
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    const $ = cheerio.load(data);
    const results: any[] = [];

    $('.s-item__wrapper').each((_, element) => {
      const $el = $(element);
      const title = $el.find('.s-item__title').text().trim();
      const priceText = $el.find('.s-item__price').text().trim();
      const link = $el.find('.s-item__link').attr('href');
      
      if (title && priceText && !title.includes('Shop on eBay')) {
        results.push({
          title,
          price: parseFloat(priceText.replace('EUR', '').replace('.', '').replace(',', '.').trim()),
          url: link,
          platform: 'ebay'
        });
      }
    });

    // Return the median price of sold items
    return results;
  } catch (error) {
    console.error("Real eBay Scrape Error:", error);
    throw new Error("Failed to scrape eBay.");
  }
};
