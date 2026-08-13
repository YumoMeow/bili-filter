/**
 * Bili Filter 首页入口
 *
 * 负责：
 * - 加载视频队列
 * - 触发抓取
 * - 渲染队列
 * - 管理 B 站 Cookie
 */


import {
    videoService
} from "./services/video-service.js";


import {
    renderVideoQueue
} from "./ui/video-view.js";


import {
    showToast
} from "./ui/toast.js";


/* ==================================================
   DOM
   ================================================== */

const queueContainer =
    document.getElementById(
        "video-list"
    );


const refreshButton =
    document.getElementById(
        "refresh-button"
    );


const cookieForm =
    document.getElementById(
        "cookie-form"
    );


const cookieInput =
    document.getElementById(
        "cookie-input"
    );


const cookieStatus =
    document.getElementById(
        "cookie-status"
    );


/* ==================================================
   Queue
   ================================================== */


/**
 * 抓取并渲染视频队列。
 */
async function loadQueue() {

    if (!queueContainer) {
        return;
    }


    queueContainer.innerHTML =
        `<div class="empty-state empty-state--small">
            <p>正在加载视频……</p>
        </div>`;


    try {

        const result =
            await videoService.refresh();


        const videos =
            await videoService.getVideos();


        renderVideoQueue(
            queueContainer,
            videos
        );


        if (
            result.errors
            && result.errors.length > 0
        ) {

            showToast(
                `${result.errors.length} 个 UP 主的视频抓取失败。`
            );
        }

    } catch (error) {

        console.error(
            "加载视频队列失败：",
            error
        );


        renderVideoQueue(
            queueContainer,
            []
        );


        showToast(
            error.message
            || "加载视频队列失败。"
        );
    }
}


/* ==================================================
   Cookie
   ================================================== */


/**
 * 读取 Cookie 配置状态。
 */
async function loadCookieStatus() {

    if (!cookieStatus) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/config/cookie"
            );


        const result =
            await response.json();


        if (result.success) {

            cookieStatus.textContent =
                result.data.configured
                    ? "当前使用自定义 Cookie"
                    : "当前使用默认 Cookie";
        }

    } catch (error) {

        cookieStatus.textContent =
            "无法读取 Cookie 状态。";
    }
}


/**
 * 保存新的 Cookie。
 */
async function handleCookieSubmit(event) {

    event.preventDefault();


    if (!cookieInput) {
        return;
    }


    const value =
        cookieInput.value.trim();


    if (!value) {

        showToast(
            "请先粘贴 SESSDATA。"
        );

        return;
    }


    try {

        const response =
            await fetch(
                "/api/config/cookie",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        {
                            sessdata: value
                        }
                    )
                }
            );


        const result =
            await response.json();


        if (result.success) {

            showToast(
                "Cookie 已保存。"
            );


            cookieInput.value = "";

            await loadCookieStatus();

        } else {

            showToast(
                result.error
                || "保存 Cookie 失败。"
            );
        }

    } catch (error) {

        console.error(
            "保存 Cookie 失败：",
            error
        );


        showToast(
            "保存 Cookie 失败，请确认 server.py 正在运行。"
        );
    }
}


/* ==================================================
   Events
   ================================================== */


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        loadQueue
    );
}


if (cookieForm) {

    cookieForm.addEventListener(
        "submit",
        handleCookieSubmit
    );
}


/* ==================================================
   Init
   ================================================== */


async function init() {

    await loadCookieStatus();

    await loadQueue();
}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();
}