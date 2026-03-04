/**
 * Cesium ion Configuration
 *
 * HOW TO SET UP:
 *
 * 1. CESIUM ION ACCESS TOKEN (required)
 *    - Sign up or log in at https://ion.cesium.com
 *    - Go to "Access Tokens" and copy your default token
 *    - Replace "FILL_ME" below with your token string
 *
 * 2. ASSET ID
 *    - The assetId below points to a Cesium ion 3D Tiles asset
 *    - To load a different asset, change assetId to your asset's numeric ID
 *    - Find asset IDs under "My Assets" in your Cesium ion dashboard
 *
 * 3. GOOGLE PHOTOREALISTIC 3D TILES
 *    - Set enableGoogle3DTiles to false to disable the Google 3D Tiles base layer
 *    - This can improve performance on lower-end hardware
 */

// src/config.js

/**
 * Mapping from city slug in the URL to Cesium ion asset IDs.
 *
 * Example URLs (depending on your hosting setup):
 *   - /albany
 *   - /tompkins
 *
 * The last non-empty path segment is treated as the city key.
 * If no matching key is found, the default city is used.
 */
export const CITY_ASSETS = {
    albany: 4497409,//4492611,
    tompkins: 4498876,//4490407,
};

const DEFAULT_CITY = "tompkins";

function resolveCityFromLocation() {
    if (typeof window === "undefined" || !window.location) {
        return DEFAULT_CITY;
    }

    // 1) Prefer explicit ?city=albany style query parameter
    try {
        const params = new URLSearchParams(window.location.search || "");
        const qCity = (params.get("city") || "").toLowerCase();
        if (qCity && Object.prototype.hasOwnProperty.call(CITY_ASSETS, qCity)) {
            return qCity;
        }
    } catch {
        // ignore URL parsing issues and fall through to pathname
    }

    // 2) Fallback to last non-empty path segment: /albany, /tompkins, etc.
    const pathname = window.location.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
        const last = segments[segments.length - 1].toLowerCase();
        if (Object.prototype.hasOwnProperty.call(CITY_ASSETS, last)) {
            return last;
        }
    }

    // 3) Default
    return DEFAULT_CITY;
}

const RESOLVED_CITY = resolveCityFromLocation();
const RESOLVED_ASSET_ID = CITY_ASSETS[RESOLVED_CITY] || CITY_ASSETS[DEFAULT_CITY];

export const CESIUM_CONFIG = {
    ionAccessToken: window.CESIUM_ION_TOKEN || "FILL_ME",
    assetId: RESOLVED_ASSET_ID,
    enableGoogle3DTiles: true,
};

// Expose the resolved city key for potential UI use.
export const CURRENT_CITY = RESOLVED_CITY;

/**
 * Vertical offset for the point cloud tileset, in meters.
 * LiDAR is often in a different vertical datum than 3D Tiles (e.g. geoid vs ellipsoid).
 * - positive: move point cloud UP (if it appears below the 3D tiles)
 * - negative: move point cloud DOWN (if it appears above the 3D tiles)
 * Set to 0 to disable.
 */
export const VERTICAL_OFFSET_METERS = -33;

/**
 * Performance tuning for point cloud rendering.
 *
 * - maximumScreenSpaceError: Lower values = higher quality, higher GPU cost.
 *   Recommended range: 2 (high quality) to 16 (fast).
 *
 * - pointCloudAttenuation: When true, points are sized based on density
 *   so they fill gaps. Disable for raw per-point rendering.
 *
 * - geometricErrorScale: Multiplier on tile geometric error.
 *   Values < 1.0 load more detail; > 1.0 load less.
 *
 * - maximumAttenuation: Upper bound on attenuated point size in pixels.
 *   Prevents points from becoming excessively large when zoomed in.
 *
 * - maximumCacheOverflowBytes: Tile cache limit in bytes.
 *   512 MB default keeps memory in check for large LiDAR datasets.
 */
export const PERFORMANCE_CONFIG = {
    maximumScreenSpaceError: 4,
    pointCloudAttenuation: true,
    geometricErrorScale: 1.0,
    maximumAttenuation: 4,
    maximumCacheOverflowBytes: 512 * 1024 * 1024,
};

/**
 * Per-point attribute definitions from the LiDAR dataset.
 *
 * Each entry describes a numeric field available in the tileset's metadata.
 *   - field:  exact property name in the 3D Tiles data
 *   - label:  human-readable name shown in the UI
 *   - unit:   display unit (for UI labels / legends)
 *   - min:    expected minimum value (drives colour ramp breakpoints)
 *   - max:    expected maximum value
 *
 * Adjust min/max to match your actual data range for best colour distribution.
 * For the current 3D Tiles 1.1 GLB tileset, only the structural metadata
 * properties below are available.
 */
export const ATTRIBUTES = [
    {
        field: "AnnualRadiation_kWh_m2",
        label: "Annual Radiation",
        unit: "kWh/m²",
        min: 0,
        max: 1600,
        // Aliases in some GLTF/GLB exports:
        //   "Radiation" (and possibly "_Radiation")
        aliases: ["Radiation"],
    },
    {
        field: "MeanSunlitFraction",
        label: "Mean Sunlit Fraction",
        unit: "",
        min: 0,
        max: 1,
        // Aliases: "SunlitFrac", possibly with "_" prefix.
        aliases: ["SunlitFrac"],
    },
    {
        field: "HorizontalViewFactor",
        label: "Horizontal View Factor",
        unit: "",
        min: 0,
        max: 1,
        // Aliases: "HorizView"
        aliases: ["HorizView"],
    },
    {
        field: "SkyViewFactor",
        label: "Sky View Factor",
        unit: "",
        min: 0,
        max: 1,
        // Aliases: "SkyView"
        aliases: ["SkyView"],
    },
    {
        field: "Area_m2",
        label: "Area",
        unit: "m²",
        min: 0,
        max: 100,
        // Aliases: "SensorArea" (ShadingSensorArea[m2])
        aliases: ["SensorArea"],
    },
];

/**
 * Default styling configuration.
 *
 * - defaultAttribute: The per-point attribute field name to colour by on load.
 * - defaultColorRamp: Which colour ramp preset to apply on load.
 *   Options: "heat", "viridis", "coolWarm", "greyscale"
 * - defaultPointSize: Base point size in pixels (before attenuation).
 */
export const STYLING_CONFIG = {
    defaultAttribute: "AnnualRadiation_kWh_m2",
    defaultColorRamp: "heat",
    defaultPointSize: 3,
};
