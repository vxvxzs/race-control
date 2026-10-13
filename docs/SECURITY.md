# Bezpieczeństwo i granice weryfikacji

## Zaimplementowane mechanizmy

- Payload uwierzytelnia hasła i sesje; kontrola kolekcji/pól ogranicza dostęp do kont, zgłoszeń i powiadomień. Publiczne widoki przekazują wybrane pola, bez hasła serwera wyścigowego.
- Backend wymaga weryfikacji e-mail przed zgłoszeniem. Unikalne klucze aktywnego zgłoszenia i miejsca na gridzie ograniczają duplikaty i równoczesne przepełnienie.
- Token weryfikacji jest jednorazowy, ma 24 godziny ważności, w użytkowniku przechowywany jest SHA-256. Reset używa mechanizmu Payload, 30 minut ważności, atomowego zużycia, odwołania sesji i limitów w bazie. Link resetu i token Payload pozostają w prywatnych danych/outbox do czasu usunięcia lub nadpisania.
- Operacje własnego API sprawdzają sesję/uprawnienia; middleware blokuje obce Origin przy mutacjach. SameSite i HttpOnly ograniczają część zagrożeń, nie zastępują kontroli dostępu.
- Outbox ma unikalne klucze, atomowe przejęcie oraz ograniczone ponowienia. Przyjęcie przez Resend nie jest gwarancją doręczenia.
- Vercel wymaga PostgreSQL i blokuje schema push. Narzędzia demo są odseparowane od produkcji. Sekrety i artefakty operatora są ignorowane przez Git.

## Pozostałe ograniczenia

Publiczny logout usuwa cookie, ale nie odwołuje skopiowanego tokenu przed wygaśnięciem. Reset hasła i skrypt cofnięcia dostępu reviewera usuwają sesje. Samo disabled kontroluje nowe logowania i nie zastępuje odwołania istniejących sesji.

Bez JavaScript na publicznej stronie działa nawigacja i stopka, lecz strumieniowana treść Next.js może pozostać w stanie ładowania. Pełny widok aplikacji wymaga JavaScript; test odnotowuje to ograniczenie.

Brak niezależnego pentestu, MFA, CAPTCHA, ogólnego rozproszonego limitera wszystkich endpointów oraz potwierdzonej własnej konfiguracji WAF. Rejestracja ujawnia, że adres istnieje (409); odzyskiwanie hasła stosuje odpowiedź ogólną. Uprawnienia Local API domyślnie można ominąć: kod serwerowy wymaga świadomej kontroli użytkownika i pól.

Sportowe hooki zapisują zdarzenia w transakcji operacji Payload. Utworzenie konta, tokenu weryfikacji i outbox nie stanowią jednej wspólnej transakcji; awaria pomiędzy nimi może wymagać ponowienia weryfikacji. Nie ma webhooka potwierdzającego doręczenie ani stałego workera w produkcji. Uploady CMS na Vercelu są wyłączone bez trwałego adaptera storage. Nie wykonano testu obciążenia 100 jednoczesnych kierowców ani pełnego ćwiczenia odtworzenia produkcyjnej bazy.

Audyt zależności z 13.10.2026: `npm audit --omit=dev` — 0 zgłoszeń; pełny audit — 7 high w developerskim łańcuchu `braces`/Tailwind/ESLint. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Nie wymuszano zmian głównych wersji narzędzi. Wynik audytu jest stanem na dzień sprawdzenia, nie certyfikatem bezpieczeństwa.

Skan obecnych sekretów produkcyjnych w dostępnej historii Git nie znalazł dopasowań. W niepublikowanej lokalnej historii istnieją stare podejrzane przykłady konfiguracji; nie są obecnymi sekretami produkcji. Skan wzorców i znanych wartości nie dowodzi braku wszystkich możliwych sekretów.

Zgłoszone zamknięcie całej przeglądarki Brave podczas wpisywania „Jakub” nie zostało odtworzone w czystych profilach Chrome, Edge i Brave. Metadane Crashpad wskazują awarię procesu przeglądarki; przyczyna pozostaje nieustalona. Nie oznaczamy jej jako naprawionej.

## Testy

Polecenia w README obejmują logikę punktów, daty, tokeny, dostęp, stany zgłoszeń, powiadomienia oraz pełny przepływ lokalnego HTTP/przeglądarki. Testy integracyjne i E2E korzystają z oddzielnych baz SQLite. Opcja TEST_POSTGRES jest przeznaczona wyłącznie dla pustej, osobnej bazy; nie dla produkcji. Kontrole publicznej aplikacji muszą unikać destrukcyjnych zmian. Test funkcjonalny sprawdza konkretne zachowania; nie zastępuje audytu bezpieczeństwa ani pentestu.
