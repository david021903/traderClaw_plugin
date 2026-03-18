# Permission Management for bin/openclaw-trader.mjs

## Problem
`bin/openclaw-trader.mjs` must remain executable (chmod 755). During git operations or zip extractions, permissions can be lost.

## Solution

### For Clones (GitHub)
After cloning, run:
```bash
bash scripts/setup-hooks.sh
```

This:
- Installs git post-checkout hook to auto-fix permissions after pulls
- Sets bin/openclaw-trader.mjs to 755 immediately

### For Zip Extractions
When extracting from zip files, run:
```bash
chmod 755 bin/openclaw-trader.mjs
bash scripts/setup-hooks.sh
```

### How it Works
1. **`.gitattributes`** - Tells git to preserve file mode metadata
2. **`scripts/setup-hooks.sh`** - Installs `.git/hooks/post-checkout` hook
3. **Post-checkout hook** - Auto-runs `chmod 755 bin/openclaw-trader.mjs` on every pull/checkout

## Verification
```bash
ls -la bin/openclaw-trader.mjs
# Should show: -rwxr-xr-x ... bin/openclaw-trader.mjs
```

## For Future Contributors
Always run `bash scripts/setup-hooks.sh` after cloning!
