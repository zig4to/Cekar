# Cekar

Skupni nakupovalni seznami po trgovinah (Lidl, Hofer, Mercator, Spar …) s
predlogi izdelkov za vsako trgovino. Next.js 16 + Supabase, deploy na Vercel.

```bash
npm install
cp .env.example .env.local   # vpiši Supabase URL in anon ključ
npm run dev                  # http://localhost:3006
```

Bazo pripravi `supabase/migrations/0001_init.sql` (poženi v Supabase SQL Editorju).
Podrobnosti v `CLAUDE.md`.
