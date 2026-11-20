# DesiDrive V2

A pixel-art Indian traffic riding game featuring six roads: Hyderabad Ride, MP Off-Road, Delhi Chaos, Mumbai Rush, Tamil Nadu Flow and Ek Galti Hills. Includes illustrated bikes, buses, cars, auto-rickshaws, pedestrians, cattle, traffic signals, road rules, scoring and unlocks.

## Play

- Desktop: https://desidrive-codex-v2-puja.stunninggrebe16.chatgpt.site/
- Mobile: https://desidrive-codex-v2-puja.stunninggrebe16.chatgpt.site/mobile/

The hosted site may require owner sign-in.

## Run locally

From the repository root, serve the static `dist` directory:

```sh
python3 -m http.server 8000 -d dist
```

Open `http://localhost:8000/` for desktop or `http://localhost:8000/mobile/` for touch controls. HTTP serving is required for the asset fetches; opening the HTML file directly may not work fully.

## Tests

```sh
node tests/traffic.test.cjs
node tests/visuals.test.cjs
node tests/mobile.test.cjs
```

Desktop and mobile use matching game rules; mobile adds only touch UI and input controls.

Original DesiTrafficJam V1 repository remains separate.
