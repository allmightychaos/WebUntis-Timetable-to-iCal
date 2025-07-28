const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");
const { generateIcal } = require("./core/timetableToIcal");

// Ensure output directory exists
const OUTPUT_DIR = path.join(__dirname, "icals");
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// Generate filename with current date
const getOutputFilename = () => {
    const date = format(new Date(), "yyyy-MM-dd");
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
        console.error("[✗] Error:", err);
        process.exit(1);
    }
}

// Run the program
main();
