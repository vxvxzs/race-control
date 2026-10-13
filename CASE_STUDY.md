# RACE CONTROL — case study techniczne

## Problem i odbiorcy

Mała liga simracingowa potrzebuje wspólnego miejsca dla kalendarza, zapisów, decyzji stewardów i wyników. Arkusz oraz wiadomości na czacie nie zapewniają spójnego statusu zgłoszenia, kontroli liczby miejsc ani powtarzalnej punktacji.

Race Control łączy publiczny serwis ligi, konto kierowcy i panel organizatora. Kierowca sprawdza wydarzenie, zgłasza samochód i numer, otrzymuje decyzję, a po zawodach widzi protokół oraz dorobek. Organizator zarządza tymi samymi danymi w CMS. Projekt jest demonstracją tych procesów, bez deklaracji produkcyjnej skali.

## Dlaczego Next.js i PayloadCMS

Zachowano istniejący stack. Next.js pozwala renderować kalendarz, klasyfikację i protokoły na serwerze, a formularze, countdown i powiadomienia obsługiwać w małych komponentach klienta. Payload dostarcza modele, panel redakcyjny, sesje, uprawnienia i Local API w tym samym projekcie TypeScript.

Ta integracja ogranicza powielanie formularzy administracyjnych i modeli. Wymaga jednak świadomej kontroli granic: serwerowe Local API domyślnie może omijać access control. Publiczny ekran nie może po prostu przekazać całego dokumentu użytkownika lub wyścigu do komponentu klienta.

SQLite upraszcza lokalne uruchomienie i izolowane testy. Wdrożenie używa Neon PostgreSQL z połączeniami pooled, migracjami i ograniczonym poolem. Na docelowej bazie przeszło 38 kontroli integracyjnych; import zachował liczby rekordów, relacje i pełną klasyfikację.

## Przepływ danych

1. Publiczna strona serwerowa pobiera opublikowane wydarzenia lub protokoły przez Local API i tworzy ograniczoną projekcję.
2. Interakcja kierowcy trafia do własnego endpointu, który sprawdza sesję, origin i dane wejściowe.
3. Payload wykonuje operację. Hook kolekcji egzekwuje reguły niezależnie od tego, czy wywołał ją endpoint, czy CMS.
4. Powiązane powiadomienie i outbox używają tego samego `req`, więc należą do transakcji.
5. Funkcja serwerowa po commit przejmuje wiadomość i wywołuje Resend; trwała kolejka, atomowe przejęcie oraz idempotencja umożliwiają ograniczone odzyskiwanie bez lokalnego workera.
6. Klient odświeża rzeczywiste statusy w lekkich interwałach; nie symuluje aktywności.

To jeden projekt i baza, z osobnym procesem dostawy poczty. Nie wprowadzono mikroserwisów ani dodatkowego brokera wyłącznie na potrzeby demonstracji.

## Autoryzacja i weryfikacja

Sesję obsługuje Payload. Role to admin i driver. Panel CMS, decyzje zgłoszeń i publikacja wyników wymagają administratora. Kierowca może odczytać własne zgłoszenia i powiadomienia, edytować dozwolone pola profilu oraz oznaczyć własną wiadomość jako przeczytaną.

Nie wystarcza schowanie przycisku: testy wywołują bezpośrednio własne i natywne endpointy Payload, próbując zmienić rolę, zaakceptować swoje zgłoszenie lub odczytać cudze dane. Pola roli, weryfikacji i widoczności profilu mają niezależne ograniczenia.

Produkt dopuszcza logowanie przed weryfikacją. Zamiast natywnego trybu Payload blokującego takie logowanie zastosowano osobny `emailVerified`. Link zawiera 32 losowe bajty, a konto przechowuje SHA-256 tokenu. Ważność wynosi 24 godziny. Warunkowy UPDATE zużywa token atomowo; ponowne użycie jest odrzucane. Ponowna wysyłka jest ograniczona atomowo do raz na minutę, a nowy link unieważnia poprzedni.

Hasło serwera nie trafia do publicznego HTML ani hydratacji. Jest udostępniane zaakceptowanemu kierowcy po sprawdzeniu jego sesji. Publiczny snapshot zawiera wyłącznie liczbę zaakceptowanych, pojemność i statusy.

## System zapisów

Zgłoszenie ma status pending, accepted, rejected lub cancelled. Rejestracja wymaga zweryfikowanego kierowcy i otwartego, publicznego wyścigu. Unikalny `activeKey` ogranicza jednoczesne aktywne zgłoszenia tej samej osoby.

