const dotenv = require("dotenv").config();
const { login } = require("./webuntisAuth");
const { fetchTimetableData } = require("./webuntisFetch");
const {
    processTimetableData,
    groupAndSortTimetable,
    insertFreePeriods,
} = require("./timetableProcessor");
const { enrichTeachers } = require("./teacherEnrichment");

async function getTimetable(startDate, credsOverride) {
    const creds = credsOverride
        ? [
              credsOverride.domain,
              credsOverride.school,
              credsOverride.username,
              credsOverride.password,
          ]
        : [
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

    try {
        const disable = /^(1|true|yes)$/i.test(
            process.env.TEACHER_ENRICH_DISABLE || ""
        );
        if (!disable) {
            await enrichTeachers(processed, {
                sessionId,
                personId,
                domain: creds[0],
                school: creds[1],
                username: creds[2],
                password: creds[3],
                maxDetails: parseInt(
                    process.env.TEACHER_ENRICH_MAX || "60",
                    10
                ),
                verbose: /^(1|true|yes)$/i.test(
                    process.env.TEACHER_ENRICH_VERBOSE || ""
                ),
            });
        }
    } catch (e) {
        if (/^(1|true|yes)$/i.test(process.env.TEACHER_ENRICH_VERBOSE || "")) {
            console.error("[teacher-enrichment] Fehler:", e.message);
        }
    }

    const grouped = groupAndSortTimetable(processed);
    return insertFreePeriods(grouped);
}

module.exports = { getTimetable };
