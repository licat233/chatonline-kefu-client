<?php

$baseUrl = "http://licat-store.oss-cn-hongkong.aliyuncs.com/lib/";

// 定义路由规则
$routes = [
    '/' => 'homePageHandler',
];

// 获取当前 URL
$requestUri = rtrim($_SERVER['REQUEST_URI'], '/'); // 移除末尾的斜杠

// 根据请求的路径调用相应的处理程序
if (array_key_exists($requestUri, $routes)) {
    $handler = $routes[$requestUri];
    // 调用处理程序
    call_user_func($handler);
} else {
    homePageHandler();
}

function homePageHandler()
{
    global $baseUrl;
    echo '
    <script>
    window.LICAT_KEFU = {
        slogan: "光平哥哥真帥",
        projectUid: "dcf3c51e871a446294f9c89bbe2295f6",
        conversionEvent2: () => { }
    };
    </script>
    ';
    echo getRemoteHtml($baseUrl . "chatonline/v2/index.html");
}

function getRemoteHtml($url)
{
    $html = file_get_contents($url);
    $baseHref = updateUrlProtocol($url, "");
    return str_replace("<base href=\"\">", "<base href=\"{$baseHref}\">", $html);
}

function currentHttpProtocol()
{
    $protocol = 'http';
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') {
        $protocol = 'https';
    }
    return $protocol;
}

function updateUrlProtocol($url, $protocol)
{
    // 更改协议
    if (strpos($url, 'http:') === 0) {
        $newUrl = $protocol . substr($url, 5);
    } elseif (strpos($url, 'https:') === 0) {
        $newUrl = $protocol . substr($url, 6);
    } else {
        // URL没有指定协议，默认使用http
        $newUrl = $protocol . $url;
    }
    return $newUrl;
}
