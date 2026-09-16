function toMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 本地日历日 YYYY-MM-DD，用作分组 key */
export function getDayGroupKey(timestamp: number): string {
  const date = new Date(toMs(timestamp));
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 今天 / 昨天 / M月D日；跨年 YYYY年M月D日 */
export function getDayGroupLabel(timestamp: number, now = Date.now()): string {
  const date = new Date(toMs(timestamp));
  const nowDate = new Date(now);

  if (isSameLocalDay(date, nowDate)) return '今天';

  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return '昨天';

  if (date.getFullYear() === nowDate.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 当天「上午/下午 H:MM」，非当天「M月D日」 */
export function formatTimeOfDay(timestamp: number, now = Date.now()): string {
  const date = new Date(toMs(timestamp));
  const nowDate = new Date(now);

  if (!isSameLocalDay(date, nowDate)) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  const hours24 = date.getHours();
  const period = hours24 < 12 ? '上午' : '下午';
  const hours12 = hours24 % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${period} ${hours12}:${minutes}`;
}
