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

def perspective_to_html(view, version="3.1.0", layout="{}"):
    import base64
    arrow = view.to_arrow()
    html = """
<!DOCTYPE html>
<html lang=\"en\">
<head>
<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no\"/>
<link rel=\"stylesheet\" crossorigin=\"anonymous\" href=\"https://cdn.jsdelivr.net/npm/@finos/perspective-viewer@{0}/dist/css/themes.css\"/>
<script type=\"module\">
import perspective from \"https://cdn.jsdelivr.net/npm/@finos/perspective@{0}/dist/cdn/perspective.js\";
import \"https://cdn.jsdelivr.net/npm/@finos/perspective-viewer@{0}/dist/cdn/perspective-viewer.js\";
import \"https://cdn.jsdelivr.net/npm/@finos/perspective-viewer-datagrid@{0}/dist/cdn/perspective-viewer-datagrid.js\";
import \"https://cdn.jsdelivr.net/npm/@finos/perspective-viewer-d3fc@{0}/dist/cdn/perspective-viewer-d3fc.js\";
import \"https://cdn.jsdelivr.net/npm/@finos/perspective-viewer-openlayers@{0}/dist/cdn/perspective-viewer-openlayers.js\";
const worker = await perspective.worker();
const binary_string = window.atob(window.data.textContent);
const len = binary_string.length;
const bytes = new Uint8Array(len);
for (let i = 0; i < len; i++) {{
bytes[i] = binary_string.charCodeAt(i);
}}
window.viewer.load(worker.table(bytes.buffer));
window.viewer.restore(JSON.parse(window.layout.textContent));
</script>
<style>perspective-viewer{{position:absolute;top:0;left:0;right:0;bottom:0}}</style>
</head>
<body>
<script id='data' type=\"application/octet-stream\">{1}</script>
<script id='layout' type=\"application/json\">{2}</script>
<perspective-viewer id='viewer'></perspective-viewer>
</body>
</html>
""".format(version, base64.b64encode(arrow), layout)
    return html


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