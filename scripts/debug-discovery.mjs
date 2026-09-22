// Temporary: get the full stop-points list, filter to the names we need
// for the new per-user filter feature, and test whether the discovered
// FR_NAOLIB:Quay:NNNN refs work directly against stop-monitoring.json
// (the existing app uses short codes like MGIN1 for that endpoint).
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
];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents
}

async function main() {
  const res = await fetch(`${BASE}/stoppoints-discovery.json?api-key=${encodeURIComponent(apiKey)}`);
  const json = await res.json();
  const refs = json?.Siri?.StopPointsDelivery?.AnnotatedStopPointRef ?? [];
  console.log("DEBUG total stop points:", refs.length);

  const matches = refs.filter((r) => {
    const name = normalize(r.StopName?.[0]?.value || "");
    return NEEDED_NAMES.some((n) => name.includes(normalize(n)));
  });

  for (const m of matches) {
    console.log("DEBUG match:", JSON.stringify({ ref: m.StopPointRef?.value, name: m.StopName?.[0]?.value }));
  }

  // Test compatibility: does stop-monitoring.json accept the FR_NAOLIB:Quay:NNNN format?
  if (matches.length > 0) {
    const testRef = matches[0].StopPointRef.value;
    const smUrl = `${BASE}/stop-monitoring.json?MonitoringRef=${encodeURIComponent(testRef)}&api-key=${encodeURIComponent(apiKey)}`;
    const smRes = await fetch(smUrl);
    const smText = await smRes.text();
    console.log(`DEBUG stop-monitoring test for ${testRef} -> HTTP ${smRes.status}`);
    console.log(smText.slice(0, 1500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
