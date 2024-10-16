import { init } from './init.js'
import { events, queries } from './constants.js'
import { tic, toc } from './utils.js';

const {worker, editor} = init(execEditorContents, showError);

let result, grid, lineCount = null
const ActionsEl = document.querySelector('.actions')
const gridWrapper = document.getElementById('wrapper')
const submitBtn = document.getElementById('submit')
const errorEl = document.getElementById('error')
const resultCountEl = document.getElementById('resultCount')

function showError(e) {
	console.log(e);
	errorEl.style.height = 'auto';
	errorEl.textContent = e.message;
    resultCountEl.innerText = '';
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
        resultCountEl.innerText = results[0].values.length + ' résultats'
        submitBtn.ariaDisabled = false
		toc('Results to HTML');
	}
	worker.postMessage({ action: 'exec', sql: sql });
    loadingStart();
}
function loadingStart() {
    submitBtn.ariaDisabled = true
	resultCountEl.innerText = 'Requête en cours...';
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



function onActionsClick(ev) {
    if (!ev.target.dataset?.sql) return;
    editor.setValue(ev.target.dataset.sql);
    execEditorContents()
}

document.addEventListener(events.execUserSql, execEditorContents);
document.addEventListener(events.dbLoaded, execEditorContents);
submitBtn.addEventListener('click', execEditorContents, true);
ActionsEl.addEventListener('click', onActionsClick, true);


//////// html gen

function renderActions() {
    ActionsEl.innerHTML = queries.map((query, index) => {
        return `<div class="item" data-idx="${index}">${query.title}</div>`
    }).join('')
}
renderActions();

//////// Alpine.js stuff

// document.addEventListener('alpine:init', () => {
// Alpine.data('actions', () => ({
//     queries: queries,
//     current: '',

//     click(e) {
//         console.log(e)
//     }
// }))

// Alpine.store('actions', {
//     queries: queries,
//     current: '',

//     click(e, v) {
//         console.log(e, v, this)
//     }
// })
// });