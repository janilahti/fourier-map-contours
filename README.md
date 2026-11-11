# Border / Orbit

[Try the interactive atlas →](https://janilahti.github.io/fourier-map-contours/)

An interactive Fourier atlas, built with Canvas, JavaScript, and Vite. No API key or backend is needed. Country data is bundled locally.

## Develop

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

`npm test` runs mathematical reconstruction and all-country data checks. `npm run build` produces `dist/`. `npm run preview` serves that build locally. The development server listens on port 5173 by default.

## GitHub Pages

The repository includes a ready-to-serve build in `docs/`. Under **Settings → Pages → Build and deployment**, select **Deploy from a branch**, branch **main**, folder **/docs**, then save. The site will be available at https://janilahti.github.io/fourier-map-contours/ after GitHub completes deployment.

After changing the app, run `npm run build:pages` and commit the updated `docs/` files with the source changes. This refreshes the branch-hosted site. The included GitHub Actions workflow runs tests and checks the build; publication is controlled by your Pages settings. Relative asset paths support the project URL and custom domains.

## Drawing and terminology

- **Epicycles** are the circles in a chain of rotating vectors. Each Fourier coefficient supplies a vector's amplitude (radius), phase (initial angle), and signed frequency.
- **Complex Fourier series:** encode a closed path as `z(t) = x(t) + i y(t)` and reconstruct with a single vector chain.
- **Separate coordinate series** (the default): compute transforms of x and y independently. Rotate the y chain by 90° and use the intersection of the endpoint guides as the pen position. Count is per chain in this mode; both positive and negative frequency terms count individually.
- Components are sorted by amplitude, not frequency. Consequently a low circle count is a sparse approximation, not necessarily a conventional low-pass truncation.
- Forward/reverse controls the direction of time along the outline. Individual circles rotate in either direction according to their signed frequency; forcing every circle clockwise would change the reconstructed shape.
- Pieces cut at the antimeridian are united with polygon-clipping before selecting the main region. Borders are unwrapped across the antimeridian and projected locally with an equirectangular projection scaled by cosine of the mean latitude. Antarctica instead uses a south-polar azimuthal equidistant projection, with artificial world-sheet pole/date-line closure edges removed before sampling. The largest projected-area outer ring is selected. Interior holes are omitted from the animated path. Substantial nearby secondary regions appear in the reference map. **Fill map area** optionally adds a subtle palette-coloured fill inside the source boundaries, including those nearby regions, while retaining holes from the data. Fill and reference outline visibility are independent. This intentionally draws one continuous closed contour, not a complete political map.
- Each outline is sampled at 1,024 equal arc-length intervals before the discrete Fourier transform. The display supports 1–512 coefficients per chain. A regular cycle takes about 11.4 seconds at 1× (the former 1.75× speed). Speed buttons move by one 0.25× slider notch. The drawing tip is always highlighted; its newest segment fades to the base trace colour over about 0.63 seconds at 1×. Completed laps have exactly matching endpoints and explicitly closed drawing paths. Each completed outline stays visible through the following lap, then fades uniformly over 0.8 seconds of active playback, independent of drawing speed. Pausing or hiding the animation pauses that fade too. Changes to the country, representation, direction, or circle count restart the trace.
- Six colour palettes (Botanical, Lagoon, Terracotta, Twilight, Midnight, and High visibility) change the page and drawing together. The optional equations and live values panel shows the active Fourier formulas, normalized coordinates, time, and the largest eight real coordinate harmonics per axis. The panel is translucent until the coefficient tables are expanded. Hide it to leave the canvas clear. High visibility uses black/white UI, thicker cyan circles, a yellow trace, and a cyan pen. The standard palettes use subtle differences between the circles and map trace; High visibility preserves a stronger distinction.
- The epicycle slider supports large changes; the − and + buttons adjust the count by exactly one. Info buttons explain country selection, representations, and epicycles on hover, keyboard focus, or tap. Build-up and lap-position info buttons also keep their explanations available without permanent helper text. The next click anywhere dismisses a clicked info box.
- **Build up epicycles** is enabled by default. It starts at one and doubles to 64, then adds 32 up to 128 and 64 up to 512. Initial counts below 8 run four times faster; counts below 32 run twice as fast; higher counts use the selected drawing speed. At 1×, the outline reaches eight circles in about nine seconds. Playback continues at 512. Manual count controls are disabled during growth. Old cycles remain visible while the new approximation develops, then fade away. Turning build-up off keeps the current lap running at its current count, preserving the trace and pause state. Turning it on starts a new build-up. Restart, country, representation, or direction changes restart the progression.
- The outline’s bounding box is centered and scaled to fill the canvas with a small safety margin. In separate mode the sources sit toward the top and left margins. The map takes priority over the circles, so large epicycles can extend past the canvas edges. The fit stays fixed as the coefficient count grows. The USA view fits the contiguous states to the canvas and shows Alaska in a reference inset, so its distance from the mainland does not shrink the main drawing.
- The canvas shows the current epicycle count (per axis in separate mode), RMS positional error as a percentage of the outline’s bounding-box diagonal, and estimated spherical RMS distance in kilometres or metres. Lower error means a closer approximation. The **Reverse drawing direction** checkbox reverses time along the path. “Playback” is also valid for animation, but “drawing direction” describes this control more directly.
- Playback begins paused when the browser requests reduced motion. All controls are keyboard accessible.

## Map data and attribution

Source: [Natural Earth, Admin 0 – Countries, 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/), public domain. Retrieved 2026-10-26 from [natural-earth-vector GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). The standard bundled file preserves geometries and retains only country display names and identifiers (242 features). Natural Earth is a general-purpose cartographic dataset; small features and border treatment follow that source. 1:50m means 1:50,000,000 scale, not 50-metre precision.

Optional Google Fonts are loaded by CSS; system serif and sans-serif fallbacks work without that service. Vite builds the site. [polygon-clipping](https://github.com/mfogel/polygon-clipping) joins map regions that touch across the antimeridian. Dependency notices are bundled in [third-party-notices.txt](public/third-party-notices.txt). Production has no JavaScript CDN dependency.

## License

The application code is available under the [MIT License](LICENSE). Natural Earth map data remains public domain; third-party dependencies and Google Fonts retain their respective licenses.

## Exploring countries

The country name below the canvas links to its English Wikipedia article. **Surprise me** chooses a different country or continent, enables build-up mode, and starts animating from one epicycle, including when the previous drawing was paused. Turning off **Show epicycles** hides both the rotating chains and their crosshair guides; the contour and drawing tip remain visible.

## Site usage

GitHub’s [repository Traffic graph](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository) reports visits to the repository; it does not count visits to the GitHub Pages site. Pages has no built-in page-view dashboard. A lightweight hosted service such as [GoatCounter](https://www.goatcounter.com/) can count site page views. Enabling it would require a GoatCounter site address from the account that should own the statistics. No analytics tracker is currently included.

## Sharing a view

**Share view** opens a link that records the selected country, representation, epicycle count, speed, direction, palette, build-up mode, map fill and outline visibility, equation notation, equations/coefficients visibility, and paused state. Copy the link or use the device’s native share sheet when available. If clipboard access is unavailable, the link remains selectable for manual copying.

Links start a fresh trace at the captured circle count. Build-up mode continues growing from that count; existing traces and the exact animation phase are not shared. The recipient’s reduced-motion preference keeps the animation paused until they choose to play. Unknown countries/palettes and malformed numeric values safely fall back or are clamped to the supported controls.

The page includes static Open Graph and Twitter card metadata and a 1200 × 630 PNG preview at `public/social-preview.png`. Social crawlers can read the preview without executing JavaScript; it represents the atlas generally, including on country-specific links. The SVG source is generated from the app’s Fourier math with `node scripts/generate-social-card.mjs`. If changing the artwork, render the SVG to a 1200 × 630 PNG before rebuilding Pages. The preview image uses an absolute URL for the published GitHub Pages site. A fixed canonical/`og:url` is deliberately omitted so sharing services can retain the country/settings query string.

## Map projections

The **Map projection** selector offers **Equirectangular / polar** (the existing default) and **Equal Earth**. The footer credits Natural Earth for the data and Equal Earth for the projection, with separate Wikipedia links explaining each and a link to the projection paper. The active projection name is shown beside playback status in the canvas header. Both use the same public-domain Natural Earth longitude/latitude boundaries; projection is applied locally without downloading another map dataset. Equal Earth follows the [published projection by Šavrič, Patterson and Jenny (2018)](https://doi.org/10.1080/13658816.2018.1504949). It preserves areas, but not angles, distances, or shapes. Each selected outline is recentered on its bounding-box central longitude, keeping date-line countries continuous. Long geographic edges are subdivided before projection and arc-length sampling.

Each outline is independently enlarged to fit its canvas, so different country selections are not displayed at a common area scale. The default uses latitude-adjusted equirectangular, with a south-polar view for Antarctica. Equal Earth's poles are lines: selecting it for Antarctica shows a broad world-map band with projection-cut edges, rather than the pole-centered coastline. Projection changes recompute the Fourier coefficients and restart the trace at the active count. Shared links preserve the projection; old links retain Equirectangular / polar.

## Map detail, secondary regions, and continents

The **Country, region or continent** selector offers 242 countries/territories and seven Natural Earth geographic continents. Only the largest connected outer region is animated. Continents use [Natural Earth 1:110M geographic regions](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_geography_regions_polys.geojson), including its conventional Europe/Asia division. Central America is joined to North America; major Caribbean islands use actual 1:110M country coastlines. Greenland is intentionally omitted from North America, and Iceland from Europe. Great Britain, Ireland, and Madagascar are included as reference regions, using the same coastline source rather than geographic-region envelopes. Australia follows the source's continent definition and links to Wikipedia's continent article.

The 1:50M and 1:110M Natural Earth geography-region sources currently contain identical geometry for all seven continent features. Switching that source alone adds no coastline detail. A comparison using 1:50M country coastlines for the supplemental islands (with the same additions/omissions) increases the combined continent assets from 1,045,493 to 1,092,971 bytes: about 47 KB extra, or about 17 KB extra after gzip. Downloads remain per selected continent. The canvas header shows the active source scale; the footer omits it. This README records the source resolutions.

Countries automatically use [1:10M country data](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries.geojson) which provides more coastline detail and covers every existing country choice. There is no resolution selector; continents automatically use 1:110M instead. The 1:50M file is retained only as a hidden fallback if a detailed-country download fails. These datasets are public domain. Geometry source URLs and SHA-256 hashes are recorded in `public/data/sources.json`. After obtaining the five original GeoJSON files, regenerate the lazy assets with:

```sh
python scripts/prepare-map-data.py /path/to/ne_10m_admin_0_countries.geojson /path/to/ne_110m_geography_regions_polys.geojson /path/to/ne_10m_admin_0_disputed_areas.geojson /path/to/ne_50m_admin_0_breakaway_disputed_areas.geojson /path/to/ne_110m_admin_0_countries.geojson
```

Initial country metadata is about 19.7 KB and continent metadata about 1 KB; neither contains geometry. The 2.27 MB 1:50M fallback is not loaded on a normal visit. All 1:10M country geometries total about 12.38 MB, but only the selected country is fetched (roughly 69 KiB for Finland, 70 KiB for Italy, and 825 KiB for the USA). Continent geometry is also fetched on demand. Up to eight fetched geometries are cached in memory. Stale responses cannot replace a newer selection; failed detailed-country downloads fall back to standard data.

The trade-off: 1:10M improves the reference coastlines, but adds download and parsing cost. Animation still samples 1,024 points and retains at most 512 signed-frequency vectors per chain, so small features cannot all survive the Fourier approximation. Loading just one detailed outline avoids downloading the whole atlas. A representative Node check on this environment took about 52–63 ms to prepare Finland, Italy, or USA and compute all three transforms; these are illustrative host timings, not mobile/browser guarantees.

Nearby significant islands and similar secondary regions are included automatically in the reference map, with no separate selector. The filter retains regions with at least 0.5% of the main region's projected area and a bounding-box gap no greater than 35% of its diagonal, capped at twelve. At continent scale the area threshold is 0.025%, capped at 32, so major islands remain visible without adding thousands of tiny islands. All regions use the main region's projection and normalization. This retains Sicily/Sardinia and Corsica, while avoiding thousands of tiny Finnish islands and remote French territories. Fitting keeps the animated main region centered while allowing room for the retained reference regions. The reference-outline and map-fill controls apply to the main region and these retained secondary regions.

## Equation notation

Choose **Hidden**, **Amplitude & phase**, or **Sine & cosine coefficients**. Hidden closes the panel again; either equation form shows it on the canvas. Switching notation does not change the drawing. The coefficient tables combine the currently selected positive/negative frequency vectors into real x/y coordinate harmonics. This is important when the selected vector count includes only one member of a conjugate pair. Both forms reproduce the same current approximation. Phases are radians; a cycle of t is 1. In sine/cosine form x uses a/b and y uses c/d.

## Rendering efficiency

The render scheduler stops immediately while the document is hidden or the canvas is outside the viewport. Losing window focus eases drawing speed down over 0.45 seconds, then stops requesting frames; regaining focus eases back to the selected speed over 0.45 seconds. This temporary multiplier never changes the speed control or shared settings, and respects reduced-motion preferences. It resumes without catching up hidden time and preserves manual pause state. A paused view draws once after a control, resize, or other relevant interaction instead of looping continuously. Browsers do not reliably expose whether another desktop window covers a page. Window focus is therefore a conservative additional signal: the animation also suspends when you work in another window alongside a still-visible map. It resumes automatically on focus, while respecting manual pause. The header shows **SUSPENDED** during automatic suspension.

Static grids and reference outlines are rasterized once per layout/palette change. Trace paths are extended incrementally and reused; cached coefficient slices avoid repeated array creation. This keeps detailed coastlines and completed cycles from being rebuilt in JavaScript every frame. Numerical geometry/DFT preparation currently runs on the main thread when a new outline is selected.

Circle paths and the soft pen halo are cached per layout, and the opaque canvas avoids an unnecessary clear/compositing pass. Fourier evaluation reuses sine/cosine values and accumulates coordinates without allocating an array for every term. Controls are cached and unchanged readouts do not rewrite the DOM. All coefficients, trace samples, blending order, display resolution, and the browser's animation cadence are preserved.

A local headless Chromium comparison at 1,920 × 1,080, device pixel ratio 2, 512 epicycles per axis and 3× speed measured mean JavaScript frame callbacks of 2.13 → 1.46 ms (about 31% less). Across six seconds, script time fell from 0.78 → 0.54 seconds; total browser task time fell from 4.56 → 4.34 seconds. These are host-specific measurements, not a prediction of hardware GPU usage. Canvas comparisons covered both representations, reverse direction, multiple palettes and Antarctica; cached vector/halo rendering can differ in subpixel antialiasing.

## Desktop layout

At desktop widths, the studio height follows the space available below the intro and adjusts as the page scrolls or resizes. The controls have their own vertical scrollbar, so adding choices does not stretch the canvas below the viewport. The equation panel scrolls internally when expanded. Narrow/mobile screens retain the stacked canvas-first layout and normal page scrolling. The wider desktop layout can use up to 1,920 pixels.

Old shared URLs remain readable: legacy `equations=0` hides the panel, `equations=1` selects amplitude/phase if no notation is supplied, and explicit manual/build-up choices are preserved. Retired `highlight` preferences are ignored because tip highlighting is permanent. Retired `detail` and `nearby` preferences are ignored in favor of automatic map selection and suitable nearby regions.

## Position control and time travel

The **Position in lap** slider lets you scrub the current lap; the arrow buttons step backward/forward by 5% of a lap and can cross lap boundaries. Scrubbing or stepping pauses playback. Press **Play** to continue from the selected point. In build-up mode, revisiting an earlier lap restores its earlier epicycle count. Positions are relative to the starting count of the current view, including when a shared link starts partway through the progression. The start is clamped at zero.

Only the recent visible laps are reconstructed on a seek, using cached complete curves. Scrubbing reconstructs whole-lap fade ages at the selected drawing rate. Old laps reappear with the fade appropriate to that time, without retaining an unbounded playback history. Manual mode keeps its selected circle count. The **Reverse drawing direction** checkbox still changes the geometric direction of the outline; it is separate from moving backward through animation history. Shared links preserve the captured settings and count, and start a fresh trace rather than encoding the exact scrubbed position.

Epicycles use a slightly broader stroke (1.1 CSS pixels, or 1.8 in High visibility). In separate mode the x and y chains and dashed guides have different palette-aware colours, and the header shows the active map data scale beside playback status. A small label identifies the polar view for Antarctica. Hiding epicycles hides both chains and guides.

## Distance error

Both error readings average corresponding positions across a full lap of the animated main outline. The percentage remains a projected-coordinate RMS relative to its bounding-box diagonal. Distance error inverses the same projection and normalization used for drawing and computes spherical great-circle distances between corresponding source and Fourier samples, then takes their RMS. Both readings use all 1,024 equally spaced source-outline sample indices. The spherical distance uses Earth’s mean radius of 6,371.0088 km. Below 1 km the result is displayed in metres.

The distance is approximate and is not the shortest distance to the nearest border. It measures approximation error against the source geometry, not the survey accuracy of that map. The readout is independent of scrub position and is recalculated when the approximation changes. Nearby reference islands are not included because they are not animated. Equal Earth uses its own inverse projection for distance readings; Fourier points that overshoot its latitude range are clamped to a pole for that approximate geographic distance.
