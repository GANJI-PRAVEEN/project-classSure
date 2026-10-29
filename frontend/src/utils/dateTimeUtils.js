/**
 * Shared Date and Time Utilities for ClassSure
 *
 * Handles Asia/Kolkata (IST, UTC+05:30) timezone rules consistently:
 * - `scheduleStart` & `scheduleEnd`: Timezone-less LocalDateTime values representing local India time.
 * - `actualStart`, `actualEnd`, `disputedAt`: UTC Instant values representing absolute points in time.
 */

/**
 * Extract and format scheduled time from various representations:
 * - "2026-10-28T08:00:00" -> "8:00 AM"
 * - "2026-10-28T10:00:00" -> "10:00 AM"
 * - "2026-10-28T14:30:00" -> "2:30 PM"
 * - "08:00" or "08:00:00" -> "8:00 AM"
 * - [2026, 10, 28, 8, 0]  -> "8:00 AM"
 * - [8, 0]                -> "8:00 AM"
 *
 * Treats timezone-less dates and times as the intended Asia/Kolkata schedule time directly,
 * without incorrectly converting them through UTC (+5:30).
 */
export function formatScheduledTime(timeVal) {
  if (!timeVal) return "";

  let hours = null;
  let minutes = null;

  // 1. Array format [year, month, day, hour, minute, ...] or [hour, minute, ...]
  if (Array.isArray(timeVal)) {
    if (timeVal.length >= 5) {
      // Jackson LocalDateTime array: [year, month, day, hour, minute, second?, nano?]
      hours = timeVal[3];
      minutes = timeVal[4];
    } else if (timeVal.length >= 2) {
      // Jackson LocalTime array: [hour, minute, second?]
      hours = timeVal[0];
      minutes = timeVal[1];
    }
  }

  // 2. String format
  if (typeof timeVal === "string") {
    const trimmed = timeVal.trim();

    // Check if it's an ISO datetime string like "2026-10-28T08:00:00"
    if (trimmed.includes("T")) {
      const timePart = trimmed.split("T")[1];
      if (timePart) {
        // Strip any trailing Z or offset if passed
        const cleanTime = timePart.split(/[Z+-]/)[0];
        const parts = cleanTime.split(":");
        if (parts.length >= 2) {
          hours = parseInt(parts[0], 10);
          minutes = parseInt(parts[1], 10);
        }
      }
    } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      // Direct time string like "08:00" or "8:00" or "08:00:00"
      const parts = trimmed.split(":");
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
  }

  // 3. Fallback: if hours and minutes could not be extracted directly
  if (hours == null || isNaN(hours) || minutes == null || isNaN(minutes)) {
    return "";
  }

  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minuteStr = String(minutes).padStart(2, "0");

  return `${hour12}:${minuteStr} ${ampm}`;
}

/**
 * Format scheduled time range (e.g. "8:00 AM – 10:00 AM")
 */
export function formatScheduledTimeRange(startVal, endVal) {
  const startStr = formatScheduledTime(startVal);
  const endStr = formatScheduledTime(endVal);

  if (startStr && endStr) {
    return `${startStr} – ${endStr}`;
  }
  if (startStr) return startStr;
  if (endStr) return `Until ${endStr}`;
  return "—";
}

/**
 * Safely parse timestamps into epoch milliseconds.
 *
 * For UTC Instants (ending in Z, with timezone offset, or numeric epoch):
 * parses as UTC point in time.
 *
 * For timezone-less LocalDateTime strings (e.g. "2026-10-28T08:00:00"):
 * parses as Asia/Kolkata local time (+05:30) so that converting to local Date
 * preserves the exact scheduled hour and minute.
 */
export function parseTimestamp(val) {
  if (!val) return null;

  if (typeof val === "number") {
    return val < 1e11 ? Math.round(val * 1000) : Math.round(val);
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    const asNum = Number(trimmed);
    if (!isNaN(asNum) && asNum > 0) {
      return asNum < 1e11 ? Math.round(asNum * 1000) : Math.round(asNum);
    }

    // If explicit UTC Z or offset present: parse as-is
    if (trimmed.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) return parsed;
    }

    // If timezone-less ISO string like "2026-10-28T08:00:00":
    // Interpret as Asia/Kolkata (+05:30) local time
    if (trimmed.includes("T")) {
      const base = trimmed.split(".")[0];
      const parsed = Date.parse(`${base}+05:30`);
      if (!isNaN(parsed)) return parsed;
    }

    const fallbackParsed = Date.parse(trimmed);
    if (!isNaN(fallbackParsed)) return fallbackParsed;
  }

  if (Array.isArray(val)) {
    if (val.length >= 5) {
      const [y, m, d, h = 0, min = 0, s = 0] = val;
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}+05:30`;
      const parsed = Date.parse(iso);
      if (!isNaN(parsed)) return parsed;
    } else if (val.length >= 3) {
      const [y, m, d] = val;
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+05:30`;
      const parsed = Date.parse(iso);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

/**
 * Universal 12-hour time formatter.
 * Handles both:
 * - Timezone-less LocalDateTime / LocalTime: extracts intended local time directly ("8:00 AM")
 * - UTC Instant / numeric timestamp: formats in Asia/Kolkata timezone
 */
export function formatTime12h(timeVal) {
  if (!timeVal) return "";

  // 1. Direct scheduled time extraction for arrays, simple time strings, or timezone-less datetimes
  if (
    Array.isArray(timeVal) ||
    (typeof timeVal === "string" &&
      !timeVal.trim().endsWith("Z") &&
      !/[+-]\d{2}(:\d{2})?$/.test(timeVal.trim()))
  ) {
    const formatted = formatScheduledTime(timeVal);
    if (formatted) return formatted;
  }

  // 2. Instant / timestamp with explicit timezone or numeric epoch ms
  const ms = parseTimestamp(timeVal);
  if (!ms) return "";

  try {
    const str = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms));
    return str.toUpperCase();
  } catch {
    return "";
  }
}

