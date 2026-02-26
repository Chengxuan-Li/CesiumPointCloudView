import { CESIUM_CONFIG, PERFORMANCE_CONFIG, VERTICAL_OFFSET_METERS } from "./config.js";

let google3DTileset = null;
let diagnosticDone = false;

/**
 * One-shot diagnostic: log what metadata (if any) the tileset exposes.
 * Only runs once per page load.
 */
export function runDiagnostic(tileset) {
    if (diagnosticDone) return;
    diagnosticDone = true;

    console.group("[Cesium Point Cloud] Tileset Diagnostic");

    // Tileset-level (public API)
    console.log("tileset.properties:", tileset.properties);
    console.log("tileset.schema:", tileset.schema);

    // Walk tree and find first tile with loaded point cloud content
    var found = false;
    (function visit(tile) {
        if (found || !tile) return;
        var c = tile.content;
        if (!c) {
            if (tile.children) tile.children.forEach(visit);
            return;
        }

        // For .pnts point clouds: pointsLength = total points; featuresLength = batch groups
        var pointsLen = c.pointsLength;
        var featuresLen = c.featuresLength;
        if (typeof pointsLen !== "number") pointsLen = 0;
        if (typeof featuresLen !== "number") featuresLen = 0;

        if (pointsLen > 0 || featuresLen > 0) {
            found = true;
            console.log("=== Tile with point data ===");
            console.log("content.constructor.name:", c.constructor?.name);
            console.log("content.pointsLength:", c.pointsLength);
            console.log("content.featuresLength:", c.featuresLength);
            console.log("content.batchTableByteLength:", c.batchTableByteLength);
            console.log("All content keys:", Object.keys(c));

            // Batch table may be content.batchTable or content._batchTable
            var bt = c.batchTable || c._batchTable;
            if (bt) {
                console.log("batchTable present, keys:", Object.keys(bt));
                var inner = bt._batchTable || bt;
                if (inner && inner !== bt) console.log("_batchTable keys:", Object.keys(inner));
                if (inner && inner._properties) {
                    var propNames = Object.keys(inner._properties);
                    console.log("Batch table _properties (attribute names):", propNames);
                    propNames.forEach(function (name) {
                        var p = inner._properties[name];
                        console.log("  " + name + ":", typeof p, p && p.constructor?.name, p && p.length !== undefined ? "length=" + p.length : "");
                    });
                }
            } else {
                console.log("No content.batchTable or content._batchTable");
            }

            // This content uses _model (glTF path). Per-point data may be in _model or _metadata.
            if (c._metadata) {
                console.log("content._metadata:", c._metadata);
                console.log("content._metadata keys:", Object.keys(c._metadata));
            } else {
                console.log("content._metadata: undefined");
            }
            if (c._model) {
                var m = c._model;
                console.log("content._model keys:", Object.keys(m));
                if (m._loader) {
                    var ldr = m._loader;
                    console.log("_model._loader keys:", Object.keys(ldr));
                    if (ldr.components) {
                        console.log("_loader.components keys:", Object.keys(ldr.components));
                        if (ldr.components.structuralMetadata) {
                            var sm = ldr.components.structuralMetadata;
                            console.log("structuralMetadata keys:", Object.keys(sm));
                            var schema = sm._schema;
                            if (schema && schema.classes) {
                                console.log("structuralMetadata schema classes:", Object.keys(schema.classes));
                                for (var clsName in schema.classes) {
                                    var cls = schema.classes[clsName];
                                    if (cls && cls.properties) console.log("  class '" + clsName + "' properties:", Object.keys(cls.properties));
                                }
/**
 * Toggle Google Photorealistic 3D Tiles visibility.
 */
                            }
                            var ptCount = sm._propertyTableCount;
                            var pTables = sm._propertyTables || sm.propertyTables;
                            if (pTables && pTables.length) {
                                console.log("structuralMetadata _propertyTables count:", pTables.length);
/**
 * Update the maximumScreenSpaceError on the point cloud tileset at runtime.
 */
                                pTables.forEach(function (pt, i) {
                                    var keys = pt && (Object.keys(pt._propertyIds || pt) || Object.keys(pt));
                                    console.log("  propertyTable[" + i + "] keys:", keys);
                                    if (pt && pt._propertyIds) console.log("    _propertyIds:", pt._propertyIds);
                                    if (pt && pt._properties) console.log("    _properties:", Object.keys(pt._properties));
                                });
                            }
                            var pAttrs = sm._propertyAttributes || sm.propertyAttributes;
                            if (pAttrs && pAttrs.length) {
                                console.log("structuralMetadata _propertyAttributes count:", pAttrs.length);
                                pAttrs.forEach(function (pa, i) {
                                    console.log("  propertyAttribute[" + i + "]:", pa && Object.keys(pa));
                                    if (pa && pa._propertyIds) console.log("    _propertyIds:", pa._propertyIds);
                                    if (pa && pa._class !== undefined) console.log("    _class:", pa._class);
                                    if (pa && pa._properties) console.log("    _properties:", Object.keys(pa._properties));
                                });
                            }
                        }
                    }
                }
            }

            if (c.pointsLength > 0 && c.batchTableByteLength === 0) {
                var hasStructMeta = c._model && c._model._loader && c._model._loader.components && c._model._loader.components.structuralMetadata;
                var sm = hasStructMeta && c._model._loader.components.structuralMetadata;
                var hasProps = sm && ((sm._propertyTables && sm._propertyTables.length > 0) || (sm._propertyAttributes && sm._propertyAttributes.length > 0));
                if (!hasProps) {
                    console.warn("[Cesium Point Cloud] This tile has points but batchTableByteLength is 0 and no structural metadata property tables/attributes were found. Attribute-based styling may not work until the tileset includes per-point metadata.");
                } else {
                    console.log("[Cesium Point Cloud] Structural metadata has property data — use schema class + property name in style (e.g. ${className.propertyName}). See logged schema above.");
                }
            }

            // Try getFeature(0) API (for batched / feature-style content)
            if (c.getFeature && (featuresLen > 0 || pointsLen > 0)) {
                try {
                    var f = c.getFeature(0);
                    if (f && f.getPropertyIds) {
                        var ids = f.getPropertyIds();
                        console.log("getFeature(0).getPropertyIds():", ids);
                        if (ids && ids.length) {
                            for (var i = 0; i < Math.min(3, featuresLen || pointsLen); i++) {
                                var fi = c.getFeature(i);
                                if (fi) console.log("  feature[" + i + "] Intensity:", fi.getProperty("Intensity"), "UserData:", fi.getProperty("UserData"));
                            }
                        }
                    }
                } catch (e) {
                    console.log("getFeature/getPropertyIds error:", e.message);
                }
            }
        }

        if (!found && tile.children) tile.children.forEach(visit);
    })(tileset.root);

    if (!found) console.log("No tile with pointsLength/featuresLength > 0 found. Tiles may still be loading.");
    console.groupEnd();
}

