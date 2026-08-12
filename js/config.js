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
        whitelistKey: "bili_filter_whitelist"
    },

    whitelist: {
        modificationIntervalDays: 7,
        pendingPeriodHours: 24
    },

    budget: {
        defaultDailyLimitSeconds: 60 * 60
    }
};