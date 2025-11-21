const RELATIVE_INTERVALS = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 }
];

const formatterCache = new Map();

const getFormatter = (locale = 'en') => {
  if (!formatterCache.has(locale)) {
    formatterCache.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
  }
  return formatterCache.get(locale);
};

export const formatRelativeTime = (input, locale = 'en') => {
  if (!input) return '';
  const date =
    input instanceof Date
      ? input
      : new Date(typeof input === 'number' || typeof input === 'string' ? input : Date.now());
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);

  for (const { unit, seconds } of RELATIVE_INTERVALS) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      const value = Math.round(diffSeconds / seconds);
      return getFormatter(locale).format(value, unit);
    }
  }
  return '';
};

export default formatRelativeTime;

