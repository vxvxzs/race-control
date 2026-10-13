# Krytyczne zgłoszenia — 13.10.2026

## Wpisywanie Jakub: NOT REPRODUCED

Publiczna rejestracja w czystych Chrome, Edge i Brave, bez rozszerzeń, desktop/mobile, headless i widoczne okna: Jakub, jakub, JAKUB, Jakub Jałocha, Jakub123, Łukasz, Żaneta Świątek. Łącznie 84 sekwencje znak po znaku. Brak awarii, błędów JS i requestów podczas pisania. Powtarzalny test: `tests/register-name.browser.ts`. Publiczna rejestracja konta Jakub, logowanie i weryfikacja e-mail również przeszły.

Użytkownik potwierdził zamknięcie całego Brave. Cztery dzisiejsze lokalne raporty Crashpad: proces **browser**, wersja **155.1.97.56**, wyjątek **0x80000003**, ten sam adres **chrome.dll+0xc81b426**. Zrzutów pamięci nie przesyłano do usług zewnętrznych; lokalnie odczytano strukturę wyjątku, moduły i wybrane adnotacje. Bez symbolizowanego stosu nie ustalono funkcji ani związku z formularzem.

Input wykonuje wyłącznie setName; nie sprawdza zajętości, nie wysyła zapytań i nie normalizuje nazwy podczas pisania. Nie wprowadzono zakazu imienia ani pozornej poprawki walidacji.

Dalsze kierunki: ten sam profil Brave z wyłączonymi rozszerzeniami, sugestiami/autofill i pisownią; porównanie z nowym profilem; symbolizacja Crashpad i porównanie po aktualizacji Brave. To hipotezy, nie ustalona przyczyna. Nie zmieniano ustawień osobistego profilu. Zgłoszenie pozostaje otwarte.

## Reset hasła

Formularze, natywny reset Payload, Resend, trwały limiter, atomowe zużycie tokenu i zakończenie sesji: [architektura](PASSWORD_RECOVERY.md).

PASS: 11 kontroli resetu w izolowanej SQLite; 9 testów jednostkowych; 38 istniejących kontroli integracyjnych; migracja i rzeczywisty limiter PostgreSQL w odizolowanym schemacie; TypeScript/build. Audyt produkcyjnych zależności: 0 zgłoszonych podatności.

PASS przed wdrożeniem funkcji: publiczna rejestracja kontrolowanego konta Jakub, logowanie, prawdziwy mail weryfikacyjny w Gmailu, weryfikacja i odrzucenie powtórnego linku. Konto testowe i jego outbox usunięto; konto właściciela pozostało bez zmian.

NOT TESTED: pełny reset na publicznej domenie z prawdziwym mailem resetującym, stare/nowe hasło i token resetu w produkcji. Użytkownik polecił pominąć dalszy pełny test. Test lokalny i mail weryfikacyjny nie stanowią dowodu doręczenia maila resetującego.

Nie deklarujemy naprawy awarii Brave ani statusu „zero krytycznych problemów” bez potwierdzenia w środowisku użytkownika.

## Audyt zależności developerskich

Pełny audit wykazał 7 alertów high w łańcuchu narzędzi Tailwind/ESLint, wynikających z [braces — głęboko zagnieżdżone wzorce](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Audit produkcyjny nie wykazuje podatności. Sugerowane automatyczne naprawy oznaczają zmianę głównej wersji Tailwind lub wersji ESLint, dlatego nie zastosowano `audit fix --force` w poprawce odzyskiwania hasła. Należy osobno zaplanować migrację narzędzi; nie deklarujemy zerowego audytu wszystkich zależności.
