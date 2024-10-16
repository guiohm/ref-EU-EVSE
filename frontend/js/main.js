import { init } from './init.js'
import { events, queries, state } from './constants.js'
import { loadLocalStorage, save2LocalStorage, tic, toc } from './utils.js';
import { component } from '../lib/reef.es.js';

const {worker, editor} = init(execEditorContents, showError);

//////// Actions

const ActionsEl = document.querySelector('.actions')

function renderActions() {
    ActionsEl.innerHTML = queries.map((query, index) => {
        return `<div class="item" data-idx="${index}">${query.title}</div>`
    }).join('')
}
renderActions();

function onActionsClick(ev) {
    if (!ev.target.dataset?.idx) return;
    editor.setValue(queries[ev.target.dataset.idx].sql);
    execEditorContents()
}
ActionsEl.addEventListener('click', onActionsClick, true);

///////// Result count

function getResultCountHtml() {
    let {resultCount} = state;
    return resultCount > 0 ? `${resultCount} résultats`
        : (resultCount < 0 ? 'Requête en cours...' : 'Pas de résultat')
}
component(document.getElementById('resultCount'), getResultCountHtml);

//////// Toggle Result raw table / grid.js aka gridSwitch

document.getElementById('result-toggle').addEventListener('click', e => {
    setTimeout(() => {
        state.resultUseBasicRenderer = !e.target.checked;
        if (grid) grid.destroy()
        save2LocalStorage(state);
        document.dispatchEvent(new Event(events.execUserSql))
    }, 300);
})

///////// Help modal

const showHelpBtn = document.getElementById("helpShow");
const closeBtn = document.getElementById("helpClose");
const dialog = document.getElementById("helpDialog");

showHelpBtn.addEventListener('click', () => dialog.showModal());
closeBtn.addEventListener('click', () => {
  dialog.close();
});

/////////

let grid
const resultsDiv = document.getElementById('results')
const submitBtn = document.getElementById('submit')
const errorEl = document.getElementById('error')

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

function execEditorContents() {
    cleanErrors()
    executeSqlAndShowResults(editor.getValue() + ';');
}

function executeSqlAndShowResults(sql) {
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
                createGrid(results[i]);
            }
        }
        state.resultCount = results[0]?.values.length ?? 0
        loadingStop();
        toc('Results to HTML');
    }
    worker.postMessage({ action: 'exec', sql: sql });
    loadingStart();
}

const pageDiv = document.getElementsByClassName('page')[0];
function loadingStart() {
    state.resultCount = -1;
    submitBtn.ariaDisabled = true;
    pageDiv.style.opacity = 0.4;
    if (grid) grid.destroy();
    resultsDiv.innerHTML = '';
}

function loadingStop() {
    pageDiv.style.opacity = 1;
    submitBtn.ariaDisabled = false;
}

let createTable = function () {
    function valconcat(vals, tagName) {
        if (vals.length === 0) return '';
        const open = '<' + tagName + '>', close = '</' + tagName + '>';
        return open + vals.join(close + open) + close;
    }
    return function (columns, values) {
        const div = document.createElement('div');
        div.classList.add('results-table');
        let html = '<table><thead>' + valconcat(columns, 'th') + '</thead>';
        const rows = values.map(function (v) { return valconcat(v, 'td'); });
        html += '<tbody>' + valconcat(rows, 'tr') + '</tbody></table>';
        div.innerHTML = html;
        return div;
    }
}();

function createGrid(results) {
    if (!grid) {
        grid = new gridjs.Grid({
            columns: results.columns,
            data: results.values,
            fixedHeader: true,
            // resizable: true,
            search: true,
            sort: true,
            style:{
                container:{
                'width':'100%',
                'height':'100%'
                },
            },
            width: '100%',
            height: '92%',
        });
    } else {
        grid.destroy()
    }
    state.resultCount = results.values.length

    grid.updateConfig({
        columns: results.columns,
        data: results.values,
        // height: `${Math.min(900, lineCount * 190)}px`,
    }).render(resultsDiv);
}

loadLocalStorage(state);
document.addEventListener(events.execUserSql, execEditorContents);
document.addEventListener(events.dbLoaded, execEditorContents);
submitBtn.addEventListener('click', execEditorContents, true);

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
