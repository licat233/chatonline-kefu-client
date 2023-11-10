<?php
$baseUrl = "http://licat-store.oss-cn-hongkong.aliyuncs.com/lib/";
// 定义路由规则
$routes = [
    '/' => 'defaultPageHandler',
    '/case' => 'casePageHandler',
    '/chat' => 'chatPageHandler'
];

// 获取当前 URL
$requestUri = $_SERVER['REQUEST_URI'];

routeRequest($requestUri, $routes);

// 匹配请求路径并调用相应处理程序的函数,
// 匹配逻辑，比如: 请求路径为 "/about/company/me"
// 匹配顺序：
// "/about/company/me"
// "/about/company/"
// "/about/company"
// "/about/"
// "/about"
// "/"
function routeRequest($requestUri, $routes)
{
    $path = $requestUri;
    while ($path !== '/' && $path !== '') {
        //原字符匹配
        if (array_key_exists($path, $routes)) {
            $handler = $routes[$path];
            // 调用处理程序
            call_user_func($handler);
            return; // 匹配成功，结束函数
        }

        // 判断最后一个字符是否是 "/"
        $path2 = removeLastSegment($path); //去除"/"后面的字符，再匹配一次
        if ($path !== $path2) { //不一样，那就匹配一次
            $path = $path2;
            if (array_key_exists($path, $routes)) {
                $handler = $routes[$path];
                // 调用处理程序
                call_user_func($handler);
                return; // 匹配成功，结束函数
            }
        }

        //匹配父级目录
        $path = rtrim($path, '/');
    }

    // 如果循环结束仍然没有匹配成功，则调用默认页面处理程序
    defaultPageHandler();
}

function defaultPageHandler()
{
    echo file_get_contents("./defaultPage.html");
}

function casePageHandler()
{
    echo file_get_contents("./casePage.html");
}

function chatPageHandler()
{
    global $baseUrl;
    echo '
    <script>
    window.LICAT_KEFU = {
        slogan: "光平哥哥真帥",
        projectUid: "8ad320d2e70d49bc9ef0459dd476c39d",
        autoMsgs: ["你好，請問有什麼可以幫你？", ["色斑問題", "皺紋問題", "痘痘問題", "肌膚暗黃", "肌膚敏感", "肌膚鬆弛"], "你多大年齡了？", "是本人還是家屬？", "這邊諮詢訊息是保密的，請放心交流", "在嗎？", "還在嗎？我在等你回復", "你好，能看到我的訊息嗎？"],
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

function removeLastSegment($str)
{
    $lastSlashPos = strrpos($str, '/');

    if ($lastSlashPos !== false) {
        // 去除最后一个 "/" 后面的部分
        $newStr = substr($str, 0, $lastSlashPos + 1);
        return $newStr;
    } else {
        // 如果字符串中没有 "/"，则保持原样
        return $str;
    }
}
