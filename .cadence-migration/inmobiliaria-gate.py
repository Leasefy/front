import os, re
AREA="src/components/inmobiliaria"
fams = {
 '<button>            -> Button/IconButton/Chip': re.compile(r'<button\b'),
 '<input>             -> Input/NumberInput/...': re.compile(r'<input\b'),
 '<select>            -> Select/Combobox': re.compile(r'<select\b'),
 '<textarea>          -> Textarea': re.compile(r'<textarea\b'),
 'bespoke tabs        -> Tabs/SegmentedControl': re.compile(r'role="tab"|setActiveTab'),
 '<table>             -> Table/DataTable': re.compile(r'<table\b'),
 'bespoke modal       -> Dialog/Drawer/Sheet': re.compile(r'role="dialog"|<dialog\b'),
 'hand card           -> Card': re.compile(r'className="[^"]*(bg-white|bg-surface)[^"]*rounded-[^"]*border[^"]*p-'),
 'bespoke badge/pill  -> Badge/StatusBadge': re.compile(r'rounded-full[^"]*(bg-success|bg-warning|bg-danger|bg-primary-soft)'),
 'hand eyebrow        -> Eyebrow/MonoLabel': re.compile(r'font-mono[^"]*uppercase'),
 'hand spinner        -> Spinner/Progress': re.compile(r'animate-spin'),
}
files=[]
for root,_,fs in os.walk(AREA):
    if '/ai' in root or '/cobranza' in root: continue
    for fn in fs:
        if fn.endswith('.tsx'):
            p=os.path.join(root,fn)
            if '/ai/' not in p and '/cobranza/' not in p:
                files.append(p)
for name,rx in fams.items():
    n=sum(1 for p in files if rx.search(open(p,encoding='utf-8').read()))
    print(f"{name:46}: {n} files")
