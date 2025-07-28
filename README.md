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
   Create a `.env` in project root:
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

4. **Netlify CLI (optional)**
   ```bash
   npm install -g netlify-cli
   ```

## Usage

### 1) Local CLI (Node)

```bash
npm run cli # (if defined)
# or run directly:
node cliGenerateIcal.js
```
Result: `icals/school-timetable-YYYY-MM-DD.ics`

### 2) Netlify Function

Start:
```bash
netlify dev
```

## Recent Changes

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
