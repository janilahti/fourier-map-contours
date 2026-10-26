# Border / Orbit

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
- Each outline is sampled at 1,024 equal arc-length intervals before the discrete Fourier transform. The display supports 1–256 coefficients per chain. A cycle takes 20 seconds at 1×. The newest segment fades to the base trace colour over about 1.1 seconds at 1×; a completed outline remains visible on subsequent cycles. Changes to the country, representation, direction, or circle count restart the trace.
- Five colour palettes (Botanical, Lagoon, Terracotta, Twilight, and Midnight) change the page and drawing together. The optional equations and live values panel shows the active Fourier formulas, normalized coordinates, time, and the largest eight coefficients per chain. Hide it to leave the canvas clear.
- Playback begins paused when the browser requests reduced motion. All controls are keyboard accessible.

## Map data and attribution

Source: [Natural Earth, Admin 0 – Countries, 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/), public domain. Retrieved 2026-10-26 from [natural-earth-vector GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). The bundled file preserves geometries and retains only country display names and identifiers (242 features). Natural Earth is a general-purpose cartographic dataset; small features and border treatment follow that source. 1:50m means 1:50,000,000 scale, not 50-metre precision.

Optional Google Fonts are loaded by CSS; system serif and sans-serif fallbacks work without that service. Vite is the only build dependency. Production has no JavaScript CDN dependency.

### Crimea (Krim) and Ukraine

Crimea is not left out of Ukraine on purpose. Its omission from Ukraine’s outline comes from the Natural Earth map data used here, not an intentional choice by this project. Pull requests to correct this are welcome.

## License

The application code is available under the [MIT License](LICENSE). Natural Earth map data remains public domain; third-party dependencies and Google Fonts retain their respective licenses.
