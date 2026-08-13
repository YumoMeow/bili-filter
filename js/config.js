/**
 * Bili Filter 全局配置
 *
 * 注意：
 * Phase 0 只定义配置，不实现业务逻辑。
 */

export const CONFIG = {
    appName: "Bili Filter",

    storage: {
        appStateKey: "bili_filter_app_state",
        whitelistKey: "bili_filter_whitelist",
        videoQueueKey: "bili_filter_video_queue",
        videoLastFetchAtKey: "bili_filter_video_last_fetch_at",
        budgetKey: "bili_filter_budget"
    },

    whitelist: {
        modificationIntervalDays: 7,
        pendingPeriodHours: 24
    },

    video: {
        expiryHours: 72,
        pageSize: 50
    },

    budget: {
        defaultDailyLimitSeconds: 90 * 60,
        resetHour: 5
    }
};