#!/usr/bin/env python
# coding: utf-8

import csv
import re
import argparse

from enum import IntFlag, auto
import modules.import_logger as log
from modules.report import Report

class Socket(IntFlag):
    EF = auto()
    T2 = auto()
    CHADEMO = auto()
    CCS = auto()

MAX_POWER_KW = {
    Socket.EF: 4,
    Socket.T2: 43,
    Socket.CHADEMO: 63
}

station_list = {}
station_attributes = [ 'nom_amenageur', 'siren_amenageur', 'contact_amenageur', 'nom_operateur', 'contact_operateur', 'telephone_operateur', 'nom_enseigne', 'id_station_itinerance', 'id_station_local', 'nom_station', 'implantation_station', 'code_insee_commune', 'nbre_pdc', 'station_deux_roues', 'raccordement', 'num_pdl', 'date_mise_en_service', 'observations', 'adresse_station' ]
pdc_attributes = [ 'id_pdc_itinerance', 'id_pdc_local', 'puissance_nominale', 'prise_type_ef', 'prise_type_2', 'prise_type_combo_ccs', 'prise_type_chademo', 'prise_type_autre', 'gratuit', 'paiement_acte', 'paiement_cb', 'paiement_autre', 'tarification', 'condition_acces', 'reservation', 'accessibilite_pmr', 'restriction_gabarit', 'observations', 'date_maj', 'cable_t2_attache', 'datagouv_organization_or_owner', 'horaires' ]
socket_attributes = { 'prise_type_ef': Socket.EF, 'prise_type_2': Socket.T2, 'prise_type_chademo': Socket.CHADEMO, 'prise_type_combo_ccs': Socket.CCS }

power_stats = []
wrong_ortho = {}

parser = argparse.ArgumentParser(description='This will group, validate and sanitize a previously "consolidated" export of IRVE data from data.gouv.fr')
parser.add_argument('-i', '--input', required=False, default='opendata_irve.csv', nargs='?',
                    help='CSV input filename. Default is opendata_irve.csv')
parser.add_argument('--html-report', required=False, default=False, action='store_true',
                    help='Generate a report at output/report.html')
args = parser.parse_args()

with open('fixes_networks.csv', 'r') as csv_file:
    csv_reader = csv.DictReader(csv_file, delimiter=',')
    for row in csv_reader:
        wrong_ortho[row["opendata_name"]] = row["better_name"]

def validate_coord(lat_or_lon_text):
    try:
        float(lat_or_lon_text)
    except ValueError:
        return False
    return True

def is_correct_id(station_id):
    if station_id is None:
        return False

    station_id_parts = station_id.split('*')
    station_id = "".join(station_id_parts)
    station_id_parts = station_id.split(' ')
    station_id = "".join(station_id_parts)

    if not station_id.startswith('FR'):
        return False
    if not station_id.startswith('P', 5):
        return False
    return True

def cleanPhoneNumber(phone):
    if re.match(r"^\+33\d{9}$", phone):
        return phone
    elif re.match(r"^\+33 \d( \d{2}){4}$", phone):
        return phone.replace(" ", "")
    elif re.match(r"^33\d{9}$", phone):
        return "+"+phone
    elif re.match(r"^\d{10}$", phone):
        return "+33" + phone[1:]
    elif re.match(r"^\d{9}$", phone):
        return "+33" + phone
    elif re.match(r"^(\d{2}[. -]){4}\d{2}$", phone):
        return "+33" + phone[1:].replace(".", "").replace(" ", "").replace("-", "")
    elif re.match(r"^\d( \d{3}){3}$", phone):
        return "+33" + phone[1:].replace(" ", "")
    else:
        return None

