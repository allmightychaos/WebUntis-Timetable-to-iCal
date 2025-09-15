# WebUntis Timetable to iCal

**Convert your WebUntis school timetable into an iCal (.ics) file for easy import into any calendar.**

## Project Structure

```
project-root/
├── core/                     # Shared logic for WebUntis + iCal generation
│   ├── webuntisAuth.js       # Login/auth against WebUntis API
│   ├── domain.js             # Resolve and validate WebUntis host domain
│   ├── webuntisFetch.js      # Fetch raw timetable data from WebUntis
│   ├── timetableProcessor.js # Process/filter/group raw timetable data
│   ├── timetableBuilder.js   # Build JSON timetable (with free periods)
│   ├── teacherEnrichment.js  # Fallback teacher name enrichment via REST detail endpoints
│   ├── timetableToIcal.js    # Turn JSON timetable into an .ics string
│   └── utils.js              # Shared utility functions (dates, formatting, etc.)
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
    git clone https://github.com/allmightychaos/WebUntis-Timetable-to-iCal.git
    cd WebUntis-Timetable-to-iCal
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Configure environment (Multi‑Account JSON)**
   The project now uses a single environment variable `WEBUNTIS_ACCOUNTS` containing a JSON array of account objects. Each object requires:

    - `id` (used in Netlify endpoints: /ical/{id}, /json/{id})
    - `domain` (WebUntis server short name e.g. `nete`, `neilo` — NOT the full host)
    - `school` (school identifier passed in the query string)
    - `username`
    - `password`

    Example `.env`:

    ```env
    WEBUNTIS_ACCOUNTS='[
      {"id":"eli","domain":"neilo","school":"fsb-wr-neustadt","username":"ReisneEli","password":"pw"},
      {"id":"sam","domain":"nete","school":"htlwrn","username":"weghofer.samuel","password":"pw"}
    ]'
    ```

    Optional enrichment toggles:

    - `TEACHER_ENRICH_DISABLE=1` – disable teacher detail enrichment
    - `TEACHER_ENRICH_MAX=40` – cap detail requests (default 60)
    - `TEACHER_ENRICH_VERBOSE=1` – verbose enrichment logging
      Optional pre-supplied REST tokens (skips auto discovery if present):
    - `WEBUNTIS_BEARER`
    - `WEBUNTIS_TENANT_ID`
    - `WEBUNTIS_SCHOOL_YEAR_ID`

    Legacy single-account variables (`WEBUNTIS_DOMAIN`, `WEBUNTIS_SCHOOL`, `WEBUNTIS_USERNAME`, `WEBUNTIS_PASSWORD`) have been removed. Use the JSON array instead.

4. **Netlify CLI**
    ```bash
    npm install -g netlify-cli
    ```
    Required for running `netlify dev` (or `npm run dev`) to test the Netlify functions locally.

## Usage

**Note**: All domains in `WEBUNTIS_ACCOUNTS` are validated automatically on startup.

### 1) Local CLI (Node)

Generate an iCal for the first account (default account = first array entry):

```bash
node cliGenerateIcal.js
```

Result: `icals/school-timetable-YYYY-MM-DD.ics`

### 2) Netlify Multi-Account Functions

Two endpoints per account id:

-   `/ical/{id}` – Download iCal for that account (current + optional weeks query)
-   `/json/{id}` – JSON export (cleaned timetable structure)

Query parameters:

-   `date=dd-MM-yyyy` (start week override; Monday auto-normalized)
-   `weeks=1..20` (multi endpoint) / `weeks=1..40` (single combined generator)

### 3) Single Combined iCal (deprecated path)

`/.netlify/functions/icalHandler` still exists but now also relies on the first account in `WEBUNTIS_ACCOUNTS`.

## Test / Development Scripts

Numbered helper scripts in `tests/` (run with `node tests/<file>`):

1. `01-validate-env.js` – Validate `WEBUNTIS_ACCOUNTS` and domain reachability.
2. `02-resolve-domain.js` – Resolve/verify a domain (first account's domain).
3. `03-login.js` – Login using the first account.
4. `04-fetch-week-raw.js` – Fetch raw weekly timetable JSON.
5. `05-get-timetable.js` – Full build: processed + grouped + free periods → writes cleaned JSON.
6. `06-process-pipeline.js` – (legacy style) still uses explicit env access (will be updated).
7. `07-generate-ical.js` – Generate `.ics` (first account).
8. `08-detail-fallback.js` – Diagnostic teacher enrichment script (still references legacy vars internally – slated for refactor if kept).

## Cleaned Timetable JSON Shape

```json
{
    "generatedAt": "2025-09-12T08:30:11.123Z",
    "days": [
        {
            "date": "2025-09-08",
            "lessons": [
                {
                    "id": 123,
                    "subject": "MATH",
                    "teacher": "A.Teacher",
                    "room": "101",
                    "start": "08:00",
                    "end": "08:50",
                    "state": "STANDARD"
                }
            ],
            "freePeriods": [{ "start": "09:40", "end": "10:30" }]
        }
    ]
}
```

## Automatic Teacher Name Enrichment

(unchanged – now keyed off chosen account credentials)

Environment toggles: see above under configuration.

## Recent Changes

### Multi-Account Environment Migration - 15 Sep 2025

-   Replaced 4 single-account env vars with unified `WEBUNTIS_ACCOUNTS` JSON array.
-   Updated validation logic to iterate unique domains from the array.
-   Netlify multi function consumes `/ical/{id}` & `/json/{id}` using `id` field.
-   README / .env.example updated; legacy docs removed.

### Teacher Enrichment Integration - 12 Sep 2025

-   Added `core/teacherEnrichment.js` etc.

(Older change log entries retained below)

### Environment Validation & Domain Improvements - 28 Jul 2025

-   Startup environment checks, domain verification improvements.

### School Calendar Updates - 8 May 2025

-   See previous notes (remaining weeks, summer break logic, etc.).

## Netlify Deployment

1. Push `main`.
2. In Netlify site settings add a single variable:
    - `WEBUNTIS_ACCOUNTS` (JSON string) e.g.
        ```
        [
          {"id":"eli","domain":"neilo","school":"fsb-wr-neustadt","username":"ReisneEli","password":"pw"},
          {"id":"sam","domain":"nete","school":"htlwrn","username":"weghofer.samuel","password":"pw"}
        ]
        ```
3. (Optional) Add enrichment toggles or pre-supplied tokens.
4. Deploy – functions will validate domains on first invocation.

## License

Apache License 2.0