/**
 * Format a date in a human-readable local format (e.g. "28 Oct 2026")
 * Preserves the literal date component without timezone shifting.
 */
export function formatSessionDate(dateVal) {
  if (!dateVal) return "—";

  // If array format [year, month, day, ...]
  if (Array.isArray(dateVal) && dateVal.length >= 3) {
    const [y, m, d] = dateVal;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // If string "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
  if (typeof dateVal === "string") {
    const match = dateVal.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, yStr, mStr, dStr] = match;
      const dt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
      return dt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  const ms = parseTimestamp(dateVal);
  if (!ms) return String(dateVal);

  const dt = new Date(ms);
  if (isNaN(dt.getTime())) return String(dateVal);

  return dt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Extract a comparable YYYY-MM-DD date string from various raw date representations
 */
export function extractSessionDateStr(dateVal) {
  if (!dateVal) return null;

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  if (Array.isArray(dateVal) && dateVal.length >= 3) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const ms = parseTimestamp(dateVal);
  if (ms) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(new Date(ms));
    } catch {
      // fallback
    }
  }

  return null;
}

/**
 * Convert session date to a comparable YYYY-MM-DD string for sorting and date filters
 */
export function getComparableDateStr(session) {
  const rawDate = session?.sessionDate || session?.scheduleStart || session?.actualStart;
  return extractSessionDateStr(rawDate) || "";
}

/**
 * Get current date in "Asia/Kolkata" timezone formatted as "YYYY-MM-DD"
 */
export function getTodayKolkataDateStr() {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

/**
 * Get current day of week in "Asia/Kolkata" timezone in UPPERCASE (e.g. "WEDNESDAY")
 */
export function getTodayKolkataDayOfWeek() {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    });
    return formatter.format(new Date()).toUpperCase();
  } catch {
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    return days[new Date().getDay()];
  }
}

/**
 * Format today's date for display banner in human-friendly Indian format
 * e.g. "Wednesday, 28 October 2026"
 */
export function formatTodayKolkataDisplay() {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}

/**
 * Parse an Asia/Kolkata local datetime/time string into UTC epoch ms
 */
export function parseKolkataDateTimeToMs(val, fallbackDateStr) {
  if (!val) return null;

  // Array [y, m, d, h, min, s]
  if (Array.isArray(val) && val.length >= 3) {
    const y = val[0];
    const m = String(val[1]).padStart(2, "0");
    const d = String(val[2]).padStart(2, "0");
    const h = String(val[3] || 0).padStart(2, "0");
    const min = String(val[4] || 0).padStart(2, "0");
    const s = String(val[5] || 0).padStart(2, "0");
    const kolkataIso = `${y}-${m}-${d}T${h}:${min}:${s}+05:30`;
    const parsed = Date.parse(kolkataIso);
    if (!isNaN(parsed)) return parsed;
  }

  // Time string "HH:MM" or "HH:MM:SS"
  if (typeof val === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) {
    const dateStr = fallbackDateStr || getTodayKolkataDateStr();
    const parts = val.trim().split(":");
    const h = String(parts[0]).padStart(2, "0");
    const min = String(parts[1]).padStart(2, "0");
    const s = String(parts[2] || "00").padStart(2, "0");
    const kolkataIso = `${dateStr}T${h}:${min}:${s}+05:30`;
    const parsed = Date.parse(kolkataIso);
    if (!isNaN(parsed)) return parsed;
  }

  // String containing date & time
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) return parsed;
    }
    if (trimmed.includes("T")) {
      const base = trimmed.split(".")[0];
      const parsed = Date.parse(`${base}+05:30`);
      if (!isNaN(parsed)) return parsed;
    }
  }

  if (typeof val === "number") {
    return val < 1e11 ? Math.round(val * 1000) : Math.round(val);
  }

  return parseTimestamp(val);
}

/**
 * Calculate actual duration between start and end timestamps in minutes.
 * Handles ISO strings, epoch ms, and time strings "HH:MM".
 * Safely handles midnight crossing.
 */
export function calculateDurationMinutes(startVal, endVal) {
  if (!startVal || !endVal) return null;

  // If simple time strings "HH:MM"
  if (
    typeof startVal === "string" &&
    /^\d{1,2}:\d{2}$/.test(startVal.trim()) &&
    typeof endVal === "string" &&
    /^\d{1,2}:\d{2}$/.test(endVal.trim())
  ) {
    const [sh, sm] = startVal.trim().split(":").map(Number);
    const [eh, em] = endVal.trim().split(":").map(Number);
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // crossed midnight
    return diff;
  }

  const startMs = parseTimestamp(startVal);
  const endMs = parseTimestamp(endVal);

  if (startMs && endMs && endMs >= startMs) {
    return Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
  }

  return null;
}

/**
 * Formats minutes into human-friendly duration: e.g. "1 hr 15 min", "45 min"
 */
export function formatDurationHuman(minutes) {
  if (minutes == null || isNaN(minutes) || minutes < 0) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hrs === 0 && mins === 0) return "0 min";
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
