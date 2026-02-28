/**
 * Shared Tailwind class strings for calendar grid appearance.
 * Used by Coss (week/month/day views) and FullCalendar (.calendar-parity) so both
 * look identical. If Coss is removed later, FullCalendarAdapter still uses these
 * and the bundle keeps the styles.
 */

/** Day column header (week/month) — same as Coss week-view day header */
export const CALENDAR_DAY_HEADER_CLASSES =
  "py-2 text-center text-muted-foreground/70 text-sm";

/** Day column header when it's today — bold/foreground */
export const CALENDAR_DAY_HEADER_TODAY_CLASSES =
  "py-2 text-center text-sm font-medium text-foreground";

/** Month view: weekday row header cell (Sun, Mon, ...) */
export const CALENDAR_MONTH_WEEKDAY_HEADER_CLASSES =
  "py-2 text-center text-muted-foreground/70 text-sm";

/** Time axis label (left column) — same as Coss */
export const CALENDAR_AXIS_LABEL_CLASSES =
  "flex items-center justify-end bg-background pe-2 text-[10px] text-muted-foreground/70 sm:pe-4 sm:text-xs";

/** Grid borders: 1px solid border at 70% opacity (Coss border-border/70) */
export const CALENDAR_GRID_BORDER_CLASSES = "border-border/70";

/** Day cell in timegrid/daygrid: right + bottom border */
export const CALENDAR_DAY_CELL_CLASSES = "border-border/70 border-r border-b";

/** Header row background (Coss sticky header) */
export const CALENDAR_HEADER_ROW_CLASSES =
  "bg-background/80 backdrop-blur-md border-border/70 border-b";

/** Month view: day number container (normal) */
export const CALENDAR_DAY_NUMBER_CLASSES =
  "mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm";

/** Month view: day number when today (circle with primary) */
export const CALENDAR_DAY_NUMBER_TODAY_CLASSES =
  "mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm bg-primary text-primary-foreground";

/** Month view: cell outside current month */
export const CALENDAR_OUTSIDE_MONTH_CELL_CLASSES =
  "bg-muted/25 text-muted-foreground/70";

/** Month view: same as above applied via data-outside-cell (Coss) */
export const CALENDAR_OUTSIDE_MONTH_CELL_DATA_CLASSES =
  "data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70";

/** "+ N more" link in month view */
export const CALENDAR_MORE_LINK_CLASSES =
  "text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:text-xs";
