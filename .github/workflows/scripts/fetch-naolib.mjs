// Fetches SIRI-Lite StopMonitoring data for each of our monitored quays,
// and writes a merged, simplified JSON file that the static app can fetch.
//
// Runs server-side (via GitHub Actions), so CORS doesn't apply here.

import { writeFile, mkdir } from "node:fs/promises";

// ---- CONFIG: adjust these once you've confirmed the real API details ----
const API_BASE_URL = "https://api.okina.fr/PUT_THE_REAL_PATH_HERE/stop-monitoring.json";
const API_KEY_HEADER = "X-Gravitee-Api-Key"; // check the API's doc/swagger tab if this isn't right
// ---------------------------------------------------------------------

const MONITORING_REFS = ["MGIN1", "IDNA1", "GNRA4", "BENA1"];
// Line 26's quay code isn't confirmed yet — add it here once known.

const apiKey = process.env.NAOLIB_API_KEY;
if (!apiKey) {
  throw new Error("NAOLIB_API_KEY is not set (check the repo secret).");
}

async function fetchOne(monitoringRef) {
  const url = `${API_BASE_URL}?MonitoringRef=${encodeURIComponent(monitoringRef)}`;
  const res = await fetch(url, {
    headers: { [API_KEY_HEADER]: apiKey },
  });

  if (!res.ok) {
    console.error(`Request failed for ${monitoringRef}: ${res.status} ${res.statusText}`);
    return { monitoringRef, visits: [] };
  }

  const json = await res.json();
  const visits =
    json?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit ?? [];

  return { monitoringRef, visits };
}

async function main() {
  const results = await Promise.all(MONITORING_REFS.map(fetchOne));

  const output = {
    fetchedAt: new Date().toISOString(),
    stops: Object.fromEntries(results.map((r) => [r.monitoringRef, r.visits])),
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/naolib.json", JSON.stringify(output, null, 2));

  console.log("Wrote data/naolib.json with", results.length, "stops.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