Akceptacja sprawdza pojemność i rezerwuje unikalny numer miejsca przez `gridKey`. Sama wcześniejsza kontrola liczby rekordów nie wystarcza przy równoległych operacjach: unikalny klucz jest dodatkową ochroną w transakcji. Konflikt nie prowadzi do nadpisania wpisu. Pełne zachowanie równoległych operacji na PostgreSQL pozostaje przedmiotem przyszłej walidacji.

W interfejsie widoczne są stany gościa, niezweryfikowanego konta, formularza, oczekiwania, akceptacji, odrzucenia, pełnej listy i zamkniętych zapisów. Polling zachowuje wpisywany formularz. Moduł jest przypisany do konkretnego wyścigu, więc nawigacja nie przenosi statusu poprzedniego wydarzenia.

## Punktacja i błąd numeru rundy

Pierwotny klucz `roundPoints[round]` był błędny: dwa wyścigi z numerem R1 mogły nadpisywać komórki. Wynik kierowcy był więc zależny od kolejności odczytu dokumentów.

Rozwiązanie to indeksowanie **ID wyścigu**, przy pozostawieniu numeru rundy jako etykiety. Test regresyjny wprost sprawdza dwa różne wyścigi R1, sumę 43 i jedno zwycięstwo. Unikalny `season:round` oraz walidacja przy zapisie chronią dane przed kolejnym konfliktem. W demo iRacing Le Mans oddzielono od ACC Sprint do sezonu Endurance; nie zgadywano nowego numeru ani nie przepisywano rezultatów.

Punktacja pozycji 1–10 wynosi 25, 18, 15, 12, 10, 8, 6, 4, 2, 1. Kary są odejmowane z dolnym ograniczeniem do zera. DNF opisuje nieukończenie; sklasyfikowanie jest odrębną decyzją. Sklasyfikowany DNF może punktować. DSQ lub `classified=false` daje zero.

Klasyfikacja korzysta wyłącznie z opublikowanych protokołów publicznych wyścigów aktywnego sezonu. Countback porównuje wszystkie występujące pozycje. Wspólna projekcja `resultRaces` zasila różne ekrany, ograniczając ryzyko rozbieżnych obliczeń.

## Powiadomienia i outbox

Wiadomości w aplikacji są rekordami przypisanymi odbiorcy, nie logami. Odczyt pozostaje zapisany po odświeżeniu i ponownym logowaniu. Nowe zgłoszenie, decyzja, anulowanie i publikacja wyników tworzą odpowiednie zdarzenia.

Hook nie wysyła poczty przez sieć. Gdyby zrobił to przed ostatecznym commit, odbiorca mógłby otrzymać wiadomość o wycofanej operacji. Outbox zapisany w transakcji rozwiązuje ten problem; osobny worker odczytuje zatwierdzone rekordy.

Unikalne klucze ograniczają powtórzenia. Dla wyników używany jest skrót semantycznej treści, niezależny od technicznych ID wierszy. Worker atomowo przejmuje pending jako sending, zapisuje próby i błędy oraz ogranicza retry.

SMTP nie daje gwarancji dokładnie jednokrotnej dostawy. Niejednoznaczna awaria wymaga decyzji operatora. Resend ma własne ograniczone okno idempotencji. Lokalny preview jest faktycznie sprawdzony; integracji z dostawcą nie utożsamia się z potwierdzonym otrzymaniem wiadomości.

## System wizualny

Kompozycja rozdziela prezentację wydarzeń od czytania danych. Hero wykorzystuje duży kadr, ukośną maskę, bezpieczny ciemny obszar tekstu i dominujący tytuł. Harmonogram ma jasne tło i mocne daty; klasyfikacja sportową hierarchię, a komunikaty formę redakcyjnej listy. Tabele pozostają spokojne.

Paleta opiera się na `#080B12`, `#151A24`, `#202633`, bieli `#F4F6F8` i tekście pomocniczym `#A1AAB8`. Intensywna czerwień identyfikuje ligę; przyciski mają ciemniejszy odcień poprawiający kontrast białych napisów. Zieleń sygnalizuje stan, błękit pojawia się oszczędnie w planie i fotografii.

Usunięto zbędne slogany, numerowanie dekoracyjne i powtarzające się etykiety. Daty, statusy, samochody, numery i etykiety formularzy pozostały, ponieważ pomagają wykonać zadanie.

Fotografie pozyskano z jawnie licencjonowanych źródeł. Nürburgring pokazuje właściwe miejsce; ogólna ilustracja na innych wydarzeniach jest podpisana. Plan SVG odwzorowuje źródłową pętlę GP. Perspektywa tworzy głębię bez udawania znajomości wysokości toru.

## Ruch i decyzje wydajnościowe

