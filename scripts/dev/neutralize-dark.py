#!/usr/bin/env python3
"""
Dark mode palette swap: navy slate -> neutral graphite (zinc), and tinted dark
panels -> neutral surfaces. Only touches `dark:` utilities and the dark hex
values in app/globals.css. Preserves each file's line endings.

  python3 scripts/dev/neutralize-dark.py          # dry run, prints counts
  python3 scripts/dev/neutralize-dark.py --apply  # writes files
"""
import re, sys, pathlib

APPLY = '--apply' in sys.argv
root = pathlib.Path(__file__).resolve().parents[2]
files = list((root / 'components').glob('*.tsx')) + list((root / 'app').rglob('*.tsx'))

# 1) dark:*-slate-N  ->  dark:*-zinc-N   (any prefix chain, e.g. dark:hover:bg-, dark:group-hover:text-)
SLATE = re.compile(r'(?<![\w-])((?:[\w-]+:)*dark:(?:[\w-]+:)*[a-z-]+)-slate-(\d{2,3})')
# 2) tinted dark panel backgrounds -> neutral surface
TINT_BG = re.compile(r'(?<![\w-])((?:[\w-]+:)*dark:(?:hover:)?bg)-(?:blue|indigo|purple|violet|sky|cyan|teal|emerald|green|amber|yellow|orange|rose|red|pink)-950(?:/\d+)?')
# 3) tinted dark borders -> neutral border
TINT_BORDER = re.compile(r'(?<![\w-])((?:[\w-]+:)*dark:(?:hover:)?border)-(?:blue|indigo|purple|violet|sky|cyan|teal|emerald|green|amber|yellow|orange|rose|red|pink)-(?:800|900)(?:/\d+)?')

total = {'slate': 0, 'tint_bg': 0, 'tint_border': 0}
for f in files:
    src = open(f, encoding='utf-8', newline='').read()
    out, n1 = SLATE.subn(r'\1-zinc-\2', src)
    out, n2 = TINT_BG.subn(r'\1-zinc-900', out)
    out, n3 = TINT_BORDER.subn(r'\1-zinc-800', out)
    total['slate'] += n1; total['tint_bg'] += n2; total['tint_border'] += n3
    if out != src and APPLY:
        open(f, 'w', encoding='utf-8', newline='').write(out)

# 4) globals.css dark hex values (Tailwind slate) -> zinc / graphite
HEX = {
    '#020617': '#0f0f11',  # page (slate-950 -> graphite)
    '#0b1120': '#141416',
    '#0f172a': '#18181b',  # slate-900 -> zinc-900
    '#1e293b': '#27272a',  # slate-800 -> zinc-800
    '#334155': '#3f3f46',  # slate-700 -> zinc-700
    '#475569': '#52525b',  # slate-600 -> zinc-600
}
css = root / 'app' / 'globals.css'
src = open(css, encoding='utf-8', newline='').read()
head, sep, tail = src.partition('.dark body')
dark_part = sep + tail
for a, b in HEX.items():
    total.setdefault('css', 0)
    total['css'] += dark_part.lower().count(a)
    dark_part = re.sub(re.escape(a), b, dark_part, flags=re.I)
if APPLY:
    open(css, 'w', encoding='utf-8', newline='').write(head + dark_part)

print(('APPLIED ' if APPLY else 'DRY RUN ') + str(total))
