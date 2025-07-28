<<<<<<< HEAD
/**
 * CLI tool to generate and save iCal timetable
 * Usage: node cliGenerateIcal.js
 */

=======
// cliGenerateIcal.js
>>>>>>> df8f6eca53c4d568c7fca54dc0e5a2775301c3bd
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { generateIcal } = require('./core/timetableToIcal');

// Ensure output directory exists
const OUTPUT_DIR = path.join(__dirname, 'icals');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// Generate filename with current date
const getOutputFilename = () => {
    const date = format(new Date(), 'yyyy-MM-dd');
    return `school-timetable-${date}.ics`;
};

// Main execution
async function main() {
    try {
        // Generate iCal data
        const ics = await generateIcal();
        
        // Save to file
        const filename = getOutputFilename();
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, ics);
        
        console.log(`[✓] Saved iCal to ${filepath}`);
    } catch (err) {
        console.error('[✗] Error:', err);
        process.exit(1);
    }
}

// Run the program
main();

git add cliGenerateIcal.js
git commit -m "Your commit message"
git pull