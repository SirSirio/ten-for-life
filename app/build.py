#!/usr/bin/env python3
"""Build the routine app.

  python build.py   -> build/site/                 (standalone installable web app: full HTML document,
                                                   viewport, manifest, icons, offline service worker)
                    -> build/claude-artifact.html  (claude.ai artifact: no <head>, the viewer adds it)

Sources: src/ (app.template.html, style.css, exercises.js), data/videos*.json, assets/.
"""
import hashlib, json, os, re, shutil

# The app's display name lives here only: page title, header, home-screen label.
# (Storage keys inside the app stay fixed, so renaming never loses data.)
APP_NAME = 'Ten for Life'
APP_SHORT = 'Ten for Life'   # under the home-screen icon; keep it to ~12 characters

here = os.path.dirname(os.path.abspath(__file__))
rd = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()

tpl = rd('src', 'app.template.html')
css = rd('src', 'style.css')
ex = rd('src', 'exercises.js')

videos = {}
for name in ('videos.json', 'videos_posture.json'):
    vp = os.path.join(here, 'data', name)
    if os.path.exists(vp):
        for v in json.load(open(vp, encoding='utf-8')):
            if v.get('videoId') and re.fullmatch(r'[A-Za-z0-9_-]{11}', v['videoId']):
                videos[v['id']] = {'videoId': v['videoId'], 'title': v.get('title', ''), 'channel': v.get('channel', '')}

page = (tpl.replace('/*@STYLE@*/', css)
           .replace('/*@EXERCISES@*/', ex)
           .replace('/*@VIDEOS@*/', 'const VIDEOS=' + json.dumps(videos, ensure_ascii=False) + ';')
           .replace('@APP_NAME@', APP_NAME))

out = os.path.join(here, 'build')
if os.path.exists(out): shutil.rmtree(out)
site = os.path.join(out, 'site')
os.makedirs(os.path.join(site, 'icons'))

# 1) artifact build
open(os.path.join(out, 'claude-artifact.html'), 'w', encoding='utf-8').write(page)

# 2) standalone build: lift the head-level tags into a real <head>, add PWA wiring
head_tags, body = [], page
while True:
    m = re.match(r'\s*(<title>.*?</title>|<meta[^>]*>|<link[^>]*>)', body, re.S)
    if not m: break
    tag = m.group(1)
    if 'claude:viewport-fit-sides' not in tag:
        head_tags.append(tag)
    body = body[m.end():]
style_m = re.match(r'\s*(<style>.*?</style>)', body, re.S)
if style_m:
    head_tags.append(style_m.group(1)); body = body[style_m.end():]

pwa_head = '\n'.join([
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta name="theme-color" content="#121011">',   # the app updates it when the theme changes
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="icon" href="icons/icon-192.png">',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>',
])
sw = ('<script>if("serviceWorker" in navigator && location.protocol.startsWith("http"))'
      '{addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}</script>')
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n' + '\n'.join(head_tags[:2]) + '\n' + pwa_head + '\n'
              + '\n'.join(head_tags[2:]) + '\n</head>\n<body>\n' + body.strip() + '\n' + sw + '\n</body>\n</html>\n')

open(os.path.join(site, 'index.html'), 'w', encoding='utf-8').write(standalone)
a = os.path.join(here, 'assets')
manifest = rd('assets', 'manifest.webmanifest').replace('@APP_NAME@', APP_NAME).replace('@APP_SHORT@', APP_SHORT)
open(os.path.join(site, 'manifest.webmanifest'), 'w', encoding='utf-8').write(manifest)
# the cache name follows the page content, so installed copies update after every deploy that changes it
version = 'mr-' + hashlib.sha1(standalone.encode('utf-8')).hexdigest()[:10]
sw_js = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{version}";', rd('assets', 'sw.js'))
open(os.path.join(site, 'sw.js'), 'w', encoding='utf-8').write(sw_js)
for f in ('icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'):
    shutil.copy(os.path.join(a, f), os.path.join(site, 'icons', f))
open(os.path.join(site, '.nojekyll'), 'w').close()

print(f'built build/site ({len(standalone)} bytes, cache {version}) and build/claude-artifact.html; {len(videos)} videos')
