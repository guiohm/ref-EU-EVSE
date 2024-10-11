from io import StringIO
import sys

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