import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import chalk from 'chalk';
import { decryptString } from './utils/crypto';
import { IsDev, getReferer } from './utils/utils';
import { CurrentAppConf } from './global';
import { help } from './docs';

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

const isDev = IsDev()

const defaultConfig: CurrentAppConf = {
  slogan: "",
  projectUid: "",
  chatUrl: "//licat-store.oss-cn-hongkong.aliyuncs.com/lib/chatonline/v2/index.html",
  chatVersion: "v2",
  autoMsgs: [],
  cvUrls: [],
  useChat: true,
  newPage: false,
  shape: "circle", //默认为circle
  bindId: "",
  colorPrimary: '#1677ff', //主题色
  btnIcon: "", //按钮图标url
  tipColor: "blue",  //通知卡片颜色
  conversionEvent1: () => { }, //用户初次转化事件，由父页面定义
  conversionEvent2: () => { }, //用户点击发送按钮时的事件，由父页面定义
  getChatAppConf: () => {
    return {
      referer: getReferer(),
      projectUid: window.LICAT_KEFU?.projectUid || "",
      autoMsgs: window.LICAT_KEFU?.autoMsgs,
    }
  },
  help: help,
}

const confErrorAlert = () => {
  console.log(chalk.yellow("window.LICAT_KEFU has no configuration value, plase run window.LICAT_KEFU.help()"))
  console.log(chalk.blue("window.LICAT_KEFU value example: \n"), defaultConfig)
}

const checkSlogan = (slogan: string | undefined): boolean => {
  let decryptSlogan = ""
  if (slogan) {
    const encryptSlogan = "MTkxLDIwNywxNjIsMTYxLDE4NSwyMjcsMTA5LDIxMiwxODcsMjA2LDExMywyMzcsMTkzLDE4NSwxNzMsMjM2LDE5MSwyMDcsMTY2LDE2MCwxODUsMjQzLDk3LDIxMiwxODcsMjA2LDEwMSwxNjgsMTkyLDE4NSwxNzcsMjM2LDE5MSwyMjMsMTYyLDE1OCwxODUsMTg5LDEwOSwyMTIsMTg3LDIwNiwxMTMsMjM3LDE5MSwyMjMsMTgxLDE4Mg==";
    const crypthScret = "really and truly"
    decryptSlogan = decryptString(decryptString(encryptSlogan, crypthScret), crypthScret);
    if (slogan === decryptSlogan) return true
  }
  if (!window.document.body) return false
  window.document.body.style.backgroundColor = "#fff";
  window.document.body.style.textAlign = "center";
  window.document.body.innerHTML = `<h1>請說：${decryptSlogan}</h1><p>需要設置這個全局變量才能啟動： <br/> <br/> <code style="color: #fff; background-color: #000; padding:5px;margin: 10px 0;"> window.LICAT_KEFU.slogan = "${decryptSlogan}"</code> </p>`
  return false
}

const initConf = (): CurrentAppConf | undefined => {
  if (!window.LICAT_KEFU) {
    window.LICAT_KEFU = defaultConfig
    confErrorAlert()
    return
  }
  const conf = Object.assign(defaultConfig, window.LICAT_KEFU);
  window.LICAT_KEFU = conf
  const { slogan, projectUid, chatUrl, chatVersion, cvUrls, useChat, shape } = conf;
  //slogan检查
  if (!checkSlogan(slogan)) {
    return
  }
  //检查绑定的节点是否存在
  if (conf.bindId) {
    const bindE = document.getElementById(conf.bindId);
    if (!bindE) {
      console.log(chalk.yellow(`Unable to find bind element, get element by Id: ${conf.bindId}`))
      return
    }
  }

  if (shape !== "circle" && shape !== "square") {
    conf.shape = defaultConfig.shape
  }

  //两种情况：
  //①不使用聊天功能，而是常规的点击打开cv_url链接功能：无需配置projectUid和chatUrl，但必须配置cvUrls
  if (!useChat) {
    if (!cvUrls) {
      console.log(chalk.yellow(`LICAT_KEFU.cvUrls has no configuration value: "${cvUrls}"`))
      return
    }
  }
  //②使用聊天功能: 必须配置projectUid和chatUrl
  if (useChat) {
    //验证projectUid
    if (!projectUid) {
      console.log(chalk.yellow(`LICAT_KEFU.projectUid has no configuration value: "${projectUid}"`))
      return
    }
    //验证chatUrl
    if (!chatUrl) {
      // console.log(chalk.yellow(`LICAT_KEFU.chatUrl has no configuration value: "${chatUrl}"`))
      // return
      conf.chatUrl = `${window.location.protocol}//licat-store.oss-cn-hongkong.aliyuncs.com/lib/chatonline/${chatVersion || defaultConfig.chatVersion}/index.html`;
    }
  }
  conf.example = defaultConfig
  return conf
}

const startup = () => {
  //主要用于防止某些人使用电脑进行伪装访问
  // if (!isDev && isMockMoblieDevice()) {
  //   return
  // }

  //检查配置
  const config = initConf();
  if (!config) {
    return
  }

  window.LICAT_KEFU = config

  //检查通过
  //开始渲染
  const rootId = "root" + Date.now()
  let rootE = window.document.getElementById(rootId);
  if (!rootE) {
    rootE = document.createElement("div");
    rootE.id = rootId
    if (window.document.body) {
      window.document.body.insertAdjacentElement("afterbegin", rootE);
    }
  }
  const root = ReactDOM.createRoot(rootE);
  root.render(
    <React.StrictMode>
      <App conf={config} />
    </React.StrictMode>
  );
  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
}

try {
  startup()
} catch (error) {
  if (isDev) {
    console.error(error)
  }
}
