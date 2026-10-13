# Polishing — 13.10.2026

Sześć wydarzeń ma indywidualne fotografie i poprawne obrysy konfiguracji. `RacePhoto`, `Circuit`, `Podium` i `Status` odpowiadają za wspólną prezentację. Katalog `src/lib/tracks.ts` jest powiązany z istniejącym polem CMS Tor wyścigowy (również pełną nazwą Imoli). Nie wykonano migracji ani zmian danych. Zasoby, źródła i warunki licencji opisuje [ASSETS.md](../ASSETS.md) oraz publiczne `/credits`.

Podium P1/P2/P3 pokazuje nazwiska, zespoły i odstępy; ten sam komponent obsługuje archiwum i protokół. W klasyfikacji po pozycji i kierowcy są punkty oraz strata, potem rundy i statystyki. Top 3 i miejsca na podium w rundach mają oszczędne akcenty. Na telefonie klasyfikacja i protokół używają rozwijanych szczegółów. Usunięto techniczne mikropodpisy, podniesiono czytelność statusów i małych danych.

## Przycinanie

Przed zmianą wejście na stronę główną uruchamiało 11 pobrań RSC w tle, a wydarzenie 9. Domyślne pobieranie podstron przez widoczne linki obciążało dynamiczny CMS/bazę i sieć. Wspólny AppLink wyłącza automatyczny prefetch; nawigacja ma własny natychmiastowy stan ładowania. Kursor na planie aktualizuje transformację raz na klatkę, bez ponownego mierzenia elementu przy każdym ruchu. Aktualizacja pozycji mierzy tylko widoczne wiersze razem, animuje wyłącznie zmianę pozycji. Telefon i reduced-motion zachowują statyczny plan. Panel kierowcy nie odświeża się w ukrytej karcie.

Dwusekundowa próbka przewijania przed zmianą nie odtworzyła stałego zacinania: 0 klatek >50 ms. Nadmiar pobrań jest potwierdzony; nie dowodzi to wyłącznej przyczyny każdego przycięcia na urządzeniu użytkownika. To lekka obserwacja, bez benchmarku obciążenia czy gwarancji FPS.

## Kontrola

- PASS: TypeScript oraz lokalny build produkcyjny z kontrolą typów i lintem; pozostały wcześniejsze ostrzeżenia any w skryptach/backendzie.
- PASS: gościnny przegląd sześciu wydarzeń, wyników, protokołu i klasyfikacji desktop/mobile; strona główna, kalendarz, kierowcy i formularze odczytowo. Brak poziomego overflow i błędów wykonania JS w sprawdzonych widokach.
- NOT TESTED: pełne testy jednostkowe, integracyjne i E2E, wysyłka poczty, publikacja wyników i mutujące scenariusze kont/zapisów. Zgodnie z prośbą użytkownika nie powtarzano wymagających testów ani operacji na danych produkcyjnych.
- Logika punktacji, API, uprawnienia, autoryzacja, sekrety i infrastruktura pozostają bez zmian; pełna regresja funkcjonalna nie została ponownie potwierdzona.

Punkt powrotu lokalnie: tag `polish-start-e0f2217`. Wdrożenie produkcyjne jest weryfikowane osobno po zatwierdzonym buildzie.
