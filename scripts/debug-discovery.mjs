// Temporary: for every candidate quay matching our needed stop names,
// call stop-monitoring.json and summarize which lines/directions it
// actually serves right now, plus the short MonitoringRef code to use.
const apiKey = process.env.NAOLIB_API_KEY;
if (!apiKey) throw new Error("NAOLIB_API_KEY is not set");

const BASE = "https://api.staging.okina.fr/gateway/sem/realtime/siri/2.0";

const NEEDED_NAMES = [
  "république",
  "galheur",
  "espace diderot",
  "la houssais",
  "houssais",
  "neustrie",
  "monzie",
  "monzi",
];

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function main() {
  const res = await fetch(`${BASE}/stoppoints-discovery.json?api-key=${encodeURIComponent(apiKey)}`);
  const json = await res.json();
  const refs = json?.Siri?.StopPointsDelivery?.AnnotatedStopPointRef ?? [];

  const matches = refs.filter((r) => {
    const name = normalize(r.StopName?.[0]?.value || "");
    return NEEDED_NAMES.some((n) => name.includes(normalize(n)));
  });
  console.log("DEBUG candidate count:", matches.length);

  for (const m of matches) {
    const quayRef = m.StopPointRef.value;
    const stopName = m.StopName?.[0]?.value;
    try {
      const smRes = await fetch(
        `${BASE}/stop-monitoring.json?MonitoringRef=${encodeURIComponent(quayRef)}&api-key=${encodeURIComponent(apiKey)}`
      );
      const smJson = await smRes.json();
      const visits = smJson?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit ?? [];
      const shortRef = visits[0]?.MonitoringRef?.value ?? "(no visits right now)";
      const combos = new Set(
        visits.map((v) => {
          const mvj = v.MonitoredVehicleJourney;
          return `${mvj.LineRef?.value}|${mvj.DestinationName?.[0]?.value}`;
        })
      );
      console.log(
        "DEBUG",
        JSON.stringify({ stopName, quayRef, shortRef, lineDestCombos: [...combos] })
      );
    } catch (err) {
      console.log("DEBUG ERROR", stopName, quayRef, err.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
