const https = require("https");

// Static list of known WebUntis servers. If your server is missing, please
// check https://status.webuntis.com/ and open a PR (https://github.com/allmightychaos/WebUntis-Timetable-to-iCal/pulls) to update this list.
const WEBUNTIS_SERVERS = [
    "Achilles",
    "Ajax",
    "Antiope",
    "Aoide",
    "Arche",
    "Asopo",
    "Borys",
    "Chios",
    "Cissa",
    "Delos",
    "Erato",
    "Euterpe",
    "Hektor",
    "Hepta",
    "Herakles",
    "Hypate",
    "Ikarus",
    "Kadmos",
    "Kalliope",
    "Kephiso",
    "Klio",
    "Korfu",
    "Kos",
    "Kreta",
    "Melete",
    "Melpomene",
    "Mese",
    "Minos",
    "Naxos",
    "Neilo",
    "Nessa",
    "Nete",
    "Niobe",
    "Peleus",
    "Perseus",
    "Playground",
    "Poly",
    "Rhodos",
    "Samos",
    "Substitution Planning",
    "Tantalos",
    "Terpsichore",
    "Thalia",
    "Tipo",
    "Tritone",
    "Urania",
];

async function resolveWebUntisHost(input) {
    if (!input) throw new Error("WEBUNTIS_DOMAIN missing");

    let host = input.trim();

    // allow protocol/full URL
    if (/^https?:\/\//i.test(host)) {
        try {
            host = new URL(host).hostname;
        } catch {
            throw new Error("Invalid server name");
        }
    }

    if (host.endsWith(".webuntis.com")) {
        host = host.replace(/\.webuntis\.com$/, "");
    }

    // Format host to TitleCase for case-insensitive matching
    const formattedHost =
        host.charAt(0).toUpperCase() + host.slice(1).toLowerCase();

    if (!WEBUNTIS_SERVERS.includes(formattedHost)) {
        throw new Error("Entered server does not exist: " + host);
    }

    const fullHost = `${formattedHost}.webuntis.com`;

    await new Promise((resolve, reject) => {
        const req = https.request(
            { method: "HEAD", host: fullHost, path: "/" },
            () => resolve()
        );
        req.on("error", reject);
        req.end();
    }).catch(() => {
        throw new Error("Could not connect to WebUntis server: " + fullHost);
    });

    return fullHost;
}

module.exports = { resolveWebUntisHost, WEBUNTIS_SERVERS };