def compute_max_power_per_socket_type(station, raw_station_id):
    """
    Computes the aggregated max power per socket type accross all PDCs (PDLs) associated with the given station.
    Sockets are limited to the max power rating for their type. This is a safe guess needed when a given PDC
    has multiple sockets for a given nominal power rating:
        - E/F: max 4 kw
        - Type 2: max 43 kw
        - Chademo: max 63 kw (in France -> Version 1 only)
        - Combo CCS: currently unlimited
    """
    power_ef = power_t2 = power_chademo = power_ccs = 0
    for pdc in station['pdc_list']:
        socket_mask = sum([ flag for socket_attr, flag in socket_attributes.items() if stringBoolToInt(pdc[socket_attr])==1 ])
        socket_mask = Socket(socket_mask)
        power = float(pdc['puissance_nominale'])
        if power >= 1000:
            log.error(station_id=raw_station_id,
                pdc_id=pdc["id_pdc_itinerance"],
                source=station['attributes']['source_grouped'],
                msg="puissance nominale déclarée suspecte",
                detail="puissance: {}, prises: {}".format(pdc['puissance_nominale'], socket_mask.name))
            # Convert from W to kW (>2MW should not exist)
            # FIXME: Probably not usefull anymore. Data looks fine.
            if power_ccs >= 2000:
                power_ccs /= 1000

        err_socket = report_socket_power_out_of_specs(power, socket_mask)
        if err_socket is not None:
            log.warning(station_id=raw_station_id,
                pdc_id=pdc["id_pdc_itinerance"],
                source=station['attributes']['source_grouped'],
                msg="puissance nominale déclarée pour prise {} supérieure à la norme (valeur retenue: {})".format(err_socket.name, MAX_POWER_KW[err_socket]),
                detail="puissance: {}, prises: {}".format(pdc['puissance_nominale'], socket_mask.name))

        power_ef = max(power_ef, min(MAX_POWER_KW[Socket.EF], power if Socket.EF in socket_mask else 0))
        power_t2 = max(power_t2, min(MAX_POWER_KW[Socket.T2], power if Socket.T2 in socket_mask else 0))
        power_chademo = max(power_chademo, min(MAX_POWER_KW[Socket.CHADEMO], power if Socket.CHADEMO in socket_mask else 0))
        power_ccs = max(power_ccs, power if Socket.CCS in socket_mask else 0)

    return (power_ef, power_t2, power_chademo, power_ccs)

def report_socket_power_out_of_specs(power, socket_mask):
    """
    This check can only be done on the most powerfull socket of the PDC:
    EF < T2 < CHADEMO < CCS
    Allow rounding errors (max +1 kw). No limits known for CCS.
    """
    err_socket = None
    if Socket.CHADEMO in socket_mask and Socket.CCS in ~socket_mask:
        if power > MAX_POWER_KW[Socket.CHADEMO] + 1:
            err_socket = Socket.CHADEMO
    elif Socket.T2 in socket_mask and Socket.CCS | Socket.CHADEMO in ~socket_mask:
        if power > MAX_POWER_KW[Socket.T2] + 1:
            err_socket = Socket.T2
    elif Socket.EF in socket_mask and Socket.CCS | Socket.CHADEMO | Socket.T2 in ~socket_mask:
        if power > MAX_POWER_KW[Socket.EF] + 1:
            err_socket = Socket.EF
    return err_socket

def stringBoolToInt(strbool):
    return 1 if strbool.lower() == 'true' else 0

def transformRef(refIti, refLoc):
    rgx = r"FR\*[A-Za-z0-9]{3}\*P[A-Za-z0-9]+\*[A-Za-z0-9]+"
    areRefNoSepEqual = refIti.replace("*", "") == refLoc.replace("*", "")

    if re.match(rgx, refIti):
        return refIti
    elif areRefNoSepEqual and re.match(rgx, refLoc):
        return refLoc
    elif re.match("FR[A-Za-z0-9]{3}P[A-Za-z0-9]+", refIti):
        return "FR*"+refIti[2:5]+"*P"+refIti[6:]
    else:
        return None

