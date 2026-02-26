/**
 * Styling helpers.
 *
 * IMPORTANT: The new LiDAR tileset encodes the desired colours directly
 * in the per-point RGB (`COLOR`) channel. To respect those baked colours,
 * this module deliberately does NOT set `tileset.style.color` at all.
 *
 * We only adjust point size via point cloud shading. All attribute /
 * colour-ramp controls are essentially no-ops now.
 */

// Clear any previous style so the GLB vertex colors render natively.
export function applyDefaultStyle(tileset) {
    tileset.style = undefined;
}

// No-op: attribute-based colouring is disabled.
export function setStyleAttribute(tileset, attribute) {
    void tileset;
    void attribute;
    console.log("[Cesium Point Cloud] Attribute styling disabled; using baked RGB colours.");
}

// No-op: colour ramps are disabled.
export function setColorRamp(tileset, rampName) {
    void tileset;
    void rampName;
}

/**
 * Adjust point size without changing colour. We do this by tweaking
 * the point cloud shading maximumAttenuation value.
 */
export function setPointSize(tileset, size) {
    if (!tileset || !tileset.pointCloudShading) return;
    tileset.pointCloudShading.maximumAttenuation = Number(size) || tileset.pointCloudShading.maximumAttenuation;
}

// Kept for API completeness (not really used any more).
export function getColorRampNames() {
    return [];
}

export function getCurrentAttribute() {
    return "";
}
