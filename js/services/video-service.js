/**
 * 视频队列业务服务
 *
 * Phase 3
 *
 * 负责：
 * - 读取 / 保存视频队列
 * - 记录上次抓取时间
 * - 按白名单抓取新视频
 * - 去重
 * - 72 小时过期清理
 *
 * 预留后端化：
 * - 存储通过 StorageAdapter 抽象，将来可替换成 ApiStorageAdapter
 * - 抓取通过 BilibiliService，将来可替换成后端聚合接口
 */


import {
    createEmptyVideoQueue,
    createVideo,
    isExpiredVideo,
    isValidVideo
} from "../models/video.js";


import {
    storage
} from "./storage.js";


import {
    CONFIG
} from "../config.js";


import {
    whitelistService
} from "./whitelist-service.js";


import {
    bilibiliService
} from "./bilibili-service.js";


/**
 * 等待一段时间。
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {

    return new Promise(
        resolve => {
            setTimeout(resolve, ms);
        }
    );
}


/**
 * 生成 [min, max] 之间的随机毫秒数。
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomDelay(min, max) {

    return Math.floor(
        min + Math.random() * (max - min)
    );
}


export class VideoService {

    constructor(storageAdapter = storage) {

        this.storage =
            storageAdapter;

        this.queueKey =
            CONFIG.storage.videoQueueKey;

        this.lastFetchAtKey =
            CONFIG.storage.videoLastFetchAtKey;
    }


    /* ==================================================
       基础数据
       ================================================== */


    /**
     * 读取原始队列（不做过期处理）。
     *
     * @returns {Promise<Object>}
     */
    async loadQueue() {

        let queue =
            await this.storage.get(
                this.queueKey
            );


        if (
            !queue
            || !Array.isArray(queue.videos)
        ) {

            queue =
                createEmptyVideoQueue();
        }


        return queue;
    }


    /**
     * 保存队列。
     *
     * @param {Object} queue
     */
    async saveQueue(queue) {

        await this.storage.set(
            this.queueKey,
            {
                version: 1,
                videos: queue.videos
            }
        );
    }


    /**
     * 获取未过期的视频，按发布时间倒序。
     *
     * @returns {Promise<Array>}
     */
    async getVideos() {

        const queue =
            await this.loadQueue();


        const active =
            queue.videos.filter(
                video =>
                    isValidVideo(video)
                    && !isExpiredVideo(video)
            );


        if (
            active.length
            !== queue.videos.length
        ) {

            queue.videos = active;

            await this.saveQueue(queue);
        }


        return active.sort(
            (a, b) => {

                const ta =
                    new Date(
                        a.publishedAt
                        || a.addedAt
                    ).getTime()
                    || 0;


                const tb =
                    new Date(
                        b.publishedAt
                        || b.addedAt
                    ).getTime()
                    || 0;


                return tb - ta;
            }
        );
    }


    /* ==================================================
       上次抓取时间
       ================================================== */


    /**
     * 读取上次抓取时间（ISO 字符串）。
     *
     * @returns {Promise<string|null>}
     */
    async getLastFetchAt() {

        const value =
            await this.storage.get(
                this.lastFetchAtKey
            );


        return (
            typeof value === "string"
                ? value
                : null
        );
    }


    /**
     * 写入上次抓取时间。
     *
     * @param {string} iso
     */
    async setLastFetchAt(iso) {

        await this.storage.set(
            this.lastFetchAtKey,
            iso
        );
    }


    /* ==================================================
       抓取
       ================================================== */


    /**
     * 按白名单抓取新视频，合并入队并清理过期项。
     *
     * 没有抓取记录时，默认抓取 72 小时前到现在的视频。
     *
     * @returns {Promise<Object>}
     */
    async refresh() {

        const users =
            await whitelistService
                .getActiveUsers();


        const now =
            Date.now();


        const lastFetchAt =
            await this.getLastFetchAt();


        /*
         * 距离上次成功抓取不足 24 小时时，
         * 跳过本次抓取，直接使用现有队列。
         */
        if (lastFetchAt) {

            const lastFetchMs =
                new Date(lastFetchAt).getTime();


            const intervalMs =
                CONFIG.video.refetchIntervalHours
                * 60
                * 60
                * 1000;


            if (
                Number.isFinite(lastFetchMs)
                && (now - lastFetchMs) < intervalMs
            ) {

                console.log(
                    "距离上次抓取不足 24 小时，跳过本次抓取。"
                );


                return {
                    fetched: 0,
                    errors: [],
                    skipped: true
                };
            }
        }


        const fallbackAfterMs =
            now
            - CONFIG.video.expiryHours
            * 60
            * 60
            * 1000;


        const afterMs =
            lastFetchAt
                ? new Date(lastFetchAt).getTime()
                : fallbackAfterMs;


        const afterSeconds =
            Math.floor(
                afterMs / 1000
            );


        const fetched = [];

        const errors = [];


        let isFirst = true;


        for (const user of users) {

            /*
             * 多个 UP 之间加随机间隔，
             * 降低触发 B 站风控的概率。
             */
            if (!isFirst) {

                await sleep(
                    randomDelay(500, 1500)
                );
            }


            isFirst = false;


            try {

                const list =
                    await bilibiliService
                        .getUserVideos(
                            user.mid,
                            {
                                after:
                                    afterSeconds,

                                pageSize:
                                    CONFIG.video.pageSize
                            }
                        );


                for (const item of list) {

                    fetched.push(
                        createVideo(
                            item,
                            {
                                expireHours:
                                    CONFIG.video.expiryHours
                            }
                        )
                    );
                }

            } catch (error) {

                console.error(
                    `抓取 UP 主「${user.name}」的视频失败：`,
                    error
                );


                errors.push(
                    {
                        name: user.name,
                        message: error.message
                    }
                );
            }
        }


        /*
         * 合并：已存在的视频保留原 addedAt / expireAt。
         */
        const queue =
            await this.loadQueue();


        const byBvid =
            new Map();


        for (const video of queue.videos) {

            if (isValidVideo(video)) {

                byBvid.set(
                    video.bvid,
                    video
                );
            }
        }


        for (const video of fetched) {

            if (!byBvid.has(video.bvid)) {

                byBvid.set(
                    video.bvid,
                    video
                );
            }
        }


        queue.videos =
            [...byBvid.values()]
                .filter(
                    video =>
                        !isExpiredVideo(video)
                );


        await this.saveQueue(queue);


        /*
         * 只有全部抓取成功时才更新上次抓取时间。
         *
         * 如果有任何 UP 抓取失败，则不更新，
         * 下次重试时仍从原来的时间点开始，
         * 避免漏掉失败期间发布的视频。
         */
        if (errors.length === 0) {

            await this.setLastFetchAt(
                new Date().toISOString()
            );
        }


        return {
            fetched: fetched.length,
            errors
        };
    }


    /**
     * 重置视频队列与抓取时间，
     * 并立即按 72 小时窗口重新抓取。
     *
     * @returns {Promise<Object>}
     */
    async reset() {

        await this.storage.remove(
            this.queueKey
        );


        await this.storage.remove(
            this.lastFetchAtKey
        );


        return await this.refresh();
    }
}


/**
 * 默认 Service。
 */
export const videoService =
    new VideoService();
