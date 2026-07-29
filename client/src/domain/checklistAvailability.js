const APP_ADHOC_MODES = new Set(['app', 'both']);

const localDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (start, end) => {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86_400_000);
};

const scheduleFor = (checklist) => (
  checklist?.schedule && typeof checklist.schedule === 'object' ? checklist.schedule : {}
);

export const getChecklistSchedule = (checklist) => {
  const schedule = scheduleFor(checklist);
  const weekdays = Array.isArray(schedule.weekdays)
    ? schedule.weekdays.map(Number).filter((day) => day >= 0 && day <= 6)
    : [schedule.schedule_day_of_week ?? checklist?.schedule_day_of_week]
      .filter((day) => day !== null && day !== undefined)
      .map(Number);

  return {
    mode: schedule.mode
      || schedule.schedule_recurrence_type
      || checklist?.schedule_recurrence_type
      || null,
    frequency: schedule.frequency || checklist?.frequency || 'diaria',
    interval: Math.max(1, Number(
      schedule.interval
      || schedule.schedule_interval
      || checklist?.schedule_interval
      || 1,
    )),
    startDate: schedule.startDate
      || schedule.schedule_start_date
      || checklist?.schedule_start_date
      || null,
    endDate: schedule.endDate
      || schedule.schedule_end_date
      || checklist?.schedule_end_date
      || null,
    weekdays,
    adhocMode: schedule.adhoc_mode || checklist?.adhoc_mode || 'disabled',
  };
};

export const evaluateChecklistAvailability = (checklist, now = new Date()) => {
  const config = getChecklistSchedule(checklist);
  const todayKey = localDateKey(now);
  const start = parseLocalDate(config.startDate);
  const end = parseLocalDate(config.endDate);
  const today = parseLocalDate(todayKey);
  const hasExplicitPolicy = Boolean(
    config.mode
    || config.startDate
    || config.endDate
    || config.adhocMode !== 'disabled',
  );

  let scheduled = false;
  if (today && (!start || today >= start) && (!end || today <= end)) {
    if (config.mode === 'unica') {
      scheduled = Boolean(start && localDateKey(start) === todayKey);
    } else if (config.mode === 'recorrente') {
      if (!start) {
        scheduled = true;
      } else {
        const elapsedDays = daysBetween(start, today);
        if (config.frequency === 'semanal') {
          const weekdays = config.weekdays.length > 0 ? config.weekdays : [start.getDay()];
          scheduled = Math.floor(elapsedDays / 7) % config.interval === 0
            && weekdays.includes(today.getDay());
        } else if (config.frequency === 'mensal') {
          const elapsedMonths = (
            (today.getFullYear() - start.getFullYear()) * 12
            + today.getMonth()
            - start.getMonth()
          );
          scheduled = elapsedMonths >= 0
            && elapsedMonths % config.interval === 0
            && today.getDate() === start.getDate();
        } else {
          scheduled = elapsedDays >= 0 && elapsedDays % config.interval === 0;
        }
      }
    }
  }

  const adhoc = APP_ADHOC_MODES.has(config.adhocMode);
  const legacy = !hasExplicitPolicy;
  const available = scheduled || adhoc || legacy;

  return {
    available,
    scheduled,
    adhoc,
    legacy,
    executionType: scheduled ? 'scheduled' : 'manual',
    occurrenceKey: scheduled && todayKey ? `scheduled:${todayKey}` : null,
    reason: available ? null : 'outside_schedule',
    config,
  };
};

export const responseBelongsToOccurrence = (response, availability, now = new Date()) => {
  if (!response) return false;
  if (!availability?.occurrenceKey) return !response.is_finished;
  const metadata = response.metadata && typeof response.metadata === 'object'
    ? response.metadata
    : {};
  if (metadata.occurrence_key) return metadata.occurrence_key === availability.occurrenceKey;
  return localDateKey(response.started_at || response.updated_at) === localDateKey(now);
};

export const resolveOperatorAssignment = (checklist, latestResponse, now = new Date()) => {
  const availability = evaluateChecklistAvailability(checklist, now);
  const activeResponse = latestResponse && !latestResponse.is_finished
    ? latestResponse
    : (responseBelongsToOccurrence(latestResponse, availability, now) ? latestResponse : null);

  if (!availability.available && !activeResponse) return null;
  return {
    ...checklist,
    latestResponse: activeResponse,
    availability,
  };
};
