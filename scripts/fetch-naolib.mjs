// Fetches SIRI-Lite StopMonitoring data for each of our monitored quays,
// and writes a merged, simplified JSON file that the static app can fetch.
//
// Runs server-side (via GitHub Actions), so CORS doesn't apply here.

import { writeFile, mkdir } from "node:fs/promises";

// ---- CONFIG: adjust these once you've confirmed the real API details ----
const API_BASE_URL = "https://api.staging.okina.fr/gateway/sem/realtime/siri/2.0/stop-monitoring.json";
// ---------------------------------------------------------------------

const MONITORING_REFS = ["MGIN2", "IDNA1", "GNRA4", "BENA1"];
// Line 26 (→ Jonelière) is currently tracked via IDNA1 (see index.html comment):
// confirmed by real data that the ongoing works diversion routes it through
// Île de Nantes instead of its normal Monzie stop. IDNA1 is already covered
// above (also serves lines 4 and 5), so no separate quay call is needed for it.
//
// MGIN2 (→ Neustrie, line T3) replaces MGIN1 (→ Orvault Grd-Val / Marcel Paul):
// Marie's commute now needs the opposite platform at Mangin. MGIN2 is inferred
// from TAN's usual two-quay-per-stop numbering and not yet confirmed by real
// data — check data/naolib.json after the next run; revert to MGIN1 (and try
// another ref) if MGIN2 comes back empty or with the wrong DestinationName.

const apiKey = process.env.NAOLIB_API_KEY;
if (!apiKey) {
  throw new Error("NAOLIB_API_KEY is not set (check the repo secret).");
}

async function fetchOne(monitoringRef) {
  // api-key as a query param, matching the confirmed-working browser test —
  // no CORS concerns server-side either way, but keeping the same shape
  // avoids maintaining two different auth methods.
  const url = `${API_BASE_URL}?MonitoringRef=${encodeURIComponent(monitoringRef)}&api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

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
