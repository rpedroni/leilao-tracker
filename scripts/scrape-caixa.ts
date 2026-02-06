import * as cheerio from 'cheerio';
import type { Property } from './types.ts';
import { log, parsePrice, parseBRDate, calculateDiscount, meetsFilters, isPriorityNeighborhood } from './utils.ts';

const BASE_URL = 'https://venda-imoveis.caixa.gov.br';

/**
 * Scrape Caixa Econômica Federal auction listings
 */
export async function scrapeCaixa(): Promise<Property[]> {
  log('🔍 Starting Caixa scraper...');
  
  const properties: Property[] = [];
  
  // Caixa search URL for Paraná/Curitiba
  const searchUrl = `${BASE_URL}/sistema/busca-imovel.asp`;
  
  // Cities to search
  const cities = [
    'CURITIBA',
    'FAZENDA RIO GRANDE',
    'PINHAIS',
    'SAO JOSE DOS PINHAIS',
    'COLOMBO',
    'CAMPO LARGO',
    'ARAUCARIA',
    'ALMIRANTE TAMANDARE'
  ];
  
  for (const city of cities) {
    try {
      // Build search query
      const params = new URLSearchParams({
        estado: 'PR',
        cidade: city,
      });
      
      const url = `${searchUrl}?${params.toString()}`;
      log(`Fetching ${city}...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        log(`Failed to fetch ${city}: ${response.status}`, 'warn');
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Find property listings (adjust selectors based on actual Caixa page)
      $('.imovel, .property, .item').each((_, element) => {
        try {
          const property = parseCaixaProperty($, element, city);
          if (property && meetsFilters(property)) {
            properties.push(property);
          }
        } catch (err) {
          log(`Error parsing property: ${err}`, 'warn');
        }
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      log(`Error scraping ${city}: ${error}`, 'error');
    }
  }
  
  log(`✅ Caixa: Found ${properties.length} properties matching filters`);
  return properties;
}

/**
 * Parse a single property from Caixa HTML
 */
function parseCaixaProperty($: cheerio.CheerioAPI, element: cheerio.Element, city: string): Property | null {
  try {
    const $el = $(element);
    
    // Extract link
    const link = $el.find('a').first().attr('href') || '';
    const fullLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
    
    // Extract ID from URL or data attribute
    const idMatch = fullLink.match(/imovel[=_-](\d+)/i) || 
                    $el.attr('data-id')?.match(/(\d+)/);
    if (!idMatch) return null;
    const id = `caixa-${idMatch[1]}`;
    
    // Get property type
    let tipo = $el.find('.tipo, .tipo-imovel').text().trim();
    if (!tipo) {
      const desc = $el.text().toLowerCase();
      if (desc.includes('apartamento')) tipo = 'Apartamento';
      else if (desc.includes('casa')) tipo = 'Casa';
      else if (desc.includes('sobrado')) tipo = 'Sobrado';
      else if (desc.includes('terreno')) tipo = 'Terreno';
      else if (desc.includes('comercial') || desc.includes('sala')) tipo = 'Comercial';
      else tipo = 'Imóvel';
    }
    
    // Get address
    let endereco = $el.find('.endereco, .address').text().trim();
    if (!endereco) {
      // Try to extract from description
      const descText = $el.find('.descricao, .description').text();
      const addressMatch = descText.match(/(?:Rua|Av|Avenida|R\.)\s+[^,]+/i);
      endereco = addressMatch ? addressMatch[0] : '';
    }
    if (!endereco) return null;
    
    // Extract bairro
    let bairro = $el.find('.bairro, .neighborhood').text().trim();
    if (!bairro) {
      // Try to extract from address
      const parts = endereco.split(/[-,]/);
      if (parts.length > 1) {
        bairro = parts[1].trim();
      } else {
        bairro = city;
      }
    }
    
    // Get prices
    const lanceStr = $el.find('.valor, .preco, .price').first().text();
    const lance = parsePrice(lanceStr);
    if (!lance) return null;
    
    // Caixa typically shows "De: R$ X Por: R$ Y"
    const avaliacaoStr = $el.find('.valor-original, .de').first().text() ||
                         $el.text().match(/De:\s*R\$\s*[\d.,]+/i)?.[0];
    const avaliacao = avaliacaoStr ? parsePrice(avaliacaoStr) : null;
    
    // Calculate discount
    const desconto = avaliacao && lance ? calculateDiscount(avaliacao, lance) : null;
    
    // Get sale type
    let modalidade = $el.find('.modalidade, .tipo-venda').text().trim();
    if (!modalidade) {
      const text = $el.text();
      if (text.includes('Venda Online')) modalidade = 'Venda Online Caixa';
      else if (text.includes('Compra Direta')) modalidade = 'Compra Direta Caixa';
      else modalidade = 'Leilão Caixa';
    }
    
    // Get closing date
    const dataStr = $el.find('.data, .date, .encerramento').text();
    const encerramento = parseBRDate(dataStr);
    
    // Get area
    const areaMatch = $el.text().match(/(\d+(?:,\d+)?)\s*m[²2]/i);
    const area = areaMatch ? `${areaMatch[1]}m²` : undefined;
    
    // Occupancy
    const obs = $el.text().toLowerCase();
    let ocupacao = 'desconhecido';
    if (obs.includes('ocupado')) ocupacao = 'ocupado';
    else if (obs.includes('desocupado') || obs.includes('livre')) ocupacao = 'desocupado';
    
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
      fonte: 'Caixa',
      link: fullLink,
      prioridade: isPriorityNeighborhood(bairro)
    };
    
    return property;
    
  } catch (error) {
    log(`Error parsing Caixa property: ${error}`, 'warn');
    return null;
  }
}

// Run standalone
if (import.meta.main) {
  const properties = await scrapeCaixa();
  console.log(JSON.stringify(properties, null, 2));
}
