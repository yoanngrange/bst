// Temporary: find the monitoringRef for "Trocardière" (T3 toward Marcel Paul),
// replacing Martine's Neustrie point.
const apiKey = process.env.NAOLIB_API_KEY;
if (!apiKey) throw new Error("NAOLIB_API_KEY is not set");

const BASE = "https://api.staging.okina.fr/gateway/sem/realtime/siri/2.0";

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function main() {
  const res = await fetch(`${BASE}/stoppoints-discovery.json?api-key=${encodeURIComponent(apiKey)}`);
  const json = await res.json();
  const refs = json?.Siri?.StopPointsDelivery?.AnnotatedStopPointRef ?? [];

  const matches = refs.filter((r) => normalize(r.StopName?.[0]?.value || "").includes("trocardiere"));
  console.log("DEBUG candidate count:", matches.length);

  for (const m of matches) {
    const quayRef = m.StopPointRef.value;
    const stopName = m.StopName?.[0]?.value;
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
    console.log("DEBUG", JSON.stringify({ stopName, quayRef, shortRef, lineDestCombos: [...combos] }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
