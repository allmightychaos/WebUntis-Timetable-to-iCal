// tests/06-get-timetable.js
require("dotenv").config();
const { format, startOfWeek, parse } = require("date-fns");
const { getTimetable } = require("../core/timetableBuilder");
const fs = require("fs");
const path = require("path");

// Convert dd.MM.yyyy -> yyyy-MM-dd
function toIso(dottedDate) {
    const [day, month, year] = dottedDate.split(".").map(Number);
    return `${year.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

// Build a cleaned JSON representation of the timetable
// Removes cancelled lessons, keeps free periods separately, normalizes dates to ISO.
function buildCleanJson(timetable) {
    const result = {};

    Object.entries(timetable).forEach(([dateDotted, entries]) => {
        const isoDate = toIso(dateDotted);
        if (!result[isoDate]) {
            result[isoDate] = { date: isoDate, lessons: [], freePeriods: [] };
        }
        entries.forEach((entry) => {
            if (entry.isFreePeriod) {
                result[isoDate].freePeriods.push({
                    start: entry.startTime,
                    end: entry.endTime,
                });
                return;
            }
            if (entry.cellState === "CANCEL") return; // skip cancelled
            result[isoDate].lessons.push({
                id: entry.id,
                subject: entry.subject_short || undefined,
                subject_long: entry.subject_long || undefined,
                teacher: entry.teacherName || undefined,
                room: entry.room || undefined,
                start: entry.startTime,
                end: entry.endTime,
                state: entry.cellState,
                color: entry.color || undefined,
                periodText: entry.periodText || undefined,
            });
        });

        // Sort lessons (they should already be sorted, but ensure)
        result[isoDate].lessons.sort((a, b) => a.start.localeCompare(b.start));
        // Sort free periods too
        result[isoDate].freePeriods.sort((a, b) =>
            a.start.localeCompare(b.start)
        );
    });

    return {
        generatedAt: new Date().toISOString(),
        days: Object.keys(result)
            .sort()
            .map((d) => result[d]),
    };
}

(async () => {
    try {
        // Accept optional CLI arg (YYYY-MM-DD). If omitted, use current week's Monday.
        const argDate = process.argv[2];
        let startDate;
        if (argDate) {
            // Basic validation: try parse
            const parsed = parse(argDate, "yyyy-MM-dd", new Date());
            if (isNaN(parsed))
                throw new Error("Invalid date argument. Use yyyy-MM-dd");
            // Normalize to Monday to match backend expectation
            startDate = format(
                startOfWeek(parsed, { weekStartsOn: 1 }),
                "yyyy-MM-dd"
            );
        } else {
            const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
            startDate = format(monday, "yyyy-MM-dd");
        }

        console.error(`[get-timetable] Fetching week starting ${startDate}`); // stderr for status
        const timetable = await getTimetable(startDate);

        const cleaned = buildCleanJson(timetable);

        // Persist cleaned timetable to ./output as JSON
        const outputDir = path.join(__dirname, "output"); // ./tests/output
        fs.mkdirSync(outputDir, { recursive: true });
        const outPath = path.join(outputDir, `timetable-${startDate}.json`);
        fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), "utf8");
        console.error(`[get-timetable] Wrote cleaned JSON to ${outPath}`);

        // Output the cleaned timetable JSON (pretty-printed) to stdout as before
        console.log(JSON.stringify(cleaned, null, 2));
    } catch (e) {
        console.error("getTimetable failed:", e.message);
        process.exit(1);
    }
})();
