# Elephant Mood Tracker: five scenes

Carousel of all five Rive mood scenes, a live state machine demo ("Try State Machine") and the integration docs.

```bash
npm install
npm run dev
```

File: `public/scene_elephant.riv` · artboard `Scene` · state machine `Scene_SM`

Inputs: `Angry`, `Sad`, `Calm`, `Happy`, `Excited` (boolean, one true at a time) and `Blink` (trigger).

Uses the WebGL2 runtime (`@rive-app/react-webgl2`) so glow and blur render correctly.

Deploys as-is on Vercel.
