# Scraping Notes - URL Patterns

The scraper infrastructure is ready but needs correct URL patterns for each source.

## Portal Zuk

**Site:** https://www.portalzuk.com.br

**Known property URL pattern:**
```
https://www.portalzuk.com.br/imovel/pr/{city}/{neighborhood}/{street-address}/{id}-{property-id}
```

**To find search URLs:**
1. Visit https://www.portalzuk.com.br
2. Use browser DevTools Network tab
3. Apply filters:
   - Location: Curitiba, PR
   - Discount: >40%
   - Price: <R$800k
4. Capture the search/API endpoint URL
5. Update `scripts/scrape-zuk.ts` searchUrls array

**Known filters from homepage:**
- Descontos acima de 50%
- Por localização (estado/cidade)
- Por faixa de preço
- Imóveis desocupados

## Leilão Imóvel

**Site:** https://www.leilaoimovel.com.br

**Known property URL pattern:**
```
https://www.leilaoimovel.com.br/imovel/pr/curitiba/{description}-{id}
```

**To find search URLs:**
1. Visit site and apply filters
2. Capture search results page URL
3. Check if there's an API endpoint (look for JSON responses)
4. Update `scripts/scrape-leilaoimovel.ts`

## Caixa Econômica Federal

**Site:** https://venda-imoveis.caixa.gov.br

**Search endpoint:**
```
https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?estado=PR&cidade=CURITIBA
```

**Status:** URL pattern is known, may need to verify form parameters

## Next Steps

### 1. Manual URL Discovery
For each scraper that returns 0 results:
1. Open site in browser
2. Apply relevant filters (location, price, discount)
3. Copy the search results URL
4. Test in `web_fetch` tool
5. Inspect HTML structure to verify CSS selectors
6. Update scraper script

### 2. CSS Selector Verification
Current selectors are generic guesses:
```javascript
'.imovel-item, .property-card, .listing-item'
```

Need to inspect actual HTML and update to match real selectors.

### 3. API Endpoints (if available)
Some sites may have JSON APIs that are easier to scrape than HTML:
- Check Network tab for XHR/Fetch requests
- Look for endpoints returning JSON
- May require authentication/headers

### 4. Rate Limiting & Headers
Current implementation includes:
- User-Agent header (pretend to be browser)
- 1-1.5s delay between requests
- May need to add more headers (Referer, Accept, etc.)

## Testing Individual Scrapers

```bash
# Test with verbose output
cd /Users/arpee/clawd/leilao-tracker
~/.bun/bin/bun run scripts/scrape-zuk.ts

# Or use web_fetch to inspect pages
clawdbot web_fetch url=https://www.portalzuk.com.br/...
```

## Alternative: Browser Automation

If fetch+cheerio doesn't work (JavaScript-heavy sites), consider:
- Using Clawdbot's `browser` tool to render pages
- Extracting JSON from rendered page
- This is slower but handles dynamic content

## Current Status

✅ Infrastructure ready
✅ TypeScript types defined
✅ Deduplication logic working
✅ HTML generation working
⚠️ Scrapers need URL pattern updates
⚠️ CSS selectors need verification
