import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { IsDev, getQueryParamValue, isDesktopDevice, isDesktopUA } from './utils/utils';
import App, { AppConf } from "./App";
import { decryptString, encryptString } from './utils/crypto';
import { ConfigProvider } from 'antd';

declare global {
  interface Window {
    LICAT_KEFU: AppConf,
  }
}

const isDev = IsDev();

//后缀不要加/
const apiURL = window.location.protocol + "//api.im.mixbench.net/v1"

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
}

const startup = () => {
  if (!isDev && isDesktopDevice() !== isDesktopUA()) {
    return
  }

  //准备工作
  // 优先从父页面中读取
  let conf = getConfFromParent()
  if (!conf) {
    conf = getConfFromUrl()
  }
  if (!conf) {
    return
  }

  window.LICAT_KEFU = Object.assign(window.LICAT_KEFU || {}, conf);

  const rootId = "root" + Date.now()
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
