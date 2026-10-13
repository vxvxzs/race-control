import type { Race, Registration } from '@/payload-types'

export type CareerRegistration = Pick<
  Registration,
  'id' | 'status' | 'carModel' | 'racingNumber' | 'registeredAt' | 'adminNote'
> & {
  race: Pick<
    Race,
    | 'id'
    | 'name'
    | 'slug'
    | 'round'
    | 'track'
    | 'date'
    | 'registrationStatus'
    | 'raceStatus'
    | 'serverPassword'
  >
}
