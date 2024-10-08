_import_logged_data = []

def _log(**record):
    _import_logged_data.append(record)

def warning(station_id, source, msg, detail, pdc_id=None):
    _log(level="warning", **locals())

def error(station_id, source, msg, detail, pdc_id=None):
    _log(level="error", **locals())

def blocking(station_id, source, msg, detail, pdc_id=None):
    _log(level="blocking", **locals())