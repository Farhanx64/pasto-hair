import * as migration_20260606_084624 from './20260606_084624';
import * as migration_20260606_091203 from './20260606_091203';

export const migrations = [
  {
    up: migration_20260606_084624.up,
    down: migration_20260606_084624.down,
    name: '20260606_084624',
  },
  {
    up: migration_20260606_091203.up,
    down: migration_20260606_091203.down,
    name: '20260606_091203'
  },
];
