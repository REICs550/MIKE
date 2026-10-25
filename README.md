# MIKE

MIKE is a parametric CAD studio for cars and car parts. Parts are dimensioned in millimeters and assembled in a shared vehicle space: **+X** right, **+Y** up, **+Z** forward.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints. `npm test` checks the part geometry and the vehicle templates. `npm run build` typechecks and builds the studio.

## Model

- Load a sports coupe, grand tourer, or pickup, or start from a bare spaceframe.
- Add parts from the library: chassis, suspension, brakes, wheels, body panels, glass, lights, powertrain, and interior.
- Edit dimensions, finish, and placement. Wheel diameter keeps the tire planted on the ground.
- Move and rotate a part with the gizmo. Arrow keys nudge the selection.
- Section, explode, and dimension overlays are view tools. They do not change the model.
- Undo is kept for the session. The project also autosaves in this browser.

## Files

Export a `.json` project, an STL of the visible solids, or a bill of materials. Mass is an estimate so designs can be compared as thickness, size, and layout change. It is not a certified weight.
