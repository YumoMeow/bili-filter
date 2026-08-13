import json
import os
import re
import base64
import hashlib
import time
import datetime
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote


# ============================================================
# 配置
# ============================================================

HOST = "localhost"
PORT = 8000

BILIBILI_API = "https://api.bilibili.com"

USER_AGENT = (
    "Mozilla/5.0 "
    "(X11; Linux x86_64) "
    "AppleWebKit/537.36 "
    "(KHTML, like Gecko) "
    "Chrome/143.0 Safari/537.36"
)

CONFIG_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "data",
    "config.json"
)

DEFAULT_SESSDATA = (
    "97c4586b%2C1802153767%2C7317d%2A82CjClYRf4U4GvB1rY-tD-0A5lCrMbKzzXkOAIgGr3J2OwAEwxK5zu8aRhm5S0l028Z9MSVlc0UDctUFlDR1BySm1pa19zdGd6LWF3NDdhb3JlTk54M3o4RVNxMVA2ZmJwLUZIT3BPemM1WjgtQmpGOU9zMkpZcnF0eE8tV2NHaVJLcndVWDd0MEx3IIEC"
)


# ============================================================
# 工具函数
# ============================================================

def send_json(handler, data, status=200):
    """
    向浏览器返回 JSON。
    """

    body = json.dumps(
        data,
        ensure_ascii=False
    ).encode("utf-8")


    handler.send_response(status)


    handler.send_header(
        "Content-Type",
        "application/json; charset=utf-8"
    )


    handler.send_header(
        "Content-Length",
        str(len(body))
    )


    handler.send_header(
        "Cache-Control",
        "no-store"
    )


    handler.end_headers()


    handler.wfile.write(body)


# ============================================================
# Bilibili API
# ============================================================

def get_bilibili_user(mid):
    """
    根据 UID 获取 B 站 UP 主信息。

    返回项目内部统一的数据结构。
    """

    url = (
        BILIBILI_API
        + "/x/web-interface/card?mid="
        + str(mid)
    )


    request = urllib.request.Request(
        url,
        headers={
            "User-Agent":
                "Mozilla/5.0 "
                "(X11; Linux x86_64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/143.0 Safari/537.36",

            "Accept":
                "application/json"
        }
    )


    try:

        with urllib.request.urlopen(
            request,
            timeout=10
        ) as response:

            raw_data = response.read()


    except urllib.error.HTTPError as error:

        raise RuntimeError(
            f"B站接口请求失败（HTTP {error.code}）。"
        )


    except urllib.error.URLError as error:

        print(
            "Bilibili API request failed:",
            error
        )

        raise RuntimeError(
            "无法连接 B 站，请检查网络连接或稍后再试。"
        )


    except Exception as error:

        print(
            "Unexpected Bilibili API error:",
            error
        )

        raise RuntimeError(
            "请求 B 站时发生未知错误。"
        )


    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    try:

        result = json.loads(
            raw_data.decode("utf-8")
        )

    except Exception:

        raise RuntimeError(
            "B站返回的数据格式异常。"
        )


    # --------------------------------------------------------
    # API 状态
    # --------------------------------------------------------

    if (
        not result
        or result.get("code") != 0
    ):

        message = (
            result.get("message")
            if isinstance(result, dict)
            else None
        )


        raise RuntimeError(
            message
            or "没有找到这个 B 站用户。"
        )


    data = result.get("data")


    if (
        not data
        or not data.get("card")
    ):

        raise RuntimeError(
            "B站没有返回有效的用户信息。"
        )


    card = data["card"]


    # --------------------------------------------------------
    # 返回统一的数据结构
    # --------------------------------------------------------

    return {

        "mid":
            str(
                card.get(
                    "mid",
                    mid
                )
            ),

        "name":
            card.get(
                "name"
            )
            or "未知用户",

        "avatar":
            card.get(
                "face"
            )
            or "",

        "fans":
            int(
                card.get("fans")
                or data.get("follower")
                or 0
            )
    }


# ============================================================
# 本地配置（Cookie）
# ============================================================

def load_config():
    """
    读取本地配置文件。
    """

    try:

        with open(
            CONFIG_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)


        if isinstance(data, dict):
            return data

    except FileNotFoundError:
        pass

    except Exception as error:
        print("读取本地配置失败：", error)


    return {}


def save_config(config):
    """
    保存本地配置文件。
    """

    os.makedirs(
        os.path.dirname(CONFIG_FILE),
        exist_ok=True
    )


    with open(
        CONFIG_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            config,
            file,
            ensure_ascii=False,
            indent=4
        )


def get_sessdata():
    """
    优先使用用户自定义 Cookie，
    否则使用默认 Cookie。
    """

    sessdata = load_config().get("sessdata")


    return (
        str(sessdata).strip()
        if sessdata
        else DEFAULT_SESSDATA
    )


# ============================================================
# 通用 B 站请求
# ============================================================

