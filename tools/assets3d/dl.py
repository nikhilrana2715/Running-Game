import json, os, urllib.request, concurrent.futures as cf
op = urllib.request.build_opener(); op.addheaders = [('User-Agent', 'Mozilla/5.0 (asset-fetch)')]; urllib.request.install_opener(op)
OUT = os.path.join(os.path.dirname(__file__), 'ph')
os.makedirs(OUT, exist_ok=True)
api = lambda p: json.load(urllib.request.urlopen('https://api.polyhaven.com/' + p, timeout=60))
jobs = []
for t in ['leafy_grass', 'excavated_soil_wall', 'brown_planks_05', 'mossy_rock', 'cliff_side']:
    d = api('files/' + t)
    for key, short in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough')]:
        if key in d:
            jobs.append((d[key]['1k']['jpg']['url'], f'tex/{t}_{short}.jpg'))
for h in ['kloofendal_48d_partly_cloudy_puresky', 'qwantani_sunset_puresky', 'qwantani_night_puresky']:
    jobs.append((api('files/' + h)['tonemapped']['url'], f'sky/{h}.jpg'))
for m in ['island_tree_02', 'tree_small_02', 'fir_sapling', 'shrub_02', 'shrub_01', 'fern_02', 'grass_medium_01', 'rock_moss_set_01', 'boulder_01', 'dandelion_01']:
    g = api('files/' + m)['gltf']['1k']['gltf']
    jobs.append((g['url'], f'models/{m}/{m}.gltf'))
    for rel, v in g.get('include', {}).items():
        jobs.append((v['url'], f'models/{m}/{rel}'))

def get(j):
    url, rel = j
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    if os.path.exists(p) and os.path.getsize(p) > 0: return rel
    urllib.request.urlretrieve(url, p); return rel
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(get, jobs): pass
print('done', len(jobs))
