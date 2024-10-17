import { loadFromUrl } from "./components.js";
import { events, state } from "./constants.js";
import { loadLocalStorage, tic, toc } from "./utils.js";

export function init(showError) {

    const worker = new Worker("lib/worker.sql-wasm.js");
    worker.onerror = showError;

    (async function(){
        const data = await fetch("irve.db").then(res => res.arrayBuffer());
        worker.onmessage = function () {
            toc("Loading database from file");
            // execute("SELECT `name`, `sql`  FROM `sqlite_master`;")
            document.dispatchEvent(new Event(events.dbLoaded))
        };
        tic();
        try {
            worker.postMessage({ action: 'open', buffer: data }, [data]);
        }
        catch (exception) {
            worker.postMessage({ action: 'open', buffer: data });
        }
    })()

    loadLocalStorage(state);
    loadFromUrl(window.location.href);

    return {worker}
}