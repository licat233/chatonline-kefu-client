# kefu-client

## 按照脚本：

```html
  <script>
window.LICAT_KEFU = {
    slogan: "光平哥哥真帥",
    projectUid: "",
    newPage: false,
    conversionEvent1: () => { },
    conversionEvent2: () => { }
};
 (() => {
      let sE = document.createElement("script");
      sE.src = "https://www.24online.site/lib/licatkefu.js?timestamp=" + (new Date().getTime());
      sE.dataset["css"] = "static/css/main.5061cfda.css";
      sE.dataset["js"] = "static/js/main.5878806e.js";
      sE.dataset["dir"] = "https://www.24online.site/lib/";
      document.head.insertAdjacentElement("beforeend", sE);
    })();
  </script>
```
