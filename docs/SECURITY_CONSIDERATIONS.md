# 🔒 Security Considerations

These are the security-relevant tradeoffs of the current MVP:

- **CORS** is wide open right now (`app.use(cors())`, no allow-list). That's fine for local development and demos, but it needs to be locked down to specific trusted domain(s) before any production use.
- **Input validation** is handled by Mongoose's schema types, with `runValidators: true` enforced on updates.
- **NoSQL injection** is largely mitigated by going through Mongoose rather than raw queries — `req.body` is never passed straight into a `$where` or `$regex` clause.
- **No authentication** exists in this MVP. That's a known gap, deliberately traded off for a "user switcher" that makes the app easy to demo without a login flow.
- **Sensitive config** like `MONGO_URI` lives in `.env`, which is excluded from git (keep `.env` in `.gitignore`).
- **MongoDB TLS** is currently opened with `tlsAllowInvalidCertificates: true` in `backend/config/db.js`, which skips certificate validation. That was a convenience for local development and should be dropped — or at least scoped to non-production environments — before deploying for real.
- **HTTP-only cookies** and a proper **JWT** flow are planned for a future production-hardening pass.
