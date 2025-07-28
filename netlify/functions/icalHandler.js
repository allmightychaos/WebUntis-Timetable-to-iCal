// netlify/functions/icalHandler.js
const { format, parse, startOfWeek } = require("date-fns");
const { generateIcal } = require("../../core/timetableToIcal");

exports.handler = async (event) => {
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