def request_json(url, referer=None, cookie=None):
    """
    请求 B 站 JSON 接口。
    """

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json"
    }


    if referer:
        headers["Referer"] = referer


    if cookie:
        headers["Cookie"] = cookie


    request = urllib.request.Request(
        url,
        headers=headers
    )


    try:

        with urllib.request.urlopen(
            request,
            timeout=10
        ) as response:

            return json.loads(
                response.read().decode("utf-8")
            )


    except urllib.error.HTTPError as error:

        raise RuntimeError(
            f"B站接口请求失败（HTTP {error.code}）。"
        )


    except urllib.error.URLError as error:

        print(
            "Bilibili API request failed:",
            error
        )

        raise RuntimeError(
            "无法连接 B 站，请检查网络连接或稍后再试。"
        )


    except Exception as error:

        print(
            "Unexpected Bilibili API error:",
            error
        )

        raise RuntimeError(
            "请求 B 站时发生未知错误。"
        )


# ============================================================
# WBI 签名
# ============================================================

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]


def get_wbi_keys():
    """
    获取 WBI 签名密钥。
    """

    result = request_json(
        BILIBILI_API + "/x/web-interface/nav"
    )


    data = result.get("data") or {}

    wbi_img = data.get("wbi_img") or {}

    img_url = wbi_img.get("img_url") or ""

    sub_url = wbi_img.get("sub_url") or ""


    if not img_url or not sub_url:

        raise RuntimeError(
            "无法获取 WBI 签名密钥。"
        )


    img_key = img_url.rsplit("/", 1)[-1].split(".")[0]

    sub_key = sub_url.rsplit("/", 1)[-1].split(".")[0]


    return img_key, sub_key


def get_buvid():
    """
    获取 buvid3 / buvid4。
    """

    result = request_json(
        BILIBILI_API + "/x/frontend/finger/spi"
    )


    data = result.get("data") or {}


    return (
        str(data.get("b_3") or ""),
        str(data.get("b_4") or "")
    )


def get_mixin_key(img_key, sub_key):

    orig = img_key + sub_key


    return "".join(
        orig[i]
        for i in MIXIN_KEY_ENC_TAB
    )[:32]


def encode_wbi(params, img_key, sub_key):
    """
    计算 WBI 签名，返回带 w_rid 的 query。
    """

    mixin_key = get_mixin_key(
        img_key,
        sub_key
    )


    signed = dict(params)

    signed["wts"] = int(time.time())


    filtered = {
        key: re.sub(r"[!'()*]", "", str(value))
        for key, value in signed.items()
    }


    query = "&".join(
        f"{quote(str(key), safe='')}={quote(filtered[key], safe='')}"
        for key in sorted(filtered)
    )


    w_rid = hashlib.md5(
        (query + mixin_key).encode("utf-8")
    ).hexdigest()


    return query + "&w_rid=" + w_rid


# ============================================================
# Bilibili 视频列表 API
# ============================================================

def get_bilibili_user_videos(mid, after=0, page_size=50):
    """
    获取 UP 主在某个时间点之后发布的视频。

    返回统一的数据结构列表。
    """

    img_key, sub_key = get_wbi_keys()

    b3, b4 = get_buvid()

    sessdata = get_sessdata()


    dm_img_str = base64.b64encode(
        b"WebGL 1.0 (OpenGL ES 2.0 Chromium)"
    ).decode()


    dm_cover_img_str = base64.b64encode(
        b"ANGLE (Intel, Intel UHD Graphics (630), "
        b"(OpenGL 6, OpenGL ES 3.2, Chromium))"
        b"Full Screen (1920x1080), Windows 10 & chrome flags"
    ).decode()


    params = {
        "mid": str(mid),
        "ps": str(page_size),
        "pn": "1",
        "order": "pubdate",
        "platform": "web",
        "web_location": "1550101",
        "dm_img_list": "[]",
        "dm_img_str": dm_img_str,
        "dm_cover_img_str": dm_cover_img_str,
        "dm_img_inter": '{"ds":[],"wh":[0,0,0],"of":[0,0,0]}'
    }


    url = (
        BILIBILI_API
        + "/x/space/wbi/arc/search?"
        + encode_wbi(params, img_key, sub_key)
    )


    cookie = (
        f"buvid3={b3}; buvid4={b4}; SESSDATA={sessdata}"
        if sessdata
        else f"buvid3={b3}; buvid4={b4}"
    )


    result = request_json(
        url,
        referer=f"https://space.bilibili.com/{mid}",
        cookie=cookie
    )


    if (
        not result
        or result.get("code") != 0
    ):

        code = (
            result.get("code")
            if isinstance(result, dict)
            else None
        )


        if code == -352:

            raise RuntimeError(
                "B站风控校验失败，Cookie 可能已失效，请在首页更新 Cookie。"
            )


        if code == -412:

            raise RuntimeError(
                "B站拒绝了请求（412），请稍后再试或更新 Cookie。"
            )


        message = (
            result.get("message")
            if isinstance(result, dict)
            else None
        )


        raise RuntimeError(
            message or "获取视频列表失败。"
        )


    data = result.get("data") or {}

    vlist = (data.get("list") or {}).get("vlist") or []


    videos = []


    for item in vlist:

        created = int(item.get("created") or 0)


        if after and created <= after:
            continue


        bvid = str(item.get("bvid") or "")


        if not bvid:
            continue


        published_at = None


        if created:

            published_at = datetime.datetime.fromtimestamp(
                created,
                tz=datetime.timezone.utc
            ).isoformat()


        videos.append({
            "bvid": bvid,
            "title": item.get("title") or "",
            "cover": (item.get("pic") or "").replace("http://", "https://"),
            "author": {
                "name": item.get("author") or "",
                "mid": str(item.get("mid") or mid)
            },
            "publishedAt": published_at,
            "play": int(item.get("play") or 0),
            "url": "https://www.bilibili.com/video/" + bvid
        })


    return videos


