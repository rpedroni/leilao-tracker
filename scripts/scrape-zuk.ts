import * as cheerio from 'cheerio';
import type { Property } from './types.ts';
import { log, parsePrice, parseBRDate, calculateDiscount, meetsFilters, isPriorityNeighborhood } from './utils.ts';

const BASE_URL = 'https://www.portalzuk.com.br';

/**
 * Scrape Portal Zuk for Curitiba + Grande Curitiba properties
 */
export async function scrapeZuk(): Promise<Property[]> {
  log('🔍 Starting Portal Zuk scraper...');
  
  const properties: Property[] = [];
  
  // Search URLs for Curitiba and Grande Curitiba regions
  const searchUrls = [
    `${BASE_URL}/imoveis-a-venda/pr/curitiba`,
    `${BASE_URL}/imoveis-a-venda/pr/fazenda-rio-grande`,
    `${BASE_URL}/imoveis-a-venda/pr/pinhais`,
    `${BASE_URL}/imoveis-a-venda/pr/sao-jose-dos-pinhais`,
    `${BASE_URL}/imoveis-a-venda/pr/colombo`,
    `${BASE_URL}/imoveis-a-venda/pr/campo-largo`,
    `${BASE_URL}/imoveis-a-venda/pr/araucaria`,
    `${BASE_URL}/imoveis-a-venda/pr/almirante-tamandare`,
  ];
  
  for (const url of searchUrls) {
    try {
      log(`Fetching ${url}...`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        log(`Failed to fetch ${url}: ${response.status}`, 'warn');
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Find property listings (adjust selectors based on actual page structure)
      $('.imovel-item, .property-card, .listing-item').each((_, element) => {
        try {
          const property = parseZukProperty($, element);
          if (property && meetsFilters(property)) {
            properties.push(property);
          }
        } catch (err) {
          log(`Error parsing property: ${err}`, 'warn');
        }
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      log(`Error scraping ${url}: ${error}`, 'error');
    }
  }
  
  log(`✅ Portal Zuk: Found ${properties.length} properties matching filters`);
  return properties;
}

/**
 * Parse a single property from Zuk HTML
 */
function parseZukProperty($: cheerio.CheerioAPI, element: cheerio.Element): Property | null {
  try {
    const $el = $(element);
    
    // Extract basic info (adjust selectors as needed)
    const link = $el.find('a').first().attr('href') || '';
    const fullLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
    
    // Extract ID from URL
    const idMatch = fullLink.match(/(\d+)-(\d+)$/);
    if (!idMatch) return null;
    const id = `zuk-${idMatch[2]}`;
    
    // Get property type
    const tipo = $el.find('.tipo, .property-type').text().trim() || 'Imóvel';
    
    // Get address
    const endereco = $el.find('.endereco, .address').text().trim();
    if (!endereco) return null;
    
    // Extract bairro from address or separate field
    const bairroEl = $el.find('.bairro, .neighborhood').text().trim();
    const bairro = bairroEl || endereco.split('-')[1]?.trim() || 'Desconhecido';
    
    // Get prices
    const lanceStr = $el.find('.lance, .price, .valor').first().text();
    const lance = parsePrice(lanceStr);
    if (!lance) return null;
    
    const avaliacaoStr = $el.find('.avaliacao, .original-price').first().text();
    const avaliacao = parsePrice(avaliacaoStr);
    
    // Calculate discount
    const desconto = avaliacao && lance ? calculateDiscount(avaliacao, lance) : null;
    
    // Get auction details
    const modalidade = $el.find('.modalidade, .auction-type').text().trim() || 'Leilão';
    
    const dataStr = $el.find('.data, .date').text();
    const encerramento = parseBRDate(dataStr);
    
    // Get area
    const area = $el.find('.area, .size').text().trim() || undefined;
    
    // Get occupancy
    const ocupacaoText = $el.find('.ocupacao, .occupancy').text().toLowerCase();
    let ocupacao = 'desconhecido';
    if (ocupacaoText.includes('desocupado')) ocupacao = 'desocupado';
    else if (ocupacaoText.includes('ocupado')) ocupacao = 'ocupado';
    
    const property: Property = {
      id,
      tipo,
      bairro,
      endereco,
      lance,
      avaliacao,
      desconto,
      modalidade,
      encerramento,
      ocupacao,
      area,
      fonte: 'Portal Zuk',
      link: fullLink,
      prioridade: isPriorityNeighborhood(bairro)
    };
    
    return property;
    
  } catch (error) {
    log(`Error parsing Zuk property: ${error}`, 'warn');
    return null;
  }
}

// Run standalone
if (import.meta.main) {
  const properties = await scrapeZuk();
  console.log(JSON.stringify(properties, null, 2));
}
