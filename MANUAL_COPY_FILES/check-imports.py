# MANUAL_COPY_FILES/check-imports.py
#
# Structural import/export check for contractnest-api.
#
# WHY THIS EXISTS: `npx tsc --noEmit` in the API EXITS 0 WITHOUT CHECKING
# ANYTHING. tsconfig.json uses moduleResolution "node" and baseUrl, both
# deprecated in TS7, so tsc reports TS5107/TS5101 and aborts before compiling a
# single file. Every "API tsc = 2 = baseline" reported during the evidence
# storage work was that abort, not a clean check.
#
# It only became visible when ts-node (which does compile) crashed on two
# TS2305 errors from a firebaseStorageAdmin.ts that had been overwritten by a
# batch carrying an older copy.
#
# Run from contractnest-api/:   python3 ../MANUAL_COPY_FILES/check-imports.py
#
# It walks every relative named import and checks the target module actually
# exports each member. It does NOT follow `export * from` barrels, so imports
# from ../seeds and ../utils/constants/catalog report false positives - those
# are pre-existing and can be ignored.
#
# A real typecheck needs deps installed and the deprecations silenced:
#     npm install
#     npx tsc --noEmit --ignoreDeprecations 6.0

import re,os,sys
root='src'
bad=[]
for dp,_,fns in os.walk(root):
    for fn in fns:
        if not fn.endswith('.ts'): continue
        p=os.path.join(dp,fn)
        src=open(p,encoding='utf-8').read()
        for m in re.finditer(r"import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'", src):
            members=[x.strip() for x in m.group(1).split(',') if x.strip()]
            target=os.path.normpath(os.path.join(dp,m.group(2)))
            cand=[target+'.ts', os.path.join(target,'index.ts')]
            tp=next((c for c in cand if os.path.exists(c)), None)
            if not tp:
                bad.append((p,m.group(2),'MODULE NOT FOUND',''));continue
            tsrc=open(tp,encoding='utf-8').read()
            for mem in members:
                name=mem.replace('type ','').split(' as ')[0].strip()
                if not re.search(r'export\s+(async\s+)?(function|const|class|interface|type|enum)\s+'+re.escape(name)+r'\b', tsrc) \
                   and not re.search(r'export\s*\{[^}]*\b'+re.escape(name)+r'\b', tsrc):
                    bad.append((p,m.group(2),'NO EXPORT',name))
for b in bad: print(f"{b[0]}  <- '{b[1]}'  {b[2]}: {b[3]}")
print("TOTAL:",len(bad))