/**
 * Load the Cesium ion point cloud tileset and optionally Google 3D Tiles.
 */
export async function loadTilesets(viewer) {
    if (CESIUM_CONFIG.enableGoogle3DTiles) {
        google3DTileset = await loadGoogle3DTiles(viewer);
    }

    const pointCloudTileset = await loadPointCloud(viewer);
    return pointCloudTileset;
}

async function loadGoogle3DTiles(viewer) {
    try {
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        viewer.scene.primitives.add(tileset);
        return tileset;
    } catch (err) {
        console.error("Failed to load Google Photorealistic 3D Tiles:", err);
        return null;
    }
}

async function loadPointCloud(viewer) {
    try {
        const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(
            CESIUM_CONFIG.assetId,
            {
                maximumScreenSpaceError: PERFORMANCE_CONFIG.maximumScreenSpaceError,
                maximumCacheOverflowBytes: PERFORMANCE_CONFIG.maximumCacheOverflowBytes,
            }
        );

        viewer.scene.primitives.add(tileset);

        tileset.pointCloudShading.attenuation = PERFORMANCE_CONFIG.pointCloudAttenuation;
        tileset.pointCloudShading.geometricErrorScale = PERFORMANCE_CONFIG.geometricErrorScale;
        tileset.pointCloudShading.maximumAttenuation = PERFORMANCE_CONFIG.maximumAttenuation;

        await viewer.zoomTo(tileset);

        if (VERTICAL_OFFSET_METERS !== 0) {
            var center = tileset.boundingSphere.center;
            var normal = Cesium.Cartesian3.normalize(center, new Cesium.Cartesian3());
            var down = Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3());
            var offsetVector = Cesium.Cartesian3.multiplyByScalar(down, -VERTICAL_OFFSET_METERS, new Cesium.Cartesian3());
            tileset.modelMatrix = Cesium.Matrix4.fromTranslation(offsetVector);
            viewer.zoomTo(tileset);
        }

        return tileset;
    } catch (err) {
        console.error("Failed to load point cloud tileset:", err);
        throw err;
    }
}

export function setGoogle3DTilesVisible(viewer, visible) {
    if (google3DTileset) {
        google3DTileset.show = visible;
    } else if (visible && !google3DTileset) {
        loadGoogle3DTiles(viewer).then(function (ts) { google3DTileset = ts; });
    }
}

export function setMaximumScreenSpaceError(tileset, value) {
    if (tileset) {
        tileset.maximumScreenSpaceError = value;
    }
}
