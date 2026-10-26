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
- **Separate coordinate series:** compute transforms of x and y independently. Rotate the y chain by 90° and use the intersection of the endpoint guides as the pen position. Count is per chain in this mode; both positive and negative frequency terms count individually.
- Components are sorted by amplitude, not frequency. Consequently a low circle count is a sparse approximation, not necessarily a conventional low-pass truncation.
- Forward/reverse controls the direction of time along the outline. Individual circles rotate in either direction according to their signed frequency; forcing every circle clockwise would change the reconstructed shape.
- Borders are unwrapped across the antimeridian and projected locally with an equirectangular projection scaled by cosine of the mean latitude. The largest projected-area outer ring is selected. Islands outside that region and interior holes are omitted. This intentionally draws one continuous closed contour, not a complete political map.
- Each outline is sampled at 1,024 equal arc-length intervals before the discrete Fourier transform. The display supports 1–256 coefficients per chain. A cycle takes about 11.4 seconds at 1× (the former 1.75× speed). Speed buttons move by one 0.25× slider notch. The newest segment fades to the base trace colour over about 0.63 seconds at 1×; in ordinary mode completed outlines remain fully visible for one more cycle, then fade over the next two. In build-up mode they start fading as soon as the next cycle begins and disappear after two cycles. Highlight ages use a continuous clock, including across cycle boundaries. Changes to the country, representation, direction, or circle count restart the trace.
- Six colour palettes (Botanical, Lagoon, Terracotta, Twilight, Midnight, and High visibility) change the page and drawing together. The optional equations and live values panel shows the active Fourier formulas, normalized coordinates, time, and the largest eight coefficients per chain. The panel is translucent until the coefficient tables are expanded. Hide it to leave the canvas clear. High visibility uses black/white UI, thicker cyan circles, a yellow trace, and a cyan pen. The standard palettes use subtle differences between the circles and map trace; High visibility preserves a stronger distinction.
- The epicycle slider supports large changes; the − and + buttons adjust the count by exactly one. Info buttons explain country selection, representations, and epicycles on hover, keyboard focus, or tap. The next click anywhere dismisses a clicked info box.
- Enable **Build up epicycles** to restart with one coefficient and increase after each completed cycle: +1 up to 8, +2 up to 16, +4 up to 32, +8 up to 64, +16 up to 128, then +32 up to the fixed limit of 256. Playback continues at 256. Manual count controls are disabled during growth. Old cycles remain visible while the new approximation develops, then fade away. Restart, country, representation, or direction changes restart the progression.
- The outline’s bounding box is centered and scaled to fill the canvas with a small safety margin. In separate mode the sources sit toward the top and left margins. The map takes priority over the circles, so large epicycles can extend past the canvas edges. The fit stays fixed as the coefficient count grows.
- The canvas shows the current epicycle count (per axis in separate mode) and RMS positional error relative to the original outline, expressed as a percentage of its bounding-box diagonal. Lower error means a closer approximation. The **Reverse drawing direction** checkbox reverses time along the path. “Playback” is also valid for animation, but “drawing direction” describes this control more directly.
- Playback begins paused when the browser requests reduced motion. All controls are keyboard accessible.

## Map data and attribution

Source: [Natural Earth, Admin 0 – Countries, 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/), public domain. Retrieved 2026-10-26 from [natural-earth-vector GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). The bundled file preserves geometries and retains only country display names and identifiers (242 features). Natural Earth is a general-purpose cartographic dataset; small features and border treatment follow that source. 1:50m means 1:50,000,000 scale, not 50-metre precision.

Optional Google Fonts are loaded by CSS; system serif and sans-serif fallbacks work without that service. Vite is the only build dependency. Production has no JavaScript CDN dependency.

### Crimea (Krim) and Ukraine

Crimea is not left out of Ukraine on purpose. Its omission from Ukraine’s outline comes from the Natural Earth map data used here, not an intentional choice by this project. Pull requests to correct this are welcome.

## License

The application code is available under the [MIT License](LICENSE). Natural Earth map data remains public domain; third-party dependencies and Google Fonts retain their respective licenses.

## Exploring countries

The country name below the canvas links to its English Wikipedia article. **Random country & build up** chooses a different country or region, enables build-up mode, and starts animating from one epicycle, including when the previous drawing was paused. Turning off **Show epicycles** hides both the rotating chains and their crosshair guides; the contour and drawing tip remain visible.

## Site usage

GitHub’s [repository Traffic graph](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository) reports visits to the repository; it does not count visits to the GitHub Pages site. Pages has no built-in page-view dashboard. A lightweight hosted service such as [GoatCounter](https://www.goatcounter.com/) can count site page views. Enabling it would require a GoatCounter site address from the account that should own the statistics. No analytics tracker is currently included.

## Sharing a view

**Share view** opens a link that records the selected country, representation, epicycle count, speed, direction, palette, build-up mode, drawing visibility options, equations/coefficients visibility, and paused state. Copy the link or use the device’s native share sheet when available. If clipboard access is unavailable, the link remains selectable for manual copying.

Links start a fresh trace at the captured circle count. Build-up mode continues growing from that count; existing traces and the exact animation phase are not shared. The recipient’s reduced-motion preference keeps the animation paused until they choose to play. Unknown countries/palettes and malformed numeric values safely fall back or are clamped to the supported controls.

The page includes static Open Graph and Twitter card metadata and a 1200 × 630 PNG preview at `public/social-preview.png`. Social crawlers can read the preview without executing JavaScript; it represents the atlas generally, including on country-specific links. The SVG source is generated from the app’s Fourier math with `node scripts/generate-social-card.mjs`. If changing the artwork, render the SVG to a 1200 × 630 PNG before rebuilding Pages. The preview image uses an absolute URL for the published GitHub Pages site. A fixed canonical/`og:url` is deliberately omitted so sharing services can retain the country/settings query string.
