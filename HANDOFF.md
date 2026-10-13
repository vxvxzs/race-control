# RACE CONTROL — przekazanie

## Stan

Końcowa iteracja art direction i motion została wykonana w istniejącej aplikacji. Zachowano Next.js, PayloadCMS, dane sportowe, konta, zapisy, wyniki oraz system powiadomień. Wdrożenie produkcyjne: osobny projekt Vercel, Neon PostgreSQL oraz trwały outbox Resend. Adres i procedury operatora: [DEPLOYMENT.md](DEPLOYMENT.md). Testy publiczne są w toku; wcześniejsze kontrole opisane poniżej dotyczą iteracji lokalnej.

Punkt przywracania przed redesignem: **`6a8037c`** (`chore: preserve working league platform before final art direction`). Kopia bazy przed tym etapem: `work/art-direction-before.db`. Kopia kodu w Git nie zawiera ignorowanej bazy ani sekretów.

## Co zmieniono

- Nowa paleta blue-black, wyraźna typografia i oszczędne akcenty czerwieni/błękitu. Tokeny w `tokens.css`.
- Strona główna z asymetrycznym hero, licencjonowaną fotografią, rzeczywistym countdownem, dostępnością, jasnym harmonogramem i sportową klasyfikacją.
- Strona wydarzenia z szerokim zdjęciem, mocnym tytułem, modułem zapisów, briefingiem, listą startową i planem Nürburgringu.
- Spójne kalendarz, roster, protokoły, klasyfikacja, regulamin ze spisem treści i formularze konta.
- Panel kierowcy z numerem, następnym zgłoszeniem, dorobkiem, historią wyników i najnowszymi powiadomieniami.
- Usunięte slogany, dekoracyjne etykiety, nadmiar strzałek, przypadkowa kapitalizacja i fikcyjna deklaracja podpisu elektronicznego.
- Responsywne WebP 800/1600/2400, priorytet hero, zarezerwowane wymiary; brak zewnętrznego dostawcy fontów.
- Dokumentacja, źródła materiałów, powtarzalny przegląd przeglądarkowy, ESLint i Prettier. Build sprawdza lint oraz typy.

Zdjęcia są autentyczne i mają jawne licencje. Nürburgring ma właściwe zdjęcie i obrys. Pozostałe tory używają wyraźnie opisanej ogólnej ilustracji ligi. Nie przypisano im fałszywej geometrii.

Development i produkcja używają osobnych katalogów .next-development i .next-production. Rozwiązuje to wykrytą kolizję z równolegle działającym serwerem developerskim, który nadpisywał artefakty builda.

## Motion i wydajność

`Motion.tsx` obserwuje widoczne elementy i animuje transform/opacity przez Web Animations API. Hero pojawia się przez 800 ms, wiersze przez 440 ms, hover zwykle 160 ms. Odwiedzony element nie odtwarza reveal ponownie przy powrocie przez nawigację klienta. Pełne przeładowanie rozpoczyna nowy cykl. Treść pozostaje widoczna bez JavaScript.

Liczby pokazują wartość danych od pierwszego renderu; animują wyłącznie rzeczywistą zmianę. Klasyfikacja odświeża się co 30 sekund i stosuje FLIP przy zmianie pozycji. Nie ma losowych wzrostów ani sztucznej aktywności. Dostępność i status zgłoszenia odświeżają się co 15 sekund. Formularz zachowuje niewysłane dane.

`Circuit.tsx` przedstawia pozyskany z wiarygodnego SVG obrys Nürburgring GP. Dwie płaskie warstwy i perspektywa CSS dają przestrzenność; nie są modelem ukształtowania terenu. Ruch myszą subtelnie zmienia nachylenie, a przycisk ma obsługę klawiatury. Mobile/coarse pointer otrzymuje statyczny wariant. Reduced motion wyłącza dekoracyjny ruch i ustawia płaski plan.

Nie dodano GSAP, WebGL ani obowiązkowej sekwencji świateł. Nie ma zadeklarowanych wyników FPS/Core Web Vitals bez pomiaru. Testy szerokości Chrome nie dowodzą wydajności fizycznego telefonu.

## Dane i porządki techniczne

`npm run demo:curate` jest idempotentnym narzędziem dla znanych danych legacy:

