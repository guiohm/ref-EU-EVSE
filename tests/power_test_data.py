stations = [{
    "station": {
        "attributes": {
            "source_grouped": "sc1"
        },
        "pdc_list": [
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 100,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "True",
                'prise_type_combo_ccs': "True",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 120,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "True",
                'prise_type_combo_ccs': "TRUE",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 80,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "true",
                'prise_type_combo_ccs': "false",
            },
        ]
    },
    "result": (0, 0, 0, 120.0), # EF, T2, Chademo, CCS
    "errors": [{
        'level': 'warning',
        'station_id': 'station_id',
        'source': 'sc1',
        'msg': 'puissance nominale déclarée pour prise CHADEMO supérieure à la norme (63)',
        'detail': 'puissance: 80, prises: EF|T2|CHADEMO',
        'pdc_id': 'id1',
        }]
},{
    "station": {
        "attributes": {
            "source_grouped": "sc1"
        },
        "pdc_list": [
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 22,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "not a bool",
                'prise_type_combo_ccs': "False",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 56,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "True",
                'prise_type_combo_ccs': "FALSE",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 4,
                'prise_type_ef': "True",
                'prise_type_2': "false",
                'prise_type_chademo': "false",
                'prise_type_combo_ccs': "false",
            },
        ]
    },
    "result": (4.0, 22.0, 56.0, 0), # EF, T2, Chademo, CCS
    "errors": []
},{
    "station": {
        "attributes": {
            "source_grouped": "sc1"
        },
        "pdc_list": [
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 3600,
                'prise_type_ef': "True",
                'prise_type_2': "false",
                'prise_type_chademo': "not a bool",
                'prise_type_combo_ccs': "False",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 80,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "True",
                'prise_type_combo_ccs': "FALSE",
            },
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 50,
                'prise_type_ef': "True",
                'prise_type_2': "false",
                'prise_type_chademo': "TRUE",
                'prise_type_combo_ccs': "false",
            },
        ]
    },
    "result": (3.6, 0, 50.0, 0), # EF, T2, Chademo, CCS
    "errors": [{
        'level': 'error',
        'station_id': 'station_id',
        'source': 'sc1',
        'msg': 'puissance nominale déclarée suspecte (possible erreur W/kW)',
        'detail': 'puissance: 3600, prises: EF',
        'pdc_id': 'id1',
    },{
        'level': 'warning',
        'station_id': 'station_id',
        'source': 'sc1',
        'msg': 'puissance nominale déclarée pour prise CHADEMO supérieure à la norme (63)',
        'detail': 'puissance: 80, prises: EF|T2|CHADEMO',
        'pdc_id': 'id1',
    }]
},{
    "station": {
        "attributes": {
            "source_grouped": "sc1"
        },
        "pdc_list": [
            {
                "id_pdc_itinerance": "id1",
                "puissance_nominale": 0,
                'prise_type_ef': "True",
                'prise_type_2': "True",
                'prise_type_chademo': "not a bool",
                'prise_type_combo_ccs': "False",
            },
        ]
    },
    "result": (0, 0, 0, 0),
    "errors": []
}
]