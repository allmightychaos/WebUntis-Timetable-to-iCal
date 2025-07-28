// netlify/functions/icalHandler.js
const { format, parse, startOfWeek } = require("date-fns");
const { generateIcal } = require("../../core/timetableToIcal");
const { validateEnvironment } = require("../../core/startup-validation");

exports.handler = async (event) => {
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
                "Content-Type": "text/calendar",
                "Content-Disposition":
                    'attachment; filename="school-timetable.ics"',
            },
            body,
        };
    } catch (err) {
        console.error("iCal Error:", err);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
