import { component } from '../lib/reef.es.js';
import { events, logsColumns, queries, queryTypes, saveName, signalNameSpaces, sourceColumns, state, transient } from './constants.js';
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

const actionsEl = document.querySelector('.actions')

function renderActions() {
    const {savedQueries} = state;
    return queries.concat(savedQueries).map((query) => {
        return `<div class="item" data-type="${query.type}">${query.title}</div>`
    }).join('')
}

function onActionsClick(ev) {
    if (!ev.target.dataset?.type) return;
    const queryList = ev.target.dataset.type === queryTypes.save ? state.savedQueries : queries;
    const q = queryList.filter(q => q.title === ev.target.innerText)[0];
    editor.setValue(q.sql);
    saveName.value = q.title;
    if (q.type !== 'template') {
        document.dispatchEvent(new Event(events.execUserSql));
    }
}
actionsEl.addEventListener('click', onActionsClick, true);

component(actionsEl, renderActions, {signals: [signalNameSpaces.state]});


///////// Save

const saveBtn = document.getElementById('saveBtn')
const saveNameEl = document.getElementById('saveName')
const saveDeleteBtn = document.getElementById('saveDelete')

saveDeleteBtn.addEventListener('click', () => {
    if (saveExists(saveName.value)) {
        state.savedQueries = state.savedQueries.filter(q => q.title !== saveName.value);
    }
})

saveNameEl.addEventListener('input', function(_) { saveName.value = this.value });

saveBtn.addEventListener('click', () => {
    const sql = editor.getValue();
    if (saveNameEl.value) {
        const query = state.savedQueries.find(q => q.title == saveNameEl.value);
        if (query) {
            query.sql = sql;
        } else {
            state.savedQueries.push({
                title: saveNameEl.value,
                type: queryTypes.save,
                sql: sql,
            });
        }
        saveDeleteBtn.removeAttribute('disabled', '');
    }
});

function saveExists(name) {
    return state.savedQueries.find(q => q.title == name) !== undefined
}

function onSaveNameChange() {
    saveNameEl.value = saveName.value;
    const exists = saveExists(saveName.value);
    if (exists) {
        saveDeleteBtn.removeAttribute('disabled', '');
    } else {
        saveDeleteBtn.setAttribute('disabled', '');
    }
}

document.addEventListener('reef:signal-'+signalNameSpaces.saveName, onSaveNameChange, true);
document.addEventListener('reef:signal-'+signalNameSpaces.state, save2LocalStorage, true);

///////// Result count

function getResultCountHtml() {
    let {loading, resultCount} = transient;
    return loading ? 'Requête en cours...'
        : (resultCount > 0 ? `${resultCount} résultats` : 'Pas de résultat')
}
component(document.getElementById('resultCount'), getResultCountHtml, {signals: [signalNameSpaces.transient]});


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
    theme: 'blackboard',
    viewportMargin: Infinity,
    extraKeys: {
        'Ctrl-Enter': () => document.dispatchEvent(new Event(events.execUserSql)),
        'Alt-Enter': 'autocomplete',
        'Alt-Space': 'autocomplete',
        'Ctrl-Space': 'autocomplete',
        'Ctrl-/': 'autocomplete',
    },
    hint: CodeMirror.hint.sql,
    hintOptions: {
        tables: { //TODO automate this
            logs: logsColumns.concat(sourceColumns),
        },
        defaultTable: 'logs'
    },
});


///////// Columns list

const columnsEl = document.querySelector('.columns');

function renderColumns() {
    columnsEl.innerHTML =
        logsColumns.map(c => `<code class="log">${c}</code>`).concat(
            sourceColumns.map(c => `<code>${c}</code>`)).join('')
}
renderColumns();

// paste selected column name on click
columnsEl.addEventListener('click', e => {
    if (e.target.nodeName == 'CODE') {
        editor.replaceSelection(e.target.innerText + ', ');
        editor.focus();
    }
})

document.getElementById('showColumns').addEventListener('click', function() {
    if (columnsEl.style.display == 'none') {
        columnsEl.style.display = 'block';
        this.innerText = 'Cacher Colonnes';
        this.classList.remove('outline');
    } else {
        columnsEl.style.display = 'none';
        this.innerText = 'Afficher Colonnes';
        this.classList.add('outline');
    }
});


///////// Help modal

const showHelpBtn = document.getElementById('helpShow');
const closeBtn = document.getElementById('helpClose');
export const help = document.getElementById('helpDialog');

showHelpBtn.addEventListener('click', () => help.showModal());
closeBtn.addEventListener('click', () => {
  help.close();
});


///////// Fast table

export const createTable = function () {
    function valconcat(vals, tagName) {
        if (vals.length === 0) return '';
        const open = '<' + tagName + '>', close = '</' + tagName + '>';
        return open + vals.join(close + open) + close;
    }

    const regex = new RegExp(`(>(${logsColumns.join('|')}))`, 'g');

    return function (columns, values) {
        const div = document.createElement('div');
        div.classList.add('results-table');
        let html = '<table><thead>' + valconcat(columns, 'th') + '</thead>';
        html = html.replace(regex, ' class="log">$2');
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