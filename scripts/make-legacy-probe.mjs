import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const polyfill = html.match(/id="vite-legacy-polyfill" src="([^"]+)"/)[1]
const entry = html.match(/id="vite-legacy-entry" data-src="([^"]+)"/)[1]

const page = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>legacy probe</title>
<script>
window.__errors = [];
window.addEventListener('error', function (e) {
  window.__errors.push('UNCAUGHT: ' + (e.message || '(no message)') + '  @line ' + (e.lineno || '?'));
});
window.addEventListener('unhandledrejection', function (e) {
  var r = e.reason;
  window.__errors.push('UNHANDLED REJECTION: ' + (r && (r.stack || r.message) || String(r)));
});
var _err = console.error;
console.error = function () {
  window.__errors.push('console.error: ' + Array.prototype.map.call(arguments, function (a) {
    return a && a.stack ? a.stack : String(a);
  }).join(' '));
  _err.apply(console, arguments);
};

// ---- remove the APIs Chromium 53 (LG webOS 3.5, 2017) does not have ----
// Runs BEFORE the polyfill chunk, exactly like a real TV: whatever core-js
// restores is what the TV would have had.
${[
  'globalThis',
  'ResizeObserver',
  'AbortController',
  'queueMicrotask',
  'requestIdleCallback',
  'structuredClone',
]
  .map((k) => `try { delete window.${k}; } catch (e) {}`)
  .join('\n')}
try { delete Object.entries; } catch (e) {}
try { delete Object.values; } catch (e) {}
try { delete Object.fromEntries; } catch (e) {}
try { delete Object.getOwnPropertyDescriptors; } catch (e) {}
try { delete String.prototype.padStart; } catch (e) {}
try { delete String.prototype.padEnd; } catch (e) {}
try { delete String.prototype.matchAll; } catch (e) {}
try { delete Promise.prototype.finally; } catch (e) {}
try { delete Array.prototype.flat; } catch (e) {}
try { delete Array.prototype.flatMap; } catch (e) {}
try { delete Array.prototype.at; } catch (e) {}
try {
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: function () { return undefined; } });
} catch (e) {}

// Seed a registration code so the app takes its "already provisioned" path:
// startup fetch -> content -> frame. This page runs during parsing, before the
// deferred app module, so the seed is in place when the app reads it.
try { window.localStorage.setItem('registrationCode', 'PROBE1'); } catch (e) {}
</script>
</head>
<body>
<div id="root"></div>
<script src="${polyfill}"></script>
<script>
  // Report which of the simulated-missing APIs the polyfill actually restored.
  window.__restored = {
    ResizeObserver: typeof window.ResizeObserver,
    ObjectEntries: typeof Object.entries,
    PromiseFinally: typeof Promise.prototype.finally,
    ArrayFlat: typeof Array.prototype.flat,
    PadStart: typeof String.prototype.padStart,
    globalThis: typeof window.globalThis,
    AbortController: typeof window.AbortController,
  };
  System.import('${entry}');
</script>
<script>
  // Give the app time to boot, fetch /price-tag/getContent/PROBE1 and render the
  // frame. Nothing is clicked: with a seeded code the player provisions itself,
  // which is exactly the path a TV takes.
  // NOTE: no backticks in this block — the whole page is a JS template literal.
  setTimeout(finish, 5000);

  function finish() {
    // Sample ResizeObserver AGAIN here: the polyfill is installed by the app
    // entry module, which runs after the chunk that __restored was captured in.
    // Checking only the early snapshot reports "undefined" even when the fix
    // works, which is misleading.
    var pre = document.createElement('pre');
    pre.id = 'r';
    pre.textContent =
      'NAVIGATOR-INDEPENDENT API STATE\\n' +
      '  after polyfill chunk : ' + JSON.stringify(window.__restored) + '\\n' +
      '  after app entry      : ' + JSON.stringify({
        ResizeObserver: typeof window.ResizeObserver,
        __proto__: null,
      }) + '\\n\\n' +
      'ERRORS (' + window.__errors.length + '):\\n' + window.__errors.join('\\n') + '\\n\\n' +
      'RENDERED TEXT: ' + (document.body.innerText || '(empty)').slice(0, 300);
    document.body.innerHTML = '';
    document.body.appendChild(pre);
  }
</script>
</body>
</html>
`

writeFileSync('dist/_legacy-probe.html', page)
console.log('probe written')
console.log('  polyfill:', polyfill)
console.log('  entry   :', entry)
