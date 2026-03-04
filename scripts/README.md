# Scripts

Run from **repo root**.

## Build wheel (with latest console)

```bash
bash scripts/wheel_build.sh
```

- Builds the console frontend (`console/`), copies `console/dist` to `src/aicraw/console/dist`, then builds the wheel. Output: `dist/*.whl`.

## Build desktop app

```bash
bash scripts/desktop_build.sh
```

- Builds the console frontend, copies to `src/aicraw/console/`, then runs PyInstaller. Output: `dist/LinClaw/`.
