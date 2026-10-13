import Link from 'next/link'
import React from 'react'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { calculateEntryPoints } from '@/lib/standings'

export const dynamic = 'force-dynamic'

export default async function RaceResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getPayloadClient()

  const raceRes = await payload.find({
    collection: 'races',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  if (raceRes.docs.length === 0) {
    notFound()
  }

  const race = raceRes.docs[0]
  if (!race.isPublished) notFound()

  const resultsRes = await payload.find({
    collection: 'results',
    where: { and: [{ race: { equals: race.id } }, { status: { equals: 'published' } }] },
    depth: 2,
    limit: 1,
  })

  const resultDoc = resultsRes.docs[0]
  if (!resultDoc) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-headline text-3xl font-black text-[#F4F6F8]">
          Brak opublikowanych wyników dla wyścigu: {race.name}
        </h1>
        <p className="text-sm text-[#A1AAB8]">
          Wyniki tej rundy nie zostały jeszcze zatwierdzone przez stewardów zawodów.
        </p>
        <Link
          href="/results"
          className="inline-block px-5 py-2.5 bg-[#202633] text-xs font-headline font-bold text-[#F4F6F8]"
        >
          Wróć do listy wyników
        </Link>
      </div>
    )
  }

  const entries = [...resultDoc.entries].sort((a, b) => a.position - b.position)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-[#303848] pb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/results"
            className="text-xs font-mono font-bold text-[#A1AAB8] hover:text-[#D9162C] transition-colors"
          >
            Wszystkie wyniki
          </Link>
          <span className="text-[#A1AAB8]">•</span>
          <span className="font-mono text-xs px-2.5 py-0.5 bg-[#202633] text-[#F4F6F8] font-bold border border-[#303848]">
            Runda {race.round}
          </span>
          <span className="font-mono text-xs px-2.5 py-0.5 bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/40">
            Zatwierdzone wyniki
          </span>
        </div>

        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black text-[#F4F6F8] tracking-tight">
          {race.name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#A1AAB8]">
          <span>Tor: {race.track}</span>
          <span>•</span>
          <span>
            Data: {new Date(race.date).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}
          </span>
          {resultDoc.publishedAt && (
            <>
              <span>•</span>
              <span>
                Zatwierdzono:{' '}
                {new Date(resultDoc.publishedAt).toLocaleString('pl-PL', {
                  timeZone: 'Europe/Warsaw',
                })}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        role="region"
        aria-label="Przewijana tabela wyników"
        tabIndex={0}
        className="bg-[#151A24] border border-[#303848] overflow-x-auto"
      >
        <table className="w-full text-left text-sm whitespace-nowrap result-table">
          <thead>
            <tr className="bg-[#080b12] border-b border-[#303848] text-xs font-mono text-[#A1AAB8] tracking-wider">
              <th className="py-3.5 px-3 w-12 text-center">Poz</th>
              <th className="py-3.5 px-3 w-14 text-center">Nr</th>
              <th className="py-3.5 px-4 min-w-[200px]">Kierowca</th>
              <th className="py-3.5 px-4 min-w-[150px] hidden sm:table-cell">Zespół</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-4 font-mono">Strata / Odstęp</th>
              <th className="py-3.5 px-4 font-mono text-center">Najszybsze okr.</th>
              <th className="points-cell py-3.5 px-4 text-right font-mono font-bold text-[#F4F6F8]">
                Punkty
              </th>
              <th className="py-3.5 px-4 text-xs text-[#A1AAB8] hidden md:table-cell">
                Uwagi sędziowskie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#303848]">
            {entries.map((entry) => {
              const driver = typeof entry.driver === 'object' ? entry.driver : null
              const points = calculateEntryPoints(
                entry.position,
                entry.finishStatus,
                entry.penaltyPoints ?? 0,
                entry.classified !== false,
              )
              const isWinner =
                entry.position === 1 && entry.finishStatus !== 'dsq' && entry.classified !== false

              return (
                <tr
                  key={entry.id || entry.position}
                  className={`hover:bg-[#202633] transition-colors ${
                    isWinner ? 'bg-[#D9162C]/5 border-l-2 border-[#D9162C]' : ''
                  }`}
                >
                  {/* Position */}
                  <td className="py-3.5 px-3 text-center font-headline text-lg font-black text-[#F4F6F8]">
                    <span className={isWinner ? 'text-[#D9162C]' : ''}>{`P${entry.position}`}</span>
                  </td>

                  {/* Racing Number */}
                  <td className="py-3.5 px-3 text-center">
                    {driver?.racingNumber ? (
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-[#303848] text-[#F4F6F8]">
                        #{driver.racingNumber}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Driver */}
                  <td className="py-3.5 px-4 font-semibold text-[#F4F6F8]">
                    {driver?.name || 'Kierowca'}
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-4 text-xs text-[#A1AAB8] hidden sm:table-cell">
                    {driver?.team || 'Prywatny'}
                  </td>

                  {/* Finish status */}
                  <td className="py-3.5 px-3 text-center font-mono text-xs">
                    <span
                      className={`px-2 py-0.5 font-bold text-xs ${
                        entry.finishStatus === 'finished'
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : entry.finishStatus === 'dnf'
                            ? 'bg-amber-950/60 text-amber-400'
                            : 'bg-red-950/60 text-red-400'
                      }`}
                    >
                      {entry.classified === false
                        ? 'Nieskl.'
                        : entry.finishStatus === 'finished'
                          ? 'Meta'
                          : entry.finishStatus.toUpperCase()}
                    </span>
                  </td>

                  {/* Gap */}
                  <td className="py-3.5 px-4 font-mono text-xs text-[#F4F6F8]">
                    {entry.gap || '—'}
                  </td>

                  {/* Best Lap */}
                  <td className="py-3.5 px-4 font-mono text-xs text-center text-[#A1AAB8]">
                    {entry.bestLap || '—'}
                  </td>

                  {/* Points Awarded */}
                  <td className="points-cell py-3.5 px-4 text-right font-mono font-bold text-base text-[#F4F6F8]">
                    +{points}
                  </td>

                  {/* Notes / Penalties */}
                  <td className="py-3.5 px-4 text-xs text-[#A1AAB8] hidden md:table-cell">
                    {entry.note || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#303848] text-xs font-mono text-[#A1AAB8]">
        <span>Punktacja uwzględnia sklasyfikowanie i kary sędziowskie.</span>
        <Link href="/standings" className="text-[#D9162C] font-bold hover:underline">
          Zobacz zaktualizowaną tabelę mistrzostw
        </Link>
      </div>
    </div>
  )
}
