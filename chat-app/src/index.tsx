import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { IsDev, getQueryParamValue, isDesktopDevice, isDesktopUA, isIframe } from './utils/utils';
import App  from "./App";
import { decryptString, encryptString } from './utils/crypto';
import { ConfigProvider } from 'antd';
import { AppConf } from './global';


const isDev = IsDev();

//后缀不要加/
const apiURL = window.parent.location.protocol + "//api.im.mixbench.net/v1"
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

const getConfFromLocal = (): AppConf | undefined => {
  //前提是不能是子页面
  if (isIframe()) return undefined
  if (!window.LICAT_KEFU) return
  if (Object.prototype.toString.call(window.LICAT_KEFU) !== "[object Object]") return
  const defaultConf: AppConf = {
    referer: window.location.href,
    projectUid: "",
  }
  const conf: AppConf = Object.assign(defaultConf, window.LICAT_KEFU)
  window.LICAT_KEFU = conf
  return conf
}

const startup = () => {
  if (!isDev && isDesktopDevice() !== isDesktopUA()) {
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
      <ConfigProvider
        theme={{
          token: {
            colorBgBase: "#333",
            colorText: "#fff",
          },
          components: {
            Popover: {
            },
            Button: {
            }
          },
        }}
      >
        <App conf={conf} apiURL={apiURL} />
      </ConfigProvider>
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
