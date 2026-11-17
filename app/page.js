'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2';

// ---- Names exactly as they appear in scene_elephant.riv ----
const FILE = '/scene_elephant.riv';
const ARTBOARD = 'Scene';
const SM = 'Scene_SM';

const layout = new Layout({ fit: Fit.Cover, alignment: Alignment.Center });

const MOODS = ['Angry', 'Sad', 'Calm', 'Happy', 'Excited'];
const pad = (n) => String(n).padStart(2, '0');

// Random 3-6 s blink for a Blink trigger input.
function useAutoBlink(blink, enabled, firstDelay, onFire) {
  const cb = useRef(onFire);
  cb.current = onFire;
  useEffect(() => {
    if (!blink || !enabled) return undefined;
    let t;
    const fire = () => {
      blink.fire();
      if (cb.current) cb.current();
      t = setTimeout(fire, 3000 + Math.random() * 3000);
    };
    t = setTimeout(fire, firstDelay);
    return () => clearTimeout(t);
  }, [blink, enabled, firstDelay]);
}

/* ---------------------------------------------------------------- card */
function SceneCard({ buffer, mood, n, canClick }) {
  const { rive, RiveComponent } = useRive({
    buffer,
    artboard: ARTBOARD,
    stateMachines: SM,
    autoplay: true,
    layout,
  });
  const moodInput = useStateMachineInput(rive, SM, mood);
  const blink = useStateMachineInput(rive, SM, 'Blink');

  useEffect(() => {
    if (moodInput) moodInput.value = true;
  }, [moodInput]);
  useAutoBlink(blink, true, 700 + n * 500);

  return (
    <div className="card" onClick={() => canClick() && blink && blink.fire()}>
      <RiveComponent />
      <span className="num">{pad(n + 1)}</span>
    </div>
  );
}

