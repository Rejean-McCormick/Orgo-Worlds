# -*- coding: utf-8 -*-
from pathlib import Path
import hashlib, shutil, tkinter as tk
from tkinter import messagebox
ROOT = Path(r"C:\mycode\Orgo\Orgo_Worlds")
BACKUP = Path(r"C:\mycode\Orgo\Orgo_Worlds\.koali-update-backups\decorators-20261005-192848")
PATCHED = {'package.json': 'b52ff453f0130a2d8734c7b6cd4d4fc352b0be1719c9129e24d6fc0140652a17', 'scripts/check-worlds.mjs': '92e23de74a07dcaf945baaf4e8d514f34e21053d25aefe1a4717508e169207cf', 'apps/api/tsconfig.json': 'd0d8be2fbbf818888035310a6dc420a3116c245a7ce0c25479dec94b8c4eec1b'}
CHANGED = ['package.json', 'scripts/check-worlds.mjs']
CREATED = ['apps/api/tsconfig.json']

def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for c in iter(lambda:f.read(1024*1024), b''):
            h.update(c)
    return h.hexdigest()

app=tk.Tk(); app.withdraw()
conflicts=[]
for rel, expected in PATCHED.items():
    p=ROOT/rel
    if not p.exists() or digest(p) != expected:
        conflicts.append(rel)
if conflicts:
    messagebox.showerror("Rollback Orgo Worlds", "Rollback refusé : fichiers modifiés après le hotfix :\n\n" + "\n".join(conflicts))
    raise SystemExit(2)
for rel in CHANGED:
    src=BACKUP/rel
    dst=ROOT/rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src,dst)
for rel in CREATED:
    p=ROOT/rel
    if p.exists():
        p.unlink()
messagebox.showinfo("Rollback Orgo Worlds", "Rollback terminé.")
