import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { isDesktopDevice, isDesktopUA } from './utils/utils';
import App, { AppConf } from "./App";
import { decryptString } from './utils/crypto';
import { ConfigProvider } from 'antd';


declare global {
  interface Window {
      LICAT_KEFU: AppConf,
      OpenChatWindow?: () => any,
      conversionEvent1?: () => void,
      conversionEvent2?: () => void,
  }
}

const encryptSlogan = "MTkxLDIwNywxNjIsMTYxLDE4NSwyMjcsMTA5LDIxMiwxODcsMjA2LDExMywyMzcsMTkzLDE4NSwxNzMsMjM2LDE5MSwyMDcsMTY2LDE2MCwxODUsMjQzLDk3LDIxMiwxODcsMjA2LDEwMSwxNjgsMTkyLDE4NSwxNzcsMjM2LDE5MSwyMjMsMTYyLDE1OCwxODUsMTg5LDEwOSwyMTIsMTg3LDIwNiwxMTMsMjM3LDE5MSwyMjMsMTgxLDE4Mg==";
const crypthScret = "really and truly"
const decryptSlogan = decryptString(decryptString(encryptSlogan, crypthScret), crypthScret);
const rootId = "root" + Date.now()
let rootE = window.document.getElementById(rootId);
let status = true
if (!rootE) {
  rootE = document.createElement("div");
  rootE.id = rootId
  if (!window.document.body) {
    status = false
  } else {
    window.document.body.insertAdjacentElement("afterbegin", rootE);
  }

}

const authSlogan = (): boolean => {
  let slogan = ""
  //先检查父页面的slogan
  if (window !== window.parent) {
    const parentSlogan = window.parent?.LICAT_KEFU?.slogan;
    if (!parentSlogan) {
      //父页面必须设置
      return false
    }
    slogan = parentSlogan
  } else {
    slogan = window?.LICAT_KEFU?.slogan || ""
  }
  if (!slogan) {
    return false
  }
  if (slogan !== decryptSlogan) {
    return false
  }
  return true
}

const echoSloganAlert = () => {
  if (!window.document.body) return
  window.document.body.style.backgroundColor = "#fff";
  window.document.body.style.textAlign = "center";
  window.document.body.innerHTML = `<h1>請說：${decryptSlogan}</h1><p>需要設置這個全局變量才能啟動： <br/> <br/> <code style="color: #fff; background-color: #000; padding:5px;margin: 10px 0;"> window.LICAT_KEFU.slogan = "${decryptSlogan}"</code> </p>`
}

if (status) {
  if (!authSlogan()) {
    status = false;
    echoSloganAlert();
  }
}

const startup = () => {
  const root = ReactDOM.createRoot(rootE as HTMLElement);

  function Content() {
    if (process.env.NODE_ENV === 'production') {
      if (isDesktopDevice() !== isDesktopUA()) return <></>;
    }
    return <ConfigProvider
      theme={{
        token: {
          colorBgBase:  "#333",
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
      <App />
    </ConfigProvider>
  }

  root.render(
    <React.StrictMode>
      <Content />
    </React.StrictMode>
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
}

if (status) {
  startup()
}
