import { CESIUM_CONFIG } from "./config.js";

/**
 * Initialise a CesiumJS Viewer configured for point cloud visualisation
 * over Google Photorealistic 3D Tiles.
 *
 * @returns {Cesium.Viewer}
 */
export function initViewer() {
    if (CESIUM_CONFIG.ionAccessToken === "FILL_ME") {
        console.warn(
            "Cesium ion access token is not set. " +
            "Open src/config.js and replace FILL_ME with your token from https://ion.cesium.com/tokens"
        );
    }

    Cesium.Ion.defaultAccessToken = CESIUM_CONFIG.ionAccessToken;

    var googleGeocoder = false;
    try {
        if (typeof Cesium.IonGeocoderService !== "undefined" && Cesium.IonGeocodeProviderType && Cesium.IonGeocodeProviderType.GOOGLE !== undefined) {
            googleGeocoder = new Cesium.IonGeocoderService({ geocodeProviderType: Cesium.IonGeocodeProviderType.GOOGLE });
        }
    } catch (e) {}

    const viewer = new Cesium.Viewer("cesiumContainer", {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: googleGeocoder,
        geocode: googleGeocoder,
        homeButton: true,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: true,
        selectionIndicator: false,
        shadows: false,
        globe: false,
    });

    viewer.scene.msaaSamples = 2;

    return viewer;
}
