/**
 * 白名单业务服务
 *
 * Phase 0：
 *     只负责加载 / 初始化数据。
 *
 * Phase 1：
 *     将在这里实现：
 *
 *     - 添加 UP 主
 *     - 删除 UP 主
 *     - 7 天修改限制
 *     - 24 小时冷静期
 *     - 修改提交
 *     - active / pending 状态
 */

import {
    createEmptyWhitelist,
    isValidWhitelist
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
    }


    /**
     * 从 Storage 加载白名单。
     *
     * 如果本地不存在，
     * 则返回空白名单。
     */
    async load() {

        const whitelist =
            await this.storage.get(
                this.storageKey
            );


        if (
            whitelist === null
            || !isValidWhitelist(whitelist)
        ) {

            return createEmptyWhitelist();
        }


        return whitelist;
    }


    /**
     * 保存白名单。
     *
     * Phase 1 会进一步加入：
     * - 数据校验
     * - 修改时间
     * - version
     * - pending 状态
     */
    async save(whitelist) {

        if (!isValidWhitelist(whitelist)) {

            throw new Error(
                "尝试保存无效的白名单数据"
            );
        }


        await this.storage.set(
            this.storageKey,
            whitelist
        );
    }


    /**
     * 返回当前 active UP 主。
     *
     * Phase 0 仅提供基础接口。
     */
    async getActiveUsers() {

        const whitelist =
            await this.load();

        return whitelist.users.filter(
            user => user.status === "active"
        );
    }


    /**
     * 判断当前是否允许修改。
     *
     * Phase 0：
     * 暂时始终返回 false。
     *
     * Phase 1：
     * 根据 nextModifyAt 判断。
     */
    async canModify() {

        return false;
    }


    /**
     * 获取下一次允许修改的时间。
     *
     * Phase 0 暂无实际逻辑。
     */
    async getNextModifyTime() {

        const whitelist =
            await this.load();

        return whitelist.nextModifyAt;
    }
}


/**
 * 默认白名单服务。
 */
export const whitelistService =
    new WhitelistService();