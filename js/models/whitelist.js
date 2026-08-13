/**
 * 白名单数据模型
 *
 * Phase 1
 *
 * 一个 UP 主可能处于：
 *
 * active
 *     已经正式进入白名单
 *
 * pending
 *     刚刚添加，还处于 24 小时冷静期
 */


export const USER_STATUS = {
    ACTIVE: "active",
    PENDING: "pending"
};


/**
 * 创建一个 UP 主对象。
 *
 * @param {string|number} mid
 * @param {string} name
 * @param {Object} options
 * @returns {Object}
 */
export function createWhitelistUser(
    mid,
    name,
    options = {}
) {

    return {
        mid: String(mid),
        name: String(name),

        status:
            options.status
            ?? USER_STATUS.PENDING,

        addedAt:
            options.addedAt
            ?? new Date().toISOString(),

        effectiveAt:
            options.effectiveAt
            ?? null
    };
}


/**
 * 创建空白名单。
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
 * 判断白名单数据结构是否合法。
 *
 * @param {*} whitelist
 * @returns {boolean}
 */
export function isValidWhitelist(whitelist) {

    if (
        !whitelist
        || typeof whitelist !== "object"
    ) {
        return false;
    }


    if (
        typeof whitelist.version !== "number"
    ) {
        return false;
    }


    if (
        !Array.isArray(whitelist.users)
    ) {
        return false;
    }


    if (
        whitelist.lastModifiedAt !== null
        && typeof whitelist.lastModifiedAt !== "string"
    ) {
        return false;
    }


    if (
        whitelist.nextModifyAt !== null
        && typeof whitelist.nextModifyAt !== "string"
    ) {
        return false;
    }


    for (const user of whitelist.users) {

        if (
            !user
            || typeof user !== "object"
        ) {
            return false;
        }


        if (
            typeof user.mid !== "string"
            || typeof user.name !== "string"
        ) {
            return false;
        }


        if (
            user.status !== USER_STATUS.ACTIVE
            && user.status !== USER_STATUS.PENDING
        ) {
            return false;
        }
    }


    return true;
}


/**
 * 判断 UP 主是否 active。
 *
 * @param {Object} user
 * @returns {boolean}
 */
export function isActiveUser(user) {

    return (
        user?.status
        === USER_STATUS.ACTIVE
    );
}


/**
 * 判断 UP 主是否 pending。
 *
 * @param {Object} user
 * @returns {boolean}
 */
export function isPendingUser(user) {

    return (
        user?.status
        === USER_STATUS.PENDING
    );
}