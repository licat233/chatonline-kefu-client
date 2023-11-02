# kefu-client

## 安装脚本：

```html
<script>
  window.LICAT_KEFU = {
    slogan: "光平哥哥真帥",
    projectUid: "",
    newPage: false,
    conversionEvent1: () => { },
    conversionEvent2: () => { }
  };
  ((src) => {
    let sE = document.createElement("script");
    sE.src = src + "?timestamp=" + (new Date().getTime());
    document.head.insertAdjacentElement("beforeend", sE);
  })("https://licat-store.oss-cn-hongkong.aliyuncs.com/lib/kefu/licatkefu.js");
</script>
```
