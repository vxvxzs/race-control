# Odzyskiwanie hasła

`/login` prowadzi do `/forgot-password`. Poprawny adres otrzymuje identyczną odpowiedź niezależnie od istnienia konta i wykorzystanego limitu. Sprawdzenie konta i wysyłka wykonują się w serwerowym `after()` Vercela, po odpowiedzi. Niedostępność usługi zwraca ogólny błąd.

Payload generuje token 160-bitowy, ważny 30 minut. Szablon prowadzi do publicznego `/reset-password?token=…`. Wysyłka korzysta z prywatnego outboxa i Resend, od `Race Control <noreply@mail.jalochabuilds.site>`. Opróżniamy wyłącznie odpowiadający prośbie wpis kolejki. Akceptacja Resend nie dowodzi doręczenia do skrzynki.

Reset przyjmuje jedynie token, hasło i potwierdzenie. Hasło ma 10–128 znaków. Warunkowa aktualizacja blokuje rekord w transakcji przed natywnym resetem Payload. Po zmianie usuwamy token i wszystkie sesje, również sesję tworzoną wewnętrznie przez Payload. Użytkownik loguje się nowym hasłem. Rola, e-mail i weryfikacja pozostają bez zmian. Lokalna SQLite dodatkowo serializuje cykl transakcji resetu; PostgreSQL używa blokady rekordu wspólnej dla funkcji serwerowych.

Limity w `auth_request_limits`: 5 próśb na IP / 15 minut, 3 na adres / godzinę, 10 prób ustawienia hasła na IP / 15 minut. Natywny cooldown Payload ogranicza nadanie do raz na minutę. Klucze są HMAC-ami, bez jawnych adresów i IP. Wygasłe wpisy usuwamy po dodatkowej dobie. Limity nie zależą od istnienia konta.

Wejścia `/api/users/forgot-password` i `/api/users/reset-password` stosują tę samą politykę. Hook blokuje obejście przez natywne operacje GraphQL i nieautoryzowany kontekst Local API. Sekret resetu nie jest dostępny przez odczyt użytkownika. Formularz usuwa token z paska adresu; strona ma no-referrer, no-store i noindex. GET nie zużywa tokenu. Logi aplikacji nie zawierają haseł, tokenów ani pełnych wyjątków zapytań. Outbox przechowuje niezbędny link, więc pozostaje dostępny tylko dla właściciela i mechanizmu wysyłki.

Migracja `20261013_130000_auth_request_limits` dodaje wyłącznie tabelę limitów. Istniejące pola resetu i sesje były już w schemacie. Sprawdzono up/down i rzeczywisty limiter w tymczasowym schemacie PostgreSQL zakończonym rollbackiem; wykonano prywatną kopię produkcji.
