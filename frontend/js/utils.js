import { state, storedKeys } from "./constants.js";

// Performance measurement functions
let tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
export function tic() { tictime = performance.now() }
export function toc(msg) {
	let dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

export function loadLocalStorage() {
	const storage = JSON.parse(localStorage.getItem('v1')) || {};
	for (let key of storedKeys) {
		if (key in storage) state[key] = storage[key];
	}
}

export function save2LocalStorage() {
	const storage = {};
	for (let key of storedKeys) {
		storage[key] = state[key];
	}
	localStorage.setItem('v1', JSON.stringify(storage));
}