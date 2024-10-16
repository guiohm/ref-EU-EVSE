
// Performance measurement functions
let tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
export function tic() { tictime = performance.now() }
export function toc(msg) {
	let dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

