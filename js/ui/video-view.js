/**
 * 视频队列 UI
 *
 * 负责：
 * - 渲染视频卡片
 * - 显示过期倒计时（小时:分钟:秒）
 *
 * 不负责：
 * - 抓取逻辑
 * - 过期清理
 * - 存储
 */


let tickerId = null;


/**
 * 渲染视频队列。
 *
 * @param {HTMLElement} container
 * @param {Array} videos
 */
export function renderVideoQueue(
    container,
    videos
) {

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(videos)
        || videos.length === 0
    ) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-state empty-state--small";

        empty.innerHTML = `
            <div class="empty-state__icon">
                ◇
            </div>

            <p>
                当前没有可观看的视频。
            </p>
        `;

        container.appendChild(
            empty
        );


        stopTicker();

        return;
    }


    for (const video of videos) {

        container.appendChild(
            buildCard(video)
        );
    }


    startTicker(container);
}


/**
 * 构建一张视频卡片。
 *
 * @param {Object} video
 * @returns {HTMLElement}
 */
function buildCard(video) {

    const card =
        document.createElement("a");

    card.className =
        "video-card";

    card.href =
        video.url;

    card.target =
        "_blank";

    card.rel =
        "noopener noreferrer";


    const cover =
        document.createElement("img");

    cover.className =
        "video-card__cover";

    cover.src =
        video.cover
        || "assets/default-avatar.svg";

    cover.alt =
        video.title;

    cover.loading =
        "lazy";

    cover.referrerPolicy =
        "no-referrer";


    const body =
        document.createElement("div");

    body.className =
        "video-card__body";


    const title =
        document.createElement("div");

    title.className =
        "video-card__title";

    title.textContent =
        video.title;


    const meta =
        document.createElement("div");

    meta.className =
        "video-card__meta";

    meta.textContent =
        `${video.bvid} · ${video.author?.name || "未知 UP 主"} · ${formatPublishedAt(video.publishedAt)} · ${formatCount(video.play)} 播放`;


    body.appendChild(
        title
    );

    body.appendChild(
        meta
    );


    const countdown =
        document.createElement("div");

    countdown.className =
        "video-card__countdown";

    countdown.dataset.expireAt =
        String(
            new Date(video.expireAt).getTime()
        );


    const countdownLabel =
        document.createElement("div");

    countdownLabel.className =
        "video-card__countdown-label";

    countdownLabel.textContent =
        "过期倒计时";


    const countdownText =
        document.createElement("div");

    countdownText.className =
        "video-card__countdown-text";

    countdownText.textContent =
        "--:--:--";


    countdown.appendChild(
        countdownLabel
    );

    countdown.appendChild(
        countdownText
    );


    card.appendChild(
        cover
    );

    card.appendChild(
        body
    );

    card.appendChild(
        countdown
    );


    return card;
}


/* ==================================================
   倒计时
   ================================================== */


/**
 * 启动倒计时刷新。
 *
 * @param {HTMLElement} container
 */
function startTicker(container) {

    stopTicker();


    const tick = () => {

        const nodes =
            container.querySelectorAll(
                "[data-expire-at]"
            );


        for (const node of nodes) {

            const expireMs =
                Number(node.dataset.expireAt);


            const label =
                node.querySelector(
                    ".video-card__countdown-text"
                );


            if (!label) {
                continue;
            }


            const remaining =
                expireMs - Date.now();


            if (remaining <= 0) {

                label.textContent =
                    "已过期";

                node.classList.add(
                    "video-card--expired"
                );

            } else {

                label.textContent =
                    formatCountdown(remaining);
            }
        }
    };


    tick();

    tickerId = setInterval(
        tick,
        1000
    );
}


/**
 * 停止倒计时刷新。
 */
function stopTicker() {

    if (tickerId !== null) {

        clearInterval(
            tickerId
        );

        tickerId = null;
    }
}


/* ==================================================
   格式化
   ================================================== */


/**
 * 毫秒 → 小时:分钟:秒
 *
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {

    if (!Number.isFinite(ms) || ms <= 0) {
        return "00:00:00";
    }


    const total =
        Math.floor(ms / 1000);


    const hours =
        Math.floor(total / 3600);


    const minutes =
        Math.floor(
            (total % 3600) / 60
        );


    const seconds =
        total % 60;


    return [
        hours,
        minutes,
        seconds
    ]
        .map(
            value =>
                String(value).padStart(2, "0")
        )
        .join(":");
}


/**
 * 相对发布时间。
 *
 * @param {string|null} iso
 * @returns {string}
 */
function formatPublishedAt(iso) {

    if (!iso) {
        return "未知时间";
    }


    const time =
        new Date(iso).getTime();


    if (Number.isNaN(time)) {
        return "未知时间";
    }


    const diff =
        Date.now() - time;


    const minutes =
        Math.floor(diff / 60000);


    if (minutes < 1) {
        return "刚刚";
    }


    if (minutes < 60) {
        return `${minutes} 分钟前`;
    }


    const hours =
        Math.floor(minutes / 60);


    if (hours < 24) {
        return `${hours} 小时前`;
    }


    const days =
        Math.floor(hours / 24);


    return `${days} 天前`;
}


/**
 * 播放量格式化（万）。
 *
 * @param {number} count
 * @returns {string}
 */
function formatCount(count) {

    const value =
        Number(count);


    if (!Number.isFinite(value)) {
        return "0";
    }


    if (value >= 10000) {

        return (
            (value / 10000)
                .toFixed(1)
                .replace(/\.0$/, "")
            + "万"
        );
    }


    return value.toLocaleString("zh-CN");
}
