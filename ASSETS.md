# Materiały i licencje

Fotografie przedstawiają rzeczywiste zawody i służą jako ilustracja ligi simracingowej. Nie są zrzutami z ACC/iRacing ani dokumentacją wydarzeń w demo. Publiczny interfejs udostępnia te informacje pod `/credits`, z linkiem w stopce.

## Nürburgring — GT3

- Autor: **Lukas Raich**.
- Źródło: [GT World Challenge Europe 2024 Nürburg Nr. 48 Auer, Engel, Morad (1)](<https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_Nürburg_Nr._48_Auer,_Engel,_Morad_(1).jpg>).
- Licencja: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Pliki: `public/images/nurburgring-{800,1600,2400}.webp`.
- Zmiany: zmniejszenie i kompresja WebP. Prezentacja obejmuje kadrowanie, maskę oraz nakładki CSS. Pochodne fotografii pozostają na CC BY-SA 4.0.

## Nürburgring — noc

- Autor: **Marc Strauch**.
- Źródło: [24h Nürburgring 2014 — Night Impression](https://commons.wikimedia.org/wiki/File:24h_Nürburgring_2014_-_Night_Impression.jpg).
- Licencja: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/).
- Pliki: `public/images/night-{800,1600,2400}.webp`.
- Zmiany: zmniejszenie i kompresja WebP, kadrowanie i nakładki CSS.

## Plan pętli GP

- Autor: **Pitlane02**.
- Źródło: [Circuit Nürburgring-2013-GP.svg](https://commons.wikimedia.org/wiki/File:Circuit_Nürburgring-2013-GP.svg).
- Licencja: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- Pochodne: `public/images/nurburgring-gp.svg`, obrys w `src/lib/circuits.ts`, prezentacja w `Circuit.tsx`.
- Zmiany: wyodrębnienie ścieżki pętli GP od 2002 roku, usunięcie dodatkowych tras i etykiet, zmiana kolorów oraz projekcja CSS. Pochodny plan pozostaje na CC BY-SA 3.0.
- Jest to schemat, bez pomiarów wysokości i bez deklaracji homologacji konfiguracji konkretnego symulatora.

## Pozostałe materiały

Logo RC i układ interfejsu powstały w kodzie. Nie importowano znaków Formula 1 ani SRO. Nie użyto wygenerowanych obrazów udających screenshoty. Nazwy samochodów i gier opisują dostępne klasy/symulatory; nie oznaczają partnerstwa.

Zrzuty w `docs/screenshots` dokumentują działającą aplikację, zawierają powyższe materiały z zachowaniem ich licencji. Podczas dalszego rozpowszechniania zachowaj atrybucję i odpowiednie warunki Creative Commons. Deklaracja MIT pakietu nie zmienia licencji fotografii ani planu toru.

## Indywidualne fotografie torów — polishing 13.10.2026

- **spa**: [2024 6 Hours of Spa-Francorchamps TF Sport Chevrolet Corvette Z06 GT3.R No.82 (DSC05979).jpg](<https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_GT3.R_No.82_(DSC05979).jpg>) — MarcelX42, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). Pliki `public/images/spa-800.webp` i `spa-1600.webp`. Zmieniono rozmiar i kompresję; kadrowanie i maska CSS. Pochodne zachowują wskazaną licencję.
- **monza**: [BMW M6 GT3.jpg](https://commons.wikimedia.org/wiki/File:BMW_M6_GT3.jpg) — Yuk4woo, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). Pliki `public/images/monza-800.webp` i `monza-1600.webp`. Zmieniono rozmiar i kompresję; kadrowanie i maska CSS. Pochodne zachowują wskazaną licencję.
- **silverstone**: [Lamborghini Huracan GT3, Blancpain GT Series Endurance Cup 2017, Silverstone (30129692558).jpg](<https://commons.wikimedia.org/wiki/File:Lamborghini_Huracan_GT3,_Blancpain_GT_Series_Endurance_Cup_2017,_Silverstone_(30129692558).jpg>) — Spencer Wright from North Walsham, England, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0). Pliki `public/images/silverstone-800.webp` i `silverstone-1600.webp`. Zmieniono rozmiar i kompresję; kadrowanie i maska CSS. Pochodne zachowują wskazaną licencję.
- **imola**: [2025 6 Hours of Imola AF Corse Ferrari 296 No.21 - Heriau, Mann, Rovera.jpg](https://commons.wikimedia.org/wiki/File:2025_6_Hours_of_Imola_AF_Corse_Ferrari_296_No.21_-_Heriau,_Mann,_Rovera.jpg) — Road Atlanta Turn 5, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). Pliki `public/images/imola-800.webp` i `imola-1600.webp`. Zmieniono rozmiar i kompresję; kadrowanie i maska CSS. Pochodne zachowują wskazaną licencję.
- **lemans**: [2023 24 Hours of Le Mans - Ferrari 499P number 51.jpg](https://commons.wikimedia.org/wiki/File:2023_24_Hours_of_Le_Mans_-_Ferrari_499P_number_51.jpg) — Wolkenjaeger, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). Pliki `public/images/lemans-800.webp` i `lemans-1600.webp`. Zmieniono rozmiar i kompresję; kadrowanie i maska CSS. Pochodne zachowują wskazaną licencję.

## Dodatkowe obrysy

- Spa, Monza, Silverstone i Imola: [f1-circuits](https://github.com/bacinger/f1-circuits), Tomislav Bacinger, MIT. Geograficzne współrzędne pętli GP przeliczono na lokalną płaszczyznę z korektą długości geograficznej przez cosinus szerokości; zachowano proporcje. Pliki źródłowe: be-1925.geojson, it-1922.geojson, gb-1948.geojson, it-1953.geojson. Pełna licencja: `public/licenses/f1-circuits-MIT.txt`.
- Le Mans: [Circuit de la Sarthe track map.svg](https://commons.wikimedia.org/wiki/File:Circuit_de_la_Sarthe_track_map.svg), Will Pittenger, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Wyodrębniono path2830, pełną pętlę 24h z szykanami Hunaudières; usunięto etykiety, zmieniono kolor i projekcję. Pochodny obrys w `src/lib/tracks.ts` pozostaje na CC BY-SA 3.0.
- Wszystkie modele korzystają z tego samego SVG/CSS. To przestrzenna prezentacja planu 2D bez deklarowania danych wysokościowych. Żaden plan nie zastępuje obrysu innego toru.

Katalog `src/lib/tracks.ts` łączy istniejące pole CMS `races.track` ze zdjęciem, kadrem, krajem, długością, konfiguracją, obrysem i licencją. Nie dodano tabeli ani migracji. Zdjęcia/obrysy edytuje się w katalogu kodu; ich wybór wynika z nazwy toru w CMS. Nowa, nieznana lokalizacja wymaga dodania zasobów do katalogu — aplikacja nie podstawi przypadkowego toru.
