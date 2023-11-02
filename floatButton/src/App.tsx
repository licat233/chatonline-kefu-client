import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { ConfigProvider, Drawer, FloatButton, Tooltip, message } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import { IsDev, addQueryParam, getQueryParamValue, getRandomItem, getReferer, getRootUrl, getSupportList, isDesktopUA, openUniquePage } from './utils/utils';
// import chalk from 'chalk';
import { encryptData, encryptString } from './utils/crypto';

const isDev = IsDev()

export interface CurrentAppConf {
  slogan?: string, //口号
  projectUid?: string, //项目uid
  chatUrl?: string, //聊天页面所在url
  cvUrls?: string[], //转化链接
  useChat?: boolean, //是否使用聊天功能
  newPage?: boolean, //是否打开新页面进行聊天
  shape?: "square" | "circle",  //按钮形状
  btnColor?: string, //按钮颜色
  tipColor?: string,  //通知卡片颜色
  OpenChatWindow?: () => any, //用于父页面调用子iframe的窗口打开事件，由子页面定义
  conversionEvent1?: () => void, //用户初次转化事件，由父页面定义
  conversionEvent2?: () => void, //用户点击发送按钮时的事件，由父页面定义
  getChatAppConf?: () => ChatAppConf | undefined, //用于子页面获取配置，由父页面定义
  //example
  example?: CurrentAppConf,
}

export interface ChatAppConf {
  referer: string;
  projectUid: string,
}

interface AppProps {
  conf: CurrentAppConf
}

