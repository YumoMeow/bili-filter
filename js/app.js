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
    budgetService
} from "./services/budget-service.js";


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


const budgetTime =
    document.getElementById(
        "budget-time"
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


    /*
     * 先渲染本地已有的视频，
     * 抓取过程中用户仍能浏览旧队列。
     */
    try {

        const existing =
            await videoService.getVideos();


        renderVideoQueue(
            queueContainer,
            existing,
            {
                onWatch:
                    handleWatch
            }
        );

    } catch (error) {

        console.error(
            "读取本地视频失败：",
            error
        );
    }


    /*
     * 抓取新视频，完成后直接更新列表。
     */
    try {

        const result =
            await videoService.refresh();


        const videos =
            await videoService.getVideos();


        renderVideoQueue(
            queueContainer,
            videos,
            {
                onWatch:
                    handleWatch
            }
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
            "刷新视频队列失败：",
            error
        );


        showToast(
            error.message
            || "刷新视频队列失败。"
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
   Budget
   ================================================== */


/**
 * 把剩余秒数格式化为 时:分:秒。
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatBudget(totalSeconds) {

    const seconds =
        Math.max(
            0,
            Math.floor(
                Number(totalSeconds) || 0
            )
        );


    const hours =
        Math.floor(seconds / 3600);


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        seconds % 60;


    if (hours > 0) {

        return (
            `${hours}:`
            + `${String(minutes).padStart(2, "0")}:`
            + `${String(secs).padStart(2, "0")}`
        );
    }


    return (
        `${minutes}:`
        + `${String(secs).padStart(2, "0")}`
    );
}


/**
 * 更新预算显示。
 */
async function renderBudget() {

    if (!budgetTime) {
        return;
    }


    try {

        const remaining =
            await budgetService
                .getRemainingSeconds();


        budgetTime.textContent =
            formatBudget(remaining);

    } catch (error) {

        console.error(
            "读取预算失败：",
            error
        );
    }
}


/**
 * 点击视频时扣除完整时长并更新显示。
 *
 * @param {Object} video
 */
async function handleWatch(video) {

    if (!budgetTime) {
        return;
    }


    try {

        const budget =
            await budgetService
                .deductVideo(video);


        budgetTime.textContent =
            formatBudget(
                budget.remainingSeconds
            );

    } catch (error) {

        console.error(
            "扣除预算失败：",
            error
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

    await renderBudget();

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