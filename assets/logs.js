let worker = new Worker("assets/worker.sql-wasm.js");
worker.onerror = error;

let result, grid, lineCount = null
const ActionsEl = document.querySelector(".actions")
const gridWrapper = document.getElementById("wrapper")
const inputEl = document.getElementById('input')
const submitBtn = document.getElementById('submit')
const errorEl = document.getElementById('error')
const resultCountEl = document.getElementById('resultCount')

function print(text) {
	outputElm.innerHTML = text.replace(/\n/g, '<br>');
}
function error(e) {
	console.log(e);
	errorEl.style.height = 'auto';
	errorEl.textContent = e.message;
    resultCountEl.innerText = "";
}
function noerror() {
	errorEl.style.height = '0';
}
function execute(commands) {
	tic();
	worker.onmessage = function (event) {
		var results = event.data.results;
		toc("Executing SQL");
		if (!results) {
			error({message: event.data.error});
			return;
		}

		tic();
		for (var i = 0; i < results.length; i++) {
			gridWrapper.appendChild(createTable(results[i].columns, results[i].values));
		}
        resultCountEl.innerText = results[0].values.length + ' résultats'
		toc("Results to HTML");
	}
	worker.postMessage({ action: 'exec', sql: commands });
    loadingStart();
}
function loadingStart() {
	resultCountEl.innerText = "Requête en cours...";
    gridWrapper.innerHTML = "";
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

function execEditorContents() {
	noerror()
	execute(editor.getValue() + ';');
}

// Add syntax highlihjting to the textarea
let editor = CodeMirror.fromTextArea(inputEl, {
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
		"Ctrl-Enter": execEditorContents,
		"Alt-Enter": "autocomplete",
		"Alt-Space": "autocomplete",
		"Ctrl-Space": "autocomplete",
		"Ctrl-/": "autocomplete",
	},
    hint: CodeMirror.hint.sql,
    hintOptions: {
        tables: {
            logs: [ "level","station_id","source","msg","detail","pdc_id","nom_amenageur","siren_amenageur REAL","contact_amenageur","nom_operateur","contact_operateur","telephone_operateur","nom_enseigne","id_station_itinerance","id_station_local","nom_station","implantation_station","adresse_station","code_insee_commune","coordonneesXY","nbre_pdc","id_pdc_itinerance","id_pdc_local","puissance_nominale REAL","prise_type_ef","prise_type_2","prise_type_combo_ccs","prise_type_chademo","prise_type_autre","gratuit","paiement_acte","paiement_cb","paiement_autre","tarification","condition_acces","reservation","horaires","accessibilite_pmr","restriction_gabarit","station_deux_roues","raccordement","num_pdl","date_mise_en_service","observations","date_maj","cable_t2_attache","last_modified","datagouv_dataset_id","datagouv_resource_id","datagouv_organization_or_owner","created_at","consolidated_longitude REAL","consolidated_latitude REAL","consolidated_code_postal REAL","consolidated_commune","consolidated_is_lon_lat_correct","consolidated_is_code_insee_verified"]
        },
        defaultTable: "logs"
    },
});

console.log(CodeMirror.hint)

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

function onActionsClick(ev, el) {
    if (!ev.target.dataset?.sql) return;
    editor.setValue(ev.target.dataset.sql);
    execEditorContents()
}

submitBtn.addEventListener("click", execEditorContents, true);
ActionsEl.addEventListener("click", onActionsClick, true);

// Performance measurement functions
var tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
function tic() { tictime = performance.now() }
function toc(msg) {
	var dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

(async function(){
    const data = await fetch("irve.db").then(res => res.arrayBuffer());
    worker.onmessage = function () {
        toc("Loading database from file");
        // execute("SELECT `name`, `sql`  FROM `sqlite_master`;")
    };
    tic();
    try {
        worker.postMessage({ action: 'open', buffer: data }, [data]);
    }
    catch (exception) {
        worker.postMessage({ action: 'open', buffer: data });
    }
})()