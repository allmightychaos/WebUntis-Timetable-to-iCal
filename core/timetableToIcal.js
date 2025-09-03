// core/timetableToIcal.js
const icalModule = require("ical-generator");
const ical = icalModule.default || icalModule;
const { format, add, startOfWeek } = require("date-fns");
const { getTimetable } = require("./timetableBuilder");
const { validateEnvironment } = require("./startup-validation");
const {
    getSchoolYearEnd,
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
    // Ensure required env vars are present and valid on every run
    await validateEnvironment();

    // Normalize start date to Monday (WebUntis weekly endpoint) to avoid mid-week inconsistency
    const startDateObj = new Date(startDate + "T00:00:00");
    const monday = startOfWeek(startDateObj, { weekStartsOn: 1 });
    startDate = format(monday, "yyyy-MM-dd");

    if (debug) console.log("[iCal] Normalized Monday start:", startDate);

    // Validate weeks parameter
    if (weeks < 1 || weeks > 40) {
        throw new Error("Weeks parameter must be between 1 and 40");
    }

    const cal = ical({ name: "Stundenplan" });

    // Handle summer break
    if (isSummerBreak(new Date(startDate))) {
        const nextYearStart = getNextSchoolYearStart(new Date(startDate));
        if (debug)
            console.log(
                "[iCal] Start date in summer break, shifting to:",
                format(nextYearStart, "yyyy-MM-dd")
            );
        startDate = format(nextYearStart, "yyyy-MM-dd");
    }

    // Calculate actual number of weeks to fetch
    const remainingWeeks = getRemainingSchoolWeeks(startDate);
    const weeksToFetch = Math.min(weeks, remainingWeeks || weeks); // fallback if util misdetects

    if (debug)
        console.log(
            `[iCal] Weeks requested=${weeks} remaining=${remainingWeeks} fetching=${weeksToFetch}`
        );

    if (weeksToFetch === 0) {
        if (debug) console.log("[iCal] No weeks to fetch -> empty calendar");
        return cal.toString();
    }

    // Fetch timetable for each week
    const weekPromises = [];
    for (let i = 0; i < weeksToFetch; i++) {
        const weekDate = format(
            add(new Date(startDate), { weeks: i }),
            "yyyy-MM-dd"
        );
        if (debug)
            console.log(
                "[iCal] Fetching timetable for week starting:",
                weekDate
            );
        weekPromises.push(
            getTimetable(weekDate).catch((e) => {
                console.error(
                    "[iCal] Failed to fetch week",
                    weekDate,
                    e.message
                );
                return null;
            })
        );
    }

    const weeksData = await Promise.all(weekPromises);

    let eventCount = 0;

    // Process each week's data
    for (const week of weeksData) {
        if (!week) continue;
        Object.entries(week).forEach(([day, dayEntries]) => {
            if (!Array.isArray(dayEntries)) return;
            dayEntries.forEach((evt) => {
                if (evt.cellState !== "CANCEL" && !evt.isFreePeriod) {
                    const [d, m, y] = evt.date.split(".").map(Number);
                    const [sh, sm] = evt.startTime.split(":").map(Number);
                    const [eh, em] = evt.endTime.split(":").map(Number);
                    cal.createEvent({
                        start: new Date(y, m - 1, d, sh, sm),
                        end: new Date(y, m - 1, d, eh, em),
                        summary: evt.subject_short || "Untis Event",
                        description: `${evt.subject_long || ""}${
                            evt.room ? `, Raum: ${evt.room}` : ""
                        }${
                            evt.teacherName
                                ? `, Lehrer: ${evt.teacherName}`
                                : ""
                        }`.trim(),
                        timezone: TIMEZONE,
                        color: evt.color || undefined,
                    });
                    eventCount++;
                }
            });
        });
    }

    if (debug) console.log(`[iCal] Events created: ${eventCount}`);

    return cal.toString();
}

module.exports = { generateIcal };
