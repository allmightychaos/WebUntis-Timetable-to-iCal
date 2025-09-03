// netlify/functions/icalHandler.js
const { format, parse, startOfWeek } = require("date-fns");
const { generateIcal } = require("../../core/timetableToIcal");
const { validateEnvironment } = require("../../core/startup-validation");

exports.handler = async (event) => {
    const useCredentials = false;
    const origin = useCredentials ? event.headers.origin || "*" : "*";
    const defaultHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        // "Access-Control-Allow-Credentials": "true",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: defaultHeaders, body: "" };
    }

    await validateEnvironment();

    try {
        let startDate;
        const qs = event.queryStringParameters || {};
        if (qs.date) {
            const parsed = parse(qs.date, "dd-MM-yyyy", new Date());
            if (!isNaN(parsed)) {
                const monday = startOfWeek(parsed, { weekStartsOn: 1 });
                startDate = format(monday, "yyyy-MM-dd");
            }
        }

        // NEW: weeks param (defaults to 4 like CLI)
        const weeksParam = parseInt(qs.weeks || "4", 10);
        const weeks =
            Number.isInteger(weeksParam) && weeksParam >= 1 && weeksParam <= 40
                ? weeksParam
                : 4;

        const body = await generateIcal(weeks, startDate);
        return {
            statusCode: 200,
            headers: {
                ...defaultHeaders,
                "Content-Type": "text/calendar",
                "Content-Disposition":
                    'attachment; filename="school-timetable.ics"',
            },
            body,
        };
    } catch (err) {
        console.error("iCal Error:", err);
        return {
            statusCode: 500,
            headers: defaultHeaders,
            body: "Internal Server Error",
        };
    }
};
