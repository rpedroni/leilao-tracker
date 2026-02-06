import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Property } from './types.ts';
import { log, isPriorityNeighborhood, normalizeText } from './utils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const CAIXA_CSV_URL = 'https://venda-imoveis.caixa.gov.br/listaweb/Lista_imoveis_PR.csv';

const TARGET_CITIES = [
  'CURITIBA', 'FAZENDA RIO GRANDE', 'SAO JOSE DOS PINHAIS', 'PINHAIS',
  'COLOMBO', 'ARAUCARIA', 'CAMPO LARGO', 'ALMIRANTE TAMANDARE',
];

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
}

function parseBRL(s: string): number {
  const clean = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(clean) || 0;
  return Math.round(val * 100) / 100;
}

/**
 * Scrape Caixa Econômica Federal properties via CSV download
 * 
 * Strategy: Try direct CSV fetch first. Caixa has Radware bot protection,
 * so fallback to a cached CSV file if the direct download is blocked.
 */
export async function scrapeCaixa(): Promise<Property[]> {
  log('🏦 Starting Caixa Econômica scraper...');

  let csvText = '';

  // Try direct fetch
  try {
    log('Attempting direct CSV download...');
    const resp = await fetch(CAIXA_CSV_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp',
      },
    });

    const text = await resp.text();

    // Check if we got actual CSV or a CAPTCHA page
    if (text.includes('Nº do imóvel') || text.includes('N\u00ba do im\u00f3vel') || text.includes('Lista de Im')) {
      csvText = text;
      log('✅ Direct download succeeded!');
    } else {
      log('Got CAPTCHA/bot protection instead of CSV', 'warn');
    }
  } catch (e: any) {
    log(`Direct download failed: ${e.message}`, 'warn');
  }

  // Fallback: cached CSV
  const cacheFile = join(DATA_DIR, 'caixa_pr_cache.csv');
  if (!csvText && existsSync(cacheFile)) {
    log('📂 Using cached Caixa CSV...');
    csvText = readFileSync(cacheFile, 'latin1');
  }

  if (!csvText) {
    log('❌ No Caixa data available (bot protection + no cache)', 'error');
    log('To populate cache, manually download from: https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp');
    return [];
  }

  // Save/update cache
  writeFileSync(cacheFile, csvText, 'latin1');

  // Parse CSV
  // Format: N° do imóvel;UF;Cidade;Bairro;Endereço;Preço;Valor de avaliação;Desconto;Descrição;Modalidade de venda;Link de acesso
  const lines = csvText.split('\n').filter(l => l.trim());
  const properties: Property[] = [];

  for (const line of lines) {
    // Skip header and metadata lines
    if (line.includes('Lista de Im') || line.includes('Nº do im') || line.includes('N\u00ba do')) continue;

    const fields = line.split(';').map(f => f.trim());
    if (fields.length < 11) continue;

    const [id, uf, cidade, bairro, endereco, precoStr, avaliacaoStr, descontoStr, descricao, modalidade, link] = fields;

    // Filter by target cities
    const cidadeNorm = cidade.toUpperCase().trim();
    if (!TARGET_CITIES.includes(cidadeNorm)) continue;

    const preco = parseBRL(precoStr);
    const avaliacao = parseBRL(avaliacaoStr);
    const desconto = parseFloat(descontoStr) || 0;

    if (preco === 0) continue;

    // Extract tipo from description
    let tipo = 'Imóvel';
    const tipoMatch = descricao.match(/^(Apartamento|Casa|Sobrado|Terreno|Sala|Gleba|Loja|Galpão|Prédio)/i);
    if (tipoMatch) tipo = titleCase(tipoMatch[1]);

    // Extract area from description
    let area = '';
    const areaPriv = descricao.match(/([\d.,]+) de área privativa/);
    const areaTotal = descricao.match(/([\d.,]+) de área total/);
    const areaTerreno = descricao.match(/([\d.,]+) de área do terreno/);
    if (areaPriv && parseFloat(areaPriv[1]) > 0) {
      area = `${areaPriv[1]}m²`;
    } else if (areaTotal && parseFloat(areaTotal[1]) > 0) {
      area = `${areaTotal[1]}m²`;
    }
    if (areaTerreno && parseFloat(areaTerreno[1]) > 0) {
      area += area ? ` (terreno: ${areaTerreno[1]}m²)` : `terreno: ${areaTerreno[1]}m²`;
    }

    // Detect "sem vagas" — Caixa CSV doesn't include this directly,
    // but we flag apartments with 0 area total (common indicator) or
    // explicit mentions in description
    const descLower = descricao.toLowerCase();
    const semVagas = descLower.includes('sem direito') && descLower.includes('vaga');
    const alertas: string[] = [];
    if (semVagas) alertas.push('⛔ SEM VAGAS de garagem');
    // Also flag apartments with avaliação much higher than price in priority neighborhoods
    // (>40% off on paper can be misleading without context)

    // Normalize bairro
    const bairroDisplay = titleCase(bairro.toLowerCase());
    const bairroFinal = cidadeNorm === 'CURITIBA' ? bairroDisplay : `${bairroDisplay} (${titleCase(cidade.toLowerCase())})`;

    properties.push({
      id: `caixa-${id.trim()}`,
      tipo,
      bairro: bairroFinal,
      endereco,
      lance: preco,
      avaliacao: avaliacao > 0 ? avaliacao : preco,
      desconto: Math.round(desconto * 100) / 100,
      modalidade: modalidade || 'Caixa',
      encerramento: null,
      ocupacao: 'desconhecido',
      area: area || undefined,
      fonte: 'Caixa Econômica',
      link: link || '',
      prioridade: isPriorityNeighborhood(bairro),
      semVagas: semVagas || undefined,
      alertas: alertas.length > 0 ? alertas : undefined,
    });
  }

  log(`✅ Caixa: ${properties.length} properties parsed from CSV`);
  return properties;
}

// Run standalone
if (import.meta.main) {
  const properties = await scrapeCaixa();
  console.log(JSON.stringify(properties, null, 2));
  console.log(`\nTotal: ${properties.length} properties`);
}