/* ------------------------------------------------- live state machine */
function Demo({ file, onClose }) {
  const buffer = useMemo(() => file.slice(0), [file]);
  const { rive, RiveComponent } = useRive({
    buffer,
    artboard: ARTBOARD,
    stateMachines: SM,
    autoplay: true,
    layout,
  });
  const inputs = {
    Angry: useStateMachineInput(rive, SM, 'Angry'),
    Sad: useStateMachineInput(rive, SM, 'Sad'),
    Calm: useStateMachineInput(rive, SM, 'Calm'),
    Happy: useStateMachineInput(rive, SM, 'Happy'),
    Excited: useStateMachineInput(rive, SM, 'Excited'),
  };
  const blink = useStateMachineInput(rive, SM, 'Blink');

  const [mood, setMood] = useState('Calm');
  const [auto, setAuto] = useState(false);
  const [blinks, setBlinks] = useState(0);
  const ready = MOODS.every((m) => inputs[m]);

  // Only one mood boolean may be true at a time.
  const select = (name) => {
    MOODS.forEach((m) => {
      if (inputs[m]) inputs[m].value = m === name;
    });
    setMood(name);
  };
  useEffect(() => {
    if (ready) select('Calm');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const fireBlink = () => {
    if (!blink) return;
    blink.fire();
    setBlinks((c) => c + 1);
  };
  useAutoBlink(blink, auto, 1200, () => setBlinks((c) => c + 1));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="demo" role="dialog" aria-label="Live state machine">
      <div className="demo-stage">
        <div className="demo-phone" onClick={fireBlink}>
          <RiveComponent />
        </div>
      </div>

      <aside className="demo-panel">
        <button className="demo-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>

        <div className="eyebrow"><span className="live" />Live state machine</div>
        <h2>{SM}</h2>
        <p className="dim">
          Artboard <code>{ARTBOARD}</code>. Set one mood boolean to{' '}
          <code>true</code> at a time and fire <code>Blink</code> on its own layer.
        </p>

        <div className="group">Moods (boolean)</div>
        <div className="chips">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`chip ${mood === m ? 'on' : ''}`}
              disabled={!inputs[m]}
              onClick={() => select(m)}
            >
              {m}
            </button>
          ))}
          <button
            className="chip ghost"
            onClick={() => {
              MOODS.forEach((m) => inputs[m] && (inputs[m].value = false));
              setMood(null);
            }}
          >
            Reset
          </button>
        </div>

        <div className="group">Blink (trigger)</div>
        <button className="wide" onClick={fireBlink} disabled={!blink}>
          Fire Blink
        </button>
        <label className="toggle">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Auto blink every 3 to 6 s</span>
        </label>

        <div className="readout">
          <div><b>{mood ?? 'none (Blank Idle)'}</b> <i>mood = true</i></div>
          <div><b>{blinks}</b> <i>blinks fired</i></div>
        </div>

        <pre className="code mini">{`rive.stateMachineInputs('${SM}')
  .find(i => i.name === '${mood ?? 'Calm'}').value = true
// one boolean true at a time
// Blink: input.fire()`}</pre>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function Page() {
  // Fetch the .riv once; every card gets its own copy of the bytes.
  const [file, setFile] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(FILE)
      .then((r) => r.arrayBuffer())
      .then((b) => alive && setFile(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const buffers = useMemo(
    () => (file ? MOODS.map(() => file.slice(0)) : null),
    [file]
  );

  const [demo, setDemo] = useState(false);

  // Carousel: native scroll-snap, arrows and mouse drag.
  const rail = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const updateEdge = () => {
    const el = rail.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft < 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };
  useEffect(updateEdge, [buffers]);

  const step = (dir) => {
    const el = rail.current;
    if (!el || !el.firstElementChild) return;
    const w = el.firstElementChild.getBoundingClientRect().width;
    el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const onDown = (e) => {
    if (e.pointerType !== 'mouse') return;
    drag.current = { down: true, x: e.clientX, left: rail.current.scrollLeft, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) {
      d.moved = true;
      rail.current.classList.add('dragging');
    }
    rail.current.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const el = rail.current;
    el.classList.remove('dragging');
    if (d.moved && el.firstElementChild) {
      const w = el.firstElementChild.getBoundingClientRect().width;
      el.scrollTo({ left: Math.round(el.scrollLeft / w) * w, behavior: 'smooth' });
      setTimeout(() => (d.moved = false), 50);
    }
  };

  return (
    <>
      <header className="head">
        <div>
          <div className="eyebrow-s">Elephant Mood Tracker · 5 scenes</div>
          <h1>
            Five moods,
            <br />
            five little worlds
            <small>Tap an elephant to make him blink.</small>
          </h1>
        </div>
        <button className="try" onClick={() => file && setDemo(true)}>
          Try State Machine
        </button>
      </header>

      <section className="carousel">
        <div
          className="rail"
          ref={rail}
          onScroll={updateEdge}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          {buffers &&
            MOODS.map((m, i) => (
              <SceneCard
                key={m}
                buffer={buffers[i]}
                mood={m}
                n={i}
                canClick={() => !drag.current.moved}
              />
            ))}
        </div>
        <div className="arrows">
          <button onClick={() => step(-1)} disabled={edge.start} aria-label="Previous">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => step(1)} disabled={edge.end} aria-label="Next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </section>

      <Docs />

      {demo && file && <Demo file={file} onClose={() => setDemo(false)} />}
    </>
  );
}

/* ---------------------------------------------------------------- docs */
const NAV = [
  ['overview', 'Overview'],
  ['inputs', 'Inputs'],
  ['sm', 'State machine'],
  ['web', 'Web'],
  ['rn', 'React Native'],
  ['checklist', 'Checklist'],
];

function Docs() {
  return (
    <div className="docs">
      <div className="docs-shell">
        <nav className="docs-nav">
          <div className="docs-nav-label">Documentation</div>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>

        <div className="docs-body">
          <section id="overview" className="sec">
            <div className="eyebrow-s">Overview</div>
            <h3>One file, five scenes</h3>
            <p>
              The whole mood tracker scene ships as a single Rive file. Each
              mood is a complete looping scene with the elephant on the bench,
              driven by one state machine.
            </p>
            <div className="facts">
              <div><i>File</i><code>scene_elephant.riv</code></div>
              <div><i>Artboard</i><code>{ARTBOARD}</code></div>
              <div><i>State machine</i><code>{SM}</code></div>
            </div>
            <p>
              Use the <b>WebGL2 runtime</b> (<code>@rive-app/webgl2</code> or{' '}
              <code>@rive-app/react-webgl2</code>) on the web. The scenes use
              glow and blur, such as the lightning and the street lamp in Sad,
              which the plain canvas renderer does not draw correctly.
            </p>
          </section>

          <section id="inputs" className="sec">
            <div className="eyebrow-s">Reference</div>
            <h3>Inputs</h3>
            <table>
              <thead>
                <tr><th>Input</th><th>Type</th><th>Plays</th></tr>
              </thead>
              <tbody>
                {MOODS.map((m) => (
                  <tr key={m}>
                    <td><code>{m}</code></td>
                    <td>Boolean</td>
                    <td><code>{m}_Idle</code></td>
                  </tr>
                ))}
                <tr>
                  <td><code>Blink</code></td>
                  <td>Trigger</td>
                  <td>one blink, on its own layer</td>
                </tr>
              </tbody>
            </table>
            <p>
              Set exactly one mood boolean to <code>true</code>. When all are
              false the elephant returns to the hub state. Fire{' '}
              <code>Blink</code> every 3 to 6 seconds.
            </p>
          </section>

          <section id="sm" className="sec">
            <div className="eyebrow-s">Architecture</div>
            <h3>State machine</h3>
            <pre className="code">{`Scene_SM
  Layer "Main"
    Entry → Blank Idle (hub)
    Blank Idle ⇄ Angry_Idle    [Angry = true]
    Blank Idle ⇄ Sad_Idle      [Sad = true]
    Blank Idle ⇄ Calm_Idle     [Calm = true]
    Blank Idle ⇄ Happy_Idle    [Happy = true]
    Blank Idle ⇄ Excited_Idle  [Excited = true]
  Layer "Blink"
    Blink [Trigger] → plays Blink once`}</pre>
          </section>

          <section id="web" className="sec">
            <div className="eyebrow-s">JavaScript</div>
            <h3>Web integration</h3>
            <pre className="code">{`import { Rive, Fit, Alignment, Layout } from '@rive-app/webgl2'

const MOODS = ['Angry', 'Sad', 'Calm', 'Happy', 'Excited']

const scene = new Rive({
  src: '/scene_elephant.riv',
  canvas: document.getElementById('scene'),
  artboard: 'Scene',
  stateMachines: 'Scene_SM',
  autoplay: true,
  layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  onLoad: () => {
    const inputs = scene.stateMachineInputs('Scene_SM')

    // one mood true at a time
    window.setMood = (name) =>
      inputs.forEach((i) => {
        if (MOODS.includes(i.name)) i.value = i.name === name
      })

    const blink = inputs.find((i) => i.name === 'Blink')
    const loop = () =>
      setTimeout(() => { blink.fire(); loop() }, 3000 + Math.random() * 3000)
    loop()

    setMood('Calm')
  },
})`}</pre>
          </section>

          <section id="rn" className="sec">
            <div className="eyebrow-s">React Native</div>
            <h3>React Native example</h3>
            <pre className="code">{`import Rive from 'rive-react-native'

const SM = 'Scene_SM'
const MOODS = ['Angry', 'Sad', 'Calm', 'Happy', 'Excited']

export function ElephantScene({ mood }) {
  const riveRef = useRef(null)

  useEffect(() => {
    MOODS.forEach((name) =>
      riveRef.current?.setInputState(SM, name, name === mood)
    )
  }, [mood])

  // fire the blink trigger every few seconds
  useEffect(() => {
    const id = setInterval(() => riveRef.current?.fireState(SM, 'Blink'), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <Rive
      ref={riveRef}
      resourceName="scene_elephant"
      artboardName="Scene"
      stateMachineName={SM}
      autoplay
      style={{ width: '100%', aspectRatio: 1752 / 3100 }}
    />
  )
}`}</pre>
          </section>

          <section id="checklist" className="sec">
            <div className="eyebrow-s">Checklist</div>
            <h3>Ship it</h3>
            <ul className="checks">
              <li>Load <code>scene_elephant.riv</code>, artboard <code>Scene</code>, state machine <code>Scene_SM</code></li>
              <li>Use the WebGL2 runtime on web so glow and blur render</li>
              <li>Set exactly one of <code>Angry</code> / <code>Sad</code> / <code>Calm</code> / <code>Happy</code> / <code>Excited</code> to true</li>
              <li>Fire <code>Blink</code> every 3 to 6 seconds</li>
              <li>The artboard is 1752 × 3100 (about 9:16), so keep that aspect ratio</li>
              <li>Done</li>
            </ul>
          </section>

          <footer className="docs-footer">Elephant Mood Tracker · Rive integration docs</footer>
        </div>
      </div>
    </div>
  );
}
