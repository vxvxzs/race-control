# Race Control — wdrożenie

Aplikacja: https://race-control-rho.vercel.app  
CMS: https://race-control-rho.vercel.app/admin  
Prywatny kod: https://github.com/vxvxzs/race-control

## Usługi i przepływ

Osobny projekt Vercel `race-control`, Node 22, region Dublin. Neon PostgreSQL: branch production, baza neondb, rola neondb_owner, połączenie pooled TLS. Resend: `Race Control <noreply@mail.jalochabuilds.site>`. Pozostałe projekty i domena jalochabuilds.site nie są zmieniane.

Przeglądarka → Next.js/Payload → transakcja PostgreSQL (zgłoszenie + powiadomienia + outbox) → commit → ograniczona czasowo wysyłka Resend → zapis identyfikatora dostawcy. Sesje, tokeny, kolejka i sport pozostają w Neon; komputer autora nie uczestniczy w obsłudze wdrożenia.

Weryfikacja konta ma priorytet: endpoint zapisuje jednorazowy token i wysyła konkretną wiadomość po trwałym zapisie. Token: 24 godziny, atomowe zużycie, ponowienie co najmniej po minucie. Kolejka rejestruje próby i błąd; `sent` oznacza przyjęcie przez dostawcę, a nie dowód dostawy do skrzynki.

Wysyłka zmian z CMS i API następuje po zakończeniu operacji Payload. Limit 10 wiadomości / wywołanie i budżet 45 sekund. Atomowe przejęcie zapobiega równoległym duplikatom. Resend otrzymuje niezmienny Idempotency-Key. Przerwane `sending` odzyskiwane po 2 minutach; maksymalnie 3 próby. Ponowienia po przekroczeniu bezpiecznych 23 godzin wymagają sprawdzenia dostawcy i nie są wykonywane automatycznie.

Cron Hobby raz dziennie (`07:00 UTC`) wywołuje `/api/ops/mail` z tajnym Bearer CRON_SECRET. Ten sam endpoint można wywołać z zaufanego narzędzia operatora; nie przyjmuje adresata ani treści. Weryfikacja i zwykła wysyłka nie czekają na cron. Błędy widoczne dla właściciela w kolekcji Email Outbox i logach Vercel. Dane przykładowe z domen .test/.invalid nie są wysyłane do dostawcy.

## Konfiguracja

Produkcyjne zmienne Vercel: DATABASE_URL, PAYLOAD_SECRET, RESEND_API_KEY, CRON_SECRET, NEXT_PUBLIC_SERVER_URL, SMTP_FROM, MAIL_MODE=resend, ACTIVE_SEASON=2026/2027, PAYLOAD_DB_PUSH=false. Sekrety są serwerowe i oznaczone Sensitive. Publiczny URL ma HTTPS; lokalna SQLite i schema push są zablokowane na Vercelu. Nie kopiować lokalnych SMTP_USER/SMTP_PASS.

Lokalny, ignorowany `.env.production.local` służy operatorowi. Zawiera również OWNER_EMAIL i TEST_EMAIL. Nie dodawać go do Git ani raportów.

## Kolejna wersja i schemat

Wypchnij sprawdzony commit do produkcyjnej gałęzi repozytorium. Vercel uruchamia `npm run build:production`: zatwierdzone migracje Payload, potem build Next.js. Transakcyjna blokada PostgreSQL serializuje migracje równoległych buildów. Migracje znajdują się w `src/migrations/postgres`; schema push nie jest procesem wdrożenia. Zmiany schematu najpierw wygenerować i przejrzeć na środowisku testowym. Nigdy nie uruchamiać migrate:fresh/down/reset na produkcji.

Przed zmianą danych: `npm run db:backup`. Kopia pełnych tabel, w tym danych uwierzytelnienia i sesji, trafia wyłącznie do ignorowanego `work/neon-backup-*.private.json` i wymaga prywatnego przechowywania. Kopia SQLite sprzed migracji: `work/production-before-20261013-020646.db`. Prywatny `work/demo-export.json` zawiera zanonimizowany punkt odtworzenia historii sportowej. Pełny backup i odtworzenie demo są różnymi operacjami.

## Konta i reviewer

Unikalne hasła właściciela i Przemysława znajdują się wyłącznie w `work/production-accounts.private.json`. Nie są częścią repozytorium. Reviewer ma CMS dla sportu i demonstracyjnych kierowców; nie może odczytać lub zmienić konta właściciela, znosić własnych ograniczeń ani odczytać kolejki z tokenami. Nie ma dostępu do kont Vercel, Neon, Resend ani GitHub. Stare konta zostały zanonimizowane, otrzymały losowe hasła i są nieaktywne; sport zachował identyfikatory i relacje. Archiwalne tokeny lokalne unieważniono, aby nie wysyłać starych linków localhost.

Po prezentacji: `npm run reviewer:revoke` blokuje konto, zmienia hasło i usuwa wszystkie sesje. Właściciel może również zablokować/usunąć reviewera w CMS. Dodanie administratora: wczytać produkcyjne środowisko i przekazać ADMIN_EMAIL, ADMIN_NAME oraz unikalny ADMIN_PASSWORD do `npm run admin:create`; polecenie nie zmienia istniejących kont. Nie podawać hasła jako argumentu procesu ani w historii powłoki.

Odtworzenie sportowego demo: najpierw `npm run db:backup`, potem `npm run demo:restore -- --restore-demo-sports`. Operacja zastępuje wydarzenia, zgłoszenia, protokoły i komunikaty z prywatnego eksportu; zachowuje konta i sesje. Stosować wyłącznie do tej instancji demonstracyjnej, po sprawdzeniu kopii. Nie uruchamiać na lidze przyjmującej rzeczywistych zawodników.

## Pliki i ograniczenia

Kolekcja Media była pusta; frontend korzysta z wersjonowanych WebP i SVG o opisanych licencjach w ASSETS.md. Tworzenie/zmiana uploadów na Vercelu jest wyłączona. Nie wdrażano zbędnego storage. Przed przyszłym udostępnieniem uploadów konieczny trwały adapter Blob/S3 i osobne testy.

Vercel Hobby jest bezpłatny dla osobistego, niekomercyjnego demo; jego limity są współdzielone z innymi projektami konta. Nie zmieniano abonamentu i nie włączano płatnych usług. Neon i Resend zależą od planów istniejących kont. Aktualne darmowe limity i wyniki rzeczywistych testów będą opisane w raporcie końcowym. Codzienny cron jest mechanizmem odzyskania, a nie gwarancją natychmiastowego ponowienia po awarii dostawcy.

Stan testów publicznych: w trakcie wdrożenia. Nie traktować samego tego dokumentu jako potwierdzenia gotowości.
