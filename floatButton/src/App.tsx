import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { ConfigProvider, Drawer, FloatButton, Tooltip, message } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import { addQueryParam, getQueryParamValue, getRandomItem, getReferer, getRootUrl, isDesktopUA, openUniquePage } from './utils/utils';
import chalk from 'chalk';
import { decryptString } from './utils/crypto';

const allow = () => {
  const allows = [
    "fullscreen",
    "paymentrequest",
    "usermedia",
    "autoplay",
    "scripts",
    "popups",
    "pointerlock",
    "vr",
    "camera",
    "encrypted-media",
    "geolocation",
    "gyroscope",
    "microphone",
    "midi",
    "payment",
    "picture-in-picture",
    "speaker",
  ];
  const supports = allows.filter(key => {
    return key in navigator
  })

  return supports.join(" ")
}
const allowValue = allow();

export interface AppConf {
  slogan?: string,
  src: string,
  cv_urls?: string[],
  shape?: "square" | "circle",
  project_uid?: string, //项目uid
  newPage?: boolean, //是否打开新页面进行聊天
  btnColor?: string, //按钮颜色
  tipColor?: string,  //通知卡片颜色
}

interface AppProps {
  conf: AppConf
}

const event = getQueryParamValue("event")

const encryptSlogan = "MTkxLDIwNywxNjIsMTYxLDE4NSwyMjcsMTA5LDIxMiwxODcsMjA2LDExMywyMzcsMTkzLDE4NSwxNzMsMjM2LDE5MSwyMDcsMTY2LDE2MCwxODUsMjQzLDk3LDIxMiwxODcsMjA2LDEwMSwxNjgsMTkyLDE4NSwxNzcsMjM2LDE5MSwyMjMsMTYyLDE1OCwxODUsMTg5LDEwOSwyMTIsMTg3LDIwNiwxMTMsMjM3LDE5MSwyMjMsMTgxLDE4Mg==";
const crypthScret = "really and truly"
const decryptSlogan = decryptString(decryptString(encryptSlogan, crypthScret), crypthScret);

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

const authRes = authSlogan()


