const { resolveWebUntisHost } = require("./domain");

// Load .env locally but prefer Netlify-injected variables when available
if (!process.env.NETLIFY && !process.env.NETLIFY_DEV) {
    require("dotenv").config();
}

/**
 * Validates the essential WebUntis environment variables on application startup.
 * It checks if the domain is set, resolves it, and verifies it's a valid and reachable server.
 * If validation fails, it logs a clear error and exits the process.
 */
async function validateEnvironment() {
    console.log("Performing startup environment validation...");
    const domain = process.env.WEBUNTIS_DOMAIN;

    if (!domain) {
        console.error(
            "❌ FATAL: WEBUNTIS_DOMAIN is not set. Please check your .env file or environment variables."
        );
        process.exit(1);
    }

    try {
        const resolvedHost = await resolveWebUntisHost(domain);
        console.log(
            `✅ Environment validation successful. Using server: ${resolvedHost}`
        );
    } catch (error) {
        console.error(
            "❌ FATAL: Environment validation failed:",
            error.message
        );
        // Exit the process because the configuration is invalid and the app cannot run.
        process.exit(1);
    }
}

module.exports = { validateEnvironment };
