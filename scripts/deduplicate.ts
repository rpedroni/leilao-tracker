import { compareTwoStrings } from 'string-similarity';
import type { Property } from './types.ts';
import { log, normalizeText } from './utils.ts';

const ADDRESS_SIMILARITY_THRESHOLD = 0.85; // 85% similarity to consider duplicates

/**
 * Deduplicate properties from multiple sources by address similarity
 * Keep the property with more complete data when duplicates found
 */
export function deduplicateProperties(sources: Property[][]): Property[] {
  log('🔄 Deduplicating properties...');
  
  // Merge all sources
  const allProperties = sources.flat();
  log(`Total properties before deduplication: ${allProperties.length}`);
  
  const deduplicated: Property[] = [];
  const seen = new Set<string>();
  
  for (const property of allProperties) {
    // Normalize address for comparison
    const normalizedAddress = normalizeText(property.endereco);
    
    // Check if we've seen a similar address
    let isDuplicate = false;
    
    for (const existingAddress of seen) {
      const similarity = compareTwoStrings(normalizedAddress, existingAddress);
      
      if (similarity >= ADDRESS_SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        log(`Duplicate found: ${property.endereco} (${similarity.toFixed(2)} similarity)`, 'warn');
        
        // Find the existing property and potentially replace it if new one has better data
        const existingIndex = deduplicated.findIndex(p => 
          compareTwoStrings(normalizeText(p.endereco), existingAddress) >= ADDRESS_SIMILARITY_THRESHOLD
        );
        
        if (existingIndex !== -1) {
          const existing = deduplicated[existingIndex];
          
          // Keep the one with better data (more fields filled, higher discount, etc.)
          if (shouldReplace(existing, property)) {
            log(`Replacing ${existing.fonte} with ${property.fonte} for ${property.endereco}`);
            deduplicated[existingIndex] = property;
          }
        }
        
        break;
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(property);
      seen.add(normalizedAddress);
    }
  }
  
  // Sort by discount (highest first), then by price (lowest first)
  deduplicated.sort((a, b) => {
    // Priority neighborhood properties first
    if (a.prioridade !== b.prioridade) {
      return a.prioridade ? -1 : 1;
    }
    
    // Then by discount
    const discountA = a.desconto || 0;
    const discountB = b.desconto || 0;
    if (discountA !== discountB) {
      return discountB - discountA;
    }
    
    // Then by price
    return a.lance - b.lance;
  });
  
  log(`✅ Deduplicated to ${deduplicated.length} unique properties`);
  return deduplicated;
}

/**
 * Decide whether to replace existing property with new one
 * Based on data completeness and quality
 */
function shouldReplace(existing: Property, newProp: Property): boolean {
  // Count non-null/non-empty fields
  const existingScore = scoreProperty(existing);
  const newScore = scoreProperty(newProp);
  
  // If new property has significantly better data, replace
  if (newScore > existingScore) return true;
  
  // If scores are equal, prefer the one with discount info
  if (newScore === existingScore) {
    if (newProp.desconto && !existing.desconto) return true;
    if (newProp.avaliacao && !existing.avaliacao) return true;
  }
  
  return false;
}

/**
 * Score a property based on data completeness
 */
function scoreProperty(property: Property): number {
  let score = 0;
  
  // Essential fields
  if (property.avaliacao) score += 3;
  if (property.desconto) score += 3;
  if (property.area) score += 2;
  if (property.encerramento) score += 1;
  if (property.ocupacao !== 'desconhecido') score += 2;
  
  // Quality indicators
  if (property.endereco.length > 20) score += 1; // More detailed address
  if (property.modalidade && property.modalidade !== 'Leilão') score += 1;
  
  return score;
}

/**
 * Mark new properties compared to previous day's data
 */
export function markNewProperties(current: Property[], previous: Property[]): Property[] {
  const previousIds = new Set(previous.map(p => p.id));
  
  return current.map(property => ({
    ...property,
    novo: !previousIds.has(property.id)
  }));
}

// Run standalone (for testing with JSON files)
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: bun run deduplicate.ts <file1.json> <file2.json> ...');
    process.exit(1);
  }
  
  const sources: Property[][] = [];
  
  for (const file of args) {
    try {
      const content = await Bun.file(file).json();
      sources.push(Array.isArray(content) ? content : []);
      log(`Loaded ${file}: ${sources[sources.length - 1].length} properties`);
    } catch (error) {
      log(`Error loading ${file}: ${error}`, 'error');
    }
  }
  
  const deduplicated = deduplicateProperties(sources);
  console.log(JSON.stringify(deduplicated, null, 2));
}
