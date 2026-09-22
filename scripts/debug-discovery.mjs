// Temporary: probe the Okina SIRI-Lite gateway for a stop/line discovery
// endpoint, to find monitoringRef codes for new stops without guessing.
const apiKey = process.env.NAOLIB_API_KEY;
if (!apiKey) throw new Error("NAOLIB_API_KEY is not set");

const BASE = "https://api.staging.okina.fr/gateway/sem/realtime/siri/2.0";

const candidates = [
  `${BASE}/stoppoints-discovery.json`,
  `${BASE}/stop-points-discovery.json`,
  `${BASE}/stopoints-discovery.json`,
  `${BASE}/lines-discovery.json`,
];

for (const url of candidates) {
  try {
    const full = `${url}?api-key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(full);
    const text = await res.text();
    console.log(`DEBUG ${url} -> HTTP ${res.status}`);
    console.log(text.slice(0, 2000));
    console.log("---");
  } catch (err) {
    console.log(`DEBUG ${url} -> ERROR ${err.message}`);
  }
}
