const ical = require('ical-generator').default || require('ical-generator');
const { parse } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');
const { run } = require('../../run.js');

const CEST_TIMEZONE = 'Europe/Berlin'; // Central European Summer Time

export async function handler(event, context) {
    try {
        const finalTimetable = await run();
        if (!finalTimetable) {
            return { statusCode: 500, body: 'Failed to generate timetable' };
        }

        const calendar = ical({ name: 'School Timetable' });

        Object.values(finalTimetable).forEach(day => {
            day.forEach(event => {
                if (event.cellState !== "CANCEL" && !event.isFreePeriod) {
                    const start = zonedTimeToUtc(`${event.date} ${event.startTime}`, CEST_TIMEZONE);
                    const end = zonedTimeToUtc(`${event.date} ${event.endTime}`, CEST_TIMEZONE);

                    calendar.createEvent({
                        start,
                        end,
                        summary: event.subject_short,
                        description: `${event.subject_long}, Room: ${event.room}, Teacher: ${event.teacherName}`,
                        color: event.color || undefined,
                    });
                }
            });
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="school-timetable.ics"',
            },
            body: calendar.toString(),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error.message) };
    }
}
