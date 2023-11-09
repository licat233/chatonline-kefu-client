# kefu-client

## 安装脚本

```html
<script>
  window.LICAT_KEFU = {
    slogan: "光平哥哥真帥",
    chatUrl: "",
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

## 解决移动端100%窗口填充问题

解决方案：使用插件

- postCss
- postcss-viewport-height-correction

安装：

```shell
npm install autoprefixer
npm install postcss-nested
npm install --save postcss-viewport-height-correction
```

配置：

+ step1. 创建postcss.config.js

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    require('postcss-viewport-height-correction'),
    require('autoprefixer'),
    require('postcss-nested')
  ]
}

module.exports = config
```

+ step2. 在index.tsx中运行

```typescript
var customViewportCorrectionVariable = 'vh';
function setViewportProperty(doc: HTMLElement) {
  var prevClientHeight: number;
  var customVar = '--' + (customViewportCorrectionVariable || 'vh');
  function handleResize() {
    var clientHeight = doc.clientHeight;
    if (clientHeight === prevClientHeight) return;
    requestAnimationFrame(function updateViewportHeight() {
      doc.style.setProperty(customVar, (clientHeight * 0.01) + 'px');
      prevClientHeight = clientHeight;
    });
  }
  handleResize();
  return handleResize;
}
window.addEventListener('resize', setViewportProperty(document.documentElement));
```

+ step3. 修改index.css为index.module.css（可忽略）

```typescript
import './index.module.css';
```

+ step4. 配置css

```css
:root {
  --full-height: calc(var(--vh, 1vh) * 100) !important;
}

html {
  height: 100vh;
  max-height: var(--full-height) !important;
  min-height: var(--full-height) !important;
  height: var(--full-height) !important;
}
```


## 笔记

+ iframe的srcdoc属性有兼容性问题，请勿使用
