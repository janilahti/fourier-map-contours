"""Extract Natural Earth assets from countries, regions, and disputed-area files."""
import hashlib
import json
from pathlib import Path
import sys
import subprocess

root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 6:
    raise SystemExit("Usage: prepare-map-data.py countries-10m regions-110m disputed-10m disputed-50m countries-110m")
base = json.loads((root / 'public/data/countries.geojson').read_text())
ids = {feature['properties']['id'] for feature in base['features']}
catalog = {'type': 'FeatureCollection', 'features': [dict(feature, geometry=None) for feature in base['features']]}
source_countries, source_regions = map(Path, sys.argv[1:3])
countries = json.loads(source_countries.read_text())
regions = json.loads(source_regions.read_text())
detail = root / 'public/data/detailed'
continents = root / 'public/data/continents'
detail.mkdir(exist_ok=True)
continents.mkdir(exist_ok=True)

def save(path, value):
    path.write_text(json.dumps(value, separators=(',', ':')))

save(root / 'public/data/catalog.json', catalog)
available = []
for feature in countries['features']:
    code = feature['properties']['ADM0_A3']
    if code in ids:
        save(detail / f'{code}.json', feature['geometry'])
        available.append(code)
save(detail / 'index.json', sorted(available))
features = []
for feature in regions['features']:
    if feature['properties']['FEATURECLA'] != 'Continent':
        continue
    name = feature['properties']['NAME_EN']
    code = 'CONT_' + name.upper().replace(' ', '_')
    save(continents / f'{code}.json', feature['geometry'])
    features.append({'type': 'Feature', 'properties': {
        'id': code, 'name': name, 'kind': 'continent',
        'wikipedia': 'Australia (continent)' if name == 'Australia' else name,
    }, 'geometry': None})
save(continents / 'index.json', {'type': 'FeatureCollection', 'features': features})
save(root / 'public/data/sources.json', {
    'license': 'Natural Earth public domain',
    'sources': [
        {'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson', 'sha256': hashlib.sha256(source_countries.read_bytes()).hexdigest()},
        {'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson', 'sha256': hashlib.sha256(source_regions.read_bytes()).hexdigest()},
    ],
    'detailed_countries': len(available), 'continents': len(features),
})

subprocess.run(["node", str(root / "scripts/correct-map-data.mjs"), *sys.argv[3:5]], check=True)

subprocess.run(["node", str(root / "scripts/compose-continents.mjs"), str(source_regions), sys.argv[5]], check=True)