# ============================================================
# HTTP Handler
# ============================================================

class Handler(
    SimpleHTTPRequestHandler
):


    # --------------------------------------------------------
    # GET
    # --------------------------------------------------------

    def do_GET(self):

        parsed = urlparse(self.path)


        path = parsed.path


        # ====================================================
        # Bilibili User API
        #
        # /api/bilibili/user/123
        # ====================================================

        match = re.fullmatch(
                r"/api/bilibili/user/(\d+)",
                path
            )


        if match:

            mid = match.group(1)


            try:

                user = get_bilibili_user(
                        mid
                    )


                send_json(
                    self,
                    {
                        "success": True,
                        "data": user
                    }
                )


            except Exception as error:

                print(
                    "Bilibili API error:",
                    error
                )


                send_json(
                    self,
                    {
                        "success": False,
                        "error":
                            str(error)
                    },
                    status=502
                )


            return


        # ====================================================
        # Bilibili User Videos API
        #
        # /api/bilibili/user/123/videos?after=...&ps=...
        # ====================================================

        match = re.fullmatch(
            r"/api/bilibili/user/(\d+)/videos",
            path
        )


        if match:

            mid = match.group(1)

            query = parse_qs(parsed.query)


            try:
                after = int(query.get("after", ["0"])[0])
            except (TypeError, ValueError):
                after = 0


            try:
                ps = int(query.get("ps", ["50"])[0])
            except (TypeError, ValueError):
                ps = 50


            try:

                videos = get_bilibili_user_videos(
                    mid,
                    after=after,
                    page_size=ps
                )


                send_json(
                    self,
                    {
                        "success": True,
                        "data": videos
                    }
                )


            except Exception as error:

                print(
                    "Bilibili videos API error:",
                    error
                )


                send_json(
                    self,
                    {
                        "success": False,
                        "error": str(error)
                    },
                    status=502
                )


            return


        # ====================================================
        # Cookie 配置
        #
        # GET /api/config/cookie
        # ====================================================

        if path == "/api/config/cookie":

            send_json(
                self,
                {
                    "success": True,
                    "data": {
                        "configured": bool(
                            load_config().get("sessdata")
                        )
                    }
                }
            )

            return


        # ====================================================
        # 其他请求
        #
        # 交给 SimpleHTTPRequestHandler
        # ====================================================

        super().do_GET()


    # --------------------------------------------------------
    # POST
    # --------------------------------------------------------

    def do_POST(self):

        parsed = urlparse(self.path)

        path = parsed.path


        # ====================================================
        # 更新 Cookie
        #
        # POST /api/config/cookie
        # ====================================================

        if path == "/api/config/cookie":

            try:

                length = int(
                    self.headers.get("Content-Length") or 0
                )


                raw = (
                    self.rfile.read(length)
                    if length > 0
                    else b""
                )


                data = json.loads(
                    raw.decode("utf-8") or "{}"
                )


                sessdata = str(
                    data.get("sessdata") or ""
                ).strip()


                if not sessdata:

                    send_json(
                        self,
                        {
                            "success": False,
                            "error": "Cookie 不能为空。"
                        },
                        status=400
                    )

                    return


                config = load_config()

                config["sessdata"] = sessdata

                save_config(config)


                send_json(
                    self,
                    {"success": True}
                )


            except Exception as error:

                print(
                    "Update cookie error:",
                    error
                )


                send_json(
                    self,
                    {
                        "success": False,
                        "error": str(error)
                    },
                    status=500
                )


            return


        send_json(
            self,
            {
                "success": False,
                "error": "Not Found"
            },
            status=404
        )


    # --------------------------------------------------------
    # 日志
    # --------------------------------------------------------

    def log_message(
        self,
        format,
        *args
    ):

        print(
            "[HTTP]",
            format % args
        )


# ============================================================
# Main
# ============================================================

def main():

    server = ThreadingHTTPServer(
            (
                HOST,
                PORT
            ),
            Handler
        )


    print(
        f"Bili Filter server running at "
        f"http://{HOST}:{PORT}"
    )


    print(
        "Press Ctrl+C to stop."
    )


    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print(
            "\nStopping server..."
        )

    finally:

        server.server_close()


if __name__ == "__main__":

    main()