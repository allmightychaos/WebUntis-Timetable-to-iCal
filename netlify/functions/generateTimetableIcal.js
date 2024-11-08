const ical = require('ical-generator').default || require('ical-generator');
const { add, format } = require('date-fns');
const { run } = require('../../run.js');

const CEST_TIMEZONE = 'Europe/Vienna';

export async function handler(event, context) {
    try {
        const calendar = ical({ name: 'Stundenplan' });
        const today = format(new Date(), 'yyyy-MM-dd');
        const nextWeek = format(add(new Date(), { weeks: 1 }), 'yyyy-MM-dd');

        // Fetch timetable data for this week and next week
        const timetableThisWeek = await run(today);
        const timetableNextWeek = await run(nextWeek);

        // Function to add events from a specific week's timetable
        const addEventsToCalendar = (timetable) => {
            Object.values(timetable).forEach(day => {
                day.forEach(event => {
                    if (event.cellState !== "CANCEL" && !event.isFreePeriod) {
                        const [day, month, year] = event.date.split('.');
                        const [startHour, startMinute] = event.startTime.split(':');
                        const [endHour, endMinute] = event.endTime.split(':');

                        const start = new Date(year, month - 1, day, startHour, startMinute);
                        const end = new Date(year, month - 1, day, endHour, endMinute);

                        calendar.createEvent({
                            start,
                            end,
                            summary: event.subject_short,
                            description: `${event.subject_long}, Room: ${event.room}, Teacher: ${event.teacherName}`,
                            color: event.color || undefined,
                            timezone: CEST_TIMEZONE,
                        });
                    }
                });
            });
        };

        // Add events from this week and next week
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
        console.error("Error generating iCal file:", error);
        return {
            statusCode: 500,
            body: "Internal Server Error",
        };
    }
}
