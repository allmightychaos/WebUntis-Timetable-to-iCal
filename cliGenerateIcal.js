// run.js
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { generateIcal } = require('./core/timetableToIcal');

(async () => {
    try {
        const ics = await generateIcal();
        const dir = path.join(__dirname, 'icals');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const name = `school-timetable-${format(new Date(), 'yyyy-MM-dd')}.ics`;
        const target = path.join(dir, name);
        fs.writeFileSync(target, ics);
        console.log(`✅ Saved iCal to ${target}`);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
})();