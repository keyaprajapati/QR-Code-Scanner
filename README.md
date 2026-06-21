# AuraScan — QR Code Scanner & Generator

AuraScan is a premium browser-based QR utility that combines live camera scanning, image upload decoding, and QR code generation in one sleek interface.

## Features

- Live QR scanning using device camera (`html5-qrcode`)
- Drag-and-drop image upload for QR decoding
- Instant scan result preview with copy-to-clipboard support
- Automatic URL detection with quick open link action
- Local history log of recent scans stored in browser storage
- QR code generator with color customization and error correction options
- Download generated QR images as PNG
- Mute toggle and audio feedback for success/error states
- Responsive, modern UI with parallax card animation and ambient visuals

## Built With

- HTML
- Tailwind CSS (CDN)
- JavaScript
- `html5-qrcode`
- `qrcodejs`
- Lucide icons

## Project Structure

- `index.html` — main web app UI and layout
- `style.css` — custom styles for the app interface
- `app.js` — scanner logic, QR generation, history storage, UI interactions

## Usage

1. Open `index.html` in a modern browser.
2. Use the `Live Scanner` tab to start camera scanning and decode QR codes in real time.
3. Use the `Upload Image` tab to drop or choose a QR image file for decoding.
4. Use the `Generate QR` tab to create a custom QR code from text or a URL.
5. Copy decoded text, open URLs, or download generated QR graphics.

## Notes

- The app stores scan history in `localStorage` under `aurascan_history`.
- Audio feedback can be muted and preferences are saved locally.
- For best performance, open the app in a secure context (`https://` or `http://localhost`).

## License

Add a license of your choice before publishing on GitHub.
