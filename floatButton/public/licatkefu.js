(() => {
    let getCurrentDirectory = (href) => {
        let currentPath = href;
        let directoryPath = currentPath.replace(/\/[^/]*$/, '');
        return directoryPath
    }

    let joinUrlParts = (...parts) => {
        parts = parts.filter(part => {
            part = ((part ?? "") + "").trim()
            part = part.replace(/^\.+/g, "")
            return part.length !== 0
        })
        let filterParts = []
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

    let installKefuScript = (config) => {
        let source = ((config.source ?? "") + "").trim()
        let css = ((config.css ?? "") + "").trim()
        if (css) {
            let lE = document.createElement("link");
            lE.rel = "stylesheet";
            if (!css.startsWith("http") || !css.startsWith("//")) {
                css = joinUrlParts(source, css);
            }
            lE.href = css;
            document.head.insertAdjacentElement("beforeend", lE);
        }
        let js = ((config.js ?? "") + "").trim();
        if (js) {
            let sE = document.createElement("script");
            if (!(js + "").startsWith("http") || !js.startsWith("//")) {
                js = joinUrlParts(source, js);
            }
            sE.src = js;
            document.head.insertAdjacentElement("beforeend", sE);
        }
    }

    let readJsonConfig = (jsonUrl, callback) => {
        fetch(jsonUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(function (jsonContent) {
                // 在这里处理jsonContent变量中的内容
                callback(jsonContent)
            })
            .catch(function (error) {
                console.log('There has been a problem with your fetch operation: ', error.message);
            });
    }

    let run = (config) => {
        if (!window.LICAT_KEFU) {
            window.document.body.addEventListener("load", () => {
                installKefuScript(config)
            })
        } else {
            installKefuScript(config)
        }
    }


    let currentScript = document.currentScript;
    let baseUrl = getCurrentDirectory(currentScript.src);
    let readJsonCallback = (jsonContent) => {
        let css = jsonContent.files["main.css"];
        let js = jsonContent.files["main.js"];
        let config = {
            source: source || baseUrl,
            css: css,
            js: js,
        }
        run(config)
    }

    let cssFilename = currentScript.dataset["css"];
    let jsFilename = currentScript.dataset["js"];
    let source = currentScript.dataset["source"];
    if (cssFilename && jsFilename) {
        let config = {
            source: source || baseUrl,
            css: cssFilename,
            js: jsFilename,
        }
        run(config)
        return
    } else {
        let jsonUrl = joinUrlParts(baseUrl, "asset-manifest.json");
        readJsonConfig(jsonUrl, readJsonCallback)
        return
    }
})();
