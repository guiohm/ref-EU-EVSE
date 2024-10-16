import { events } from "./constants.js";
import { tic, toc } from "./utils.js";

export function init(showError) {

    const worker = new Worker("assets/worker.sql-wasm.js");
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

    // Add syntax highlihjting to the textarea
    const editor = CodeMirror.fromTextArea(document.getElementById('input'), {
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
                logs: [ "level","station_id","source","msg","detail","pdc_id","nom_amenageur","siren_amenageur REAL","contact_amenageur","nom_operateur","contact_operateur","telephone_operateur","nom_enseigne","id_station_itinerance","id_station_local","nom_station","implantation_station","adresse_station","code_insee_commune","coordonneesXY","nbre_pdc","id_pdc_itinerance","id_pdc_local","puissance_nominale REAL","prise_type_ef","prise_type_2","prise_type_combo_ccs","prise_type_chademo","prise_type_autre","gratuit","paiement_acte","paiement_cb","paiement_autre","tarification","condition_acces","reservation","horaires","accessibilite_pmr","restriction_gabarit","station_deux_roues","raccordement","num_pdl","date_mise_en_service","observations","date_maj","cable_t2_attache","last_modified","datagouv_dataset_id","datagouv_resource_id","datagouv_organization_or_owner","created_at","consolidated_longitude REAL","consolidated_latitude REAL","consolidated_code_postal REAL","consolidated_commune","consolidated_is_lon_lat_correct","consolidated_is_code_insee_verified"]
            },
            defaultTable: "logs"
        },
    });



    return {worker, editor}
}