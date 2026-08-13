/**
 * 观看预算服务
 *
 * 负责：
 * - 每日观看预算（默认 90 分钟）
 * - 每天 05:00 重置
 * - 点击视频时扣除视频完整时长
 *
 * 重置规则：
 * 一个周期是「当天 05:00 ~ 次日 04:59」。
 * 每次读取时计算当前周期起点，
 * 如果上次重置时间早于周期起点，则重置为默认预算。
 */


import {
    storage
} from "./storage.js";


import {
    CONFIG
} from "../config.js";


/**
 * 把视频时长字符串（"mm:ss" / "hh:mm:ss"）转成秒。
 *
 * @param {string} duration
 * @returns {number}
 */
function parseDurationToSeconds(duration) {

    if (
        typeof duration !== "string"
        || !duration
    ) {
        return 0;
    }


    const parts =
        duration.trim()
            .split(":")
            .map(Number);


    if (
        parts.some(
            value =>
                !Number.isFinite(value)
        )
    ) {
        return 0;
    }


    if (parts.length === 3) {

        return (
            parts[0] * 3600
            + parts[1] * 60
            + parts[2]
        );
    }


    if (parts.length === 2) {

        return (
            parts[0] * 60
            + parts[1]
        );
    }


    if (parts.length === 1) {
        return parts[0];
    }


    return 0;
}


export class BudgetService {

    constructor(storageAdapter = storage) {

        this.storage =
            storageAdapter;

        this.storageKey =
            CONFIG.storage.budgetKey;
    }


    /**
     * 创建空的预算记录。
     *
     * @returns {Object}
     */
    createEmpty() {

        return {
            remainingSeconds:
                CONFIG.budget.defaultDailyLimitSeconds,

            lastResetAt: null
        };
    }


    /**
     * 读取预算记录。
     *
     * @returns {Promise<Object>}
     */
    async load() {

        let budget =
            await this.storage.get(
                this.storageKey
            );


        if (
            !budget
            || typeof budget !== "object"
            || typeof budget.remainingSeconds !== "number"
        ) {

            budget =
                this.createEmpty();
        }


        return budget;
    }


    /**
     * 保存预算记录。
     *
     * @param {Object} budget
     */
    async save(budget) {

        await this.storage.set(
            this.storageKey,
            budget
        );
    }


    /**
     * 计算当前周期起点（当天或昨天的 05:00）。
     *
     * @param {number} now 毫秒时间戳
     * @returns {number}
     */
    getCycleStartTime(now = Date.now()) {

        const date =
            new Date(now);


        const year =
            date.getFullYear();


        const month =
            date.getMonth();


        const day =
            date.getDate();


        const resetHour =
            CONFIG.budget.resetHour;


        const todayStart =
            new Date(
                year,
                month,
                day,
                resetHour,
                0,
                0,
                0
            ).getTime();


        if (now >= todayStart) {
            return todayStart;
        }


        return new Date(
            year,
            month,
            day - 1,
            resetHour,
            0,
            0,
            0
        ).getTime();
    }


    /**
     * 需要时重置预算。
     *
     * 如果上次重置时间早于当前周期起点，
     * 则把预算恢复为默认值。
     *
     * @returns {Promise<Object>}
     */
    async resetIfNeeded() {

        const budget =
            await this.load();


        const cycleStart =
            this.getCycleStartTime();


        const lastReset =
            new Date(
                budget.lastResetAt
            ).getTime();


        if (
            !Number.isFinite(lastReset)
            || lastReset < cycleStart
        ) {

            budget.remainingSeconds =
                CONFIG.budget.defaultDailyLimitSeconds;


            budget.lastResetAt =
                new Date(cycleStart).toISOString();


            await this.save(budget);
        }


        return budget;
    }


    /**
     * 获取剩余秒数。
     *
     * @returns {Promise<number>}
     */
    async getRemainingSeconds() {

        const budget =
            await this.resetIfNeeded();


        return budget.remainingSeconds;
    }


    /**
     * 扣除若干秒。
     *
     * @param {number} seconds
     * @returns {Promise<Object>}
     */
    async deduct(seconds) {

        const budget =
            await this.resetIfNeeded();


        const value =
            Number(seconds);


        if (
            Number.isFinite(value)
            && value > 0
        ) {

            budget.remainingSeconds =
                Math.max(
                    0,
                    budget.remainingSeconds - value
                );


            await this.save(budget);
        }


        return budget;
    }


    /**
     * 扣除一条视频的完整时长。
     *
     * @param {Object} video
     * @returns {Promise<Object>}
     */
    async deductVideo(video) {

        return await this.deduct(
            parseDurationToSeconds(
                video?.duration
            )
        );
    }


    /**
     * 重置预算：
     * 把剩余时间恢复为默认值，
     * 并把上次重置时间置为 0，
     * 使下一次读取时立即按当前周期刷新。
     *
     * @returns {Promise<Object>}
     */
    async reset() {

        const budget =
            this.createEmpty();


        budget.lastResetAt =
            0;


        await this.save(budget);


        return budget;
    }
}


/**
 * 默认 Service。
 */
export const budgetService =
    new BudgetService();
