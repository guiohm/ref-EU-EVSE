from io import StringIO
import re
import sys

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