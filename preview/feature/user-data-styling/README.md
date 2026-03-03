# CesiumJS Point Cloud Viewer

A static web application for visualising 3D Tiles point cloud data (LiDAR) hosted on Cesium ion, with Google Photorealistic 3D Tiles as base context.

## Quick Start

### 1. Get a Cesium ion Access Token

1. Create a free account at <https://ion.cesium.com>.
2. Go to **Access Tokens** and copy your default token.

### 2. Set the Token

Open `src/config.js` and replace `"FILL_ME"` with your token:

```js
ionAccessToken: "eyJhbGciOi...",
```

### 3. Serve the Site

Because the app uses ES modules, it must be served over HTTP (not opened as a local file). Any static server works:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
index.html          Main page — viewer, UI controls, wiring
src/
  config.js         Cesium ion token, asset ID, performance & styling defaults
  viewer.js         CesiumJS Viewer initialisation
  tilesets.js       Point cloud + Google 3D Tiles loading & runtime controls
  styling.js        Attribute-based Cesium3DTileStyle, colour ramp presets
```

## Configuration

All configuration lives in `src/config.js`.

| Setting | Purpose |
|---------|---------|
| `ionAccessToken` | **Required.** Your Cesium ion API token. |
| `assetId` | Cesium ion asset ID for the point cloud tileset. Default: `4480420`. |
| `enableGoogle3DTiles` | Set `false` to skip loading Google 3D Tiles on startup. |
| `maximumScreenSpaceError` | Lower = higher quality / more tiles. Default: `4`. |
| `pointCloudAttenuation` | Density-based point sizing. Default: `true`. |
| `maximumAttenuation` | Cap on attenuated point size (px). Default: `4`. |
| `maximumCacheOverflowBytes` | Tile memory budget. Default: 512 MB. |
| `defaultAttribute` | Per-point property to colour by. Default: `"shading"`. |
| `defaultColorRamp` | Startup colour ramp. Options: `heat`, `viridis`, `coolWarm`, `greyscale`. |
| `defaultPointSize` | Base point size in pixels. Default: `3`. |

## Changing the Asset

To load a different Cesium ion tileset:

1. Upload your dataset to <https://ion.cesium.com/addasset>.
2. Note the **Asset ID** shown after processing completes.
3. In `src/config.js`, set `assetId` to the new ID.

## UI Controls

The overlay panel (top-right) provides runtime controls:

- **Colour Attribute** — switch which per-point property drives colouring.
- **Colour Ramp** — choose a colour mapping preset.
- **Screen-Space Error** — trade quality vs. performance.
- **Point Size** — base point size in pixels.
- **Point Attenuation** — toggle density-based sizing.
- **Google 3D Tiles** — toggle the photorealistic base layer.

The stats bar (bottom-left) shows live FPS and loaded tile count.

## Deployment

This is a fully static site with no build step. Deploy by copying all files to any static host:

- **GitHub Pages** — push to a `gh-pages` branch or use the repository settings.
- **Netlify / Vercel** — point at the repo root; no build command needed.
- **S3 / GCS** — upload files and enable static website hosting.
- **Any web server** — Nginx, Apache, Caddy, etc.

Ensure the server sets correct MIME types for `.js` files (`application/javascript`).

## Browser Support

Requires a browser with WebGL 2.0 support (all modern browsers).
