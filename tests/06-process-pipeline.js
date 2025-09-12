// tests/05-process-pipeline.js
require("dotenv").config();
const { format, startOfWeek } = require("date-fns");
const { login } = require("../core/webuntisAuth");
const { fetchTimetableData } = require("../core/webuntisFetch");
const {
    processTimetableData,
    groupAndSortTimetable,
    insertFreePeriods,
} = require("../core/timetableProcessor");

(async () => {
    try {
        const { sessionId, personId, personType } = await login(
            process.env.WEBUNTIS_DOMAIN,
            process.env.WEBUNTIS_SCHOOL,
            process.env.WEBUNTIS_USERNAME,
            process.env.WEBUNTIS_PASSWORD
        );
        const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
        const date = format(monday, "yyyy-MM-dd");
        const raw = await fetchTimetableData(
            sessionId,
            personType,
            personId,
            date
        );
        if (!raw) throw new Error("No raw data");

        const elems = raw.elements;
        const filtered = {
            classes: elems.filter((e) => e.type === 1),
            teachers: elems.filter((e) => e.type === 2),
            lessons: elems.filter((e) => e.type === 3),
            rooms: elems.filter((e) => e.type === 4),
        };
        const processed = await processTimetableData(
            raw.elementPeriods[personId],
            filtered
        );
        const grouped = groupAndSortTimetable(processed);
        const withFree = insertFreePeriods(grouped);

        console.log("Days:", Object.keys(withFree));
        const firstDay = Object.keys(withFree)[0];
        console.log("Sample entries:", withFree[firstDay]?.slice(0, 5));
    } catch (e) {
        console.error("Pipeline failed:", e.message);
        process.exit(1);
    }
})();
