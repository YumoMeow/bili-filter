/**
 * 白名单业务服务
 *
 * Phase 1
 *
 * 负责：
 *
 * - 初始化白名单
 * - 读取白名单
 * - 添加 UP 主
 * - 删除 UP 主
 * - 7 天修改限制
 * - 24 小时冷静期
 * - pending -> active
 */


import {
    createEmptyWhitelist,
    createWhitelistUser,
    isValidWhitelist,
    USER_STATUS
} from "../models/whitelist.js";


import {
    storage
} from "./storage.js";


import {
    CONFIG
} from "../config.js";


export class WhitelistService {

    constructor(storageAdapter = storage) {

        this.storage =
            storageAdapter;

        this.storageKey =
            CONFIG.storage.whitelistKey;

        this.defaultDataUrl =
            "./data/default-whitelist.json";
        
        this.draftStorageKey =
            "bili_filter_draft_whitelist";
    }


    /* ==================================================
       基础数据
       ================================================== */


    /**
     * 加载白名单。
     *
     * 如果第一次使用，则从 default-whitelist.json
     * 初始化本地数据。
     *
     * @returns {Promise<Object>}
     */
    async load() {

        let whitelist =
            await this.storage.get(
                this.storageKey
            );


        /*
         * 第一次使用。
         */
        if (whitelist === null) {

            whitelist =
                await this.initialize();
        }


        /*
         * 数据损坏时恢复成空白名单。
         */
        if (
            !isValidWhitelist(whitelist)
        ) {

            console.warn(
                "检测到无效白名单数据，正在重置。"
            );

            whitelist =
                createEmptyWhitelist();

            await this.save(
                whitelist
            );
        }


        /*
         * 每次加载时检查 pending。
         */
        const changed =
            this.activateExpiredUsers(
                whitelist
            );


        if (changed) {

            await this.save(
                whitelist
            );
        }


        return whitelist;
    }


    /**
     * 第一次初始化。
     *
     * @returns {Promise<Object>}
     */
    async initialize() {

        const whitelist =
            createEmptyWhitelist();


        try {

            const response =
                await fetch(
                    this.defaultDataUrl
                );


            if (!response.ok) {

                throw new Error(
                    `无法读取默认白名单：${response.status}`
                );
            }


            const data =
                await response.json();


            if (
                !Array.isArray(data.users)
            ) {

                throw new Error(
                    "default-whitelist.json 格式错误"
                );
            }


            /*
             * 默认白名单直接视为 active。
             *
             * 因为这些是工具初始配置，
             * 不应该让用户第一次打开就等 24 小时。
             */
            whitelist.users =
                data.users.map(user => {

                    return createWhitelistUser(
                        user.mid,
                        user.name,
                        {
                            status:
                                USER_STATUS.ACTIVE,

                            addedAt:
                                new Date().toISOString(),

                            effectiveAt:
                                new Date().toISOString()
                        }
                    );
                });


        } catch (error) {

            console.error(
                "初始化默认白名单失败：",
                error
            );
        }


        await this.save(
            whitelist
        );


        return whitelist;
    }


