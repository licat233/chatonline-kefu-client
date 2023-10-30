import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App, { AppConf } from './App';
import reportWebVitals from './reportWebVitals';
import chalk from 'chalk';
import { updateUrlProtocol } from './utils/utils';

declare global {
  interface Window {
    LICAT_KEFU: AppConf,
    OpenChatWindow?: () => any,
    conversionEvent1?: () => void,
    conversionEvent2?: () => void,
  }
}

const rootId = "root" + Date.now()
let rootE = window.document.getElementById(rootId);
if (!rootE) {
  rootE = document.createElement("div");
  rootE.id = rootId
  if (window.document.body) {
    window.document.body.insertAdjacentElement("afterbegin", rootE);
  }
}

const exampleConfig: AppConf = {
  src: '',
  cv_urls: [],
  shape: "circle", //默认为circle
  project_uid: "",
  newPage: false,
  btnColor: '#00b96b', //按钮颜色
  tipColor: "cyan",  //通知卡片颜色
}
const confErrorAlert = () => {
  console.log(chalk.yellow("window.LICAT_KEFU has no configuration value"))
  console.log(chalk.blue("window.LICAT_KEFU value example: \n"), exampleConfig)
}

const startup = () => {
  const cf = window.LICAT_KEFU
  if (!cf) {
    confErrorAlert()
    return
  }
  cf.btnColor = cf.btnColor || exampleConfig.btnColor
  cf.tipColor = cf.tipColor || exampleConfig.tipColor
  //如果没有预留客服链接，也没有项目，不能加载
  if (!cf.project_uid) {
    if (!cf.cv_urls || (cf.cv_urls?.length === 0)) {
      console.log(chalk.yellow(`LICAT_KEFU.project_uid has no configuration value: "${cf.project_uid}"`))
      return
    }
  }

  if (!cf.src) {
    console.log(chalk.yellow(`LICAT_KEFU.src has no configuration value: "${cf.src}"`))
    if (!cf.cv_urls || (cf.cv_urls?.length === 0)) {
      console.log(chalk.yellow("LICAT_KEFU.cv_urls has no configuration value: "), cf.cv_urls)
      return
    }
  } else {
    cf.src = updateUrlProtocol(cf.src)
    //光有src链接也不行，还必须有project_uid才行
    if (!cf.project_uid) {
      console.log(chalk.yellow(`LICAT_KEFU.project_uid has no configuration value: "${cf.project_uid}"`))
      return
    }
  }
  cf.shape = cf.shape || "circle";
  const root = ReactDOM.createRoot(
    rootE as HTMLElement
  );
  root.render(
    <React.StrictMode>
      <App conf={cf} />
    </React.StrictMode>
  );

  // If you want to start measuring performance in your app, pass a function
  // to log results (for example: reportWebVitals(console.log))
  // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
  reportWebVitals();
}

if (rootE) {
  startup()
}
