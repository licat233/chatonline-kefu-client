(function () {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return;
    }
    var win = window;
    var getCurrentDirectory = function (currentPath) {
        var directoryPath = currentPath.replace(/\/[^/]*$/, '');
        return directoryPath;
    };
    var joinUrlParts = function () {
        var parts = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            parts[_i] = arguments[_i];
        }
        parts = parts.filter(function (part) {
            part = ((part !== null && part !== void 0 ? part : "") + "").trim();
            part = part.replace(/^\.+/g, "");
            return part.length !== 0;
        });
        var filterParts = [];
        parts.forEach(function (part, index) {
            part = ((part !== null && part !== void 0 ? part : "") + "").trim().replace(/^\.+|\.+$/g, "");
            if (part.length === 0)
                return;
            if (index === 0) {
                part = part.replace(/\/+$/g, "");
            }
            else if (index === part.length - 1) {
                part = part.replace(/^\/+/g, "");
            }
            else {
                part = part.replace(/^\/+|\/+$/g, "");
            }
            filterParts.push(part);
        });
        return filterParts.join("/");
    };
    var installKefuScript = function (conf) {
        var _a, _b, _c;
        var source = (((_a = conf.source) !== null && _a !== void 0 ? _a : "") + "").trim();
        var css = (((_b = conf.css) !== null && _b !== void 0 ? _b : "") + "").trim();
        if (css) {
            var lE = document.createElement("link");
            lE.rel = "stylesheet";
            if (!css.startsWith("http") || !css.startsWith("//")) {
                css = joinUrlParts(source, css);
            }
            lE.href = css;
            document.head.insertAdjacentElement("beforeend", lE);
        }
        var js = (((_c = conf.js) !== null && _c !== void 0 ? _c : "") + "").trim();
        if (js) {
            var sE = document.createElement("script");
            if (!(js + "").startsWith("http") || !js.startsWith("//")) {
                js = joinUrlParts(source, js);
            }
            sE.src = js;
            document.head.insertAdjacentElement("beforeend", sE);
        }
    };
    var readJsonConfig = function (jsonUrl, callback) {
        fetch(jsonUrl)
            .then(function (response) {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
            .then(function (jsonContent) {
            callback(jsonContent);
        })
            .catch(function (error) {
            console.log('There has been a problem with your fetch operation: ', error.message);
        });
    };
    var run = function (conf) {
        if (!win.LICAT_KEFU) {
            window.document.body.addEventListener("load", function () {
                installKefuScript(conf);
            });
        }
        else {
            installKefuScript(conf);
        }
    };
    var currentScript = window.document.currentScript;
    if (!currentScript) {
        return;
    }
    var baseUrl = getCurrentDirectory(currentScript.src);
    var cssFilename = currentScript.dataset["css"];
    var jsFilename = currentScript.dataset["js"];
    var source = currentScript.dataset["source"];
    if (cssFilename && jsFilename) {
        var conf = {
            source: source || baseUrl,
            css: cssFilename,
            js: jsFilename,
        };
        run(conf);
        return;
    }
    else {
        var jsonUrl = joinUrlParts(baseUrl, "asset-manifest.json");
        var readJsonCallback = function (jsonContent) {
            var css = jsonContent.files["main.css"];
            var js = jsonContent.files["main.js"];
            var conf = {
                source: source || baseUrl,
                css: css,
                js: js,
            };
            run(conf);
        };
        readJsonConfig(jsonUrl, readJsonCallback);
        return;
    }
})();
