# Leilão Tracker Scripts

TypeScript scripts for scraping and generating daily property auction reports.

## Setup

```bash
# Install dependencies
bun install
```

## Usage

### Run individual scrapers

```bash
# Scrape Portal Zuk
bun run scripts/scrape-zuk.ts

# Scrape Leilão Imóvel
bun run scripts/scrape-leilaoimovel.ts

# Scrape Caixa
bun run scripts/scrape-caixa.ts
```

### Deduplicate properties

```bash
bun run scripts/deduplicate.ts data/source1.json data/source2.json
```

### Generate HTML

```bash
bun run scripts/generate-html.ts data/2026-02-06.json index.html
```

### Run full daily pipeline

```bash
bun run scripts/run-daily.ts
```

This will:
1. Run all scrapers in parallel
2. Deduplicate properties
3. Mark new properties (compared to yesterday)
4. Save to `data/YYYY-MM-DD.json`
5. Generate HTML pages
6. Commit and push to git

## Scripts

- **types.ts** - Shared TypeScript types and constants
- **utils.ts** - Utility functions (formatting, parsing, logging)
- **scrape-zuk.ts** - Portal Zuk scraper
- **scrape-leilaoimovel.ts** - Leilão Imóvel scraper
- **scrape-caixa.ts** - Caixa scraper
- **deduplicate.ts** - Deduplication by address similarity
- **generate-html.ts** - HTML page generator
- **run-daily.ts** - Main orchestrator

## Filters

- Discount: >40%
- Price: <R$800k
- Region: Curitiba + Grande Curitiba

## Priority Neighborhoods

Portão, Batel, Água Verde, Centro, Bigorrilho, Cabral, Jardim Social, Alto da XV, Hugo Lange, Juvevê

## Error Handling

All scrapers handle errors gracefully. If one scraper fails, the others continue. The daily run will only fail if ALL scrapers fail.

## Notes

- Scrapers use plain `fetch` + `cheerio` (no browser automation)
- CSS selectors may need adjustment as websites change
- Rate limiting: 1-1.5s delay between requests
- Deduplication uses 85% address similarity threshold
