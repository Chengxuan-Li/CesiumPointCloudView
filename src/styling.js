import { STYLING_CONFIG, ATTRIBUTES } from "./config.js";

/**
 * Data-driven styling via Cesium.CustomShader.
 *
 * PropertyAttributes (per-vertex GPU metadata) are NOT accessible through
 * Cesium3DTileStyle expressions (CPU-side). They ARE accessible in GLSL
 * via fsInput.metadata.propertyName / vsInput.metadata.propertyName.
 */

// ---------------------------------------------------------------------------
// Colour ramp definitions — each is an array of { t, rgb } stops.
// rgb values are 0–255. GLSL and CSS are generated from these.
// ---------------------------------------------------------------------------

const COLOR_RAMPS = {
    heat: {
        label: "Heat",
        stops: [
            { t: 0.00, rgb: [0, 0, 128] },
            { t: 0.25, rgb: [0, 0, 255] },
            { t: 0.50, rgb: [0, 255, 255] },
            { t: 0.75, rgb: [255, 255, 0] },
            { t: 1.00, rgb: [255, 0, 0] },
        ],
    },
    viridis: {
        label: "Viridis",
        stops: [
            { t: 0.00, rgb: [68, 1, 84] },
            { t: 0.25, rgb: [59, 82, 139] },
            { t: 0.50, rgb: [33, 145, 140] },
            { t: 0.75, rgb: [94, 201, 98] },
            { t: 1.00, rgb: [253, 231, 37] },
        ],
    },
    coolWarm: {
        label: "Cool ↔ Warm",
        stops: [
            { t: 0.00, rgb: [59, 76, 192] },
            { t: 0.50, rgb: [221, 221, 221] },
            { t: 1.00, rgb: [180, 4, 38] },
        ],
    },
    turbo: {
        label: "Turbo",
        stops: [
            { t: 0.00, rgb: [48, 18, 59] },
            { t: 0.17, rgb: [70, 107, 227] },
            { t: 0.33, rgb: [33, 185, 214] },
            { t: 0.50, rgb: [72, 241, 111] },
            { t: 0.67, rgb: [195, 232, 41] },
            { t: 0.83, rgb: [254, 165, 12] },
            { t: 1.00, rgb: [122, 4, 3] },
        ],
    },
    magma: {
        label: "Magma",
        stops: [
            { t: 0.00, rgb: [0, 0, 4] },
            { t: 0.25, rgb: [82, 22, 121] },
            { t: 0.50, rgb: [194, 52, 82] },
            { t: 0.75, rgb: [254, 165, 58] },
            { t: 1.00, rgb: [252, 253, 191] },
        ],
    },
    greyscale: {
        label: "Greyscale",
        stops: [
            { t: 0.00, rgb: [0, 0, 0] },
            { t: 1.00, rgb: [255, 255, 255] },
        ],
    },
};

// ---------------------------------------------------------------------------
// GLSL generation from ramp stops
// ---------------------------------------------------------------------------

function vec3Str(rgb) {
    return "vec3(" + (rgb[0] / 255).toFixed(4) + ", " + (rgb[1] / 255).toFixed(4) + ", " + (rgb[2] / 255).toFixed(4) + ")";
}

function rampToGlsl(stops, tVar) {
    var lines = [];
    lines.push("  vec3 c;");
    for (var i = 0; i < stops.length - 1; i++) {
        var lo = stops[i];
        var hi = stops[i + 1];
        var cond = (i === 0) ? "if" : "} else if";
        if (i === stops.length - 2) {
            // last segment — else branch
            if (i === 0) {
                lines.push("  c = mix(" + vec3Str(lo.rgb) + ", " + vec3Str(hi.rgb) + ", clamp((" + tVar + " - " + lo.t.toFixed(4) + ") / " + (hi.t - lo.t).toFixed(4) + ", 0.0, 1.0));");
            } else {
                lines.push("  } else {");
                lines.push("    float s = clamp((" + tVar + " - " + lo.t.toFixed(4) + ") / " + (hi.t - lo.t).toFixed(4) + ", 0.0, 1.0);");
                lines.push("    c = mix(" + vec3Str(lo.rgb) + ", " + vec3Str(hi.rgb) + ", s);");
                lines.push("  }");
            }
        } else {
            lines.push("  " + cond + " (" + tVar + " < " + hi.t.toFixed(4) + ") {");
            lines.push("    float s = clamp((" + tVar + " - " + lo.t.toFixed(4) + ") / " + (hi.t - lo.t).toFixed(4) + ", 0.0, 1.0);");
            lines.push("    c = mix(" + vec3Str(lo.rgb) + ", " + vec3Str(hi.rgb) + ", s);");
        }
    }
    return lines;
}

