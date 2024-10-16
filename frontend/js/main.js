import { init } from './init.js'
import { events, queries } from './constants.js'
import { tic, toc } from './utils.js';
import { component, signal } from '../lib/reef.es.js';

const {worker, editor} = init(execEditorContents, showError);

const state = signal({
    loading: true,
    resultCount: 0,
})

let result, grid, lineCount = null
const gridWrapper = document.getElementById('wrapper')
const submitBtn = document.getElementById('submit')
const errorEl = document.getElementById('error')

function showError(e) {
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
			gridWrapper.appendChild(createTable(results[i].columns, results[i].values));
		}
        state.resultCount = results[0].values.length
        submitBtn.ariaDisabled = false
		toc('Results to HTML');
	}
	worker.postMessage({ action: 'exec', sql: sql });
    loadingStart();
}
function loadingStart() {
    state.resultCount = -1;
    submitBtn.ariaDisabled = true;
    gridWrapper.innerHTML = '';
}

let createTable = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		const open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
		const div = document.createElement('div');
        div.classList.add('overflow-auto');
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
            columns: result[0].columns,
            data: result[0].values,
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
    lineCount = result[0].values.length

    grid.updateConfig({
        columns: result[0].columns,
        data: result[0].values,
        // height: `${Math.min(900, lineCount * 190)}px`,
    }).render(gridWrapper);
}

document.addEventListener(events.execUserSql, execEditorContents);
document.addEventListener(events.dbLoaded, execEditorContents);
submitBtn.addEventListener('click', execEditorContents, true);



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

///////// result count

function getResultCountHtml() {
    let {resultCount} = state;
    return resultCount > 0 ? resultCount + ' résultats' : 'Requête en cours...'
}
component(document.getElementById('resultCount'), getResultCountHtml);

////////