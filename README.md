# WebUntis Timetable to iCal

**Convert your WebUntis school timetable into an iCal (.ics) file for easy import into any calendar.**

## Project Structure

```
project-root/
├── core/                     # Shared logic for WebUntis + iCal generation
│   ├── webuntisAuth.js       # Login/auth against WebUntis API
│   ├── webuntisFetch.js      # Fetch raw timetable data from WebUntis
│   ├── timetableProcessor.js # Process/filter/group raw timetable data
│   ├── timetableBuilder.js   # Build JSON timetable (with free periods)
│   └── timetableToIcal.js    # Turn JSON timetable into an .ics string
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
   cd timetable-ical
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` in project root:
   ```env
   WEBUNTIS_DOMAIN=domain // e.g. `nete`
   WEBUNTIS_SCHOOL=YourSchoolName
   WEBUNTIS_USERNAME=yourUsername
   WEBUNTIS_PASSWORD=yourPassword
   ```

4. **Netlify CLI (optional)**
   ```bash
   npm install -g netlify-cli
   ```

## Usage

### 1) Local CLI (Node)

```bash
npm run cli
# or:
node cliGenerateIcal.js
```
Result: `icals/school-timetable-YYYY-MM-DD.ics`

### 2) Netlify Function

Start:
```bash
netlify dev
```


## Netlify Deployment

1. Push `main`
2. On Netlify:
   - New Site from Repo
   - Build-Command: `npm run build` (or empty)
   - Set ENV Variables (`WEBUNTIS_*`):

## License

Apache License 2.0
