import * as migration_20260920_130936_initial_cms from './20260920_130936_initial_cms'
import * as migration_20260921_074300_product_workflow_hardening from './20260921_074300_product_workflow_hardening'

export const migrations = [
  {
    up: migration_20260920_130936_initial_cms.up,
    down: migration_20260920_130936_initial_cms.down,
    name: '20260920_130936_initial_cms',
  },
  {
    up: migration_20260921_074300_product_workflow_hardening.up,
    down: migration_20260921_074300_product_workflow_hardening.down,
    name: '20260921_074300_product_workflow_hardening',
  },
]