- Ukrywa trzy dawne konta testowe i dodatkowy duplikat seeda w rosterze i anuluje ich aktywne zgłoszenia na nadchodzące wydarzenia, zachowując konta i historię.
- Zmienia dawną demonstracyjną nazwę Robert Kubica na fikcyjną Rafał Kubiak, bez zmiany identyfikatora zawodnika.
- Oddziela iRacing 10H Le Mans od ACC Sprint do sezonu **iRacing Endurance 2026**, zachowując rundę 1. Konflikt z R1 Spa w sezonie 2026/2027 został rozwiązany przez właściwe rozdzielenie serii.
- Uzupełnia klucze rund i poprawia tytuły znanych komunikatów.

Publiczny seed nie dodaje nazw QA. Dwukrotny przebieg na osobnej bazie potwierdził 9 kont, 5 wyścigów, 7 zgłoszeń, 2 protokoły i 16 wierszy wyników bez przyrostu przy drugim uruchomieniu. Seed rozpoznaje także przemianowaną historyczną tożsamość demonstracyjną. Dane testowe nadal powstają w oddzielnych bazach. `publicProfile` jest polem kontrolowanym przez administratora, nie ukrytym sposobem podnoszenia uprawnień.

Ujednolicono projekcję wyników w `result-view.ts` i typ panelu kierowcy w `career.ts`. Usunięto powieloną walidację pojemności z endpointu stewardów; źródłem reguły pozostaje hook kolekcji. Usunięto przykładowy endpoint, stary alias testu, nieużywane zależności, stare fotografie bez dokumentacji praw oraz nieaktualny Docker z MongoDB. Style wspólne i tokeny oddzielono od warstwy art direction; usunięto nieużywane reguły dawnego hero.

ESLint nie zgłasza błędów. Pozostałe ostrzeżenia `no-explicit-any` dotyczą dawnych granic adaptera/hooków, skryptów i fixture testowych; nie maskowano ich globalnym wyłączeniem reguły. Publiczne widoki i komponenty mają jawne typy. Stabilne mechanizmy transakcji zachowano.

## Reguły backendu i bezpieczeństwo

| Obszar              | Zachowanie                                                                  |
| ------------------- | --------------------------------------------------------------------------- |
| Sesja i role        | Autoryzacja Payload; CMS i decyzje dostępne administratorowi                |
| Konto               | Rejestracja przez walidowany endpoint; brak publicznej listy kont           |
| Pola chronione      | Kierowca nie zmieni roli, weryfikacji ani widoczności profilu               |
| Registrations       | Odczyt własnych/admina; mutacje kierowcy przez kontrolowane endpointy       |
| Limit miejsc        | Walidacja hooka, aktywny klucz i unikalna rezerwacja miejsca                |
| Results             | Modyfikacja przez admina; publicznie wyłącznie opublikowane protokoły       |
| Hasło serwera       | Nie trafia do publicznego HTML, hydratacji ani publicznego REST             |
| Snapshot miejsc     | Tylko liczba zaakceptowanych, pojemność i statusy publicznego wydarzenia    |
| Powiadomienia       | Własny odbiorca i odczyt; brak prawa zmiany treści lub odbiorcy             |
| E-mail              | Token 32 losowe bajty, SHA-256 w koncie, 24h, atomowe jednokrotne zużycie   |
| Ponowna weryfikacja | Atomowe ograniczenie raz na minutę; nowy link unieważnia poprzedni          |
| Sekrety             | Brak publicznych haseł demo; .env, bazy, work i skrzynka pomijane przez Git |

Zmiana adresu e-mail przez formularz profilu jest zablokowana, aby nie przenosić istniejącej weryfikacji na inny adres. Zalogowanie przed potwierdzeniem jest dozwolone; zapis na wyścig wymaga potwierdzenia również na backendzie.

### Punktacja

Komórki wyników są indeksowane ID wyścigu. Test regresji obejmuje dwie różne rundy z tym samym numerem: 25 + 18 = 43 i jedno zwycięstwo, bez nadpisania komórki. `season:round` jest walidowany przy zapisie. DNF i sklasyfikowanie są niezależne; DSQ lub brak sklasyfikowania daje zero. Kary są odejmowane, a countback uwzględnia wszystkie występujące pozycje.

Daty używają `Europe/Warsaw`, nie dopisanego na stałe CEST. 25.10.2026, 19:00 UTC jest wyświetlane jako 20:00 CET. Countdown odejmuje rzeczywiste chwile UTC i po upływie terminu zastępuje cyfry komunikatem.

