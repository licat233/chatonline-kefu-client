<?php

$baseUrl = "http://licat-store.oss-cn-hongkong.aliyuncs.com/lib/";

// 定义路由规则
$routes = [
    '/' => 'homePageHandler',
    '/demo1' => 'chatV1Handler',
    '/demo2' => 'chatV2Handler'
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
    echo getRemoteHtml($baseUrl . "kefu/home.html");
}

function chatV1Handler()
{
    global $baseUrl;
    echo getRemoteHtml($baseUrl . "kefu/demo1.html");
}

function chatV2Handler()
{
    global $baseUrl;
    echo getRemoteHtml($baseUrl . "kefu/demo2.html");
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
