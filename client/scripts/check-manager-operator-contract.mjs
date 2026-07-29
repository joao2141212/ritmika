import assert from 'node:assert/strict';
import {
  evaluateChecklistAvailability,
  getChecklistSchedule,
  responseBelongsToOccurrence,
  resolveOperatorAssignment,
} from '../src/domain/checklistAvailability.js';

const at = (date) => new Date(`${date}T12:00:00`);
const recurring = {
  schedule: {
    mode: 'recorrente',
    frequency: 'semanal',
    interval: 1,
    startDate: '2026-07-27',
    weekdays: [1, 3],
    adhoc_mode: 'disabled',
  },
};

assert.equal(evaluateChecklistAvailability(recurring, at('2026-07-29')).scheduled, true);
assert.equal(evaluateChecklistAvailability(recurring, at('2026-07-30')).available, false);
assert.equal(evaluateChecklistAvailability({
  schedule: { mode: 'unica', startDate: '2026-07-29', adhoc_mode: 'disabled' },
}, at('2026-07-29')).scheduled, true);
assert.equal(evaluateChecklistAvailability({
  schedule: { mode: 'pontual', adhoc_mode: 'disabled' },
}, at('2026-07-29')).available, false);
assert.equal(evaluateChecklistAvailability({
  schedule: { mode: 'pontual', adhoc_mode: 'app' },
}, at('2026-07-29')).adhoc, true);
assert.equal(evaluateChecklistAvailability({
  schedule: {
    mode: 'recorrente',
    frequency: 'diaria',
    interval: 2,
    startDate: '2026-07-27',
    adhoc_mode: 'disabled',
  },
}, at('2026-07-29')).scheduled, true);
assert.equal(evaluateChecklistAvailability({
  schedule: {
    mode: 'recorrente',
    frequency: 'mensal',
    interval: 1,
    startDate: '2026-06-29',
    adhoc_mode: 'disabled',
  },
}, at('2026-07-29')).scheduled, true);
assert.equal(resolveOperatorAssignment(
  { schedule: { mode: 'pontual', adhoc_mode: 'disabled' } },
  { id: 'running', is_finished: false },
  at('2026-07-29'),
)?.latestResponse?.id, 'running');
assert.equal(resolveOperatorAssignment(
  recurring,
  {
    id: 'old',
    is_finished: true,
    metadata: { occurrence_key: 'scheduled:2026-07-27' },
  },
  at('2026-07-29'),
)?.latestResponse, null);
assert.equal(responseBelongsToOccurrence({
  is_finished: true,
  metadata: { occurrence_key: 'scheduled:2026-07-29' },
}, evaluateChecklistAvailability(recurring, at('2026-07-29')), at('2026-07-29')), true);
assert.equal(getChecklistSchedule({
  schedule: { mode: 'pontual', adhoc_mode: 'both' },
}).adhocMode, 'both');
assert.equal(evaluateChecklistAvailability({}, at('2026-07-29')).legacy, true);

console.log(JSON.stringify({
  status: 'ok',
  checks: 12,
  contract: 'manager-schedule-to-operator-availability',
}));
