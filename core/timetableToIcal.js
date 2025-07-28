// core/timetableToIcal.js
const icalModule = require("ical-generator");
const ical = icalModule.default || icalModule;
const { format, add } = require("date-fns");
const { getTimetable } = require("./timetableBuilder");
const {
    getSchoolYearEnd,
    getNextSchoolYearStart,
    isSummerBreak,
    getRemainingSchoolWeeks,
} = require("./utils");

const TIMEZONE = "Europe/Vienna";

async function generateIcal(
    weeks = 4,
    startDate = format(new Date(), "yyyy-MM-dd")
) {
    // Validate weeks parameter
    if (weeks < 1 || weeks > 40) {
        throw new Error("Weeks parameter must be between 1 and 40");
    }

    const cal = ical({ name: "Stundenplan" });
    const start = new Date(startDate);

    // Handle summer break
    if (isSummerBreak(start)) {
        const nextYearStart = getNextSchoolYearStart();
        startDate = format(nextYearStart, "yyyy-MM-dd");
    }

    // Calculate actual number of weeks to fetch
    const remainingWeeks = getRemainingSchoolWeeks(startDate);
    const weeksToFetch = Math.min(weeks, remainingWeeks);

    if (weeksToFetch === 0) {
        return cal.toString();
    }

    // Fetch timetable for each week
    const weekPromises = [];
    for (let i = 0; i < weeksToFetch; i++) {
        const weekDate = format(
            add(new Date(startDate), { weeks: i }),
            "yyyy-MM-dd"
        );
        weekPromises.push(getTimetable(weekDate));
    }

    const weeksData = await Promise.all(weekPromises);

    // Process each week's data
    for (const week of weeksData) {
        Object.values(week).forEach((day) =>
            day.forEach((evt) => {
                if (evt.cellState !== "CANCEL" && !evt.isFreePeriod) {
                    const [d, m, y] = evt.date.split(".").map(Number);
                    const [sh, sm] = evt.startTime.split(":").map(Number);
                    const [eh, em] = evt.endTime.split(":").map(Number);
                    cal.createEvent({
                        start: new Date(y, m - 1, d, sh, sm),
                        end: new Date(y, m - 1, d, eh, em),
                        summary: evt.subject_short,
                        description: `${evt.subject_long}, Raum: ${evt.room}, Lehrer: ${evt.teacherName}`,
                        timezone: TIMEZONE,
                        color: evt.color || undefined,
                    });
                }
            })
        );
    }

    return cal.toString();
}

module.exports = { generateIcal };
