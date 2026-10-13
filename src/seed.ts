import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { getPayloadClient } from './lib/payload'

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed disabled in production')
  console.log('🚀 Starting RACE CONTROL database seeding...')
  const payload = await getPayloadClient()

  // 1. Create Admin Account
  console.log('👤 Creating administrator account...')
  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: 'admin@example.test' } },
  })

  let adminUser = existingAdmin.docs[0]
  if (!adminUser) {
    adminUser = await payload.create({
      collection: 'users',
      data: {
        name: 'Race Director (Admin)',
        email: 'admin@example.test',
        password: process.env.SEED_ADMIN_PASSWORD || randomBytes(32).toString('hex'),
        role: 'admin',
        emailVerified: true,
        demoAccount: true,
        racingNumber: 1,
        team: 'Race Control FIA Stewards',
        favoriteCar: 'Safety Car (Porsche 911 GT3)',
      },
    })
  }

  // 2. Create Drivers
  console.log('🏎️ Creating driver accounts...')
  const driversData = [
    {
      name: 'Rafał Kubiak',
      email: 'rafal.kubiak@example.test',
      racingNumber: 88,
      team: 'AF Corse Sim Team',
      favoriteCar: 'Ferrari 296 GT3',
    },
    {
      name: 'Mateusz Banaś',
      email: 'mateusz.banas@example.test',
      racingNumber: 12,
      team: 'Apex GT Motorsport',
      favoriteCar: 'Porsche 992 GT3 R',
    },
    {
      name: 'Piotr Nowak',
      email: 'piotr.nowak@example.test',
      racingNumber: 77,
      team: 'Bavaria Sim Racing',
      favoriteCar: 'BMW M4 GT3',
    },
    {
      name: 'Jan Kowalski',
      email: 'jan.kowalski@example.test',
      racingNumber: 23,
      team: 'Silesia Racing Club',
      favoriteCar: 'Ferrari 296 GT3',
    },
    {
      name: 'Tomasz Wiśniewski',
      email: 'tomasz.w@example.test',
      racingNumber: 99,
      team: 'Vantage Esports',
      favoriteCar: 'Aston Martin Vantage GT3',
    },
    {
      name: 'Lucas Müller',
      email: 'lucas.mueller@example.test',
      racingNumber: 44,
      team: 'Black Falcon Sim',
      favoriteCar: 'Mercedes-AMG GT3 Evo',
    },
    {
      name: 'Kevin Larson',
      email: 'kevin.larson@example.test',
      racingNumber: 5,
      team: 'Nordic Speedworks',
      favoriteCar: 'Audi R8 LMS GT3 Evo II',
    },
    {
      name: 'Jakub Majewski',
      email: 'jakub.m@example.test',
      racingNumber: 17,
      team: 'Papaya Sim Racing',
      favoriteCar: 'McLaren 720S GT3 Evo',
    },
  ]

  const driverDocs: any[] = []
  for (const d of driversData) {
    const found = await payload.find({
      collection: 'users',
      // A renamed legacy demo can retain its old private email. Reuse its sporting identity.
      where: {
        or: [
          { email: { equals: d.email } },
          { and: [{ demoAccount: { equals: true } }, { name: { equals: d.name } }] },
        ],
      },
      sort: 'id',
    })

    if (found.docs.length > 0) {
      driverDocs.push(found.docs[0])
    } else {
      const created = await payload.create({
        collection: 'users',
        data: {
          name: d.name,
          email: d.email,
          password: randomBytes(32).toString('hex'),
          role: 'driver',
          emailVerified: true,
          demoAccount: true,
          racingNumber: d.racingNumber,
          team: d.team,
          favoriteCar: d.favoriteCar,
        },
      })
      driverDocs.push(created)
    }
  }

  // 3. Create Races
  console.log('🏁 Creating championship calendar races...')
  const racesData = [
    {
      name: 'Runda 1 - Grand Prix Spa-Francorchamps',
      slug: 'spa-gt3',
      round: 1,
      track: 'Circuit de Spa-Francorchamps',
      trackCountry: 'Belgia',
      trackLength: '7.004 km',
      date: '2026-09-20T19:00:00.000Z',
      game: 'Assetto Corsa Competizione',
      format: 'Kwalifikacje 15 min + Wyścig 45 min (1 obowiązkowy pitstop z tankowaniem)',
      maxParticipants: 24,
      registrationStatus: 'closed' as const,
      raceStatus: 'completed' as const,
      weather: 'Sucho, 21°C powietrze, 28°C asfalt',
      brief:
        'Inauguracyjna runda sezonu na legendarnym torze w Ardenach. Zmienne przeciążenia w Eau Rouge i Raidillon oraz wymagający zjazd do Blanchimont.',
      regulations:
        'Obowiązkowy pitstop z wymianą opon. Limit incydentów: 35 punktów karno-ostrzegawczych. Podwójna żółta flaga w Raidillon bezwzględnie zakazuje wyprzedzania.',
      serverPassword: 'spa-acc-paddock',
      isPublished: true,
    },
    {
      name: 'Runda 2 - Grand Prix Monza',
      slug: 'monza-gt3',
      round: 2,
      track: 'Autodromo Nazionale Monza',
      trackCountry: 'Włochy',
      trackLength: '5.793 km',
      date: '2026-10-04T19:00:00.000Z',
      game: 'Assetto Corsa Competizione',
      format: 'Kwalifikacje 15 min + Wyścig 45 min (1 obowiązkowy pitstop)',
      maxParticipants: 24,
      registrationStatus: 'closed' as const,
      raceStatus: 'completed' as const,
      weather: 'Słonecznie, 24°C powietrze, 34°C asfalt',
      brief:
        'Świątynia Prędkości. Kluczowe punkty dohamowania przed Variante del Rettifilo i Variante della Roggia. Niezwykle ciasna walka w strugach aerodynamicznych.',
      regulations:
        'Ścisła kontrola ścinania szykan Variante del Rettifilo. Każde zyskanie przewagi skutkuje karą czasową +10s.',
      serverPassword: 'monza-speed-2026',
      isPublished: true,
    },
    {
      name: 'Runda 3 - Grand Prix Nürburgring',
      slug: 'nurburgring-gt3',
      round: 3,
      track: 'Nürburgring GP',
      trackCountry: 'Niemcy',
      trackLength: '5.148 km',
      date: '2026-10-25T19:00:00.000Z', // Nadchodzący wyścig
      game: 'Assetto Corsa Competizione',
      format: 'Kwalifikacje 15 min + Wyścig 50 min (1 obowiązkowy pitstop)',
      maxParticipants: 24,
      registrationStatus: 'open' as const,
      raceStatus: 'upcoming' as const,
      weather: 'Częściowe zachmurzenie, 18°C powietrze, 22°C asfalt',
      brief:
        'Techniczna pętla Grand Prix w górach Eifel. Wymagający kompleks Castrol-S oraz sekcja Schumacher-S weryfikują precyzję prowadzenia i zarządzanie oponami.',
      regulations:
        'Limit toru monitorowany na wyjściu z szykany NGK. Obowiązek odbycia pitstopu w oknie czasowym między 15. a 35. minutą wyścigu.',
      serverPassword: 'eifel-gt3-access',
      isPublished: true,
    },
    {
      name: 'Runda 4 - Grand Prix Silverstone',
      slug: 'silverstone-gt3',
      round: 4,
      track: 'Silverstone Grand Prix Circuit',
      trackCountry: 'Wielka Brytania',
      trackLength: '5.891 km',
      date: '2026-11-08T19:00:00.000Z',
      game: 'Assetto Corsa Competizione',
      format: 'Kwalifikacje 15 min + Wyścig 45 min',
      maxParticipants: 24,
      registrationStatus: 'open' as const,
      raceStatus: 'upcoming' as const,
      weather: 'Lekka mżawka możliwa w 2. połowie, 16°C powietrze',
      brief:
        'Kolebka motorsportu z ultraszybkimi sekwencjami Maggotts, Becketts i Chapel. Niezwykle wysokie obciążenia bocznych opon.',
      regulations: 'Zasady bezpiecznego restartu i przestrzeganie limitów toru w Copse Corner.',
      serverPassword: 'silverstone-uk-992',
      isPublished: true,
    },
    {
      name: 'Runda 5 - Grand Prix Imola',
      slug: 'imola-gt3',
      round: 5,
      track: 'Autodromo Internazionale Enzo e Dino Ferrari',
      trackCountry: 'Włochy',
      trackLength: '4.909 km',
      date: '2026-11-22T19:00:00.000Z',
      game: 'Assetto Corsa Competizione',
      format: 'Finał sezonu: kwalifikacje 20 min + wyścig 60 min (2 pitstopy)',
      maxParticipants: 24,
      registrationStatus: 'open' as const,
      raceStatus: 'upcoming' as const,
      weather: 'Sucho, 20°C powietrze',
      brief:
        'Wielki finał sezonu GT3 Sprint Series. Podjazdy pod Piratella i zjazdy do Acque Minerali na historycznym torze w Imoli.',
      regulations: 'Punktacja zgodnie z regulaminem sezonu. Dwa obowiązkowe pitstopy.',
      serverPassword: 'imola-finale-2026',
      isPublished: true,
    },
  ]

  const raceDocs: Record<string, any> = {}
  for (const r of racesData) {
    const found = await payload.find({
      collection: 'races',
      where: { slug: { equals: r.slug } },
    })

    if (found.docs.length > 0) {
      raceDocs[r.slug] = found.docs[0]
    } else {
      const created = await payload.create({
        collection: 'races',
        data: r,
      })
      raceDocs[r.slug] = created
    }
  }

  // 4. Create Registrations for Races
  console.log('📝 Creating registrations for races...')

  // Registrations for Runda 3 (Nürburgring - Upcoming)
  const nurburgringDrivers = [
    { driver: driverDocs[0], car: 'Ferrari 296 GT3', num: 88, status: 'accepted' as const },
    { driver: driverDocs[1], car: 'Porsche 992 GT3 R', num: 12, status: 'accepted' as const },
    { driver: driverDocs[2], car: 'BMW M4 GT3', num: 77, status: 'accepted' as const },
    { driver: driverDocs[3], car: 'Ferrari 296 GT3', num: 23, status: 'accepted' as const },
    {
      driver: driverDocs[4],
      car: 'Aston Martin Vantage GT3',
      num: 99,
      status: 'accepted' as const,
    },
    { driver: driverDocs[5], car: 'Mercedes-AMG GT3 Evo', num: 44, status: 'pending' as const },
    { driver: driverDocs[6], car: 'Audi R8 LMS GT3 Evo II', num: 5, status: 'pending' as const },
  ]

  for (const reg of nurburgringDrivers) {
    const existing = await payload.find({
      collection: 'registrations',
      where: {
        and: [
          { race: { equals: raceDocs['nurburgring-gt3'].id } },
          { user: { equals: reg.driver.id } },
        ],
      },
    })

    if (existing.docs.length === 0) {
      await payload.create({
        collection: 'registrations',
        context: { skipEvents: true },
        data: {
          race: raceDocs['nurburgring-gt3'].id,
          user: reg.driver.id,
          carModel: reg.car,
          racingNumber: reg.num,
          status: reg.status,
          registeredAt: new Date().toISOString(),
        },
      })
    }
  }

  // 5. Create Results for Completed Rounds (Spa and Monza)
  console.log('🏆 Creating published results for Round 1 & Round 2...')

  // Round 1 - Spa Results
  const spaResultsFound = await payload.find({
    collection: 'results',
    where: { race: { equals: raceDocs['spa-gt3'].id } },
  })

  if (spaResultsFound.docs.length === 0) {
    await payload.create({
      collection: 'results',
      context: { skipEvents: true },
      data: {
        race: raceDocs['spa-gt3'].id,
        status: 'published',
        publishedAt: '2026-09-20T21:30:00.000Z',
        entries: [
          {
            driver: driverDocs[0].id, // Rafał Kubiak
            position: 1,
            finishStatus: 'finished',
            gap: 'LEADER',
            bestLap: '2:17.382',
            penaltyPoints: 0,
            note: 'Zwycięstwo start-to-finish z Pole Position',
          },
          {
            driver: driverDocs[1].id, // Mateusz Banaś
            position: 2,
            finishStatus: 'finished',
            gap: '+2.148s',
            bestLap: '2:17.519',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[2].id, // Piotr Nowak
            position: 3,
            finishStatus: 'finished',
            gap: '+5.812s',
            bestLap: '2:17.890',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[3].id, // Jan Kowalski
            position: 4,
            finishStatus: 'finished',
            gap: '+11.450s',
            bestLap: '2:18.104',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[4].id, // Tomasz Wiśniewski
            position: 5,
            finishStatus: 'finished',
            gap: '+16.290s',
            bestLap: '2:18.340',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[5].id, // Lucas Müller
            position: 6,
            finishStatus: 'finished',
            gap: '+22.810s',
            bestLap: '2:18.650',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[6].id, // Kevin Larson
            position: 7,
            finishStatus: 'finished',
            gap: '+28.905s',
            bestLap: '2:18.910',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[7].id, // Jakub Majewski
            position: 8,
            finishStatus: 'finished',
            gap: '+35.120s',
            bestLap: '2:19.040',
            penaltyPoints: 0,
          },
        ],
      },
    })
  }

  // Round 2 - Monza Results
  const monzaResultsFound = await payload.find({
    collection: 'results',
    where: { race: { equals: raceDocs['monza-gt3'].id } },
  })

  if (monzaResultsFound.docs.length === 0) {
    await payload.create({
      collection: 'results',
      context: { skipEvents: true },
      data: {
        race: raceDocs['monza-gt3'].id,
        status: 'published',
        publishedAt: '2026-10-04T21:30:00.000Z',
        entries: [
          {
            driver: driverDocs[1].id, // Mateusz Banaś
            position: 1,
            finishStatus: 'finished',
            gap: 'LEADER',
            bestLap: '1:47.112',
            penaltyPoints: 0,
            note: 'Znakomity manewr w Parabolica na ostatnim kółku',
          },
          {
            driver: driverDocs[0].id, // Rafał Kubiak
            position: 2,
            finishStatus: 'finished',
            gap: '+0.384s',
            bestLap: '1:47.098',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[3].id, // Jan Kowalski
            position: 3,
            finishStatus: 'finished',
            gap: '+4.290s',
            bestLap: '1:47.450',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[2].id, // Piotr Nowak
            position: 4,
            finishStatus: 'finished',
            gap: '+8.140s',
            bestLap: '1:47.580',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[5].id, // Lucas Müller
            position: 5,
            finishStatus: 'finished',
            gap: '+14.230s',
            bestLap: '1:47.810',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[4].id, // Tomasz Wiśniewski
            position: 6,
            finishStatus: 'finished',
            gap: '+18.900s',
            bestLap: '1:48.010',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[7].id, // Jakub Majewski
            position: 7,
            finishStatus: 'finished',
            gap: '+24.110s',
            bestLap: '1:48.240',
            penaltyPoints: 0,
          },
          {
            driver: driverDocs[6].id, // Kevin Larson
            position: 8,
            finishStatus: 'dnf',
            gap: 'DNF (Awaria zawieszenia po kontakcie w T1)',
            bestLap: '1:48.350',
            penaltyPoints: 0,
          },
        ],
      },
    })
  }

  // 6. Create Announcements
  console.log('📢 Creating league announcements...')
  const announcementsData = [
    {
      title: 'Regulamin sezonu GT3 Sprint Series 2026/27',
      slug: 'regulamin-sezon-2026-27',
      category: 'regulation' as const,
      date: '2026-09-10T12:00:00.000Z',
      isPinned: true,
      summary:
        'Kluczowe zasady dotyczące limitów toru, procedury startowej, obowiązkowych pitstopów oraz punktacji.',
      content: `Niniejszy dokument reguluje zasady sportowe i techniczne rozgrywek RACE CONTROL GT3 Sprint Series.

1. FORMAT ZAWODÓW
Każda runda składa się z sesji treningowej (30 min), kwalifikacji (15 min) oraz wyścigu głównego (45-60 min).

2. SYSTEM PUNKTACJI
1. miejsce: 25 pkt
2. miejsce: 18 pkt
3. miejsce: 15 pkt
4. miejsce: 12 pkt
5. miejsce: 10 pkt
6. miejsce: 8 pkt
7. miejsce: 6 pkt
8. miejsce: 4 pkt
9. miejsce: 2 pkt
10. miejsce: 1 pkt

3. ZACHOWANIE NA TORZE
Wszelkie incydenty i niesportowe zachowania podlegają ocenie stewardów. Kary czasowe oraz punkty karne są odliczane bezpośrednio w oficjalnej klasyfikacji końcowej.`,
    },
    {
      title: 'Decyzje sędziowskie po rundzie 2: Monza',
      slug: 'decyzje-sedziowskie-monza',
      category: 'stewards' as const,
      date: '2026-10-05T10:00:00.000Z',
      isPinned: false,
      summary:
        'Raport sędziowski z incydentów w Variante del Rettifilo oraz weryfikacja czasów okrążeń.',
      content: `Panel Sędziowski przeanalizował powtórki z 2. rundy na torze Monza.
Kontakt z 1. okrążenia pomiędzy samochodami #5 i #44 w Variante del Rettifilo został uznany za incydent wyścigowy bez nakładania kar punktowych.
Wszystkie pozycje w klasyfikacji końcowej zostały oficjalnie zatwierdzone.`,
    },
    {
      title: 'Briefing przed rundą 3: Nürburgring GP',
      slug: 'briefing-runda-3-nurburgring',
      category: 'briefing' as const,
      date: '2026-10-20T18:00:00.000Z',
      isPinned: false,
      summary:
        'Zapisy otwarte do 24 października. Szczegóły dotyczące warunków pogodowych i okna serwisowego.',
      content: `Zbliża się 3. runda mistrzostw na torze Nürburgring GP.
Zapisy dla kierowców trwają do 24 października do godziny 23:59.
Okno pitstopowe otwiera się w 15. minucie wyścigu i zamyka w 35. minucie.
Hasło serwera zostanie udostępnione wszystkim kierowcom ze statusem "Zaakceptowano".`,
    },
  ]

  for (const ann of announcementsData) {
    const found = await payload.find({
      collection: 'announcements',
      where: { slug: { equals: ann.slug } },
    })

    if (found.docs.length === 0) {
      await payload.create({
        collection: 'announcements',
        data: ann,
      })
    }
  }

  console.log('✅ Seeding completed successfully!')
  console.log(
    'Demo driver passwords are random and unavailable. Create your own account or private administrator.',
  )
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', { name: err instanceof Error ? err.name : 'UnknownError' })
    process.exit(1)
  })
