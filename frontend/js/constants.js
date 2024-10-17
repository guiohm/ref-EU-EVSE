import { signal } from "../lib/reef.es.js"

export const signalNameSpaces = {
    saveName: 'saveName',
    state: 'state',
    transient: 'transient',
}

export const state = signal({
    resultUseBasicRenderer: true,
    savedQueries: [],
}, signalNameSpaces.state)

export const transient = signal({
    loading: false,
    resultCount: 0
}, signalNameSpaces.transient)

export const saveName = signal('', signalNameSpaces.saveName)

export const storedKeys = ['resultUseBasicRenderer', 'savedQueries']

export const events = {
    execUserSql: 'execUserSql',
    dbLoaded: 'dbLoaded',
}
export const logsColumns = ["log_id", "level", "station_id", "source", "msg", "detail", "pdc_id"]

export const sourceColumns = ["nom_amenageur","siren_amenageur","contact_amenageur","nom_operateur","contact_operateur","telephone_operateur","nom_enseigne","id_station_itinerance","id_station_local","nom_station","implantation_station","adresse_station","code_insee_commune","coordonneesXY","nbre_pdc","id_pdc_itinerance","id_pdc_local","puissance_nominale","prise_type_ef","prise_type_2","prise_type_combo_ccs","prise_type_chademo","prise_type_autre","gratuit","paiement_acte","paiement_cb","paiement_autre","tarification","condition_acces","reservation","horaires","accessibilite_pmr","restriction_gabarit","station_deux_roues","raccordement","num_pdl","date_mise_en_service","observations","date_maj","cable_t2_attache","last_modified","datagouv_dataset_id","datagouv_resource_id","datagouv_organization_or_owner","created_at","consolidated_longitude","consolidated_latitude","consolidated_code_postal","consolidated_commune","consolidated_is_lon_lat_correct","consolidated_is_code_insee_verified"]

export const queryTypes = {
    preset: 'preset',
    save: 'save',
    template: 'template',
}

export const queries = [
    {
        title: 'Problèmes par organisation',
        type: queryTypes.preset,
        sql:
`SELECT l.datagouv_organization_or_owner, problemes, level, count(1) as occurrences, msg FROM logs l
  LEFT JOIN (
    SELECT datagouv_organization_or_owner, count(1) as problemes FROM logs GROUP BY datagouv_organization_or_owner
    ) AS b ON b.datagouv_organization_or_owner = l.datagouv_organization_or_owner
GROUP BY l.datagouv_organization_or_owner, level, msg ORDER BY problemes DESC, level;`,
    },{
        title: 'Liste des problèmes',
        type: queryTypes.preset,
        sql: 'SELECT level, msg, COUNT(1) as occurrences FROM logs GROUP BY level, msg',
    },{
        title: 'Filtrer par organisation',
        type: queryTypes.preset,
        sql: "SELECT * FROM logs WHERE source = 'izivia' LIMIT 500",
    },{
        title: 'Filtrer par problème',
        type: queryTypes.preset,
        sql:
`SELECT log_id, detail, id_station_itinerance, pdc_id, id_station_local, id_pdc_itinerance, id_pdc_local, date_maj, nom_amenageur, siren_amenageur, contact_amenageur, nom_operateur, contact_operateur, telephone_operateur, nom_enseigne, nom_station, implantation_station, adresse_station, code_insee_commune, coordonneesXY, nbre_pdc puissance_nominale, prise_type_ef, prise_type_2, prise_type_combo_ccs, prise_type_chademo, prise_type_autre, gratuit, paiement_acte, paiement_cb, paiement_autre, tarification, condition_acces, reservation, horaires, accessibilite_pmr, restriction_gabarit, station_deux_roues, raccordement, num_pdl, date_mise_en_service, observations, cable_t2_attache, last_modified, datagouv_dataset_id, datagouv_resource_id, created_at, consolidated_longitude, consolidated_latitude, consolidated_code_postal, consolidated_commune, consolidated_is_lon_lat_correct, consolidated_is_code_insee_verified
FROM logs WHERE msg LIKE 'le nombre de point de charge%' LIMIT 500`,
    },{
        title: 'Organisation / message',
        type: queryTypes.template,
        sql: "SELECT * FROM logs WHERE source = '_value_'  and msg = '_value_' LIMIT 500",
    },
]
