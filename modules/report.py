from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
import itertools
from markdown import markdown

from . import utils

id_count = itertools.count()
def id_increment():
    return next(id_count)

@dataclass
class Chunk:
    out: str
    id: int = field(repr=False, init=False, default_factory=id_increment)
    title: str = ""
    html: bool = False
    markdown: bool = False
    collapsable: bool = True

class Report:
    template_data = {
        "format": "html",
        "toc": True,
        "title": "Rapport de run Jungle-Bus Group IRVE OpenData",
        "file_name": "output/index.html",
        "timestamp": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z"),
    }

    def __init__(self, input_file, logs, station_list, power_stats):
        self.are_packages_installed = False
        self.input_file = input_file
        self.logs = logs
        self.station_list = station_list
        self.power_stats = power_stats
        self.source_distinct_station_id_count = 0
        self.source_distinct_pdc_id_count = 0
        self.source_line_count = 0
        self.severity_by_source = None
        self.severity_stats = None

    def generate_report(self):
        try:
            self._build()
            self.are_packages_installed = True
        except ImportError:
            self.source_distinct_station_id_count = 'N/A'
            self.source_distinct_pdc_id_count = 'N/A'
            print("WARNING! Some stats are disabled!")
            print("==> Please install missing Python libs with: `python3 -m pip install -r requirements.txt` <==")

    def _build(self):
        import pandas as pd
        dfinput = pd.read_csv(self.input_file, memory_map=True, usecols=['id_station_itinerance', 'id_pdc_itinerance'])
        self.source_line_count = len(dfinput)
        self.source_distinct_station_id_count = len(set(dfinput["id_station_itinerance"]))
        self.source_distinct_pdc_id_count = len(set(dfinput["id_pdc_itinerance"]))

        dflogs = pd.DataFrame(self.logs)
        self.severity_stats = dflogs['level'].value_counts().rename_axis(['Severité'])

        gr = dflogs.groupby(["source","level"],
                            observed=True, group_keys=False, sort=False, as_index=False
            ).size().rename(copy=False, columns={"level":"Sévérité"})

        self.severity_by_source = pd.pivot_table(gr, values="size", index=["source"], columns=["Sévérité"],
               observed=False, aggfunc="sum", margins=True, margins_name="TOTAL", fill_value="-"
            ).reset_index().sort_values(['TOTAL'], ascending=False).set_index(['source']
            ).rename_axis(['Organisation'])

        gr2 = dflogs.groupby(["source","level","msg"],
                             observed=True, as_index=False
            ).size().rename(copy=False,
                columns={"source": "Organisation", "level":"Sévérité", "size": "Occurences", "msg": "Problème"})

        self.msg_by_source = gr2.groupby(["Organisation","Occurences","Sévérité","Problème"],
                observed=True, group_keys=True, sort=True, as_index=True).count() \

    def render_stdout(self):
        if self.source_line_count > 0:
            print(f"{self.source_line_count} lignes (PDCs) en entrée | {self.source_line_count - self.source_distinct_pdc_id_count} PDCs en double")

        print(f"{len(self.station_list)} stations reconnues sur {self.source_distinct_station_id_count} station_id distincts en entrée")
        print(f"{len(self.logs)} problèmes trouvés pour {self.source_distinct_pdc_id_count} PDCs distincts en entrée (il peut exister plusieurs problèmes par PDC/station):")
        for (level, msg), count in sorted(Counter([(elem['level'], elem['msg']) for elem in self.logs]).items()):
            print(f" > {'['+level+']':>10s} {count:>5d} x {msg}")

        if self.are_packages_installed:
            import pandas as pd
            pd.options.display.max_colwidth = 100
            print("\n"+self.severity_stats.to_string())

            print("\nTop 25 Organisations les plus problematiques:\n")
            print(self.severity_by_source.head(26))

    def render_html(self):
        if not self.are_packages_installed:
            return

        import pandas as pd
        from jinja2 import Environment, FileSystemLoader
        jinja = Environment(
            loader=FileSystemLoader("./templates")
        )
        jinja.filters["markdown"] = lambda content: markdown(content, extensions=["tables", ])

        chunks = []

        readme_url = utils.get_github_repo_url()
        chunks.append(Chunk(
            title="Présentation",
            markdown=True,
            collapsable=False,
            out=f"Ceci est la page de résultats générée automatiquement. Pour plus d'informations sur le process, voir [{readme_url}]({readme_url})"
        ))
        chunks.append(Chunk(
            title="Fichiers",
            markdown=True,
            collapsable=False,
            out="* [opendata_stations.csv](opendata_stations.csv) : Liste des stations\n"
                "* [opendata_networks.csv](opendata_networks.csv) : Liste des couples opérateurs / réseau (à des fins de corrections de typo, ajout de tag wikidata, etc)\n"
                "* [opendata_errors.csv](opendata_errors.csv) : Liste des erreurs rencontrées durant le traitement (avec détail au cas par cas)\n"
        ))
        with utils.Capturing() as output:
            self.render_stdout()
        chunks.append(Chunk(
            title="Récap",
            out="\n".join(output),
        ))
        chunks.append(Chunk(
            title="Sévérité par organisation",
            out=pd.DataFrame(self.severity_by_source).to_html(border=0),
            html=True,
        ))
        chunks.append(Chunk(
            title="Problèmes par organisation",
            out=pd.DataFrame(self.msg_by_source).to_html(border=0),
            html=True,
        ))

        if len(self.power_stats) > 0:
            with utils.Capturing() as output:
                print(" EF  |   T2  | Chademo |  CCS  |")
                for power_set, count in Counter(self.power_stats).most_common():
                    print("{:4.2f}   {:5.2f}    {:5.2f}   {:6.2f} | {} stations".format(*power_set, count))
            chunks.append(Chunk(
                title="Statistiques puissance par station",
                out="\n".join(output),
            ))

        template = jinja.get_template(f"template.{self.template_data.get('format')}")
        report = template.render({**self.template_data, "chunks": chunks, })
        with open(self.template_data.get("file_name"), "w") as out:
            out.write(report)

if __name__ == "__main__":
    """ This part is used for testing/development.
        Run it whith: `python -m modules.report`
    """
    import csv

    logs = []
    with open("output/opendata_errors.csv") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=',')
        logs = [row for row in reader]

    r = Report("opendata_irve.csv", logs, station_list=[], power_stats=[])
    r.generate_report()
    r.render_stdout()
    r.render_html()