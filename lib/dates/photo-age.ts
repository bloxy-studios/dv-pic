export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

export type AgeState =
  | "within_window"
  | "outside_window"
  | "unavailable"
  | "future_or_inconsistent"
  | "inconclusive";

export type PhotoAgeInput = {
  dateTimeOriginal?: string | null;
  offsetTimeOriginal?: string | null;
  dateTimeDigitized?: string | null;
  dateTime?: string | null;
  today: CivilDate;
};

export type PhotoAgeResult = {
  state: AgeState;
  captureDate: CivilDate | null;
  boundary: CivilDate;
  detail: string;
  timezoneNote: string | null;
};

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const OFFSET = /^([+-])(\d{2}):(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidCivilDate(date: CivilDate): boolean {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) {
    return false;
  }
  if (date.month < 1 || date.month > 12 || date.day < 1) return false;
  return date.day <= daysInMonth(date.year, date.month);
}

export function addCalendarMonths(date: CivilDate, delta: number): CivilDate {
  const absolute = date.year * 12 + (date.month - 1) + delta;
  const year = Math.floor(absolute / 12);
  const monthIndex = absolute - year * 12;
  const month = monthIndex + 1;
  const day = Math.min(date.day, daysInMonth(year, month));
  return { year, month, day };
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function formatCivil(date: CivilDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export function parseExifDate(value: string | null | undefined): CivilDate | null {
  if (!value) return null;
  const match = value.trim().match(EXIF_DATE);
  if (!match) return null;
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidCivilDate(date) ? date : null;
}

export function offsetIsValid(value: string | null | undefined): boolean {
  if (!value) return false;
  const match = value.trim().match(OFFSET);
  if (!match) return false;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return hours <= 14 && minutes < 60;
}

function dayDistance(a: CivilDate, b: CivilDate): number {
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcA - utcB) / 86_400_000);
}

export function assessPhotoAge(input: PhotoAgeInput): PhotoAgeResult {
  const boundary = addCalendarMonths(input.today, -6);
  const original = parseExifDate(input.dateTimeOriginal);
  const digitized = parseExifDate(input.dateTimeDigitized);
  const modified = parseExifDate(input.dateTime);

  if (input.offsetTimeOriginal && !offsetIsValid(input.offsetTimeOriginal)) {
    return {
      state: "inconclusive",
      captureDate: original,
      boundary,
      timezoneNote: "The offset stored with the capture time is not a valid UTC offset.",
      detail:
        "Date evidence is inconclusive. The capture timestamp includes an offset DV Ready could not interpret. Take a new photograph if you are unsure of the date.",
    };
  }

  const timezoneNote = input.offsetTimeOriginal
    ? `The file includes a UTC offset of ${input.offsetTimeOriginal.trim()}. The calendar date below is the date written in DateTimeOriginal, which EXIF stores in the camera's local time.`
    : original
      ? "No UTC offset was stored. The calendar date is taken exactly as written in DateTimeOriginal. A camera clock can be wrong."
      : null;

  if (!original) {
    if (digitized || modified) {
      return {
        state: "inconclusive",
        captureDate: null,
        boundary,
        timezoneNote,
        detail:
          "DateTimeOriginal is missing. A digitized or file-change timestamp is not treated as the date the photograph was taken. This does not mean the photo is too old or recent. Check when it was actually taken and whether it reflects current appearance.",
      };
    }
    return {
      state: "unavailable",
      captureDate: null,
      boundary,
      timezoneNote: null,
      detail:
        "We could not verify the capture date from the image metadata. This does not automatically mean the photo is too old. Check when the photograph was actually taken and whether it reflects your current appearance.",
    };
  }

  if (digitized && Math.abs(dayDistance(original, digitized)) > 1) {
    return {
      state: "inconclusive",
      captureDate: original,
      boundary,
      timezoneNote,
      detail: `DateTimeOriginal (${formatCivil(original)}) and DateTimeDigitized (${formatCivil(digitized)}) disagree by more than one day. DV Ready will not treat either date as proof.`,
    };
  }

  if (compareCivil(original, input.today) > 0) {
    return {
      state: "future_or_inconsistent",
      captureDate: original,
      boundary,
      timezoneNote,
      detail: `The capture date ${formatCivil(original)} is after the date of this check (${formatCivil(input.today)}). Verify the camera clock or use a newly taken photograph.`,
    };
  }

  if (compareCivil(original, boundary) < 0) {
    return {
      state: "outside_window",
      captureDate: original,
      boundary,
      timezoneNote,
      detail: `The available metadata indicates capture on ${formatCivil(original)}, which is before the six-calendar-month boundary of ${formatCivil(boundary)}. The photo may be too old. Take a new photo. EXIF dates can be wrong, and this result is not proof.`,
    };
  }

  return {
    state: "within_window",
    captureDate: original,
    boundary,
    timezoneNote,
    detail: `Photo age: The available metadata indicates that this image was captured on ${formatCivil(original)}. This is consistent with the configured six-month window ending at the check date ${formatCivil(input.today)} (boundary ${formatCivil(boundary)}, inclusive). EXIF metadata can be missing or altered, so this result is not proof of the actual capture date. You must also confirm that the photo reflects your current appearance.`,
  };
}

export function localCivilDate(now = new Date()): CivilDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}