### Powiadomienia i dostawa

Nowe zgłoszenie powiadamia admina i kierowcę; decyzja kierowcę; anulowanie admina; publikacja uczestników i kierowców protokołu. Unikalne klucze i semantyczny skrót wyników ograniczają duplikaty.

Wspólny `req` przekazuje transakcję do zapisów Notifications i EmailOutbox. Hook nie jest wysyłką po commit: dostawę wykonuje osobny worker. [Dokumentacja transakcji Payload](https://payloadcms.com/docs/database/transactions).

Worker ma stany pending/sending/sent/preview/failed i maksymalnie trzy próby. Resend korzysta z klucza idempotencji; [okno dostawcy wynosi 24h](https://resend.com/changelog/idempotency-keys). SMTP używa stałego Message-ID, ale nie gwarantuje dokładnie jednokrotnego dostarczenia. Niejednoznaczny błąd SMTP i rekord sending po przerwaniu workera wymagają sprawdzenia u dostawcy; nie resetuj ich bez oceny. Lokalny preview potwierdza wygenerowanie pliku, nie otrzymanie e-maila.

## Weryfikacja

Końcowy przebieg: **9/9 testów jednostkowych, 34/34 kontrole integracyjne, 55/55 kontroli HTTP/przeglądarki i 43/43 kontrole widoków**. Build, TypeScript, lint (0 błędów, 19 ostrzeżeń) oraz formatowanie przechodzą. Konsola publicznych ekranów i żądania assetów nie wykazały błędów.

Raport końcowy i eksport zrzutów znajdują się również w katalogu outputs rozmowy. Lokalne surowe dowody są ignorowane w Git:

| Kontrola                                                                                                                       | Dowód                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Jednostki: punktacja, DNF/DSQ, countback, DST, tokeny, escaping i countdown                                                    | `npm test`                                          |
| Reguły kolekcji, uprawnienia, limit miejsc, idempotencja, worker i retry                                                       | `npm run test:integration` — 34 kontrole            |
| Formularze, e-mail preview, weryfikacja, zapis, akceptacja, odświeżenie statusu/miejsc, publikacja, odczyt, logowanie i edycja | `work/http-checks.json`                             |
| 17 publicznych tras desktop/mobile oraz dodatkowe szerokości 320/768/1920                                                      | `work/visual-checks.json`                           |
| Klawiatura, reduced motion, brak JS, powrót przez SPA i upłynięty countdown                                                    | `tests/visual.ts`                                   |
| Rzeczywiste zrzuty desktop/mobile i konto na oddzielnej bazie                                                                  | `work/after-*.png`, `docs/screenshots/`             |
| Aktualny audyt zależności                                                                                                      | `work/art-audit.json`, `work/audit-production.json` |
| Porównanie istniejących wierszy protokołów z kopią                                                                             | `work/data-preservation.json`                       |

Zakres obejmuje automatyzację Chrome i ręczną ocenę zrzutów. Nie jest niezależnym audytem dostępności, pentestem ani testem rzeczywistego telefonu.

## Ograniczenia przed publikacją

1. Brak testu faktycznej dostawy SMTP/Resend, reputacji domeny i DNS. Potwierdzony jest lokalny preview.
2. Zachowany adapter PostgreSQL nie był uruchamiany; potrzebne migracje, backup/restore i testy równoległych operacji w docelowym środowisku.
3. Audyt npm: 9 high łącznie, 4 high bez devDependencies. Zgłoszenia wynikają z łańcucha braces; wykonany audyt nie oferuje poprawki źródłowej. Nie stosowano ryzykownego `audit fix --force`.
4. Brak publicznego deploya, pomiarów obciążenia i testów fizycznych urządzeń. Rozmiary bundle z builda są pomiarem kompilacji, nie metryką UX.
5. Produkcja wymaga także decyzji operatora o odzyskiwaniu kont, ochronie przed nadużyciami, retencji danych i obsłudze zgłoszeń użytkowników.
6. Plan przestrzenny istnieje tylko dla Nürburgringu, bez danych wysokości. Pozostałe wydarzenia mają jawną ilustrację ogólną.
7. Dokumentacja opisuje uruchomienie procesów Node; nie dostarczono zweryfikowanego obrazu Docker.

Instrukcje startu, prywatnego administratora i przeglądu są w README. Nie publikuj .env, baz, katalogu work ani prywatnej skrzynki.
