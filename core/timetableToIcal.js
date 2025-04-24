// core/timetableToIcal.js
const icalModule = require('ical-generator');
const ical = icalModule.default || icalModule;
const { format, add } = require('date-fns');
const { getTimetable } = require('./timetableBuilder');

const TIMEZONE = 'Europe/Vienna';

async function generateIcal(startDate = format(new Date(), 'yyyy-MM-dd')) {
      const cal = ical({ name: 'Stundenplan' });
      const nextWeek = format(add(new Date(startDate), { weeks: 1 }), 'yyyy-MM-dd');

      const week1 = await getTimetable(startDate);
      const week2 = await getTimetable(nextWeek);

      for (const week of [week1, week2]) {
            Object.values(week).forEach(day =>
                  day.forEach(evt => {
                        if (evt.cellState !== 'CANCEL' && !evt.isFreePeriod) {
                              const [d, m, y] = evt.date.split('.').map(Number);
                              const [sh, sm] = evt.startTime.split(':').map(Number);
                              const [eh, em] = evt.endTime.split(':').map(Number);
                              cal.createEvent({
                                    start: new Date(y, m - 1, d, sh, sm),
                                    end: new Date(y, m - 1, d, eh, em),
                                    summary: evt.subject_short,
                                    description: `${evt.subject_long}, Raum: ${evt.room}, Lehrer: ${evt.teacherName}`,
                                    timezone: TIMEZONE,
                                    color: evt.color || undefined,
                              });
                        }
                  })
            );
      }

      return cal.toString();
}

module.exports = { generateIcal };