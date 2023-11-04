(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return
    }

    interface config {
        css: string,
        js: string,
        source: string,
    }

    const win = window as any

    let getCurrentDirectory = (currentPath: string) => {
        let directoryPath = currentPath.replace(/\/[^/]*$/, '');
        return directoryPath
    }

    let joinUrlParts = (...parts: string[]) => {
        parts = parts.filter(part => {
            part = ((part ?? "") + "").trim()
            part = part.replace(/^\.+/g, "")
            return part.length !== 0
        })
        let filterParts: string[] = [];
        parts.forEach((part, index) => {
            part = ((part ?? "") + "").trim().replace(/^\.+|\.+$/g, "")
            if (part.length === 0) return
            if (index === 0) {
                part = part.replace(/\/+$/g, "")
            } else if (index === part.length - 1) {
                part = part.replace(/^\/+/g, "")
            } else {
                part = part.replace(/^\/+|\/+$/g, "")
            }
            filterParts.push(part)
        })
        return filterParts.join("/");
    }

    let installKefuScript = (conf: config) => {
        let source = ((conf.source ?? "") + "").trim()
        let css = ((conf.css ?? "") + "").trim()
        if (css) {
            let lE = document.createElement("link");
            lE.rel = "stylesheet";
            if (!css.startsWith("http") || !css.startsWith("//")) {
                css = joinUrlParts(source, css);
            }
            lE.href = css;
            document.head.insertAdjacentElement("beforeend", lE);
        }
        let js = ((conf.js ?? "") + "").trim();
        if (js) {
            let sE = document.createElement("script");
            if (!(js + "").startsWith("http") || !js.startsWith("//")) {
                js = joinUrlParts(source, js);
            }
            sE.src = js;
            document.head.insertAdjacentElement("beforeend", sE);
        }
    }

    let readJsonConfig = (jsonUrl: string, callback: (arg0: any) => void) => {
        fetch(jsonUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(function (jsonContent) {
                callback(jsonContent)
            })
            .catch(function (error) {
                console.log('There has been a problem with your fetch operation: ', error.message);
            });
    }

    let run = (conf: config) => {
        if (!win.LICAT_KEFU) {
            window.document.body.addEventListener("load", () => {
                installKefuScript(conf)
            })
        } else {
            installKefuScript(conf)
        }
    }

    let currentScript = window.document.currentScript as HTMLScriptElement;
    if (!currentScript) {
        return
    }
    let baseUrl = getCurrentDirectory(currentScript.src);
    let cssFilename = currentScript.dataset["css"];
    let jsFilename = currentScript.dataset["js"];
    let source = currentScript.dataset["source"];

    if (cssFilename && jsFilename) {
        let conf: config = {
            source: source || baseUrl,
            css: cssFilename,
            js: jsFilename,
        }
        run(conf)
        return
    } else {
        let jsonUrl = joinUrlParts(baseUrl, "asset-manifest.json");
        let readJsonCallback = (jsonContent: any) => {
            let css = jsonContent.files["main.css"];
            let js = jsonContent.files["main.js"];
            let conf: config = {
                source: source || baseUrl,
                css: css,
                js: js,
            }
            run(conf)
        }
        readJsonConfig(jsonUrl, readJsonCallback)
        return
    }
})();
