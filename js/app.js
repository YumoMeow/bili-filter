/**
 * Bili Filter 前端入口
 *
 * Phase 0：
 *     初始化页面。
 *
 * 以后：
 *     这里负责组装各个 Service 和 UI。
 */

import {
    whitelistService
} from "./services/whitelist-service.js";

import {
    showToast
} from "./ui/toast.js";


/**
 * 页面初始化。
 */
async function init() {

    console.log(
        "Bili Filter 正在启动..."
    );


    /*
     * 检查 Storage 是否正常工作。
     *
     * 这里只做最基本的启动检查。
     */
    try {

        await whitelistService.load();

        console.log(
            "Whitelist Service 初始化成功"
        );

    } catch (error) {

        console.error(
            "初始化失败：",
            error
        );

        showToast(
            "应用初始化失败，请检查控制台。"
        );
    }


    console.log(
        "Bili Filter 启动完成。"
    );
}


/*
 * DOM 加载完成后启动应用。
 */
if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();
}