# Version upgrade runbooks

Scripts to upgrade a live OpenClaw + `solana-traderclaw` install on a target host. Each file is pinned to a **target version** and includes:

- pre-upgrade snapshots (rollback paths)
- npm install for plugin (+ CLI when present)
- post-upgrade verification (dist markers, bootstrap file count, live tool probe)

Run on the gateway host as the OpenClaw user (paths in each script match that deployment).

| Script | Target | Notes |
|--------|--------|-------|
| [upgrade-to-1.0.147.sh](./upgrade-to-1.0.147.sh) | 1.0.147 | STATUS_QUERIES bootstrap (6th injected file), lifetime alpha stats |
