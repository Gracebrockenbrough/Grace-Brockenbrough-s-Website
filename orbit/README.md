# Orbit — Returns & Wallet

*Your shopping, taken care of.* Orbit keeps track of return deadlines, return labels, refunds, gift cards and store credit across retailers.

This is the **Stage 1 prototype**: a complete, clickable, mobile-first experience on fictional demo data, with the real deadline, priority, parsing and dedupe logic underneath.

```bash
cd orbit
npm install
npm run dev        # http://localhost:3000 (best at 390px wide)
npm test           # 37 unit tests
npm run build:prototype  # single-file clickable preview
npm run build      # production build
```

- Architecture, screens, components, database and what's real vs demo: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Database schema with row-level security: [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql)

**Try these:** *Ask Orbit* → “I ordered a red dress, when do I return it?” · *Prepare Return* (Reformation) · *View QR Code* (Madewell) · *Track Refund* (Sephora) · Wallet → Sephora → *Reveal* · Wallet → *Send a Gift* · Returns → **+** → *Paste an email* → *Everlane delivery update* (fills a missing delivery date) · Settings → *Preview tools* for empty and outage states.

Everything shown is fictional, and retailer policies are samples. Nothing is submitted to retailers, and no payments are processed. Data is stored only in your browser (Settings → *Reset Demo Data*).
