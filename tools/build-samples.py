"""Build the bundled bank from pinned, attributed upstream recordings."""
import base64, hashlib, json, pathlib, urllib.request, urllib.parse, concurrent.futures
ROOT = pathlib.Path(__file__).resolve().parents[1]
def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r: return r.read()
TONE_REF = '622c2f1c32c8cfce4158ddc3eb26e518ddef37e5'
VCSL_REF = 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e'
notes = {
 'contrabass': ['C2','D2','E2','Fs2','A2','Cs3'],
 'cello': ['C3','D3','E3','G3','A3','C4'],
 'piano': ['A3','C4','Ds4','Fs4','A4','C5'],
 'flute': ['C5','E5','A5','C6'],
 'bells': ['C6','G6','C7']
}
def sample(item):
    kind, note = item
    if kind == 'bells':
        path = 'Idiophones/Struck Idiophones/Glockenspiel/glock_medium_' + note + '_01.wav'
        url = 'https://raw.githubusercontent.com/sgossner/VCSL/' + VCSL_REF + '/' + urllib.parse.quote(path)
        mime = 'audio/wav'
    else:
        url = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/' + TONE_REF + '/samples/' + kind + '/' + note + '.mp3'
        mime = 'audio/mpeg'
    data = fetch(url)
    return kind, note.replace('s','#'), 'data:' + mime + ';base64,' + base64.b64encode(data).decode(), {'instrument':kind,'note':note,'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
bank = {}; sources = []
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for kind, note, uri, source in pool.map(sample, [(k,n) for k,ns in notes.items() for n in ns]):
        bank.setdefault(kind,{})[note] = uri; sources.append(source)
(ROOT/'js/instrument-samples.js').write_text("/* Real instrument recordings. See vendor/instrument-samples/CREDITS.md.\n   Data URLs preserve offline file:// playback; decode once, share buffers. */\nwindow.MusicMakerSamples = " + json.dumps(bank,separators=(',',':')) + ';\n')
(ROOT/'vendor/instrument-samples/manifest.json').write_text(json.dumps(sources,indent=2)+'\n')
(ROOT/'vendor/instrument-samples/upstream-source-info.txt').write_bytes(fetch('https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/'+TONE_REF+'/sample-source-info.txt'))
(ROOT/'vendor/instrument-samples/VCSL-LICENSE.txt').write_bytes(fetch('https://raw.githubusercontent.com/sgossner/VCSL/'+VCSL_REF+'/LICENSE'))
print('Samples:',len(sources),'original bytes:',sum(s['bytes'] for s in sources),'bank bytes:',(ROOT/'js/instrument-samples.js').stat().st_size,'tone ref:',TONE_REF)