// ---------------------------------------------------------------------------
// CSS gradient generation
// ---------------------------------------------------------------------------

function rampToCssGradient(stops) {
    var parts = stops.map(function (s) {
        return "rgb(" + s.rgb[0] + "," + s.rgb[1] + "," + s.rgb[2] + ") " + Math.round(s.t * 100) + "%";
    });
    return "linear-gradient(90deg, " + parts.join(", ") + ")";
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentColorAttribute = STYLING_CONFIG.defaultAttribute;
let currentSizeAttribute = null;
let currentSizeScale = STYLING_CONFIG.defaultPointSize || 3;
let currentRamp = STYLING_CONFIG.defaultColorRamp || "heat";
// Structural metadata property names discovered at runtime (via tilesets.js)
let availablePropertyNames = null;
/** Filter range for the colour attribute: normalized 0–1. Points outside [min,max] are hidden. */
let currentFilterMinNorm = 0;
let currentFilterMaxNorm = 1;
/** Per-point normal offset distance in model units (meters). */
let currentNormalOffset = 0.0;
// Resolved property names for normals, if present
let normalXPropName = null;
let normalYPropName = null;
let normalZPropName = null;

function getAttributeMeta(field) {
    return (
        ATTRIBUTES.find(function (a) { return a.field === field; }) ||
        { field: field, label: field, unit: "", min: 0, max: 1, aliases: [] }
    );
}

function normalizeName(name) {
    return String(name || "").replace(/^_+/, "");
}

function resolvePropertyNameForMeta(meta) {
    const base = meta.field;
    const aliases = Array.isArray(meta.aliases) ? meta.aliases : [];
    const candidates = [base].concat(aliases).map((s) => String(s || ""));

    if (!availablePropertyNames || !availablePropertyNames.length) {
        return base;
    }

    // First pass: exact match (including underscore variants)
    for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        for (let j = 0; j < availablePropertyNames.length; j++) {
            const prop = availablePropertyNames[j];
            if (prop === cand) return prop;
        }
    }

    // Second pass: match ignoring leading underscores on metadata side
    for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        for (let j = 0; j < availablePropertyNames.length; j++) {
            const prop = availablePropertyNames[j];
            if (normalizeName(prop) === cand) return prop;
        }
    }

    // Fallback to base logical name
    return base;
}

// ---------------------------------------------------------------------------
// Shader builder
// ---------------------------------------------------------------------------