CSS i Web Animations API wystarczają do reveal, hover, panelu powiadomień i przemieszczeń w tabeli. Nie dodano GSAP ani WebGL. Ruch korzysta głównie z transform i opacity, a obserwator uruchamia reveal po wejściu elementu do widoku.

Hero nie powtarza animacji przy powrocie przez nawigację klienta. Liczby startują od właściwej wartości i interpolują wyłącznie rzeczywistą zmianę. Countdown używa chwili UTC, a daty są formatowane w Europe/Warsaw. Po upływie terminu nie pokazuje liczb ujemnych.

Reduced motion wyłącza dekoracyjne animacje. Układ toru jest statyczny na coarse pointer i płaski w reduced motion. Treść publicznego hero pozostaje dostępna bez JavaScript. Zdjęcia mają warianty WebP i responsywny srcset; nie ma zewnętrznego ładowania fontów.

Nie zadeklarowano płynności fizycznego telefonu ani wyników Core Web Vitals bez pomiaru. Testowane szerokości, przejścia i brak overflow są konkretną weryfikacją layoutu.

## QA: problemy i poprawki

| Znalezisko                                          | Rozwiązanie                                                    |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Nadpisywanie wyników dwóch R1                       | Klucze ID wyścigu, test regresji i unikalny klucz sezonu/rundy |
| DNF utożsamiony z brakiem punktów                   | Osobne sklasyfikowanie, wspólna funkcja i testy decyzji        |
| CEST dopisane przez cały rok                        | Intl z Europe/Warsaw i test zmiany czasu                       |
| Publiczne konta, zbyt szerokie dokumenty            | Ograniczenia kolekcji/pól i jawne projekcje serwerowe          |
| Wielokrotne powiadomienia po zapisie                | Unikalne klucze i semantyczny skrót protokołu                  |
| Testowe nazwy i zgłoszenie w publicznym demo        | Idempotentna kuracja bez kasowania historii                    |
| Polling mógł odtwarzać domyślne wartości formularza | Inicjalizacja tylko raz, test zachowania wpisanego numeru      |
| Stan poprzedniego wydarzenia po nawigacji           | Tożsamość widgetu według slugu i czyszczenie pustego statusu   |
| Kolizja działającego dev z buildem                  | Osobne katalogi .next-development i .next-production           |
| Nieaktualny Docker MongoDB                          | Usunięcie konfiguracji sprzecznej z faktycznym adapterem       |

Testy jednostkowe, integracja i scenariusz HTTP sprawdzają logikę oraz pełny przebieg użytkownika. Osobny test widoków sprawdza rzeczywiste ekrany, szerokości, menu, klawiaturę, reduced motion, powrót przez SPA i upływ countdownu. Ręczna ocena zrzutów uzupełnia automatyczne asercje.

## Granice demonstracji

Nie wykonano publicznego wdrożenia, realnej dostawy e-mail, migracji PostgreSQL, dużego obciążenia ani niezależnego pentestu. Audyt zależności pozostawia łańcuch braces opisany w HANDOFF. Zanim aplikacja obsłuży rzeczywistą ligę, potrzebne są też procedury operatora, retencja, odzyskiwanie kont i monitoring.

Nie jest to historia wielomiesięcznej realizacji. Dokument opisuje faktyczny stan aplikacji rozwijanej z udziałem narzędzi AI i decyzje, które można pokazać w źródłach oraz testach.

## Pliki warte poznania przed rozmową

| Plik/moduł                                           | O czym opowiedzieć                                |
| ---------------------------------------------------- | ------------------------------------------------- |
| `src/payload.config.ts` i `src/collections/`         | Integracja CMS, modele i access control           |
| `src/lib/league-hooks.ts`                            | Reguły zapisów i transakcyjne zdarzenia           |
| `src/lib/standings.ts` i `result-view.ts`            | Punktacja, countback i klucze wyników             |
| `src/lib/atomic.ts`, `verification.ts`               | Atomowe tokeny, throttling i przejmowanie poczty  |
| `src/lib/notifications.ts`, `src/mail-worker.ts`     | Outbox, retry i granice dostawy                   |
| `src/components/RaceRegistrationWidget.tsx`          | Stany zapisów i odświeżanie bez utraty formularza |
| `src/components/Motion.tsx`, `Circuit.tsx`           | Progresywny ruch, FLIP i sourced SVG              |
| `src/app/(frontend)/tokens.css`, `art-direction.css` | System wizualny i responsywność                   |
| `tests/core.test.ts`, `countdown.test.ts`            | Małe regresje domenowe                            |
| `tests/integration.ts`, `http-flow.ts`, `visual.ts`  | Dowody integracji i rzeczywistego przebiegu       |