with open(args.input) as csvfile:
    reader = csv.DictReader(csvfile, delimiter=',')
    for row in reader:
        if not row['id_station_itinerance']:
            log.blocking(station_id=None,
                source=row['datagouv_organization_or_owner'],
                msg="pas d'identifiant ref:EU:EVSE (id_station_itinerance). Ce point de charge est ignoré et sa station ne sera pas présente dans l'analyse Osmose",
                detail=None)
            continue
        if row['id_station_itinerance']=="Non concerné":
            # Station non concernée par l'identifiant ref:EU:EVSE (id_station_itinerance). Ce point de charge est ignoré et sa station ne sera pas présente dans l'analyse Osmose
            continue

        station_id = row['id_station_itinerance'] # usefull to join logs with source data
        cleanRef = transformRef(station_id, row['id_station_local'])

        # Overkill given that this data should have passed through this code:
        # https://github.com/datagouv/datagouvfr_data_pipelines/blob/75db0b1db3fd79407a1526b0950133114fefaa0f/schema/utils/geo.py#L33
        if not validate_coord(row["consolidated_longitude"]) or not validate_coord(row["consolidated_latitude"]):
            log.blocking(station_id= station_id,
                source=row['datagouv_organization_or_owner'],
                msg="coordonnées non valides. Ce point de charge est ignoré et sa station ne sera pas présente dans l'analyse Osmose",
                detail="consolidated_longitude: {}, consolidated_latitude: {}".format(row['consolidated_longitude'], row["consolidated_latitude"]))
            continue

        if not is_correct_id(cleanRef):
            log.blocking(station_id=station_id,
                source=row['datagouv_organization_or_owner'],
                msg="le format de l'identifiant ref:EU:EVSE (id_station_itinerance) n'est pas valide. Ce point de charge est ignoré et sa station ne sera pas présente dans l'analyse Osmose",
                detail="iti: %s, local: %s" % (row['id_station_itinerance'], row['id_station_local']))
            continue

        if not station_id in station_list:
            station_prop = {}
            for key in station_attributes :
                station_prop[key] = row[key]
                if row[key] == "null":
                    station_prop[key] = ""
                elif row[key] in wrong_ortho.keys():
                    station_prop[key] = wrong_ortho[row[key]]

            station_prop['Xlongitude'] = float(row['consolidated_longitude'])
            station_prop['Ylatitude'] = float(row['consolidated_latitude'])
            phone = cleanPhoneNumber(row['telephone_operateur'])
            station_list[station_id] = {'attributes' : station_prop, 'pdc_list': []}
            station_list[station_id]['attributes']['id_station_itinerance'] = cleanRef

            # Non-blocking issues
            if phone is None and row['telephone_operateur']!= "":
                station_prop['telephone_operateur'] = None
                log.warning(station_id=station_id,
                   source=row['datagouv_organization_or_owner'],
                   msg="le numéro de téléphone de l'opérateur (telephone_operateur) est dans un format invalide",
                   detail=row['telephone_operateur'])
            elif phone is not None:
                station_prop['telephone_operateur'] = phone
            else:
                station_prop['telephone_operateur'] = None

            if row['station_deux_roues'].lower() not in ['true', 'false', '']:
                station_prop['station_deux_roues'] = None
                log.warning(station_id=station_id,
                   source=row['datagouv_organization_or_owner'],
                   msg="le champ station_deux_roues n'est pas valide",
                   detail=row['station_deux_roues'])
            else:
                station_prop['station_deux_roues'] = row['station_deux_roues'].lower()

        pdc_prop = {key: row[key] for key in pdc_attributes}
        station_list[station_id]['pdc_list'].append(pdc_prop)

