

export const chatHtml = (scriptCode?: string): string => {
    return `
    ${scriptCode || ""}
    <head>
    <meta charset="utf-8"/>
    <link rel="icon" href="//licat-store.oss-cn-hongkong.aliyuncs.com/web/cfd76c984b524770aca53e278059ca04.png"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="theme-color" content="#000000"/>
    <meta name="description" content="Web site created using create-react-app"/>
    <link rel="apple-touch-icon" href="//licat-store.oss-cn-hongkong.aliyuncs.com/web/cfd76c984b524770aca53e278059ca04.png"/>
    <link rel="manifest" href="//licat-store.oss-cn-hongkong.aliyuncs.com/web/fcfe7302b7504e369725ff8f1dbe5625.json"/>
    <title>客服在線</title>
    <script>window.LICAT_KEFU = window.opener.LICAT_KEFU || window.parent.LICAT_KEFU || window.LICAT_KEFU || { slogan: "光平哥哥真帥", cv_urls: [], project_uid: "" }</script>
    <script defer="defer" src="//licat-store.oss-cn-hongkong.aliyuncs.com/web/28d73adc45b94efa9b822a4b1d92d2cb.js"></script>
    <link href="//licat-store.oss-cn-hongkong.aliyuncs.com/web/8aa0fae2659f4bb787d760bcbed56796.css" rel="stylesheet"/>
    </head>
    `
}
