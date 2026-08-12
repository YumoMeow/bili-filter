/**
 * 白名单数据模型
 */

/**
 * 创建一个 UP 主对象。
 *
 * @param {number|string} mid
 * @param {string} name
 * @returns {Object}
 */
export function createWhitelistUser(mid, name) {
    return {
        mid: String(mid),
        name: String(name),

        status: "active",

        addedAt: null,
        effectiveAt: null
    };
}


/**
 * 创建一个空白名单。
 *
 * @returns {Object}
 */
export function createEmptyWhitelist() {
    return {
        version: 1,

        users: [],

        lastModifiedAt: null,
        nextModifyAt: null
    };
}


/**
 * 判断对象是否看起来像合法的白名单。
 *
 * 这里只做基础的数据结构检查。
 * 复杂业务规则由 whitelist-service 负责。
 *
 * @param {*} whitelist
 * @returns {boolean}
 */
export function isValidWhitelist(whitelist) {
    if (!whitelist || typeof whitelist !== "object") {
        return false;
    }

    if (!Array.isArray(whitelist.users)) {
        return false;
    }

    if (
        typeof whitelist.version !== "number"
    ) {
        return false;
    }

    return true;
}


/**
 * 判断一个 UP 主是否处于 active 状态。
 *
 * @param {Object} user
 * @returns {boolean}
 */
export function isActiveUser(user) {
    return user?.status === "active";
}


/**
 * 判断一个 UP 主是否处于 pending 状态。
 *
 * @param {Object} user
 * @returns {boolean}
 */
export function isPendingUser(user) {
    return user?.status === "pending";
}