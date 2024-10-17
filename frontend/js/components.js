import { component } from '../lib/reef.es.js';
import { columns, events, queries, state } from './constants.js';
import { save2LocalStorage } from './utils.js';


//////// history

export function loadFromUrl(url) {
    let sql = url.split('#')[0];
    sql = sql.split('?q=');
    if (sql.length > 1 && sql[1].toLowerCase().startsWith('select')) {
        editor.setValue(decodeURI(sql[1]));
        document.dispatchEvent(new CustomEvent(events.execUserSql,
            { detail: { pushHistory: false }}));
    }
}

window.addEventListener('popstate', (e) => loadFromUrl(e.target.location.href));


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
    document.dispatchEvent(new Event(events.execUserSql));
}
ActionsEl.addEventListener('click', onActionsClick, true);


///////// Result count

function getResultCountHtml() {
    let {loading, resultCount} = state;
    return loading ? 'Requête en cours...'
        : (resultCount > 0 ? `${resultCount} résultats` : 'Pas de résultat')
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


///////// Editor

export const editor = CodeMirror.fromTextArea(document.getElementById('input'), {
    mode: 'text/x-sql',
    viewportMargin: Infinity,
    indentWithTabs: true,
    smartIndent: true,
    lineNumbers: false,
    lineWrapping: true,
    matchBrackets: true,
    autofocus: true,
    theme: "blackboard",
    viewportMargin: Infinity,
    extraKeys: {
        "Ctrl-Enter": () =>
            document.dispatchEvent(new Event(events.execUserSql)),
        "Alt-Enter": "autocomplete",
        "Alt-Space": "autocomplete",
        "Ctrl-Space": "autocomplete",
        "Ctrl-/": "autocomplete",
    },
    hint: CodeMirror.hint.sql,
    hintOptions: {
        tables: { //TODO automate this
            logs: columns,
        },
        defaultTable: "logs"
    },
});


///////// Help modal

const showHelpBtn = document.getElementById("helpShow");
const closeBtn = document.getElementById("helpClose");
const dialog = document.getElementById("helpDialog");

showHelpBtn.addEventListener('click', () => dialog.showModal());
closeBtn.addEventListener('click', () => {
  dialog.close();
});


///////// Fast table

export const createTable = function () {
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


///////// Grid (slow)

export let grid;
export function createGrid(results, wrapperEl) {
    if (grid) {
        grid.destroy()
    }

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

    grid.render(wrapperEl);
}