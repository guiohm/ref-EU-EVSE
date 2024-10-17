import { init } from './init.js'
import { events, state } from './constants.js'
import { tic, toc } from './utils.js';
import { createGrid, createTable, editor, grid } from './components.js';

const {worker} = init(showError);

const resultsDiv = document.getElementById('results')
const submitBtn = document.getElementById('submit')
const errorEl = document.getElementById('error')
const pageDiv = document.getElementsByClassName('page')[0];

function showError(e) {
    loadingStop();
    console.log(e);
    errorEl.style.height = 'auto';
    errorEl.textContent = e.message;
    state.resultCount = 0;
}

function cleanErrors() {
    errorEl.style.height = '0';
}

function loadingStart() {
    state.loading = true;
    state.resultCount = 0;
    submitBtn.ariaDisabled = true;
    pageDiv.style.opacity = 0.4;
    if (grid) grid.destroy();
    resultsDiv.innerHTML = '';
}

function loadingStop() {
    state.loading = false;
    pageDiv.style.opacity = 1;
    submitBtn.ariaDisabled = false;
}

function execEditorContents(options) {
    if (state.loading) return;
    cleanErrors()
    executeSqlAndShowResults(editor.getValue(), options);
}

function executeSqlAndShowResults(sql, options) {
    if (options?.pushHistory !== false)
        history.pushState({}, "", location.pathname+'?q='+encodeURI(sql));

    tic();
    worker.onmessage = function (event) {
        var results = event.data.results;
        toc('Executing SQL');
        if (!results) {
            showError({message: event.data.error});
            return;
        }

        tic();
        for (var i = 0; i < results.length; i++) {
            if (state.resultUseBasicRenderer) {
                resultsDiv.appendChild(createTable(results[i].columns, results[i].values));
            } else {
                createGrid(results[i], resultsDiv);
            }
        }
        state.resultCount = results[0]?.values.length ?? 0
        loadingStop();
        toc('Results to HTML');
    }
    worker.postMessage({ action: 'exec', sql: sql + ';' });
    loadingStart();
}

submitBtn.addEventListener('click', execEditorContents, true);
document.addEventListener(events.execUserSql, e => execEditorContents(e.detail));
document.addEventListener(events.dbLoaded, () => {
    state.loading = false;
    execEditorContents();
});


////////

// select cell content on click
resultsDiv.addEventListener('click', e => {
    if (e.target.nodeName == 'TD') {
        const selection = window.getSelection();
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        selection.addRange(range);
    }
})

// debug
// for (let e of ['signal', 'start', 'stop', 'before-render', 'render'])
//     document.addEventListener('reef:' + e, ev => console.log(ev.type, ev.target));
