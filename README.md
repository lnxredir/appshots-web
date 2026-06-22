# appshots-web

Turn raw app screenshots into App Store-ready promotional images — in your browser.

<p align="center">
  <img src="examples/hero.png" alt="appshots example output" width="100%" />
</p>

## What it does

Upload a screenshot from your simulator, device, or browser and turn it into a polished, store-ready image with the visual editor:

<p align="center">
  <img src="examples/before-after.png" alt="Before and after framing" width="600" />
</p>

**appshots-web** is a self-hosted web studio for App Store screenshot design:

1. **Frame** — wrap screenshots in realistic device frames with backgrounds, shadows, and text
2. **Style** — customize gradients, patterns, fonts, stickers, and placement with live preview
3. **Export** — download pixel-perfect PNGs at exact store dimensions

26 built-in device presets: iPhone, iPad, Android, Mac, Apple Watch, Apple TV, Vision Pro.

### Modes

- **Single** — one screenshot per export, ideal for individual store images
- **Seamless** — design a wide canvas that slices into multiple App Store screenshots, with elements spanning panel boundaries

## Credits

This project is a web-first fork of [appshots](https://github.com/albertnahas/appshots) by [Albert Nahas](https://github.com/albertnahas). Thank you to the original author for the framing engine, device presets, and CLI foundation that made this web studio possible.

## Install

### Docker (recommended)

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone https://github.com/lnxredir/appshots-web.git
cd appshots-web
cp .env.example .env   # optional — defaults to port 8084
docker compose up --build -d
```

Open [http://localhost:8084](http://localhost:8084).

Override the port in `.env` or inline:

```bash
APPSHOTS_PORT=9000 docker compose up --build -d
```

### From source (development)

Requires Node.js 20+.

```bash
git clone https://github.com/lnxredir/appshots-web.git
cd appshots-web
npm ci
npm run build
npm run ui
```

The UI dev server runs at [http://localhost:5173](http://localhost:5173) and proxies API requests to the backend.

## Quick Start

### 1. Start the app

```bash
docker compose up --build -d
```

### 2. Upload a screenshot

Open the app in your browser, choose **Single** mode, and drop a PNG, JPEG, or WebP screenshot onto the upload zone.

### 3. Pick a device and style it

- Select a device preset (e.g. iPhone 6.9")
- Choose portrait or landscape
- Set a background gradient, pattern, or solid color
- Add title and subtitle text with full styling controls
- Drag the phone frame to reposition; use alignment and size sliders in the sidebar

### 4. Download

Click **Download PNG** to export an App Store-ready image at the exact pixel dimensions for your selected device.

### Seamless carousel

Switch to **Seamless** mode to design a multi-panel wide canvas:

1. Set the panel count (2–5)
2. Add phone frames and position screenshots across panels
3. Add per-panel title and subtitle text
4. Use **Download all** to export each panel as a separate PNG

## Configuration

Optional environment variables (set in `.env` or passed to Docker Compose):

| Variable | Description | Default |
|----------|-------------|---------|
| `APPSHOTS_PORT` | HTTP port for the web UI and API | `8084` |
| `APPSHOTS_HOST` | Bind address inside the container | `0.0.0.0` |
| `APPSHOTS_TAG` | Docker image tag | `latest` |

## Device Presets

| Slug | Dimensions | Devices |
|------|-----------|---------|
| `iphone-6.9` | 1320 x 2868 | iPhone Air, 17 Pro Max, 16 Pro Max |
| `iphone-6.9-alt` | 1290 x 2796 | iPhone 16 Plus, 15 Pro Max |
| `iphone-6.5` | 1284 x 2778 | iPhone 14 Plus, 13 Pro Max |
| `iphone-6.3` | 1206 x 2622 | iPhone 17 Pro, 17 |
| `iphone-6.3-alt` | 1179 x 2556 | iPhone 16 Pro, 16, 15 Pro |
| `iphone-6.1` | 1170 x 2532 | iPhone 14, 13, 12 |
| `iphone-5.5` | 1242 x 2208 | iPhone 8 Plus, 7 Plus |
| `ipad-13` | 2064 x 2752 | iPad Pro M5/M4, iPad Air M3 |
| `ipad-11` | 1668 x 2388 | iPad Pro 11", iPad Air |
| `android-phone` | 1080 x 1920 | Standard Android (16:9) |
| `android-phone-tall` | 1080 x 2400 | Modern Android (20:9) |
| `android-tablet-10` | 1600 x 2560 | 10" Android tablet |
| `mac` | 2880 x 1800 | MacBook Pro |

The editor includes all 26 presets covering Apple Watch, Apple TV, and Vision Pro.

## Production deployment

```bash
# Pull latest and rebuild
git pull
docker compose up --build -d

# Check health
docker compose ps
curl -sf http://localhost:8084/api/devices | head -c 200
```

The container exposes a health check on `/api/devices` and restarts automatically unless stopped.

## License

MIT
