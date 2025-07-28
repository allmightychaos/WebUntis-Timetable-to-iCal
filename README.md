# WebUntis Timetable to iCal

**Convert your WebUntis school timetable into an iCal (.ics) file for easy import into any calendar.**

## Project Structure

```
project-root/
├── core/                     # Shared logic for WebUntis + iCal generation
│   ├── webuntisAuth.js       # Login/auth against WebUntis API
│   ├── domain.js            # Resolve and validate WebUntis host domain
│   ├── webuntisFetch.js      # Fetch raw timetable data from WebUntis
│   ├── timetableProcessor.js # Process/filter/group raw timetable data
│   ├── timetableBuilder.js   # Build JSON timetable (with free periods)
│   ├── timetableToIcal.js    # Turn JSON timetable into an .ics string
│   └── utils.js             # Shared utility functions (dates, formatting, etc.)
├── icals/                    # Local output folder for generated .ics files
├── netlify/                  # Netlify Functions folder
│   └── functions/
│       └── icalHandler.js    # HTTP handler for .ics download in browser
├── cliGenerateIcal.js        # CLI entry-point: saves .ics locally with date
├── netlify.toml              # Netlify configuration + redirects
├── package.json              # Scripts + dependencies
└── .env                      # Environment variables (ignored by Git)
```

## Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd WebUntis-Timetable-to-iCal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Copy `.env.example` to `.env` in the project root and edit the values:
   ```env
   WEBUNTIS_DOMAIN=yourServer
   # short name like `nete` or the full host `nete.webuntis.com`
   WEBUNTIS_SCHOOL=YourSchoolName
   WEBUNTIS_USERNAME=yourUsername
   WEBUNTIS_PASSWORD=yourPassword
   ```

   If you encounter an error that the entered server does not exist, the
   bundled server list may be outdated. Check the current servers at
   <https://status.webuntis.com/> and feel free to submit a PR adding the new
   server name.

   When running with Netlify (including `netlify dev`), any variables
   configured in your Netlify site will override values in this file.

4. **Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```
   Required for running `netlify dev` (or `npm run dev`) to test the
   Netlify function locally.

## Usage

Environment variables are validated automatically on every run. If the
configuration is invalid, the application will exit with a helpful error
message.
Netlify provides its own environment variables during `netlify dev` or on
production, and these take precedence over values in your local `.env` file.

### 1) Local CLI (Node)

Run the generator entirely locally. No Netlify CLI required.

```bash
npm run cli # (if defined)
# or run directly:
node cliGenerateIcal.js
```
Result: `icals/school-timetable-YYYY-MM-DD.ics`

### 2) Netlify Function

Requires the Netlify CLI.
Start the local dev server with either command:
```bash
netlify dev
# or
npm run dev
```


## Recent Changes

### Environment Validation & Domain Improvements - 28th July 2025
- Added startup environment checks and `.env.example` for easier setup.
- `icalHandler` validates configuration before generating calendars.
- `domain.js` now accepts full host names and verifies connectivity.
- New `npm run dev` script runs `netlify dev` for local testing (Netlify CLI required).
- Local startup prefers Netlify-provided env vars when present.
- Removed unused code and builtin dependencies; cleaned up tests.
- Updated `.gitignore` to exclude generated `icals/` files.
- Documentation improvements across README.

### School Calendar Updates - 8th May 2025
- Added custom week range selection (1-40 weeks) for timetable generation
- Implemented smart school year handling:
  * Automatic detection of summer break periods
  * Resumes from first Monday of September after summer break
  * School year end date set to July 7th
- Enhanced date calculations:
  * Calculates remaining weeks until school year end
  * Caps requested weeks to remaining school weeks
  * Handles transitions between school years
- Improved code organization:
  * Moved date-related utilities to `utils.js`
  * Better separation of concerns
  * More maintainable and reusable code structure

## Netlify Deployment

1. Push `main`
2. On Netlify:
   - New Site from Repo
   - Build-Command: `npm run build` (or empty)
   - Set environment variables under **Site settings → Build & deploy → Environment**:
     - `WEBUNTIS_DOMAIN`
     - `WEBUNTIS_SCHOOL`
     - `WEBUNTIS_USERNAME`
     - `WEBUNTIS_PASSWORD`
   - Click **Deploy site** to trigger the initial build
3. Netlify will deploy automatically on each push once the variables are set.

## License

Apache License 2.0
