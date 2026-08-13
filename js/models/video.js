/**
 * 视频数据模型
 *
 * Phase 3
 *
 * 一条来自白名单 UP 主的视频。
 */

/**
 * 创建一条视频记录。
 *
 * @param {Object} data
 * @param {Object} options
 * @param {number} options.expireHours 抓取后多少小时过期
 * @returns {Object}
 */
export function createVideo(data, options = {}) {

    const now =
        Date.now();


    const expireHours =
        Number(options.expireHours ?? 72);


    const expireAt =
        new Date(
            now
            + expireHours
            * 60
            * 60
            * 1000
        ).toISOString();


    const bvid =
        String(data.bvid ?? "");


    return {
        bvid,

        title:
            String(data.title ?? ""),

        cover:
            String(data.cover ?? ""),

        duration:
            String(data.duration ?? ""),

        author: {
            name:
                String(data.author?.name ?? ""),

            mid:
                String(data.author?.mid ?? "")
        },

        publishedAt:
            data.publishedAt ?? null,

        play:
            Number(data.play ?? 0),

        url:
            data.url
            || (
                bvid
                    ? `https://www.bilibili.com/video/${bvid}`
                    : ""
            ),

        addedAt:
            data.addedAt
            ?? new Date(now).toISOString(),

        expireAt:
            data.expireAt
            ?? expireAt
    };
}


/**
 * 创建空的视频队列。
 *
 * @returns {Object}
 */
export function createEmptyVideoQueue() {

    return {
        version: 1,

        videos: []
    };
}


/**
 * 判断视频数据结构是否合法。
 *
 * @param {*} video
 * @returns {boolean}
 */
export function isValidVideo(video) {

    return (
        !!video
        && typeof video === "object"
        && typeof video.bvid === "string"
        && video.bvid.length > 0
    );
}


/**
 * 判断视频是否已过期。
 *
 * @param {Object} video
 * @returns {boolean}
 */
export function isExpiredVideo(video) {

    if (
        !video
        || !video.expireAt
    ) {
        return false;
    }


    const expireTime =
        new Date(video.expireAt).getTime();


    if (Number.isNaN(expireTime)) {
        return false;
    }


    return (
        Date.now()
        >= expireTime
    );
}
