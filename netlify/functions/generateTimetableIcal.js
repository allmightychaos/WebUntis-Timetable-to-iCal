const ical = require('ical-generator').default || require('ical-generator');
const { add, format } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');
const { run } = require('../../run.js');

const CEST_TIMEZONE = 'Europe/Berlin';

export async function handler(event, context) {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const nextWeek = format(add(new Date(), { weeks: 1 }), 'yyyy-MM-dd');

        // Get timetables for this week and next week
        const timetableThisWeek = await run(today);
        const timetableNextWeek = await run(nextWeek);

        if (!timetableThisWeek && !timetableNextWeek) {
            return { statusCode: 500, body: 'Failed to generate timetable' };
        }

        const calendar = ical({ name: 'School Timetable' });

        const addEventsToCalendar = (timetable) => {
            Object.values(timetable).forEach(day => {
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
        };

        // Add events from both weeks
        if (timetableThisWeek) addEventsToCalendar(timetableThisWeek);
        if (timetableNextWeek) addEventsToCalendar(timetableNextWeek);

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