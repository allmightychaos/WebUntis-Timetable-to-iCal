// netlify/functions/icalHandler.js
const { generateIcal } = require('../../core/timetableToIcal');

exports.handler = async () => {
    try {
        const body = await generateIcal();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="school-timetable.ics"',
            },
            body
        };
    } catch (err) {
        console.error('iCal Error:', err);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};