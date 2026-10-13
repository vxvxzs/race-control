import Link from 'next/link'
export const metadata = { title: 'Materiały i licencje — Race Control' }
export default function CreditsPage() {
  return (
    <div className="page-width page-content credits-page">
      <header className="page-heading">
        <h1>Materiały i licencje</h1>
        <p>
          Zdjęcia rzeczywistych zawodów służą jako ilustracja ligi simracingowej. Nie są zrzutami z
          symulatora ani relacją z wyścigów w kalendarzu demo.
        </p>
      </header>
      <section className="rules-section">
        <h2>Fotografie</h2>
        <p>
          <Link href="https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_Nürburg_Nr._48_Auer,_Engel,_Morad_(1).jpg">
            GT World Challenge Europe 2024, Nürburgring, Mercedes-AMG nr 48
          </Link>{' '}
          — Lukas Raich,{' '}
          <Link href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</Link>. Zmiany:
          rozmiar, kompresja WebP oraz kadrowanie i nakładki CSS. Pochodne zdjęcia pozostają na CC
          BY-SA 4.0.
        </p>
        <p>
          <Link href="https://commons.wikimedia.org/wiki/File:24h_Nürburgring_2014_-_Night_Impression.jpg">
            24h Nürburgring 2014 — Night Impression
          </Link>{' '}
          — Marc Strauch, <Link href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</Link>
          . Zmiany: rozmiar, kompresja WebP oraz kadrowanie i nakładki CSS.
        </p>
      </section>
      <section className="rules-section" id="circuit">
        <h2>Plan toru</h2>
        <p>
          <Link href="https://commons.wikimedia.org/wiki/File:Circuit_Nürburgring-2013-GP.svg">
            Circuit Nürburgring-2013-GP.svg
          </Link>{' '}
          — Pitlane02,{' '}
          <Link href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</Link>.
          Wyodrębniono obrys pętli Grand Prix od 2002 roku, usunięto etykiety i poboczne trasy,
          zmieniono kolory oraz sposób prezentacji. Zmodyfikowany plan pozostaje na CC BY-SA 3.0.
          Perspektywa to efekt interfejsu, nie pomiar wysokości ani homologowany plan konkretnej
          konfiguracji symulatora.
        </p>
      </section>
      <section className="rules-section">
        <h2>Dane demonstracyjne</h2>
        <p>
          Sportowe profile, zespoły, wyniki i komunikaty z seeda są przykładowe. Nie potwierdzają
          udziału rzeczywistych kierowców ani powiązania z Formula 1, SRO, zespołami i producentami
          samochodów. Własne konta i zgłoszenia działają na rzeczywistej bazie danych.
        </p>
      </section>
    </div>
  )
}
