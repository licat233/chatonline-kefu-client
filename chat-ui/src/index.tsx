import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { IsDev, getQueryParamValue, isDesktopDevice, isDesktopUA, isIframe, isMockDevice } from './utils/utils';
import { decryptString, encryptString } from './utils/crypto';
import { AppConf } from './global';
import App from './App';
import chalk from 'chalk';
import "./libs/chatui-icons.js";

const isDev = IsDev();

//后缀不要加/
const apiURL = window.parent.location.protocol + "//api.im.mixbench.net/v1"

const confErrorAlert = () => {
  console.log(chalk.yellow("window.LICAT_KEFU has no configuration value"))
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

//从url中读取配置
const getConfFromUrl = (): AppConf | undefined => {
  const paramsStr = getQueryParamValue("licat")
  if (paramsStr) {
    try {
      const deStr = decryptString(paramsStr, encryptString("licat", "licat"))
      const conf = JSON.parse(deStr) as AppConf
      return conf
    } catch (err) {
      if (isDev) {
        console.error(err)
      }
      return
    }
  }
}

//从父页面读取配置
const getConfFromParent = (): AppConf | undefined => {
  const fn = window.parent.LICAT_KEFU?.getChatAppConf
  if (typeof fn === 'function') {
    let conf = fn()
    return conf
  }
  return undefined
}

//从本地读取配置
const getConfFromLocal = (): AppConf | undefined => {
  //前提是不能是子页面
  if (isIframe()) return undefined
  if (!window.LICAT_KEFU) {
    confErrorAlert()
    return
  }
  if (Object.prototype.toString.call(window.LICAT_KEFU) !== "[object Object]") return
  const defaultConf: AppConf = {
    referer: window.location.href,
    projectUid: "",
  }
  //如果是本地配置，必须配置口号
  //slogan检查
  if (!checkSlogan(window.LICAT_KEFU?.slogan)) {
    return
  }
  const conf: AppConf = Object.assign(defaultConf, window.LICAT_KEFU)
  window.LICAT_KEFU = conf
  return conf
}

const startup = () => {
  //主要用于防止某些人使用电脑进行伪装访问
  if (!isDev && isMockDevice()) {
    return
  }

  //准备工作
  // 优先从父页面中读取
  let conf = getConfFromParent()
  if (!conf) {
    //再从url中读取
    conf = getConfFromUrl()
    if (!conf) {
      //再从本地读取
      conf = getConfFromLocal()
      if (!conf) {
        return
      }
    }
  }

  //类型检查
  if (Object.prototype.toString.call(conf) !== "[object Object]") return
  if (!conf.projectUid) {
    alert("projectUid not configure value")
    return
  }

  window.LICAT_KEFU = Object.assign(window.LICAT_KEFU || {}, conf);

  const rootId = "root"
  let rootE = window.document.getElementById(rootId);
  if (!rootE) {
    rootE = document.createElement("div");
    rootE.id = rootId
    if (!window.document.body) {
      if (isDev) {
        console.error("window.document.body undefined")
      }
      return
    }
    window.document.body.insertAdjacentElement("afterbegin", rootE);
  }
  const root = ReactDOM.createRoot(rootE as HTMLElement);
  root.render(
    <React.StrictMode>
      <App conf={conf} apiURL={apiURL} />
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
