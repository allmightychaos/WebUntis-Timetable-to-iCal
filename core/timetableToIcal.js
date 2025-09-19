const icalModule = require("ical-generator");
const ical = icalModule.default || icalModule;
const { format, add, startOfWeek } = require("date-fns");
const { getTimetable } = require("./timetableBuilder");
// validateEnvironment checks WEBUNTIS_ACCOUNTS (multi-account JSON)
const { validateEnvironment } = require("./startup-validation");
const {
    getNextSchoolYearStart,
    isSummerBreak,
    getRemainingSchoolWeeks,
} = require("./utils");

const TIMEZONE = "Europe/Vienna";

async function generateIcal(
    weeks = 4,
    startDate = format(new Date(), "yyyy-MM-dd"),
    { debug = false } = {}
) {
    await validateEnvironment();
    const monday = startOfWeek(new Date(startDate + "T00:00:00"), {
        weekStartsOn: 1,
    });
    startDate = format(monday, "yyyy-MM-dd");
    if (weeks < 1 || weeks > 40)
        throw new Error("Weeks parameter must be between 1 and 40");

    const cal = ical({ name: "Stundenplan" });
    // Ensure calendar has a timezone (fixes Apple Calendar offset)
    if (typeof cal.timezone === "function") cal.timezone(TIMEZONE);
    if (isSummerBreak(new Date(startDate)))
        startDate = format(
            getNextSchoolYearStart(new Date(startDate)),
            "yyyy-MM-dd"
        );

    const remaining = getRemainingSchoolWeeks(startDate);
    const weeksToFetch = Math.min(weeks, remaining || weeks);
    if (weeksToFetch === 0) return cal.toString();

    const promises = [];
    for (let i = 0; i < weeksToFetch; i++) {
        const weekDate = format(
            add(new Date(startDate), { weeks: i }),
            "yyyy-MM-dd"
        );
        promises.push(getTimetable(weekDate).catch(() => null));
    }
    const weeksData = await Promise.all(promises);

    let count = 0;
    for (const week of weeksData) {
        if (!week) continue;
        for (const entries of Object.values(week)) {
            if (!Array.isArray(entries)) continue;
            for (const evt of entries) {
                // Skip cancelled lessons in iCal to retain previous behavior
                if (evt.cellState === "CANCEL") continue;
                // Skip free periods as they are not lessons
                if (evt.isFreePeriod) continue;

                const [d, m, y] = evt.date.split(".").map(Number);
                const [sh, sm] = evt.startTime.split(":").map(Number);
                const [eh, em] = evt.endTime.split(":").map(Number);
                const summary =
                    evt.subject_short ||
                    evt.subject_long ||
                    evt.periodText ||
                    "Untis Event";
                const parts = [];
                if (evt.subject_long) parts.push(evt.subject_long);
                if (
                    evt.periodText &&
                    evt.periodText !== summary &&
                    !parts.includes(evt.periodText)
                )
                    parts.push(evt.periodText);
                if (evt.room) parts.push(`Raum: ${evt.room}`);
                if (evt.teacherName) parts.push(`Lehrer: ${evt.teacherName}`);
                if (evt.cellState) parts.push(`Status: ${evt.cellState}`);
                ical({}).createEvent;
                cal.createEvent({
                    start: new Date(y, m - 1, d, sh, sm),
                    end: new Date(y, m - 1, d, eh, em),
                    summary,
                    description: parts.join(", "),
                    // timezone handled at calendar level
                    color: evt.color || undefined,
                });
                count++;
            }
        }
    }
    if (debug) console.log(`[iCal] Events created: ${count}`);
    return cal.toString();
}

function buildIcsEvents(processedDays) {
    const events = [];
    for (const day of processedDays) {
        for (const lesson of day.lessons) {
            // Skip cancelled lessons in iCal to retain previous behavior
            if (lesson.state === "CANCEL") continue;
            // Skip free periods as they are not lessons
            if (lesson.isFreePeriod) continue;

            const summary = [
                lesson.subject || lesson.subject_long,
                lesson.teacher,
                lesson.room,
            ]
                .filter(Boolean)
                .join(" · ");

            const start = new Date(lesson.start);
            const end = new Date(lesson.end);

            events.push({
                uid: `${
                    lesson.id ||
                    lesson.lessonId ||
                    Math.random().toString(36).slice(2)
                }@timetable-ical`,
                start,
                end,
                summary,
                description: lesson.periodText || "",
                location: lesson.room || "",
                // ...existing fields if any...
            });
        }
    }
    return events;
}

module.exports = { generateIcal, buildIcsEvents };
