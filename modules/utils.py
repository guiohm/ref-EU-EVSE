from io import StringIO
import re
import sqlite3
import sys

import pandas as pd

def create_sqlite(input_file):
    conn = sqlite3.connect('output/irve.db')
    df = pd.read_csv(input_file, low_memory=False)
    df.to_sql('irve', con=conn, if_exists='replace', index=False)

    df = pd.read_csv('output/opendata_errors.csv', low_memory=False)
    df = df.drop_duplicates()
    df.to_sql('log', con=conn, if_exists='replace', index=True)

    conn.execute("DROP VIEW IF EXISTS view_logs;")
    conn.execute("""
    CREATE VIEW view_logs as
    SELECT * FROM log l LEFT JOIN irve i ON l.station_id = i.id_station_itinerance UNION
    SELECT * FROM log l LEFT JOIN irve i ON l.station_id = i.id_station_itinerance AND l.pdc_id = i.id_pdc_itinerance WHERE l.pdc_id IS NOT null; """)
    conn.close()

def get_github_repo_url():
    with open(".git/config", "r") as file:
        config = file.read()
        match = re.search(r"[/:]([\w\-]+/ref-EU-EVSE)", config, flags=re.I|re.M)
        if match is not None:
            return "https://github.com/"+match.group(1)
    return ""


class Capturing(list):
    """Captures stdout into a list of lines.

    Usage:
        with Capturing() as output:
            print("I like spondulicks")
    """
    def __enter__(self):
        self._stdout = sys.stdout
        sys.stdout = self._stringio = StringIO()
        return self
    def __exit__(self, *args):
        self.extend(self._stringio.getvalue().splitlines())
        del self._stringio    # free up some memory
        sys.stdout = self._stdout