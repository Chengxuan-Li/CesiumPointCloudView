Project Overview

Build a web-based 3D geospatial visualization platform using CesiumJS and Cesium ion.

The application will:

Display a Cesium ion-hosted 3D Tiles point cloud tileset

The tileset represents LiDAR data converted from GeoJSON

Each point contains custom user-defined attributes

Overlay Google Photorealistic 3D Tiles as base 3D context

Provide a clean API integration layer for Cesium ion access

Cesium ion Asset Information

Use the following Cesium ion asset:

Asset ID: 4480518

Asset Name: merged_annual_shading

Asset Type: 3D Tiles

Located in: Cesium ion → My Assets

Upload Date: Feb 24 2026 10:35 PM

Functional Requirements
1. Core Viewer

Initialize CesiumJS Viewer

Load Google Photorealistic 3D Tiles

Load the Cesium ion tileset (Asset ID 4480420)

Automatically zoom to tileset bounding volume

Enable depth testing against terrain

2. Data-Driven Styling

The tileset contains custom per-point attributes derived from GeoJSON.

The system must support:

Styling by user attribute (e.g., value, shading, etc.)

Threshold-based color mapping

Ability to modify style dynamically

Clean separation between styling logic and viewer initialization

Use Cesium3DTileStyle for attribute-based styling.

3. Performance Controls

Expose configuration for:

maximumScreenSpaceError

pointCloudShading attenuation

tile cache control

optional toggle for Google 3D Tiles visibility

Ensure smooth performance with large LiDAR datasets.

4. Project Structure

Organize code into:

/src
  viewer.js
  tilesets.js
  styling.js
  config.js
index.html

Avoid monolithic script blocks.

5. Cesium ion API Configuration Layer

Create a configuration file:

config.js

Structure:

export const CESIUM_CONFIG = {
    ionAccessToken: "FILL_ME",
    assetId: 4480518,
    enableGoogle3DTiles: true
};

The coding agent should leave clear documentation comments indicating:

Where to insert Cesium ion API token

How to change asset ID

How to disable Google 3D Tiles

Deliverables

Fully working minimal CesiumJS site

Modular code structure

Inline documentation

Clear instructions on:

Setting Cesium ion token

Replacing asset ID

Deploying as static site

Non-Goals

No backend server

No authentication system

No advanced UI framework

No data editing functionality

Optional Enhancements (If Time Permits)

UI dropdown to switch styling attribute

Color ramp presets

Performance debug panel (FPS, tile count)

Toggle Google 3D Tiles layer

Constraints

Must work as static site

Must use CesiumJS

Must load tileset via Cesium ion

Must support large-scale LiDAR point cloud