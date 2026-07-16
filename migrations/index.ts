import * as migration_20260606_084624 from './20260606_084624';
import * as migration_20260606_091203 from './20260606_091203';
import * as migration_20260715_041235_add_discount_and_pricing_fields from './20260715_041235_add_discount_and_pricing_fields';
import * as migration_20260716_070516 from './20260716_070516';

export const migrations = [
  {
    up: migration_20260606_084624.up,
    down: migration_20260606_084624.down,
    name: '20260606_084624',
  },
  {
    up: migration_20260606_091203.up,
    down: migration_20260606_091203.down,
    name: '20260606_091203',
  },
  {
    up: migration_20260715_041235_add_discount_and_pricing_fields.up,
    down: migration_20260715_041235_add_discount_and_pricing_fields.down,
    name: '20260715_041235_add_discount_and_pricing_fields',
  },
  {
    up: migration_20260716_070516.up,
    down: migration_20260716_070516.down,
    name: '20260716_070516'
  },
];