function buildShader() {
    var colorMeta = getAttributeMeta(currentColorAttribute);
    var rampDef = COLOR_RAMPS[currentRamp] || COLOR_RAMPS.heat;
    var colorPropName = resolvePropertyNameForMeta(colorMeta);
    var useNormals = !!(normalXPropName && normalYPropName && normalZPropName && currentNormalOffset !== 0);

    var fragLines = [];
    fragLines.push("void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {");
    fragLines.push("  float cVal = float(fsInput.metadata." + colorPropName + ");");
    fragLines.push("  float t = clamp((cVal - " + colorMeta.min.toFixed(1) + ") / " +
        Math.max(1e-6, colorMeta.max - colorMeta.min).toFixed(1) + ", 0.0, 1.0);");

    var rampGlsl = rampToGlsl(rampDef.stops, "t");
    fragLines = fragLines.concat(rampGlsl);

    fragLines.push("  if (t < " + currentFilterMinNorm.toFixed(4) + " || t > " + currentFilterMaxNorm.toFixed(4) + ") {");
    fragLines.push("    material.alpha = 0.0;");
    fragLines.push("  } else {");
    fragLines.push("    material.diffuse = c;");
    fragLines.push("    material.alpha = 1.0;");
    fragLines.push("  }");
    fragLines.push("}");

    var vertLines = [];
    vertLines.push("void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {");
    if (currentSizeAttribute) {
        var sizeMeta = getAttributeMeta(currentSizeAttribute);
        var sizePropName = resolvePropertyNameForMeta(sizeMeta);
        vertLines.push("  float sVal = float(vsInput.metadata." + sizePropName + ");");
        vertLines.push("  float st = clamp((sVal - " + sizeMeta.min.toFixed(1) + ") / " +
            Math.max(1e-6, sizeMeta.max - sizeMeta.min).toFixed(1) + ", 0.0, 1.0);");
        vertLines.push("  vsOutput.pointSize = " + currentSizeScale.toFixed(1) + " * (0.5 + st);");
    } else {
        vertLines.push("  vsOutput.pointSize = " + currentSizeScale.toFixed(1) + ";");
    }
    if (useNormals) {
        vertLines.push("  vec3 n = normalize(vec3(" +
            "float(vsInput.metadata." + normalXPropName + ")," +
            "float(vsInput.metadata." + normalYPropName + ")," +
            "float(vsInput.metadata." + normalZPropName + ")));");
        vertLines.push("  vsOutput.positionMC.xyz += n * " + currentNormalOffset.toFixed(3) + ";");
    }
    vertLines.push("}");

    return new Cesium.CustomShader({
        fragmentShaderText: fragLines.join("\n"),
        vertexShaderText: vertLines.join("\n"),
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function applyDefaultStyle(tileset) {
    if (!tileset) return;
}

export function setStyleAttribute(tileset, attribute) {
    if (!tileset || !attribute) return;
    currentColorAttribute = attribute;
    currentFilterMinNorm = 0;
    currentFilterMaxNorm = 1;
    tileset.customShader = buildShader();
}

export function setColorRamp(tileset, rampName) {
    if (!tileset || !COLOR_RAMPS[rampName]) return;
    currentRamp = rampName;
    if (currentColorAttribute) {
        tileset.customShader = buildShader();
    }
}

export function setSizeAttribute(tileset, attribute) {
    if (!tileset) return;
    currentSizeAttribute = attribute || null;
    tileset.customShader = buildShader();
}

export function setPointSize(tileset, size) {
    if (!tileset) return;
    currentSizeScale = Number(size) || currentSizeScale;
    tileset.customShader = buildShader();
}

export function setScreenSpaceSize(tileset, useScreenSpace) {
    if (!tileset || !tileset.pointCloudShading) return;
    // Always use screen-space / attenuated sizing. The toggle in the UI
    // no longer disables attenuation; it is effectively always on.
    tileset.pointCloudShading.attenuation = true;
}

export function getColorRampNames() {
    return Object.keys(COLOR_RAMPS).map(function (key) {
        return { id: key, label: COLOR_RAMPS[key].label };
    });
}

export function getCurrentRamp() {
    return currentRamp;
}

export function getCurrentRampCSSGradient() {
    var rampDef = COLOR_RAMPS[currentRamp] || COLOR_RAMPS.heat;
    return rampToCssGradient(rampDef.stops);
}

export function getCurrentAttribute() {
    return currentColorAttribute;
}

/**
 * Register structural metadata property names discovered at runtime.
 * Called from tilesets.js once we have inspected the tileset.
 */
export function registerAvailableProperties(names) {
    if (!names) {
        availablePropertyNames = null;
        normalXPropName = normalYPropName = normalZPropName = null;
        return;
    }
    availablePropertyNames = Array.from(names).map((n) => String(n));

    // Resolve normal property names once, if available
    const normalXMeta = { field: "ShadingSensorNormalX", aliases: ["NormalX"] };
    const normalYMeta = { field: "ShadingSensorNormalY", aliases: ["NormalY"] };
    const normalZMeta = { field: "ShadingSensorNormalZ", aliases: ["NormalZ"] };
    normalXPropName = resolvePropertyNameForMeta(normalXMeta);
    normalYPropName = resolvePropertyNameForMeta(normalYMeta);
    normalZPropName = resolvePropertyNameForMeta(normalZMeta);
}

/** Set value filter range (normalized 0–1). Points outside [normMin, normMax] are hidden. */
export function setFilterRange(tileset, normMin, normMax) {
    var lo = Math.max(0, Math.min(1, Number(normMin) || 0));
    var hi = Math.max(0, Math.min(1, Number(normMax) || 1));
    if (lo > hi) { var t = lo; lo = hi; hi = t; }
    currentFilterMinNorm = lo;
    currentFilterMaxNorm = hi;
    if (tileset && currentColorAttribute) {
        tileset.customShader = buildShader();
    }
}

/** Get current filter range as { min, max } normalized 0–1. */
export function getFilterRange() {
    return { min: currentFilterMinNorm, max: currentFilterMaxNorm };
}

/** Set normal offset distance in model units (meters). */
export function setNormalOffset(tileset, distance) {
    currentNormalOffset = Number(distance) || 0;
    if (tileset && currentColorAttribute) {
        tileset.customShader = buildShader();
    }
}
