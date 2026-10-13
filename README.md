# RACE CONTROL

Liga simracingowa: konta kierowców, weryfikacja e-mail, zapisy i decyzje stewardów, wyniki, klasyfikacja oraz powiadomienia.

- [Aplikacja](https://race-control-rho.vercel.app) · [CMS](https://race-control-rho.vercel.app/admin)
- [Odzyskiwanie hasła](https://race-control-rho.vercel.app/forgot-password)
- Next.js, React, TypeScript, PayloadCMS, Neon PostgreSQL i Resend; hosting Vercel.
- Dane sportowe są demonstracyjne. [Źródła i licencje materiałów](ASSETS.md).

## Development

Node 22, `npm ci`, własny `.env` na podstawie `.env.example`. Ustaw losowy PAYLOAD_SECRET. Lokalnie SQLite: `npm run db:push`, następnie `npm run seed` i `npm run dev`. Nie uruchamiaj seeda ani schema push na produkcji.

## Kontrole

- `npm run typecheck`, `npm run build`, `npm test`.
- `npm run test:integration` — izolowana SQLite.
- `npm run test:recovery` — tokeny, sesje, równoczesny reset, limity i weryfikacja e-mail w izolowanej SQLite.
- `npm run test:register-name` — odczytowy test nazw w czystych Chrome, Edge i Brave; wymaga tych przeglądarek. QA_BASE_URL zmienia adres, QA_HEADED=true pokazuje okna.

Nie uruchamiaj testów wymagających pustej bazy na produkcji. [Zakres kontroli i nierozstrzygnięta awaria Brave](docs/CRITICAL_FIXES.md).

## Utrzymanie

[Wdrożenie i kopie](DEPLOYMENT.md) · [Reset hasła](docs/PASSWORD_RECOVERY.md) · [Polishing](docs/POLISH.md).

Sekrety, prywatne konta, kopie bazy i OWNER_TECHNICAL_GUIDE.md pozostają poza Git. Uploady CMS są wyłączone do czasu skonfigurowania trwałego storage. Schemat produkcji zmieniają wersjonowane migracje.
