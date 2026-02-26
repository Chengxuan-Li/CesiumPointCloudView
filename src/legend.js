/**
 * Load the point cloud legend from src/legend.json.
 *
 * The schema is:
 * {
 *   "attribute": "AnnualRadiation_Wh_m2",
 *   "value_min": 0.0,
 *   "value_max": 1554558.375,
 *   "stops": [
 *     {
 *       "t": 0.0,           // 0–1 along ramp
 *       "value": 0.0,       // attribute value at this stop
 *       "rgb01": [0,0,0.5], // colour as 0–1 floats
 *       "rgb255": [0,0,127] // same colour as 0–255 ints
 *     },
 *     ...
 *   ],
 *   "note": "Colors are applied as a continuous ramp; stops are reference points."
 * }
 */
export async function loadLegend() {
    const response = await fetch("./src/legend.json", { cache: "no-cache" });
    if (!response.ok) {
        throw new Error("Failed to load legend.json: " + response.status + " " + response.statusText);
    }
    const legend = await response.json();
    // Basic sanity check of expected fields
    if (!legend || typeof legend !== "object" || !legend.attribute || !Array.isArray(legend.stops)) {
        throw new Error("legend.json does not match expected schema.");
    }
    if (typeof window !== "undefined") {
        window.LIDAR_LEGEND = legend;
        console.log("[Cesium Point Cloud] Loaded legend for attribute:", legend.attribute, legend);
    }
    return legend;
}

