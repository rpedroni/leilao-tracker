# Leilão Tracker

Automated daily scraping and tracking of property auction opportunities in Curitiba and Grande Curitiba region.

## Phase 1: Infrastructure ✅ COMPLETE

TypeScript/Bun-based scraping infrastructure with:
- ✅ Modular scrapers for multiple sources
- ✅ Smart deduplication by address similarity
- ✅ HTML report generation (dark theme, responsive)
- ✅ Git automation (commit & push)
- ✅ Error handling (graceful failure per source)

## Quick Start

```bash
# Install dependencies
bun install

# Run daily pipeline
bun run scripts/run-daily.ts
```

## Structure

```
leilao-tracker/
├── data/               # Daily JSON snapshots (YYYY-MM-DD.json)
├── scripts/            # Scraping & generation scripts
│   ├── types.ts        # TypeScript types
│   ├── utils.ts        # Shared utilities
│   ├── scrape-*.ts     # Source-specific scrapers
│   ├── deduplicate.ts  # Deduplication logic
│   ├── generate-html.ts # HTML page generator
│   └── run-daily.ts    # Main orchestrator
├── *.html              # Generated HTML pages
└── index.html          # Current properties (auto-generated)
```

## Filters

- **Discount:** >40%
- **Price:** <R$800k
- **Region:** Curitiba + Grande Curitiba
- **Priority neighborhoods:** Portão, Batel, Água Verde, Centro, Bigorrilho, Cabral, Jardim Social, Alto da XV, Hugo Lange, Juvevê

## Sources

### Currently Configured
1. **Portal Zuk** - portalzuk.com.br
2. **Leilão Imóvel** - leilaoimovel.com.br  
3. **Caixa** - venda-imoveis.caixa.gov.br

### To Be Added (Phase 2)
- Mega Leilões, Sold Leilões, Biasi
- Bank leilões (Santander, Itaú, Bradesco, BB)
- Real estate portals (OLX, Zap, VivaReal)

## Next Steps

### URL Pattern Discovery
The scraper infrastructure is ready but needs correct URL patterns:

1. **For each scraper**, open the website in a browser
2. Apply filters (location, price, discount)
3. Inspect the search results page URL
4. Check Network tab for API endpoints (JSON is easier than HTML)
5. Update the scraper's `searchUrls` array

See `scripts/SCRAPING-NOTES.md` for detailed instructions.

### CSS Selector Verification
Current selectors are generic guesses. Need to:
1. Inspect actual HTML structure of each site
2. Update CSS selectors in each scraper
3. Test extraction logic

### Testing
```bash
# Test individual scrapers
bun run scripts/scrape-zuk.ts
bun run scripts/scrape-leilaoimovel.ts
bun run scripts/scrape-caixa.ts

# Test deduplication
bun run scripts/deduplicate.ts data/2026-02-06.json data/2026-02-02.json

# Test HTML generation
bun run scripts/generate-html.ts data/2026-02-06.json test.html

# Full pipeline (scrapers will return 0 results until URLs are fixed)
bun run scripts/run-daily.ts
```

## Features

### Deduplication
- Uses string similarity (85% threshold) to detect duplicate addresses
- Keeps property with most complete data
- Handles typos and address format variations

### HTML Output
- Dark theme, GitHub-inspired design
- Responsive card layout
- Top 5 highlighted
- Priority neighborhood indicators
- New property ribbons
- Stats dashboard
- Historical navigation

### Error Handling
- Each scraper runs independently
- Failure in one source doesn't crash the pipeline
- Logs errors but continues processing
- Only fails if ALL scrapers fail

### Git Integration
- Auto-commits daily data
- Auto-pushes to main branch
- Commit message includes property count

## Cron Setup (Future)

Once URLs are verified, set up daily run:

```bash
# Add to crontab
0 8 * * 1-5 cd /Users/arpee/clawd/leilao-tracker && ~/.bun/bin/bun run scripts/run-daily.ts
```

Runs Monday-Friday at 8 AM.

## Tech Stack

- **Runtime:** Bun (fast TypeScript execution)
- **Parsing:** Cheerio (jQuery-like HTML parsing)
- **Deduplication:** string-similarity
- **Output:** Static HTML (GitHub Pages ready)

## Development

See `scripts/README.md` for detailed script documentation.

## Status

**Phase 1:** ✅ Infrastructure complete  
**Phase 2:** ⏳ URL discovery & scraper tuning (next step)  
**Phase 3:** ⏳ Additional sources  
**Phase 4:** ⏳ WhatsApp notifications
