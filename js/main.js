import { init } from './init.js'
import { events, signalNameSpaces, state, transient } from './constants.js'
import { tic, toc } from './utils.js';
import { createGrid, createTable, editor, grid, help } from './components.js';

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
    transient.resultCount = 0;
}

function cleanErrors() {
    errorEl.style.height = '0';
}

function loadingStart() {
    transient.loading = true;
    transient.resultCount = 0;
    submitBtn.ariaDisabled = true;
    pageDiv.style.opacity = 0.4;
    if (grid) grid.destroy();
    resultsDiv.innerHTML = '';
}

function loadingStop() {
    transient.loading = false;
    pageDiv.style.opacity = 1;
    submitBtn.ariaDisabled = false;
}

function execEditorContents(options) {
    if (transient.loading) return;
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
        transient.resultCount = results[0]?.values.length ?? 0
        loadingStop();
        toc('Results to HTML');
    }
    worker.postMessage({ action: 'exec', sql: sql + ';' });
    loadingStart();
}

submitBtn.addEventListener('click', execEditorContents, true);
document.addEventListener(events.execUserSql, e => execEditorContents(e.detail));
document.addEventListener(events.dbLoaded, () => {
    transient.loading = false;
    execEditorContents();
});

document.addEventListener('keydown', e => {
    if (e.key == '?' && !editor.hasFocus()) {
        if (help.open) help.close(); else help.showModal();
    }
    else if (e.ctrlKey && e.key == 'Enter') {
        document.dispatchEvent(new Event(events.execUserSql));
    }
    else if (e.ctrlKey && e.key == 'z') {
        editor.execCommand('undo');
        editor.focus();
    }
    else if (e.ctrlKey && e.key == 'v') {
        paste(e);
    }
});

function paste(event) {
    const selection = window.getSelection();
    // if nothing selected -> isCollapsed == true -> the user clipboard will be pasted
    // if something selected -> we paste the selection but NOT the user clipboard
    if (!selection.isCollapsed) {
        // check for template placeholders and fill the first one
        let sql = editor.getValue();
        const regex = /(_value_)/;
        let found = false;
        sql = sql.replace(regex, match => {
            found = match != null;
            return selection.toString();
        });
        if (found) {
            editor.setValue(sql);
        } else {
            editor.replaceSelection(selection.toString());
        }
        event.preventDefault();
    }
    editor.focus();
}

// select cell content on click
resultsDiv.addEventListener('click', e => {
    if (e.target.nodeName == 'TD') {
        const selection = window.getSelection();
        selection.empty();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        selection.addRange(range);
    }
})

// debug
// for (let e of ['start', 'stop', 'before-render', 'render'])
//     document.addEventListener('reef:' + e, ev => console.log(ev.type, ev.target));
// for (let n of Object.keys(signalNameSpaces))
//     document.addEventListener('reef:signal-' + n, ev => console.log('signal-'+n, ev.detail));
