import { tracks } from '@/lib/tracks'
import Link from '@/components/AppLink'
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
        {tracks.map((track) => (
          <p key={track.id}>
            <Link href={track.photo.source}>{track.photo.title}</Link> — {track.photo.author},{' '}
            <Link href={track.photo.licenseURL}>{track.photo.license}</Link>. Zmiany: rozmiar,
            kompresja WebP, kadrowanie i nakładki CSS. Pochodne zachowują wskazaną licencję.
          </p>
        ))}
      </section>
      <section className="rules-section" id="circuit">
        <h2>Plany torów</h2>
        {tracks.map((track) => (
          <p key={track.id}>
            <Link href={track.outline.source}>
              {track.name} — {track.outline.variant}
            </Link>{' '}
            — {track.outline.author},{' '}
            <Link href={track.outline.licenseURL}>{track.outline.license}</Link>. Zmiany:
            wyodrębnienie obrysu, projekcja współrzędnych, kolory i perspektywa SVG. Pochodne
            pozostają na wskazanej licencji.
          </p>
        ))}
        <p>
          Perspektywa jest sposobem prezentacji płaskiego obrysu. Nie przedstawia wysokości terenu
          ani homologacji wariantu konkretnego symulatora.
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
