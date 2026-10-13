# RACE CONTROL — przekazanie produkcji

Stan na 13 października 2026: działające publiczne demo, trwała baza Neon i rzeczywista poczta Resend. Publiczny adres: https://race-control-rho.vercel.app; CMS: /admin. Prywatne źródła: https://github.com/vxvxzs/race-control.

## Potwierdzony zakres

Na publicznej domenie przeszło 67 kontroli funkcjonalnych, 43 kontrole przeglądarkowe, 10 kontroli wartości prywatnych oraz 4 kontrole po sprzątaniu. Obejmują formularz rejestracji i logowania, wiadomość weryfikacyjną, aktywację, token błędny/wygasły/ponownie użyty, throttle, zgłoszenie, anulowanie, odrzucenie i akceptację, mobile polling, powiadomienia, profil, wylogowanie i ponowne logowanie.

Administrator rzeczywiście zalogował się do publicznego CMS, utworzył i zmienił wydarzenie, opublikował protokół i komunikat. Sklasyfikowany DNF P1 z karą 2 pkt dał 23, a niesklasyfikowany 0. Reviewer zalogował się osobno; odmówiono mu odczytu/zmiany właściciela i odczytu kolejki z tokenami. Sprawdzono blokady roli kierowcy, prywatne hasła, obcy origin i endpoint odzyskiwania.

Nowe wdrożenie zachowało istniejące sesje, świeże logowanie, zgłoszenie, wyniki, profil oraz odczytane powiadomienie. Po testach usunięto tymczasowe wydarzenie, protokół, zgłoszenia, komunikat i kierowcę. Testowy e-mail można ponownie wykorzystać do rejestracji.

## Dane i konta

Zachowano 6 wydarzeń, 12 zgłoszeń, 2 protokoły i 16 wpisów wynikowych oraz identyczną klasyfikację. Najbliższe Nürburgring: 7/24 zaakceptowanych. Zachowano relacje/identyfikatory i archiwalne powiadomienia. Lokalne prywatne dane zanonimizowano; stare konta mają nowe losowe hasła, nieaktywne logowanie i unieważnione lokalne tokeny. Historycznych wiadomości nie wysyłano.

Aktywne konta administratora są dwa: właściciel i Przemysław. Dane logowania wyłącznie w ignorowanym `work/production-accounts.private.json`; plik ma uprawnienia bieżącego użytkownika Windows i SYSTEM. Nie przekazuj reviewerowi pliku ze wszystkimi kontami — przekaż tylko jego wpis. Dostęp do infrastruktury i źródeł GitHub pozostaje osobną decyzją właściciela.

Po prezentacji `npm run reviewer:revoke` blokuje konto i unieważnia sesje. Instrukcje dodawania administratorów, backupu, resetu sportowego demo i kolejnej publikacji: [DEPLOYMENT.md](DEPLOYMENT.md).

## Poczta i utrzymanie

Trwały outbox wysyłany jest po commit; native CMS i własne API mają tę samą ścieżkę. Ograniczone próby i stały klucz Resend; operator przegląda błędy w Email Outbox. Produkcja nie wymaga mail:worker. Ostatnia kontrola: 10 przyjętych rzeczywistych wiadomości, 17 stłumionych demo/archiwalnych, 0 pending/sending/failed. Przyjęcie przez API nie jest dowodem odbioru: odbiór wiadomości i publiczny link sprawdzono niezależnie przez Gmail.

Pierwsza wiadomość była początkowo w Spam, później była widoczna w Odebranych; kolejne decyzje dotarły do Odebranych. Dodano DMARC wyłącznie dla mail.jalochabuilds.site. Ostatnia wiadomość: SPF/DKIM/DMARC pass. Nie gwarantujemy klasyfikacji przyszłych wiadomości przez każdego dostawcę. Klucz wysyłkowy nie pozwala odczytać zarządzanego statusu domeny ani billingów.

Nie włączono płatnych usług. Vercel Hobby potwierdzono, a darmowe limity Neon/Resend opisano w DEPLOYMENT.md. Nie modyfikowano innych projektów ani strony jalochabuilds.site. Dla subdomeny poczty dodano tylko dedykowany TXT DMARC.

## Ograniczenia i dowody

Testy telefonu wykonano w emulacji Chrome. Nie wyłączano fizycznie komputera, nie wykonywano testu obciążenia ani wielodniowego monitoringu, nie czekano na przyszłą godzinę automatycznego crona. Zabezpieczony endpoint odzyskiwania przetestowano wywołaniem produkcyjnym. Odtworzenie całego surowego backupu oraz odebranie dostępu finalnemu reviewerowi nie były wykonywane na tej instancji.

Build, typy i formatowanie przeszły; lint ma 25 ostrzeżeń any. Produkcyjny audit: 0 podatności. Niewykorzystywana w runtime część narzędzi developerskich pozostaje osobnym zakresem audytu. Zachowano istniejącą parę Next/Payload i legacy-peer-deps; testy publiczne potwierdzają działanie, nie zastępują przyszłego przeglądu zgodności peer dependencies.

[Surowe kontrole bez sekretów](docs/production-checks.json). Prywatne kopie SQLite i Neon oraz demo-export pozostają w work. Lokalna historia master została zachowana wraz z prywatnym bundle; opublikowana gałąź main zaczyna się od czystego snapshotu, bez dawnego przykładowego sekretu z historycznego README.
