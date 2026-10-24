import * as migration_20260606_084624 from './20260606_084624';
import * as migration_20260606_091203 from './20260606_091203';
import * as migration_20260715_041235_add_discount_and_pricing_fields from './20260715_041235_add_discount_and_pricing_fields';
import * as migration_20260716_070516 from './20260716_070516';
import * as migration_20261023_025818_tiered_evening_surcharge from './20261023_025818_tiered_evening_surcharge';
import * as migration_20261023_034626_theme_colors from './20261023_034626_theme_colors';
import * as migration_20261023_034645_terms_of_service from './20261023_034645_terms_of_service';
import * as migration_20261023_034755_promo_codes from './20261023_034755_promo_codes';
import * as migration_20261023_034826_customer_accounts from './20261023_034826_customer_accounts';
import * as migration_20261024_084831_weekend_surcharge_and_optouts from './20261024_084831_weekend_surcharge_and_optouts';

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
    name: '20260716_070516',
  },
  {
    up: migration_20261023_025818_tiered_evening_surcharge.up,
    down: migration_20261023_025818_tiered_evening_surcharge.down,
    name: '20261023_025818_tiered_evening_surcharge',
  },
  {
    up: migration_20261023_034626_theme_colors.up,
    down: migration_20261023_034626_theme_colors.down,
    name: '20261023_034626_theme_colors',
  },
  {
    up: migration_20261023_034645_terms_of_service.up,
    down: migration_20261023_034645_terms_of_service.down,
    name: '20261023_034645_terms_of_service',
  },
  {
    up: migration_20261023_034755_promo_codes.up,
    down: migration_20261023_034755_promo_codes.down,
    name: '20261023_034755_promo_codes',
  },
  {
    up: migration_20261023_034826_customer_accounts.up,
    down: migration_20261023_034826_customer_accounts.down,
    name: '20261023_034826_customer_accounts',
  },
  {
    up: migration_20261024_084831_weekend_surcharge_and_optouts.up,
    down: migration_20261024_084831_weekend_surcharge_and_optouts.down,
    name: '20261024_084831_weekend_surcharge_and_optouts'
  },
];