function App(appProps: AppProps) {
  const { projectUid, chatUrl, cvUrls, useChat, newPage, shape, btnColor, tipColor } = appProps.conf
  const msgCountCacheKey = "msg_count_" + projectUid;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [openChatWindow, setOpenChatWindow] = useState(false);
  const [placement, setPlacement] = useState<'left' | 'right' | 'top' | 'bottom' | undefined>("bottom")
  const [btnShape, setBtnShape] = useState<"square" | "circle">(shape || "circle");
  const [chatWindowSize, setChatWindowSize] = useState<Record<string, string | number | undefined>>({ width: undefined, height: undefined })
  const cvUrl = useRef("")
  const [messageApi, contextHolder] = message.useMessage();
  const [msgTip, setMsgTip] = useState({ open: false, title: "" });
  const firstLoaded = useRef(false)
  const loadSuccess = useRef(false)

  if (!useChat) {
    if (cvUrls && cvUrls.length !== 0) {
      cvUrl.current = getRandomItem(cvUrls) || ""
    }
  }

  const errors = (msg: string) => {
    messageApi.open({
      type: 'error',
      content: msg,
      duration: 5,
    });
  };

  const warning = (msg: string) => {
    messageApi.open({
      type: 'warning',
      content: msg,
    });
  };

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

  const getChatLink = (): string => {
    if (!projectUid) {
      errors("projectUid is empty")
      return ""
    }
    if (!chatUrl) {
      errors("chatUrl is empty")
      return ""
    }
    const params: ChatAppConf = {
      referer: getReferer(),
      projectUid: projectUid,
    }
    try {
      const encrypString = encryptData(params, encryptString("licat", "licat"))
      const chatLink = addQueryParam(chatUrl, { "licat": encrypString })
      return chatLink
    } catch (error) {
      if (isDev) {
        console.error(error)
      }
      return ""
    }
  }

  const chatPageLink = useRef(getChatLink())

  const handleResize = () => {
    const width = window.innerWidth;
    if (width <= 768) {
      setChatWindowSize({ width: "100%", height: "75%" });
      setBtnShape(btnShape)
      setPlacement("bottom")
    } else {
      setChatWindowSize({ width: "375px", height: "75%" });
      setBtnShape("square")
      setPlacement("right")
    }
  }

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
    const openFn = iframeRef.current?.contentWindow?.LICAT_KEFU?.OpenChatWindow
    openFn && openFn()
  }

  const openLink = (link: string) => {
    if (!link) return
    if (link.startsWith("line://", 0)) {
      window.location.href = link
    } else {
      var newWin = window.open(link, "_blank");
      if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
        errors("Unable to open！");
      }
    }
  }

  const openCvUrl = (cvUrl: string | undefined) => {
    if (!cvUrl) {
      warning("cvURL is empty");
      return
    }
    openLink(cvUrl)
  }

  const openChatPage = () => {
    const newWin = openUniquePage(chatPageLink.current)
    if (newWin == null || typeof newWin == 'undefined' || newWin.closed || typeof newWin.closed == 'undefined') {
      // 无法打开，那就继续使用当前窗口进行聊天
      switchChatWindow()
    }
    return
  }

  const clearUnreadMsg = () => {
    setMsgCount(0)
    setMsgTip({ open: false, title: "" });
    localStorage.removeItem(msgCountCacheKey);
  }

  const conversionEvent = () => {
    try {
      const cvFn1 = window.LICAT_KEFU?.conversionEvent1
      cvFn1 && cvFn1()
      if (isDev) {
        console.log("run conversionEvent1")
      }

    } catch (err) {
      if (isDev) {
        console.error("run conversionEvent1 error:", err)
      }
    }
  }

  const onClickButton = () => {
    //AD的conversion事件
    conversionEvent()
    //一旦点击，就清除所有未读消息标志
    clearUnreadMsg()
    //如果不使用聊天功能
    if (!useChat) {
      //则打开cvURL链接
      openCvUrl(cvUrl.current)
      return
    }
    //如果使用聊天功能
    //先生成聊天页面Url

    //如果需要在新标签页打开
    if (newPage) {
      openChatPage()
      return
    }
    //如果加载失败，则在标签页打开
    if (!loadSuccess.current) {
      openChatPage()
      return
    }
    //打开drawer聊天面板
    const width = window.innerWidth;
    if (width <= 320) {
      //太小的屏幕，我们直接打开一个新窗口进行聊天
      openChatPage()
      return
    }
    switchChatWindow()
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

  const iframeInsertContent = (content: string): boolean => {
    if (content && iframeRef.current && chatUrl) {
      const parser = new DOMParser();
      const webDoc = parser.parseFromString(content, 'text/html');
      const htmlElement = webDoc.documentElement;
      const headE = htmlElement.querySelector("head")
      if (!headE) {
        return false
      }
      if (!headE.querySelector("base")) {
        const baseE = document.createElement("base");
        const baseHref = getRootUrl(chatUrl)
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

  const fetchChatPageContent = async (url: string): Promise<string> => {
    try {
      return fetch(url)
        .then(resp => { return resp.text() })
        .catch((e) => {
          if (isDev) {
            console.error(e)
          }
          return ""
        });
    } catch (err) {
      return ""
    }
  }

  useEffect(() => {
    if (!useChat || newPage) return
    if (!firstLoaded.current && chatUrl) {
      firstLoaded.current = true
      fetchChatPageContent(chatUrl)
        .then((content: string) => {
          if (!content) {
            throw new Error("request content fail:" + chatUrl)
          }
          iframeInsertContent(content);
          //加载draw
          loadSuccess.current = true
          //如果有未读消息，则显示
          if (msgCount > 0) {
            switchChatWindow(true)
          }

          //如果是pc端，5秒钟后自动弹出聊天窗口
          if (isDesktopUA() && window.innerWidth > 768) {
            setTimeout(() => {
              switchChatWindow(true)
            }, 5000)
          }
        })
        .catch((err: any) => {
          //不加载draw
          loadSuccess.current = false
          if (isDev) {
            console.error(err.message);
          }
          err.message && errors(err.message)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      //如果有未读消息，则显示
      if (msgCount > 0 || getQueryParamValue("openChat") !== null) {
        switchChatWindow(true)
      }
    }
  }

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize);
    if (!useChat) {
      return
    }
    if (newPage) {
      return
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    //开始监听消息
    window.addEventListener('message', receiveMessage, false);
    //如果是pc端，5秒钟后自动弹出聊天窗口
    if (isDesktopUA() && window.innerWidth > 768) {
      setTimeout(() => {
        switchChatWindow(true)
      }, 5000)
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', receiveMessage, false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerStyles: DrawerStyles = {
    content: {
      padding: '0',
      margin: '0',
      background: "transparent",
    },
    body: {
      padding: '0',
      margin: '0',
      background: "transparent",
      overflow: "hidden",
      borderTopLeftRadius: "10px",
      borderTopRightRadius: "10px",
      // maxWidth: "400px",
    },
  };

  const renderChatWindow = () => {
    if (!useChat || newPage) return <></>;
    const allowList = getSupportList();
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
        <iframe
          ref={iframeRef}
          className='chatIframe'
          width="100%"
          height="100%"
          allowFullScreen={true}
          allow={allowList}
          title='chatonline'
          id={"chatIframe-" + projectUid}
        // src={chatPageUrl.current}
        />
      </Drawer>
    )
  }

  return (
    <section>
      <ConfigProvider theme={{ token: { colorPrimary: btnColor } }} drawer={{ styles: drawerStyles }}>
        {contextHolder}
        <FloatButton
          icon={<Tooltip placement="topLeft" color={tipColor} open={msgTip.open} fresh={true} trigger="contextMenu" title={msgTip.title}><div className='floatKefuButtonIcon'><CustomerServiceOutlined /></div></Tooltip>}
          type="primary"
          shape={btnShape}
          // style={{ right: 14, bottom: 50 }}
          badge={{ count: msgCount, overflowCount: 999 }}
          // description={btnShape === "square" ? "客服" : ""} //不能用中文
          onClick={onClickButton}
          target="__blank"
          className='floatKefuButton'
        />
        {renderChatWindow()}
      </ConfigProvider >
    </section >
  );
}

export default App;