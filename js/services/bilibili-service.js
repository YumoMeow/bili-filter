/**
 * BilibiliService
 *
 * 负责与项目后端进行 B 站数据通信。
 *
 * 注意：
 *
 * 浏览器不能直接请求 B 站 API，
 * 因此这里不再访问 api.bilibili.com。
 *
 * 浏览器
 *   ↓
 * /api/bilibili/...
 *   ↓
 * server.py
 *   ↓
 * B站 API
 */


/* ==================================================
   BilibiliService
   ================================================== */

class BilibiliService {

    constructor() {

        /*
         * 使用当前网站的后端。
         *
         * 不写 localhost:8000，
         * 这样以后部署到服务器时无需修改。
         */
        this.baseUrl =
            "/api/bilibili";
    }


    /**
     * 根据 UID 获取 UP 主公开信息。
     *
     * @param {string|number} mid
     * @returns {Promise<Object>}
     */
    async getUserInfo(mid) {

        const cleanMid =
            String(mid).trim();


        /*
         * UID 必须是纯数字。
         */
        if (!/^\d+$/.test(cleanMid)) {

            throw new Error(
                "UID 必须是纯数字。"
            );
        }


        /*
         * 请求自己的后端。
         *
         * 最终 URL：
         *
         * /api/bilibili/user/2
         */
        const url =
            `${this.baseUrl}/user/${encodeURIComponent(cleanMid)}`;


        let response;


        try {

            response =
                await fetch(
                    url,
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

        } catch (error) {

            console.error(
                "Bilibili backend request failed:",
                error
            );

            throw new Error(
                "无法连接本地服务器，请确认 server.py 正在运行。"
            );
        }


        /*
         * HTTP 状态检查。
         */
        if (!response.ok) {

            let errorMessage =
                `服务器请求失败（HTTP ${response.status}）。`;


            /*
             * 尝试读取后端返回的错误信息。
             */
            try {

                const errorResult =
                    await response.json();


                if (
                    errorResult
                    && errorResult.error
                ) {

                    errorMessage =
                        errorResult.error;
                }

            } catch (error) {

                /*
                 * 如果错误响应不是 JSON，
                 * 使用默认错误信息。
                 */
            }


            throw new Error(
                errorMessage
            );
        }


        /*
         * 解析后端 JSON。
         */
        let result;


        try {

            result =
                await response.json();

        } catch (error) {

            throw new Error(
                "服务器返回的数据格式异常。"
            );
        }


        /*
         * 检查后端业务状态。
         */
        if (
            !result
            || result.success !== true
        ) {

            throw new Error(
                result?.error
                || "获取 B 站用户信息失败。"
            );
        }


        /*
         * 返回用户信息。
         */
        const user =
            result.data;


        if (!user) {

            throw new Error(
                "服务器没有返回有效的用户信息。"
            );
        }


        return {

            mid:
                String(
                    user.mid
                    ?? cleanMid
                ),

            name:
                user.name
                || "未知用户",

            avatar:
                user.avatar
                || "",

            fans:
                Number(
                    user.fans
                    ?? 0
                )
        };
    }


    /**
     * 获取 UP 主在某时间点之后发布的视频。
     *
     * @param {string|number} mid
     * @param {Object} options
     * @param {number} options.after   unix 秒，0 表示不限
     * @param {number} options.pageSize
     * @returns {Promise<Array>}
     */
    async getUserVideos(mid, options = {}) {

        const cleanMid =
            String(mid).trim();


        if (!/^\d+$/.test(cleanMid)) {

            throw new Error(
                "UID 必须是纯数字。"
            );
        }


        const after =
            Number(options.after ?? 0);


        const pageSize =
            Number(options.pageSize ?? 50);


        const query =
            new URLSearchParams();


        if (after > 0) {

            query.set(
                "after",
                String(Math.floor(after))
            );
        }


        query.set(
            "ps",
            String(pageSize)
        );


        const url =
            `${this.baseUrl}/user/${encodeURIComponent(cleanMid)}/videos?${query.toString()}`;


        let response;


        try {

            response =
                await fetch(
                    url,
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

        } catch (error) {

            console.error(
                "Bilibili videos request failed:",
                error
            );

            throw new Error(
                "无法连接本地服务器，请确认 server.py 正在运行。"
            );
        }


        if (!response.ok) {

            let errorMessage =
                `服务器请求失败（HTTP ${response.status}）。`;


            try {

                const errorResult =
                    await response.json();


                if (
                    errorResult
                    && errorResult.error
                ) {

                    errorMessage =
                        errorResult.error;
                }

            } catch (error) {

                /*
                 * 忽略非 JSON 错误响应。
                 */
            }


            throw new Error(
                errorMessage
            );
        }


        let result;


        try {

            result =
                await response.json();

        } catch (error) {

            throw new Error(
                "服务器返回的数据格式异常。"
            );
        }


        if (
            !result
            || result.success !== true
        ) {

            throw new Error(
                result?.error
                || "获取视频列表失败。"
            );
        }


        const videos =
            result.data;


        if (!Array.isArray(videos)) {

            throw new Error(
                "服务器没有返回有效的视频列表。"
            );
        }


        return videos.map(video => {

            const bvid =
                String(video.bvid ?? "");


            return {

                bvid,

                title:
                    video.title
                    || "",

                cover:
                    video.cover
                    || "",

                author: {
                    name:
                        video.author?.name
                        || "",

                    mid:
                        String(
                            video.author?.mid
                            ?? cleanMid
                        )
                },

                publishedAt:
                    video.publishedAt
                    || null,

                play:
                    Number(
                        video.play
                        ?? 0
                    ),

                url:
                    video.url
                    || (
                        bvid
                            ? `https://www.bilibili.com/video/${bvid}`
                            : ""
                    )
            };
        });
    }
}


/* ==================================================
   Export
   ================================================== */

export const bilibiliService =
    new BilibiliService();