for station_id, station in station_list.items() :
    sources = set([elem['datagouv_organization_or_owner'] for elem in station['pdc_list']])
    if len(sources) !=1 :
        log.error(station_id=station_id,
                  source="multiples",
                  msg="plusieurs sources pour un même id",
                  detail=sources)
    station['attributes']['source_grouped'] = list(sources)[0]

    horaires = set([elem['horaires'].strip() for elem in station['pdc_list']])
    if len(horaires) !=1 :
        station['attributes']['horaires_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs horaires pour une même station",
                    detail=horaires)
    else :
        station['attributes']['horaires_grouped'] = list(horaires)[0]

    gratuit = set([elem['gratuit'].strip().lower() for elem in station['pdc_list']])
    if len(gratuit) !=1 :
        station['attributes']['gratuit_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs infos de gratuité (gratuit) pour une même station",
                    detail=gratuit)
    else :
        station['attributes']['gratuit_grouped'] = list(gratuit)[0]

    paiement_acte = set([elem['paiement_acte'].strip().lower() for elem in station['pdc_list']])
    if len(paiement_acte) !=1 :
        station['attributes']['paiement_acte_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs infos de paiement (paiement_acte) pour une même station",
                    detail=paiement_acte)
    else :
        station['attributes']['paiement_acte_grouped'] = list(paiement_acte)[0]

    paiement_cb = set([elem['paiement_cb'].strip().lower() for elem in station['pdc_list']])
    if len(paiement_cb) !=1 :
        station['attributes']['paiement_cb_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs infos de paiement (paiement_cb) pour une même station",
                    detail=paiement_cb)
    else :
        station['attributes']['paiement_cb_grouped'] = list(paiement_cb)[0]

    reservation = set([elem['reservation'].strip().lower() for elem in station['pdc_list']])
    if len(reservation) !=1 :
        station['attributes']['reservation_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs infos de réservation pour une même station",
                    detail=reservation)
    else :
        station['attributes']['reservation_grouped'] = list(reservation)[0]

    accessibilite_pmr = set([elem['accessibilite_pmr'].strip() for elem in station['pdc_list']])
    if len(accessibilite_pmr) !=1 :
        station['attributes']['accessibilite_pmr_grouped'] = None
        log.warning(station_id=station_id,
                    source=station['attributes']['source_grouped'],
                    msg="plusieurs infos d'accessibilité PMR (accessibilite_pmr) pour une même station",
                    detail=accessibilite_pmr)
    else :
        station['attributes']['accessibilite_pmr_grouped'] = list(accessibilite_pmr)[0]

    if len(station['pdc_list']) != int(station['attributes']['nbre_pdc']):
        log.error(station_id=station_id,
                  source=station['attributes']['source_grouped'],
                  msg="le nombre de point de charge de la station n'est pas cohérent avec la liste des points de charge fournie",
                  detail="{} points de charge indiqués pour la station (nbre_pdc) mais {} points de charge listés".format(station['attributes']['nbre_pdc'], len(station['pdc_list'])))
        station['attributes']['nbre_pdc'] = min(len(station['pdc_list']), int(station['attributes']['nbre_pdc']))

    station['attributes']['nb_prises_grouped'] = len(station['pdc_list'])

    EF_count = sum([ stringBoolToInt(elem['prise_type_ef']) for elem in station['pdc_list'] ])
    station['attributes']['nb_EF_grouped'] = EF_count

    T2_count = sum([ stringBoolToInt(elem['prise_type_2']) for elem in station['pdc_list'] ])
    station['attributes']['nb_T2_grouped'] = T2_count

    combo_count = sum([ stringBoolToInt(elem['prise_type_combo_ccs']) for elem in station['pdc_list'] ])
    station['attributes']['nb_combo_ccs_grouped'] = combo_count

    chademo_count = sum([ stringBoolToInt(elem['prise_type_chademo']) for elem in station['pdc_list'] ])
    station['attributes']['nb_chademo_grouped'] = chademo_count

    autre_count = sum([ stringBoolToInt(elem['prise_type_autre']) for elem in station['pdc_list'] ])
    station['attributes']['nb_autre_grouped'] = autre_count

    if (EF_count + T2_count + combo_count + chademo_count + autre_count) == 0:
        log.error(station_id=station_id,
                  source=station['attributes']['source_grouped'],
                  msg="aucun type de prise précisé sur l'ensemble des points de charge",
                  detail="nb pdc: %s" % (len(station['pdc_list'])))

    power_grouped_values = compute_max_power_per_socket_type(station, station_id)
    power_stats.append(power_grouped_values)
    power_props = ['power_ef_grouped', 'power_t2_grouped', 'power_chademo_grouped', 'power_ccs_grouped']
    station['attributes'].update(zip(power_props, power_grouped_values))


logs = log._import_logged_data

r = Report(args.input, logs, station_list, power_stats)
r.generate_report()
r.render_stdout()
if args.html_report:
    r.render_html()

with open("output/opendata_errors.csv", 'w') as ofile:
    tt = csv.DictWriter(ofile, fieldnames=logs[0].keys())
    tt.writeheader()
    for elem in logs:
        tt.writerow(elem)

with open("output/opendata_stations.csv", 'w') as ofile:
    tt = csv.DictWriter(ofile, fieldnames=station_list[list(station_list)[0]]["attributes"].keys())
    tt.writeheader()
    for station_id, station in station_list.items():
        tt.writerow(station['attributes'])
