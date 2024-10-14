function change_theme() {
    let theme = document.getElementById("dark-light-mode").checked ? "light" : "dark";
    let html = document.getElementsByTagName("html")[0];
    let prism_dark = document.getElementById("prism-dark");
    let prism_light = document.getElementById("prism-light");
    let gridjs_dark = document.getElementById("gridjs-dark");
    let gridjs_light = document.getElementById("gridjs-light");
    html.setAttribute("data-theme", theme);
    if (theme == "light") {
        prism_light.removeAttribute("media")
        prism_dark.setAttribute("media", "max-width: 1px")
        gridjs_light.removeAttribute("media")
        gridjs_dark.setAttribute("media", "max-width: 1px")
    } else {
        prism_dark.removeAttribute("media")
        prism_light.setAttribute("media", "max-width: 1px")
        gridjs_dark.removeAttribute("media")
        gridjs_light.setAttribute("media", "max-width: 1px")
    }
}
