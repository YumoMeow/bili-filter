/**
 * Bili Filter 首页入口
 */

import {
    whitelistService
} from "./services/whitelist-service.js";

import {
    showToast
} from "./ui/toast.js";


async function init() {

    try {

        const users =
            await whitelistService
                .getActiveUsers();


        console.log(
            `当前有 ${users.length} 个 active UP 主。`
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
}


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