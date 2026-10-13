# Wdrożenie i utrzymanie

## Środowisko

Produkcję obsługują Vercel Functions, Neon PostgreSQL (pooled TLS) i Resend. W Vercel ustaw: DATABASE_URL, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL (HTTPS), ACTIVE_SEASON, MAIL_MODE=resend, RESEND_API_KEY, SMTP_FROM oraz CRON_SECRET. PAYLOAD_DB_PUSH musi być false. `.env.example` opisuje lokalne i opcjonalne ustawienia SMTP. Sekretów serwerowych nie oznaczaj prefiksem NEXT_PUBLIC_.

Repozytorium jest połączone z Vercel: push do `main` uruchamia wdrożenie produkcyjne. Przed pushem sprawdź gałąź, testy oraz środowisko przypisane projektowi. Aktualnie zmienne usług skonfigurowano tylko dla Production. Preview bez dodatkowej konfiguracji nie zbuduje aplikacji. Preview wymaga osobnej testowej bazy i kluczy; nie wykonuj testów zapisujących dane w preview połączonym z produkcyjnym Neon.

## Migracje

Vercel uruchamia `npm run build:production`: `scripts/production-migrate.ts` stosuje migracje z `src/migrations/postgres/`, następnie buduje Next.js. Blokada transakcyjna PostgreSQL serializuje równoczesne uruchomienia tego skryptu. Migracje mają własne transakcje; blokada nie oznacza jednej transakcji obejmującej cały build. Błąd migracji zatrzymuje deployment.

Zmiany schematu generuj i sprawdzaj na osobnej bazie. Stosuj zmiany zgodne ze starą wersją aplikacji, ponieważ build może zmienić bazę przed przełączeniem ruchu. Nie uruchamiaj `db:push`, `migrate:fresh`, `down` ani resetów na produkcji. Lokalny `npm run db:push` obsługuje wyłącznie SQLite.

## Kopie i powrót do poprzedniej wersji

Przed zmianą danych wykonaj `npm run db:backup` w zaufanym środowisku operatora. Skrypt wczytuje ignorowany `.env.production.local` i zapisuje spójny odczyt tabel do `work/neon-backup-*.private.json`. Plik zawiera również dane uwierzytelniania i sesje: przechowuj go prywatnie i poza Git. To eksport wierszy, nie pełny backup PostgreSQL obejmujący DDL, role i ustawienia infrastruktury.

Wadliwy kod wycofaj przez ponowne promowanie poprzedniego działającego deploymentu w Vercel. Nie cofa to migracji ani zapisów użytkowników. Odtwarzanie danych najpierw przećwicz na nowej bazie/branchu Neon z właściwym schematem, sprawdź relacje i dopiero zaplanuj przełączenie. Retencję i dostępne mechanizmy przywracania sprawdź w aktualnym planie Neon; automatyczne odtworzenie produkcji nie jest częścią repozytorium.

## Poczta i diagnostyka

Po trwałym zapisie aplikacja uruchamia ograniczone czasowo opróżnianie outbox przez Resend. Codzienny cron o 07:00 UTC wywołuje `/api/ops/mail` z Bearer CRON_SECRET. Endpoint nie przyjmuje dowolnych adresatów ani treści. Cron odzyskuje zaległości; nie gwarantuje szybkiego ponowienia podczas długiej awarii.

W CMS właściciel sprawdza Email Outbox: status, attempts, nextAttempt, lastError i providerMessageId. `sent` oznacza przyjęcie przez dostawcę, nie potwierdzenie dostarczenia do skrzynki. Po 3 próbach albo przekroczeniu bezpiecznego okna idempotencji sprawdź stan u dostawcy przed ręczną ponowną wysyłką. Lokalnie `mail:worker`/`mail:once` obsługują preview lub SMTP; nie są stale uruchomionym workerem Vercel.

Przy HTTP 500 sprawdź logi konkretnego deploymentu, konfigurację środowiska, migracje i dostępność Neon. Nie publikuj pełnych logów, URL-i połączeń, linków resetu ani backupów. `reviewer:revoke` blokuje czasowe konta reviewerów i usuwa ich sesje; uruchamiaj świadomie. `admin:create` tworzy konto, nie nadpisuje istniejącego.

## Narzędzia demonstracyjne

`seed`, `demo:curate`, `security:rotate-demo`, `db:export-demo` i `demo:restore` są ograniczone do lokalnej SQLite; skrypty zmieniające demo odmawiają działania przy kontach innych niż demo. Eksport czyta przygotowaną kopię `work/production-source.db`. Odtworzenie sportu wymaga dodatkowego `--restore-demo-sports`, istniejących kont i transakcji; zastępuje lokalne dane sportowe. Nie jest procedurą odzyskiwania produkcji.

`db:import-demo -- --import-empty-demo` służy jednorazowemu importowi zaufanego, zanonimizowanego eksportu do pustej bazy PostgreSQL; odmawia działania na Vercelu i przy istniejących danych. Nie wykonuje się podczas deploymentu. Wszystkie pliki `work/` są lokalne i ignorowane.