    /**
     * 保存白名单。
     *
     * @param {Object} whitelist
     */
    async save(whitelist) {

        if (
            !isValidWhitelist(whitelist)
        ) {

            throw new Error(
                "尝试保存无效的白名单数据"
            );
        }


        await this.storage.set(
            this.storageKey,
            whitelist
        );
    }

/* ==================================================
   Draft
   ================================================== */


/**
 * 开始编辑。
 *
 * 将当前正式白名单复制成 draft。
 *
 * @returns {Promise<Object>}
 */
async beginEdit() {

    const whitelist =
        await this.load();

    /*
     * 深拷贝，避免修改 draft 时
     * 意外修改正式数据。
     */
    const draft =
        JSON.parse(
            JSON.stringify(whitelist)
        );

    await this.storage.set(
        this.draftStorageKey,
        draft
    );

    return draft;
}


/**
 * 获取当前 draft。
 *
 * @returns {Promise<Object|null>}
 */
async getDraft() {

    const draft =
        await this.storage.get(
            this.draftStorageKey
        );

    if (draft === null) {
        return null;
    }

    if (
        !isValidWhitelist(draft)
    ) {

        await this.clearDraft();

        return null;
    }

    return draft;
}


/**
 * 保存 draft。
 *
 * 注意：
 * 这里只修改 draft，
 * 不会修改正式白名单。
 *
 * @param {Object} draft
 */
async saveDraft(draft) {

    if (
        !isValidWhitelist(draft)
    ) {

        throw new Error(
            "尝试保存无效的草稿数据。"
        );
    }

    await this.storage.set(
        this.draftStorageKey,
        draft
    );
}


/**
 * 清除 draft。
 */
async clearDraft() {

    await this.storage.remove(
        this.draftStorageKey
    );
}


/**
 * 向 draft 中添加 UP 主。
 *
 * 注意：
 * 这个函数只负责修改 draft。
 *
 * 不负责：
 * - 查询 B站
 * - 保存正式白名单
 * - 启动 7 天周期
 *
 * @param {Object} draft
 * @param {Object} userInfo
 */
addUserToDraft(
    draft,
    userInfo
) {

    if (
        !userInfo
        || !userInfo.mid
    ) {

        throw new Error(
            "UP 主信息无效。"
        );
    }


    const mid =
        String(
            userInfo.mid
        ).trim();


    const exists =
        draft.users.some(
            user =>
                String(user.mid)
                === mid
        );


    if (exists) {

        throw new Error(
            "这个 UP 主已经在白名单中。"
        );
    }


    const now =
        new Date();


    const effectiveAt =
        new Date(
            now.getTime()
            + CONFIG.whitelist.pendingPeriodHours
            * 60
            * 60
            * 1000
        );


    const user =
        createWhitelistUser(
            mid,
            {
                name:
                    userInfo.name,

                avatar:
                    userInfo.avatar,

                fans:
                    userInfo.fans,

                status:
                    USER_STATUS.PENDING,

                addedAt:
                    now.toISOString(),

                effectiveAt:
                    effectiveAt.toISOString()
            }
        );


    draft.users.push(
        user
    );


    return user;
}


/**
 * 从 draft 中删除 UP 主。
 *
 * @param {Object} draft
 * @param {string|number} mid
 */
removeUserFromDraft(
    draft,
    mid
) {

    const cleanMid =
        String(mid).trim();


    const index =
        draft.users.findIndex(
            user =>
                user.mid === cleanMid
        );


    if (index === -1) {

        throw new Error(
            "没有找到这个 UP 主。"
        );
    }


    return draft.users.splice(
        index,
        1
    )[0];
}


/**
 * 判断正式白名单和 draft 是否不同。
 *
 * @param {Object} draft
 * @returns {Promise<boolean>}
 */
async hasDraftChanges(draft) {

    const whitelist =
        await this.load();


    /*
     * 比较用户列表。
     *
     * lastModifiedAt / nextModifyAt
     * 不参与比较，因为它们属于正式提交时
     * 才应该更新的数据。
     */
    const currentUsers =
        JSON.stringify(
            whitelist.users
        );

    const draftUsers =
        JSON.stringify(
            draft.users
        );


    return (
        currentUsers
        !== draftUsers
    );
}


/**
 * 正式提交 draft。
 *
 * 只有这里才真正启动 7 天修改周期。
 *
 * @param {Object} draft
 */
async commitDraft(draft) {

    if (
        !isValidWhitelist(draft)
    ) {

        throw new Error(
            "草稿数据无效。"
        );
    }


    /*
     * 只有点击保存时才检查 7 天限制。
     */
    if (
        !(await this.canModify())
    ) {

        throw new Error(
            "当前还不能修改白名单。"
        );
    }


    const changed =
        await this.hasDraftChanges(
            draft
        );


    if (!changed) {

        throw new Error(
            "白名单没有发生任何变化。"
        );
    }


    const now =
        new Date();


    /*
     * 创建正式数据。
     *
     * draft 中的 users 成为正式 users。
     */
    const whitelist =
        {
            version:
                draft.version,

            users:
                JSON.parse(
                    JSON.stringify(
                        draft.users
                    )
                ),

            lastModifiedAt:
                now.toISOString(),

            nextModifyAt:
                new Date(
                    now.getTime()
                    + CONFIG.whitelist.modificationIntervalDays
                    * 24
                    * 60
                    * 60
                    * 1000
                ).toISOString()
        };


    await this.save(
        whitelist
    );


    /*
     * 提交成功后删除 draft。
     */
    await this.clearDraft();


    return whitelist;
}

