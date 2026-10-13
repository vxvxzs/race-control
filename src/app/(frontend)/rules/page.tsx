import Link from 'next/link'
import React from 'react'

export const metadata = {
  title: 'Regulamin sportowy — RACE CONTROL',
  description:
    'Kodeks sportowy, zasady zachowania na torze, procedura protestów oraz taryfikator kar ligowych.',
}

export default function RulesPage() {
  return (
    <div className="page-width page-content rules-page">
      <div className="page-heading">
        <h1 className="font-headline text-4xl sm:text-5xl font-black text-[#F4F6F8] tracking-tight">
          Regulamin sportowy
        </h1>
        <p className="text-sm text-[#A1AAB8]">
          Oficjalne zasady obowiązujące wszystkich uczestników ligi RACE CONTROL.
        </p>
      </div>

      <div className="rules-layout">
        <nav className="rules-toc" aria-label="Spis treści regulaminu">
          <Link href="#format">Format weekendu</Link>
          <Link href="#registration-rules">Zgłoszenia i weryfikacja</Link>
          <Link href="#points">Punktacja i remisy</Link>
          <Link href="#protests">Incydenty i protesty</Link>
        </nav>
        <div className="rules-body">
          <section id="format" className="rules-section">
            <div className="flex items-center gap-2 border-b border-[#303848] pb-2">
              <h2 className="font-headline text-xl font-bold text-[#F4F6F8]">
                Format weekendu wyścigowego
              </h2>
            </div>
            <ul className="list-disc list-outside space-y-1.5 pl-2 text-xs font-mono">
              <li>
                <strong className="text-[#F4F6F8]">Trening oficjalny:</strong> 30 minut (serwer
                otwarty od 19:30 czasu polskiego)
              </li>
              <li>
                <strong className="text-[#F4F6F8]">Kwalifikacje:</strong> 15 minut (rozpoczęcie o
                20:00 czasu polskiego)
              </li>
              <li>
                <strong className="text-[#F4F6F8]">Wyścig główny:</strong> 45-50 minut z procedurą
                startu lotnego
              </li>
              <li>
                <strong className="text-[#F4F6F8]">Obowiązkowy pitstop:</strong> minimum 1 wizyta w
                alei serwisowej z dolewką paliwa lub wymianą opon
              </li>
            </ul>
          </section>

          <section id="registration-rules" className="rules-section">
            <div className="flex items-center gap-2 border-b border-[#303848] pb-2">
              <h2 className="font-headline text-xl font-bold text-[#F4F6F8]">
                Zgłoszenia i weryfikacja
              </h2>
            </div>
            <p>
              Każdy kierowca zgłaszający się do wyścigu musi posiadać konto z potwierdzonym adresem
              e-mail oraz wybrać własny numer startowy. Zgłoszenia podlegają akceptacji przez
              administratorów ligi (stewardów). Kierowca ze statusem
              <span className="text-emerald-400 font-bold font-mono mx-1">Zaakceptowano</span>
              otrzymuje bezpośredni dostęp do hasła serwera zawodów. W przypadku rezygnacji,
              kierowca ma obowiązek anulować zgłoszenie przed zamknięciem listy startowej.
            </p>
          </section>

          <section id="points" className="rules-section">
            <div className="flex items-center gap-2 border-b border-[#303848] pb-2">
              <h2 className="font-headline text-xl font-bold text-[#F4F6F8]">Punktacja i remisy</h2>
            </div>
            <p>Punkty przyznawane są dla pierwszych 10 pozycji w oficjalnym protokole:</p>
            <div className="p-3 bg-[#080b12] border border-[#303848] font-mono text-xs text-[#F4F6F8]">
              P1: 25 pkt | P2: 18 pkt | P3: 15 pkt | P4: 12 pkt | P5: 10 pkt | P6: 8 pkt | P7: 6 pkt
              | P8: 4 pkt | P9: 2 pkt | P10: 1 pkt
            </div>
            <p>
              DNF może otrzymać punkty za sklasyfikowaną pozycję. Niesklasyfikowany zawodnik i DSQ
              otrzymują 0 punktów. Decyzje stewardów oraz kary punktowe są uwzględniane w
              klasyfikacji.
            </p>
            <p className="text-xs">
              W przypadku równej liczby punktów w klasyfikacji generalnej, o kolejności decyduje w
              pierwszej kolejności liczba zwycięstw (1. miejsc), a następnie liczba najwyższych
              zdobytych pozycji (2. miejsc, 3. miejsc itd.).
            </p>
          </section>

          <section id="protests" className="rules-section">
            <div className="flex items-center gap-2 border-b border-[#303848] pb-2">
              <h2 className="font-headline text-xl font-bold text-[#F4F6F8]">
                Incydenty i protesty
              </h2>
            </div>
            <p>
              Protesty po wyścigu można zgłaszać do 24 godzin po zakończeniu sesji. Panel stewardów
              analizuje powtórki z serwera. Kary mogą obejmować:
            </p>
            <ul className="list-disc list-outside space-y-1 pl-2 text-xs font-mono">
              <li>Ostrzeżenie formalne</li>
              <li>Doliczenie kary czasowej (+5s / +10s / +30s)</li>
              <li>Odjęcie punktów karnych w klasyfikacji generalnej</li>
              <li>Dyskwalifikacja z wyścigu (DSQ) w przypadku rażącego niesportowego zachowania</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
