# HomeHue: AI Exterior House Colour Studio 🏠

HomeHue is an advanced exterior house colour visualization studio and AI design generation system. It enables homeowners, architects, and designers to accurately analyze house architecture, detect exterior surfaces (walls, trim, roofs, doors, windows, pillars, balconies, boundaries, gates), and visualize realistic, tone-mapped exterior colour palettes without altering the original building geometry.

---

## ✨ Key Features

- **Architectural Context Analysis**: Evaluates wall proportions, roof shape/material, trim, colonnades, balconies, surrounding greenery, and lighting before suggesting colours.
- **8 Professional Design Styles**:
  - Modern Minimal
  - Contemporary
  - Elegant
  - Luxury
  - Warm & Natural
  - Earthy
  - Traditional
  - Bold Modern
- **Structure-Preserving Rendering**: Uses micro-contrast relief tone-mapping to preserve shadows, natural textures, and highlights—retaining the exact original photograph.
- **Zero Hallucination**: Only generates colour recommendations for surfaces that actually exist on the house.
- **Comprehensive Architectural Rationale**: Every recommended colour includes the swatch name, HEX code, target area, and a design rationale explaining why it suits the facade.
- **Manual Precision Tools**: Brush, eraser, grow, shrink, smooth, undo/redo, and color locking.
- **Respects User Customizations**: Manually selected colours are preserved when generating automated AI concepts.

---

## 🚀 Quick Start

### Windows (One-Click)
Double-click `start.bat` to launch the local server and open the studio in your browser automatically:
```cmd
start.bat
```
To stop the server and close the terminal:
```cmd
stop.bat
```

### Manual Run (Any OS)
Run the built-in Python web server:
```bash
python app.py
```
Then navigate to:
```
http://localhost:8000/HomeHue_MasterAI.html
```

---

## 📁 Repository Structure

- `HomeHue_MasterAI.html` / `index.html` / `HomeHue_Studio.html` — Main application studio entry points.
- `app.py` — Lightweight local HTTP server.
- `start.bat` / `stop.bat` — Windows automation scripts.
- `style.css` — Global styling and UI design tokens.
- `scratch/` — Regression test suites verifying architectural cases, mask editing, and tone-mapping rendering.
