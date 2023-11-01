(() => {
    function getCurrentDirectory(url) {
        var pathArray = url.split('/');
        var protocol = pathArray[0];
        var host = pathArray[2];
        var pathname = pathArray[3];

        var currentDirectoryUrl = protocol + '//' + host + '/' + pathname + '/';
        return currentDirectoryUrl;
    }

    function joinUrlParts(...parts) {
        return parts.map(part => part.replace(/\/$/, '')).join('/');
    }

    function installKefuScript({ css, js, baseUrl }) {
        if (css) {
            let lE = document.createElement("link");
            lE.rel = "stylesheet";
            lE.href = joinUrlParts(baseUrl, css);
            document.head.insertAdjacentElement("beforeend", lE);
        }
        if (js) {
            let sE = document.createElement("script");
            sE.src = joinUrlParts(baseUrl, js);
            document.head.insertAdjacentElement("beforeend", sE);
        }
    }

    let config = {
        baseUrl: "",
        css: "",
        js: ""
    }
    let currentScript = document.currentScript;
    let src = currentScript.src;
    let baseUrl = getCurrentDirectory(src);
    let cssFilename = currentScript.dataset["css"];
    let jsFilename = currentScript.dataset["js"];
    let dirName = currentScript.dataset["dir"];
    if (cssFilename && jsFilename) {
        config = {
            baseUrl: dirName || baseUrl,
            css: cssFilename,
            js: jsFilename,
        }
    }
    if (!window.LICAT_KEFU) {
        window.document.body.addEventListener("load", () => {
            installKefuScript(config)
        })
    } else {
        installKefuScript(config)
    }
})();