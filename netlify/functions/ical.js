const { generateIcal } = require("../../core/timetableToIcal");
const { validateEnvironment } = require("../../core/startup-validation");

exports.handler = async (event, context) => {
    // Run validation first. This will stop the function if the config is bad.
    await validateEnvironment();

    try {
        const ics = await generateIcal();
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/calendar",
            },
            body: ics,
        };
    } catch (err) {
        console.error("[✗] Error in Netlify function:", err);
        return {
            statusCode: 500,
            body: "Error generating iCal data.",
        };
    }
};
