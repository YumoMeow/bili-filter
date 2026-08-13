import json
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import re


# ============================================================
# 配置
# ============================================================

HOST = "localhost"
PORT = 8000

BILIBILI_API = "https://api.bilibili.com"


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
        # 其他请求
        #
        # 交给 SimpleHTTPRequestHandler
        # ====================================================

        super().do_GET()


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