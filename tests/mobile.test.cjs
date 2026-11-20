const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const desktop = fs.readFileSync('dist/index.html', 'utf8');
const mobile = fs.readFileSync('dist/mobile/index.html', 'utf8');
const code = fs.readFileSync('dist/mobile/mobile-controls.js', 'utf8');

// Do not silently fork the game rules between desktop and mobile.
const script = (html) => html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script(desktop) && script(mobile), 'game engine exists on both pages');
assert.equal(script(mobile).replace(/\s*\/\/ Mobile-only input bridge:[^\n]*\n\s*window\.__desiDriveMobileEngine = g;/, ''),
  script(desktop), 'mobile runs exactly the same engine, except exposing its input handle');
assert.match(mobile, /<base href="\.\.\/">/, 'shared sprites load correctly');
assert.match(mobile, /mobile\/mobile-controls\.js/, 'mobile-specific controls loaded');
assert.doesNotMatch(desktop, /mobile-controls/, 'desktop build untouched');

const elements = new Map();
let mutationCheck;
function createElement(id, key) {
  const listeners = new Map();
  const attributes = {};
  const classes = new Set();
  const el = {
    id, dataset: key ? {drivingKey:key} : {}, attributes, listeners,
    label:{textContent:'OFF'},
    classList: {
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    setAttribute(name,val) { attributes[name]=val; },
    addEventListener(name,cb) { listeners.set(name,cb); },
    querySelector(selector) { assert.equal(selector,'small'); return el.label; },
    setPointerCapture() {},
    fire(name, pointerId) {
      const callback = listeners.get(name);
      assert.ok(callback,`${id} has ${name} handler`);
      callback({pointerId,preventDefault() {}});
    }
  };
  elements.set(id,el);
  return el;
}

const names = [
  ['mobile-steer-left','ArrowLeft'], ['mobile-steer-right','ArrowRight'],
  ['mobile-accelerate','ArrowUp'], ['mobile-brake','ArrowDown'],
  ['mobile-ind-left'], ['mobile-ind-right'], ['hud-screen'],
  ['game-over-screen'], ['garage-screen']
];
names.forEach(([id,key])=>createElement(id,key));
const game = {
  isPlaying:true, keys:{}, ind:{l:false,r:false},
  updateUIIndicators() { this.indUpdates=(this.indUpdates||0)+1; }
};
const keyButtons = names.filter(([,key])=>key).map(([id])=>elements.get(id));
const ctx = vm.createContext({
  window: {__desiDriveMobileEngine:game, addEventListener(){}},
  document: {
    querySelectorAll(selector) { assert.equal(selector,'[data-driving-key]'); return keyButtons; },
    getElementById(id) { return elements.get(id); },
    addEventListener() {}, hidden:false
  },
  MutationObserver: class {
    constructor(fn) { mutationCheck=fn; }
    observe() {}
  },
  Map, Set
});
vm.runInContext(code,ctx);

const accelerate = elements.get('mobile-accelerate');
const steer = elements.get('mobile-steer-left');
accelerate.fire('pointerdown',1);
assert.equal(game.keys.ArrowUp,true,'drive pressed = accelerate');
steer.fire('pointerdown',2);
assert.equal(game.keys.ArrowUp,true,'multi-touch steering keeps acceleration held');
assert.equal(game.keys.ArrowLeft,true,'second finger steers');
steer.fire('pointerup',2);
assert.equal(game.keys.ArrowUp,true,'releasing steer does not release drive');
assert.equal(game.keys.ArrowLeft,false,'steer released');
accelerate.fire('pointercancel',1);
assert.equal(game.keys.ArrowUp,false,'cancel releases drive');

elements.get('mobile-ind-left').fire('click');
assert.equal(game.ind.l,true,'indicator toggles on tap');
elements.get('mobile-ind-right').fire('click');
assert.equal(game.ind.l,false,'right indicator switches off left');
assert.equal(game.ind.r,true,'right indicator switches on');
assert.equal(elements.get('mobile-ind-right').label.textContent,'ON','indicator status visible');

accelerate.fire('pointerdown',3);
assert.equal(game.keys.ArrowUp,true);
game.isPlaying = false;
elements.get('hud-screen').classList.toggle('hidden',true);
mutationCheck();
assert.equal(game.keys.ArrowUp,false,'game over releases accelerator');
assert.equal(accelerate.attributes['aria-pressed'],'false','no stuck controls on game over');

console.log('Mobile input and shared-game-logic checks passed.');
