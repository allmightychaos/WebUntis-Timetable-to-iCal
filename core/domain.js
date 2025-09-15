const https = require("https");

// Known WebUntis server names (TitleCase)
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
    host = host.replace(/\.webuntis\.com$/i, "");

    // Format host to TitleCase for case-insensitive matching
    const formatted =
        host.charAt(0).toUpperCase() + host.slice(1).toLowerCase();
    if (!WEBUNTIS_SERVERS.includes(formatted))
        throw new Error("Entered server does not exist: " + host);
    const full = `${formatted}.webuntis.com`;

    await new Promise((res, rej) => {
        const req = https.request(
            { method: "HEAD", host: full, path: "/" },
            () => res()
        );
        req.on("error", rej);
        req.end();
    }).catch(() => {
        throw new Error("Could not connect to WebUntis server: " + full);
    });

    return full;
}

module.exports = { resolveWebUntisHost, WEBUNTIS_SERVERS };
