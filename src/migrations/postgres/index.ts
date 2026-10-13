import * as migration_20261013_001550_initial_production from './20261013_001550_initial_production'
import * as migration_20261013_001817_system_email_body from './20261013_001817_system_email_body'

export const migrations = [
  {
    up: migration_20261013_001550_initial_production.up,
    down: migration_20261013_001550_initial_production.down,
    name: '20261013_001550_initial_production',
  },
  {
    up: migration_20261013_001817_system_email_body.up,
    down: migration_20261013_001817_system_email_body.down,
    name: '20261013_001817_system_email_body',
  },
]
