# WebUntis-Timetable-to-iCal

This project fetches timetable data via the WebUntis API, processes the information, and generates an iCal file that can be used in your calendar application.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/allmightychaos/WebUntis-Timetable-to-iCal.git
   cd WebUntis-Timetable-to-iCal
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Usage

1. **Configure Environment Variables:**  
   Create a `.env` file in the root directory with your WebUntis API credentials and any other configuration options. For example:

   ```env
      WEBUNTIS_DOMAIN="replaceWithDomain"
      WEBUNTIS_SCHOOL="replaceWithSchoolname"
      WEBUNTIS_USERNAME="replaceWithUsername"
      WEBUNTIS_PASSWORD="replaceWithPassword"
   ```

2. **Run the script:**

   ```bash
   node run.js
   ```

The script will fetch your timetable data, process it, and generate an iCal file that you can import into your calendar.

## License

This project is licensed under the Apache License 2.0.
