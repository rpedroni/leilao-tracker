import * as cheerio from 'cheerio';
import type { Property } from './types.ts';
import { log, parsePrice, parseBRDate, calculateDiscount, meetsFilters, isPriorityNeighborhood } from './utils.ts';

const BASE_URL = 'https://www.leilaoimovel.com.br';

/**
 * Scrape Leilão Imóvel for Curitiba + Grande Curitiba properties
 */
export async function scrapeLeilaoImovel(): Promise<Property[]> {
  log('🔍 Starting Leilão Imóvel scraper...');
  
  const properties: Property[] = [];
  
  // Search endpoints for Curitiba region
  const searchUrls = [
    `${BASE_URL}/imoveis-a-venda/pr/curitiba`,
    `${BASE_URL}/imoveis-leilao/pr/curitiba`,
    `${BASE_URL}/imoveis-compra-direta/pr/curitiba`,
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
      
      // Find property listings
      $('.item-imovel, .property-item, .listing').each((_, element) => {
        try {
          const property = parseLeilaoImovelProperty($, element);
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
  
  log(`✅ Leilão Imóvel: Found ${properties.length} properties matching filters`);
  return properties;
}

/**
 * Parse a single property from Leilão Imóvel HTML
 */
function parseLeilaoImovelProperty($: cheerio.CheerioAPI, element: cheerio.Element): Property | null {
  try {
    const $el = $(element);
    
    // Extract link
    const link = $el.find('a').first().attr('href') || '';
    const fullLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
    
    // Extract ID from URL (pattern: imovel-...-NUMBER or just NUMBER)
    const idMatch = fullLink.match(/(\d{6,})/);
    if (!idMatch) return null;
    const id = `li-${idMatch[1]}`;
    
    // Get property type
    let tipo = $el.find('.tipo-imovel, .property-type, .tipo').text().trim();
    if (!tipo) {
      // Try to infer from description
      const desc = $el.text().toLowerCase();
      if (desc.includes('apartamento')) tipo = 'Apartamento';
      else if (desc.includes('casa')) tipo = 'Casa';
      else if (desc.includes('sobrado')) tipo = 'Sobrado';
      else if (desc.includes('terreno')) tipo = 'Terreno';
      else tipo = 'Imóvel';
    }
    
    // Get address
    const endereco = $el.find('.endereco, .address, .localizacao').text().trim();
    if (!endereco) return null;
    
    // Extract bairro
    const bairroEl = $el.find('.bairro, .neighborhood').text().trim();
    let bairro = bairroEl;
    if (!bairro) {
      // Try to extract from address
      const parts = endereco.split(',');
      if (parts.length > 1) {
        bairro = parts[parts.length - 2].trim();
      } else {
        bairro = 'Desconhecido';
      }
    }
    
    // Get prices
    const lanceStr = $el.find('.valor-lance, .preco, .price, .valor').first().text();
    const lance = parsePrice(lanceStr);
    if (!lance) return null;
    
    const avaliacaoStr = $el.find('.valor-avaliacao, .avaliacao, .original-price').first().text();
    const avaliacao = parsePrice(avaliacaoStr);
    
    // Calculate discount
    const desconto = avaliacao && lance ? calculateDiscount(avaliacao, lance) : null;
    
    // Get auction/sale type
    let modalidade = $el.find('.modalidade, .tipo-venda').text().trim();
    if (!modalidade) {
      const text = $el.text();
      if (text.includes('Compra Direta')) modalidade = 'Compra Direta';
      else if (text.includes('Venda Online')) modalidade = 'Venda Online';
      else if (text.includes('Leilão SFI')) modalidade = 'Leilão SFI';
      else modalidade = 'Leilão';
    }
    
    // Get closing date
    const dataStr = $el.find('.data-encerramento, .data, .date').text();
    const encerramento = parseBRDate(dataStr);
    
    // Get area
    const area = $el.find('.area, .metragem').text().trim() || undefined;
    
    // Get occupancy from observations
    const observacoes = $el.find('.observacoes, .obs').text().toLowerCase();
    let ocupacao = 'desconhecido';
    if (observacoes.includes('imóvel ocupado') || observacoes.includes('imovel ocupado')) {
      ocupacao = 'ocupado';
    } else if (observacoes.includes('desocupado')) {
      ocupacao = 'desocupado';
    }
    
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
      fonte: 'Leilão Imóvel',
      link: fullLink,
      prioridade: isPriorityNeighborhood(bairro)
    };
    
    return property;
    
  } catch (error) {
    log(`Error parsing Leilão Imóvel property: ${error}`, 'warn');
    return null;
  }
}

// Run standalone
if (import.meta.main) {
  const properties = await scrapeLeilaoImovel();
  console.log(JSON.stringify(properties, null, 2));
}