    /* ==================================================
       查询
       ================================================== */


    /**
     * 获取全部 UP 主。
     *
     * @returns {Promise<Array>}
     */
    async getUsers() {

        const whitelist =
            await this.load();

        return whitelist.users;
    }


    /**
     * 获取 active UP 主。
     *
     * @returns {Promise<Array>}
     */
    async getActiveUsers() {

        const users =
            await this.getUsers();

        return users.filter(
            user =>
                user.status
                === USER_STATUS.ACTIVE
        );
    }


    /**
     * 获取 pending UP 主。
     *
     * @returns {Promise<Array>}
     */
    async getPendingUsers() {

        const users =
            await this.getUsers();

        return users.filter(
            user =>
                user.status
                === USER_STATUS.PENDING
        );
    }


    /**
     * 根据 MID 查找 UP 主。
     *
     * @param {string|number} mid
     * @returns {Promise<Object|null>}
     */
    async findUser(mid) {

        const users =
            await this.getUsers();

        const targetMid =
            String(mid);


        return (
            users.find(
                user =>
                    user.mid === targetMid
            )
            ?? null
        );
    }


    /**
     * 当前是否允许修改白名单。
     *
     * @returns {Promise<boolean>}
     */
    async canModify() {

        const whitelist =
            await this.load();


        /*
         * 从来没有修改过。
         */
        if (
            !whitelist.nextModifyAt
        ) {

            return true;
        }


        const nextModify =
            new Date(
                whitelist.nextModifyAt
            ).getTime();


        return (
            Date.now()
            >= nextModify
        );
    }


    /**
     * 获取下一次允许修改时间。
     *
     * @returns {Promise<string|null>}
     */
    async getNextModifyTime() {

        const whitelist =
            await this.load();

        return whitelist.nextModifyAt;
    }


    /**
     * 获取修改状态。
     *
     * @returns {Promise<Object>}
     */
    async getModificationStatus() {

        const whitelist =
            await this.load();


        if (
            !whitelist.nextModifyAt
        ) {

            return {
                canModify: true,
                nextModifyAt: null,
                remainingMs: 0
            };
        }


        const nextTime =
            new Date(
                whitelist.nextModifyAt
            ).getTime();


        const remainingMs =
            Math.max(
                0,
                nextTime - Date.now()
            );


        return {
            canModify:
                remainingMs === 0,

            nextModifyAt:
                whitelist.nextModifyAt,

            remainingMs
        };
    }


    /* ==================================================
       修改
       ================================================== */


    /**
     * 添加 UP 主。
     *
     * 新增后进入 pending 状态。
     *
     * @param {string|number} mid
     * @param {string} name
     * @returns {Promise<Object>}
     */


    /* ==================================================
       Pending
       ================================================== */


    /**
     * 把已经超过冷静期的用户转换为 active。
     *
     * @param {Object} whitelist
     * @returns {boolean}
     */
    activateExpiredUsers(whitelist) {

        const now =
            Date.now();

        let changed = false;


        for (
            const user
            of whitelist.users
        ) {

            if (
                user.status
                !== USER_STATUS.PENDING
            ) {
                continue;
            }


            if (!user.effectiveAt) {
                continue;
            }


            const effectiveAt =
                new Date(
                    user.effectiveAt
                ).getTime();


            if (
                now >= effectiveAt
            ) {

                user.status =
                    USER_STATUS.ACTIVE;

                changed = true;
            }
        }


        return changed;
    }


    /* ==================================================
       Internal
       ================================================== */


    /**
     * 应用 7 天修改冷却。
     *
     * @param {Object} whitelist
     * @param {Date} now
     */
    applyModificationCooldown(
        whitelist,
        now
    ) {

        const nextModify =
            new Date(
                now.getTime()
                + CONFIG.whitelist.modificationIntervalDays
                * 24
                * 60
                * 60
                * 1000
            );


        whitelist.lastModifiedAt =
            now.toISOString();


        whitelist.nextModifyAt =
            nextModify.toISOString();
    }
}


/**
 * 默认 Service。
 */
export const whitelistService =
    new WhitelistService();