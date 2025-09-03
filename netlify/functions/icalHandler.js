// netlify/functions/icalHandler.js
const { format, parse, startOfWeek } = require("date-fns");
const { generateIcal } = require("../../core/timetableToIcal");
const { validateEnvironment } = require("../../core/startup-validation");

exports.handler = async (event) => {
    // ---- CORS default config ----
    // Wenn du credentials: 'include' im Fetch nutzt, setze ALLOW_CREDENTIALS = true
    // und verwende origin = event.headers.origin statt '*'.
    const useCredentials = false; // <- bei Bedarf auf true setzen
    const origin = useCredentials ? event.headers.origin || "*" : "*";
    const defaultHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        // wenn useCredentials === true, uncomment:
        // "Access-Control-Allow-Credentials": "true",
    };

    // handle preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: defaultHeaders,
            body: "",
        };
    }

    // Run validation first. This will stop the function if the config is bad.
    await validateEnvironment();

    try {
        let startDate;
        const dateParam =
            event.queryStringParameters && event.queryStringParameters.date;
        if (dateParam) {
            const parsed = parse(dateParam, "dd-MM-yyyy", new Date());
            if (!isNaN(parsed)) {
                const monday = startOfWeek(parsed, { weekStartsOn: 1 });
                startDate = format(monday, "yyyy-MM-dd");
            }
        }

        const body = await generateIcal(1, startDate);
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
