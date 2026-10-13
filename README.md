# RACE CONTROL

Aplikacja ligi simracingowej: konta kierowców, weryfikacja e-mail, zapisy i decyzje stewardów, wyniki, klasyfikacja oraz powiadomienia.

Next.js 15, React 19, TypeScript, PayloadCMS 3, PostgreSQL (Neon), Resend i Vercel. Lokalnie SQLite.

[Aplikacja](https://race-control-rho.vercel.app) · [CMS](https://race-control-rho.vercel.app/admin)

## Uruchomienie

Wymagania: Node.js 22 i npm. Zainstaluj zależności przez `npm ci`, skopiuj `.env.example` do `.env` i zastąp PAYLOAD_SECRET losową wartością (minimum 32 znaki). Przykład zawiera nazwy zmiennych, bez sekretów.

Dla lokalnej SQLite wykonaj `npm run db:push`, opcjonalnie `npm run seed`, następnie `npm run dev`. Seed wymaga bazy zawierającej wyłącznie konta demonstracyjne lub pustej bazy. Administratora można utworzyć przez `npm run admin:create` z ADMIN_EMAIL, ADMIN_NAME i ADMIN_PASSWORD przekazanymi w środowisku procesu.

## Weryfikacja

- `npm run typecheck` i `npm run lint` — typy i analiza kodu.
- `npm test` — logika klasyfikacji, daty, tokeny i blokady narzędzi demo.
- `npm run test:integration`, `npm run test:recovery` i `npm run test:demo-tools` — osobne lokalne bazy SQLite.
- `npm run build`, następnie `npm run test:e2e` — produkcyjny build i pełny lokalny przepływ HTTP/przeglądarki; wymaga zainstalowanego Google Chrome.
- `npm run test:visual` i `npm run test:register-name` — dodatkowe kontrole przeglądarkowe; konfiguracja adresu przez QA_BASE_URL. Test nazw wymaga Chrome, Edge i Brave.

Testów zapisujących dane nie uruchamiaj na produkcji. Skrypty administracyjne znajdują się w `scripts/`.

## Utrzymanie i ograniczenia

[Wdrożenie, migracje i kopie](DEPLOYMENT.md) · [Bezpieczeństwo i ograniczenia](docs/SECURITY.md) · [Źródła i licencje zasobów](ASSETS.md).

Dane sportowe są demonstracyjne. Uploady CMS na Vercelu wymagają trwałego storage i są obecnie wyłączone. Produkcyjny schemat zmieniają wersjonowane migracje; narzędzia demo i schema push są lokalne. Sekrety, kopie danych i prywatny przewodnik właściciela pozostają poza Git.