function App(props: AppProps) {
  const { src, cv_urls, shape, project_uid, newPage, btnColor, tipColor } = props.conf
  const msgCountCacheKey = "msg_count_" + project_uid;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [openChatWindow, setOpenChatWindow] = useState(false);
  const [loadChatWindow, setLoadChatWindow] = useState(true)
  const firstLoaded = useRef(false)
  const [placement, setPlacement] = useState<'left' | 'right' | 'top' | 'bottom' | undefined>("bottom")
  const [btnShape, setBtnShape] = useState<"square" | "circle" | undefined>(shape);
  const [chatWindowSize, setChatWindowSize] = useState<Record<string, string | number | undefined>>({ width: undefined, height: undefined })
  const cvUrl = useRef("")
  const [messageApi, contextHolder] = message.useMessage();
  const [msgTip, setMsgTip] = useState({ open: false, title: "在線客服" });


  if (cv_urls && cv_urls.length !== 0) {
    cvUrl.current = getRandomItem(cv_urls) || ""
  }

  const getUnreadMsgCountCache = (): number => {
    const value = localStorage.getItem(msgCountCacheKey)
    if (value) {
      const num = parseInt(value);
      if (!isNaN(num)) {
        return num
      }
    }
    localStorage.removeItem(msgCountCacheKey)
    return 0
  }

  const [msgCount, setMsgCount] = useState(getUnreadMsgCountCache());

  const handleResize = () => {
    const width = window.innerWidth;
    if (width <= 768) {
      setChatWindowSize({ width: "100%", height: "72%" });
      setBtnShape("circle")
      setPlacement("bottom")
    } else {
      setChatWindowSize({ width: "375px", height: "72%" });
      setBtnShape("square")
      setPlacement("right")
    }
  }

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const switchChatWindow = (open?: boolean) => {
    if (open) {
      setOpenChatWindow(true);
      return
    }
    setOpenChatWindow(!openChatWindow)
  };

  const afterOpenChange = () => {
    if (!openChatWindow) return
    localStorage.removeItem(msgCountCacheKey)
    if (iframeRef.current) {
      if (iframeRef.current.contentWindow?.OpenChatWindow) iframeRef.current.contentWindow?.OpenChatWindow()
    }
  }

  const loadContent = (content: string): boolean => {
    if (content && iframeRef.current) {
      const parser = new DOMParser();
      const webDoc = parser.parseFromString(content, 'text/html');
      const htmlElement = webDoc.documentElement;
      const headE = htmlElement.querySelector("head")
      if (!headE) {
        return false
      }
      if (!headE.querySelector("base")) {
        const baseE = document.createElement("base");
        const baseHref = getRootUrl(src)
        baseE.href = baseHref
        headE.insertAdjacentElement("afterbegin", baseE);
      }
      const headlerContent = headE.outerHTML
      const bodyE = htmlElement.querySelector("body");
      if (!bodyE) {
        return false;
      }
      const bodyContent = bodyE.outerHTML
      const allContent = headlerContent + bodyContent
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(allContent);
        doc.close();
        return true
      }
    }
    return false
  }

  const fetchContent = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const data = await response.text();
      return data;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  const openCvUrl = (cvUrl: string | undefined) => {
    if (!cvUrl) {
      console.log(chalk.yellow("未配置cv_urls"))
      return
    }
    if (cvUrl.startsWith("line://", 0)) {
      window.location.href = cvUrl
    } else {
      var newWin = window.open(cvUrl, "_blank");
      if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
        messageApi.error("無法打開，請聯絡客服！", 1);
      }
    }
  }

  const newPageChat = () => {
    const chatUrl = addQueryParam(src, { "referer": getReferer(), "cv_url": cvUrl.current, "project_uid": project_uid ?? "" })
    const newWin = openUniquePage(chatUrl)
    if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
      // 无法打开，那就继续使用当前窗口进行聊天
      switchChatWindow()
    }
    return
  }

  const clearUnreadMsg = () => {
    setMsgCount(0)
    setMsgTip({ open: false, title: "在線客服" });
    localStorage.removeItem(msgCountCacheKey);
  }

  const conversionEvent = () => {
    try {
      window.conversionEvent1 && window.conversionEvent1()
      console.log("run window.conversionEvent1")
    } catch (err) {
      console.error("run conversionEvent1 error:", err)
    }
  }

  const onClickButton = () => {
    //AD的conversion事件
    conversionEvent()
    //一旦点击，就清除所有未读消息标志
    clearUnreadMsg()
    if (newPage) {
      newPageChat()
      return
    }
    if (loadChatWindow) {
      const width = window.innerWidth;
      if (width <= 320) {
        //太小的屏幕，我们直接打开一个新窗口进行聊天
        newPageChat()
        return
      }
      switchChatWindow()
    } else {
      openCvUrl(cvUrl.current)
    }
  }

  const notifyMessage = (content: string | undefined) => {
    if (!content) return;
    //判断当前窗口是否是打开状态，如果是打开状态，则不用通知
    if (openChatWindow) return;
    //加入未读消息列表
    const unreadMsgCount = msgCount + 1
    setMsgCount(unreadMsgCount)
    setMsgTip({ open: true, title: content });
    localStorage.setItem(msgCountCacheKey, unreadMsgCount + "")
  }

  const receiveMessage = (event: MessageEvent) => {
    const { data } = event
    if (typeof data === 'object' && data.source === 'chatIframe') {
      notifyMessage(data.message)
    }
  };

  useEffect(() => {
    if (!firstLoaded.current) {
      firstLoaded.current = true
      if (!authRes) {
        setLoadChatWindow(true);
        return
      }
      fetchContent(src)
        .then((content: string) => {
          loadContent(content);
          //加载draw
          setLoadChatWindow(true);
          if (event === "openChat") {
            switchChatWindow(true)
          }

          //如果是pc端，5秒钟后自动弹出聊天窗口
          if (isDesktopUA() && window.innerWidth > 768) {
            setTimeout(() => {
              switchChatWindow()
            }, 5000)
          }
          //开始监听消息
          window.addEventListener('message', receiveMessage, false);
        })
        .catch((err: any) => {
          //不加载draw
          setLoadChatWindow(false)
          console.error(err);
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerStyles: DrawerStyles = {
    content: {
      padding: '0',
      margin: '0',
      background: "transparent",
      borderRadius: "10px",
      // maxWidth: "400px",
    },
    body: {
      padding: '0',
      margin: '0',
      // maxWidth: "400px",
    },
  };

  const renderDrawerConten = () => {
    if (authRes) {
      return <iframe
        ref={iframeRef}
        className='chatIframe'
        width="100%"
        height="100%"
        allowFullScreen={true}
        allow={allowValue}
        title='chatonline'
        id={"chatIframe-" + project_uid}
      />
    }
    return <div style={{ backgroundColor: "#fff", textAlign: "center", height: "100%", }}>
      <h1>請說：{decryptSlogan}</h1>
      <p>需要設置這個全局變量才能啟動： <br />  <br /> <code style={{ color: "#fff", backgroundColor: " #000", padding: "5px", margin: "10px 0", }}> window.LICAT_KEFU.slogan = "{decryptSlogan}"</code> </p>
    </div>
  }

  const renderChatWindow = () => {
    if (!loadChatWindow) return <></>
    return (
      <Drawer
        className='chatDrawer'
        placement={placement}
        closable={false}
        open={openChatWindow}
        key="chatonline20231029"
        forceRender={true}
        width={chatWindowSize["width"]}
        height={chatWindowSize["height"]}
        afterOpenChange={afterOpenChange}
        onClose={() => { setOpenChatWindow(false) }}
      // mask={!isDesktopUA()}
      >
        {renderDrawerConten()}
      </Drawer>
    )
  }

  return (
    <section>
      <ConfigProvider theme={{ token: { colorPrimary: btnColor } }}>
        {contextHolder}

        <FloatButton
          icon={<Tooltip placement="topLeft" color={tipColor} open={msgTip.open} fresh={true} trigger="contextMenu" title={msgTip.title}><CustomerServiceOutlined /></Tooltip>}
          type="primary"
          shape={btnShape}
          style={{ right: 14 }}
          badge={{ count: msgCount, overflowCount: 999 }}
          description={btnShape === "square" ? "客服" : ""}
          onClick={onClickButton}
          target="__blank"
          className='floatKefuButton'
        />

        <ConfigProvider drawer={{ styles: drawerStyles }}>
          {renderChatWindow()}
        </ConfigProvider>
      </ConfigProvider >
    </section>
  );
}

export default App;