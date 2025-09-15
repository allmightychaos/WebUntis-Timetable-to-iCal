const { format, startOfWeek, add } = require("date-fns");
const { getTimetable } = require("../../core/timetableBuilder");
const { validateEnvironment } = require("../../core/startup-validation");
const { getAccount } = require("../../core/multiAccounts");
const { buildClean } = require("../../core/cleanExport");
// Changed import handling for ical-generator (supports both CJS & ESM default export)
const icalLib = require("ical-generator");
const ical = icalLib.default || icalLib;

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
    };
    if (event.httpMethod === "OPTIONS")
        return { statusCode: 204, headers, body: "" };
    try {
        // Removed validateEnvironment(); we validate per-account now.
        const m = (event.path || "").match(/\/(ical|json)\/([^\/]+)/i);
        if (!m)
            return {
                statusCode: 400,
                headers,
                body: "Use /ical/{id} or /json/{id}",
            };
        const mode = m[1].toLowerCase();
        const id = m[2];
        const account = getAccount(id);
        if (!account) {
            return { statusCode: 404, headers, body: "Unknown account id" };
        }

        // Removed legacy process.env mapping.

        if (
            !account.domain ||
            !account.school ||
            !account.username ||
            !account.password
        ) {
            return {
                statusCode: 500,
                headers,
                body: "Account config incomplete",
            };
        }

        const qs = event.queryStringParameters || {};
        let startDate;
        if (qs.date) {
            const d = new Date(qs.date + "T00:00:00");
            if (!isNaN(d))
                startDate = format(
                    startOfWeek(d, { weekStartsOn: 1 }),
                    "yyyy-MM-dd"
                );
        }
        if (!startDate)
            startDate = format(
                startOfWeek(new Date(), { weekStartsOn: 1 }),
                "yyyy-MM-dd"
            );
        const weeksParam = parseInt(qs.weeks || "2", 10);
        const weeks = weeksParam >= 1 && weeksParam <= 20 ? weeksParam : 2;

        const weekData = [];
        for (let i = 0; i < weeks; i++) {
            const dt = format(
                add(new Date(startDate), { weeks: i }),
                "yyyy-MM-dd"
            );
            try {
                const grouped = await getTimetable(dt, account);
                weekData.push({ weekStart: dt, grouped });
            } catch (e) {
                weekData.push({ weekStart: dt, error: e.message });
            }
        }

        if (mode === "json") {
            const out = {
                person: account.id,
                weeks: weekData.map((w) =>
                    w.grouped
                        ? {
                              weekStart: w.weekStart,
                              data: buildClean(w.grouped),
                          }
                        : { weekStart: w.weekStart, error: w.error }
                ),
            };
            return {
                statusCode: 200,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(out, null, 2),
            };
        }

        // Use normalized ical factory
        const cal = ical({ name: `Stundenplan ${account.id}` });
        for (const w of weekData) {
            if (!w.grouped) continue;
            const clean = buildClean(w.grouped);
            for (const day of clean.days) {
                for (const l of day.lessons) {
                    const [Y, M, D] = day.date.split("-").map(Number);
                    const [sh, sm] = l.start.split(":").map(Number);
                    const [eh, em] = l.end.split(":").map(Number);
                    const summary =
                        l.subject ||
                        l.subject_long ||
                        l.periodText ||
                        "Untis Event";
                    const parts = [];
                    if (l.subject_long) parts.push(l.subject_long);
                    if (
                        l.periodText &&
                        l.periodText !== summary &&
                        !parts.includes(l.periodText)
                    )
                        parts.push(l.periodText);
                    if (l.teacher) parts.push(`Lehrer: ${l.teacher}`);
                    if (l.state) parts.push(`Status: ${l.state}`);
                    cal.createEvent({
                        start: new Date(Y, M - 1, D, sh, sm),
                        end: new Date(Y, M - 1, D, eh, em),
                        summary,
                        description: parts.join(", "),
                    });
                }
            }
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                "Content-Type": "text/calendar",
                "Content-Disposition": `attachment; filename="${account.id}-timetable.ics"`,
            },
            body: cal.toString(),
        };
    } catch (e) {
        console.error("multi error", e);
        return { statusCode: 500, headers, body: "Internal Error" };
    }
};
