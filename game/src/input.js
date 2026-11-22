// Keyboard + mouse state, with edge-triggered "pressed" helpers.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let mouseDown = false;
  let mousePressed = false;
  let mouseX = 0;
  let mouseY = 0;

  const code = (e) => e.code;

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (!keys.has(code(e))) pressed.add(code(e));
    keys.add(code(e));
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code(e))) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(code(e)));
  window.addEventListener('mousedown', (e) => {
    mouseDown = true; mousePressed = true; mouseX = e.clientX; mouseY = e.clientY;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  return {
    down(c) { return keys.has(c); },
    pressed(c) { return pressed.has(c); },
    axis(neg, pos) { return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0); },
    mouse: { get down() { return mouseDown; }, get pressed() { return mousePressed; }, get x() { return mouseX; }, get y() { return mouseY; } },
    endFrame() { pressed.clear(); mousePressed = false; },
  };
}
