// core/timetableBuilder.js
const dotenv = require("dotenv");
// Load .env only when not running on Netlify
if (!process.env.NETLIFY && !process.env.NETLIFY_DEV) {
    dotenv.config();
}

const { login } = require("./webuntisAuth");
const { fetchTimetableData } = require("./webuntisFetch");
const {
    processTimetableData,
    groupAndSortTimetable,
    insertFreePeriods,
} = require("./timetableProcessor");

async function getTimetable(startDate) {
    const creds = [
        process.env.WEBUNTIS_DOMAIN,
        process.env.WEBUNTIS_SCHOOL,
        process.env.WEBUNTIS_USERNAME,
        process.env.WEBUNTIS_PASSWORD,
    ];
    const loginData = await login(...creds);
    if (!loginData) throw new Error("Login failed");

    const { sessionId, personId, personType } = loginData;
    const raw = await fetchTimetableData(
        sessionId,
        personType,
        personId,
        startDate
    );
    if (!raw) throw new Error("Fetch failed");

    // nach Typ filtern
    const elems = raw.elements;
    const filtered = {
        classes: elems.filter((e) => e.type === 1),
        teachers: elems.filter((e) => e.type === 2),
        lessons: elems.filter((e) => e.type === 3),
        rooms: elems.filter((e) => e.type === 4),
    };

    // verarbeiten, sortieren, Free-Periods einfügen
    const processed = await processTimetableData(
        raw.elementPeriods[personId],
        filtered
    );
    const grouped = groupAndSortTimetable(processed);
    return insertFreePeriods(grouped);
}

module.exports = { getTimetable };
