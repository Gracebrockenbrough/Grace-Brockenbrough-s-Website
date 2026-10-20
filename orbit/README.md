# Orbit

*One place for everything shopping.* Discover sales you actually care about, keep a wishlist, track every purchase from delivery to return to refund, keep gift cards and store credit in a wallet, and understand your spending without judgment. Orbit only reads shopping emails; it never acts for you.

This is the **Stage 1 prototype**: a complete, clickable, mobile-first experience on fictional demo data, with the real deadline, priority, parsing and dedupe logic underneath.

```bash
cd orbit
npm install
npm run dev        # http://localhost:3000 (best at 390px wide)
npm test           # 63 unit tests
npm run build:prototype  # single-file clickable preview
npm run build      # production build
```

- Architecture, screens, components, database and what's real vs demo: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Database schema with row-level security: [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql)

**Try these:** finish the welcome screens · copy a code and vote on it in Discover · Wishlist → Describe / Photo / Voice / Link · Purchases → Refunds → tick "I've received this refund" (COS) · add a return tracking number (Madewell) · Wallet → a card's sale note · Insights → Quarter → turn on spending targets · Profile → "What Orbit's AI can and can't do".

Everything shown is fictional, and retailer policies are samples. Nothing is submitted to retailers, and no payments are processed. Data is stored only in your browser (Settings → *Reset Demo Data*).
