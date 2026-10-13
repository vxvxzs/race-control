# Race Control — case study techniczne

Race Control łączy publiczny serwis ligi simracingowej, konto kierowcy oraz panel organizatora. Kierowca otrzymuje potwierdzony status zgłoszenia i protokół wyników; steward zarządza tymi samymi danymi w CMS. Istniejącą aplikację Next.js/Payload przeniesiono z lokalnej SQLite do publicznego demo na Vercelu, bez kolejnego redesignu.

## Trwałość w środowisku serverless

Neon PostgreSQL przechowuje dane sportowe, sesje, weryfikację i kolejkę wiadomości. Oficjalny adapter Payload działa z poolingiem i limitem połączeń. Schemat tworzą przejrzane migracje, wykonywane przed buildem pod blokadą transakcyjną; automatyczny schema push jest zablokowany na Vercelu, a lokalne polecenie push ograniczono do SQLite.

Eksport istniejących danych zachował identyfikatory i relacje. Dane prywatne zostały zanonimizowane, dawne konta i tokeny unieważnione. Porównanie przed/po obejmowało liczby dokumentów oraz pełną klasyfikację: 6 wydarzeń, 12 zgłoszeń, 2 protokoły, 16 wpisów wynikowych i identyczne punkty. Wprowadzono dwa niezależne konta administracyjne i kopie do odtworzenia demo.

## Granica transakcji i wysyłki

Zgłoszenie, powiadomienie i outbox zapisują się wspólnie. Dopiero po commit funkcja wywołuje Resend. Atomowe przejęcie wiadomości, stały klucz idempotencji, ograniczona liczba prób i kontrola 23-godzinnego okna chronią przed równoległym lub opóźnionym powieleniem. Zabezpieczony mechanizm odzyskiwania uzupełnia wysyłkę synchroniczną. Krytyczny e-mail weryfikacyjny nie zależy od codziennego crona ani komputera autora.

Status `sent` oznacza przyjęcie przez dostawcę. Dostawę sprawdzono oddzielnie w Gmailu: otrzymano weryfikację oraz decyzje o zgłoszeniu, a link wskazywał publiczną domenę. Po dodaniu dedykowanego DMARC wiadomość o akceptacji miała SPF, DKIM i DMARC pass i była w Odebranych. Pierwsza weryfikacja początkowo trafiła do Spam; nie przypisujemy poprawy folderu wyłącznie zmianie DNS.

## Autoryzacja i reguły sportowe

Local API domyślnie może omijać access control, więc publiczne widoki stosują jawne projekcje. Operacje kierowcy sprawdzają sesję i rolę. Hooki walidują zgłoszenia i wyniki niezależnie od klienta CMS/API. Unique keys chronią duplikaty i sloty; weryfikacja tokena jest warunkową, atomową aktualizacją SQL.

Reviewer może testować sport i demonstracyjnych kierowców, ale nie odczytać lub przejąć konta właściciela, znosić własnych ograniczeń ani pobrać outboxu z tokenami. Odpowiedzi własnych operacji administracyjnych zwracają identyfikator i status, zamiast pełnych powiązanych dokumentów.

Punktacja rozdziela DNF/DSQ od sklasyfikowania. Na publicznym CMS opublikowano DNF P1 z karą: 23 pkt. Zmiana na niesklasyfikowany dała 0. Ponowna publikacja identycznego protokołu nie powieliła powiadomień.

## Weryfikacja i granice

Na docelowej instancji PostgreSQL przeszło 38 kontroli integracyjnych. Publiczne testy objęły rzeczywiste formularze, CMS, role, mail, mobile, punktację i trwałość po kolejnym wdrożeniu. Sesje, zgłoszenie, profil, wyniki i stan odczytu pozostały w Neon. Testowe rekordy usunięto, a baseline sportowy ponownie porównano.

To działające osobiste demo, nie deklaracja skali produkcyjnej: brak testu obciążenia i wielodniowego SLA; telefon sprawdzono w emulacji. Uploady wyłączono, ponieważ kolekcja Media była pusta, a grafiki są wersjonowane i licencjonowane. Przed użyciem jako rzeczywista liga wymagany jest osobny przegląd eksploatacji, limitów i danych osobowych.

Aplikacja: https://race-control-rho.vercel.app · [Wdrożenie](DEPLOYMENT.md) · [Dowody kontroli](docs/production-checks.json)
