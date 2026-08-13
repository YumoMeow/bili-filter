/**
 * 白名单 UI
 *
 * 负责：
 *
 * - 渲染 UP 主
 * - 显示 active / pending
 * - 显示删除按钮
 */


import {
    USER_STATUS
} from "../models/whitelist.js";


/**
 * 格式化时间。
 *
 * @param {string} iso
 * @returns {string}
 */
function formatDateTime(iso) {

    if (!iso) {
        return "";
    }


    const date =
        new Date(iso);


    return date.toLocaleString(
        "zh-CN",
        {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/**
 * 渲染白名单。
 *
 * @param {HTMLElement} container
 * @param {Array} users
 * @param {Object} options
 */
export function renderWhitelist(
    container,
    users,
    options = {}
) {

    if (!container) {
        return;
    }


    const {
        canModify = false,
        onRemove = null
    } = options;


    container.innerHTML = "";


    if (
        !Array.isArray(users)
        || users.length === 0
    ) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-state empty-state--small";

        empty.innerHTML = `
            <div class="empty-state__icon">
                ◇
            </div>

            <p>
                当前还没有 UP 主。
            </p>
        `;

        container.appendChild(
            empty
        );

        return;
    }


    for (const user of users) {

        const item =
            document.createElement("div");

        item.className =
            "whitelist-item";


        /* ==========================
           左侧内容
           ========================== */

        const content =
            document.createElement("div");

        content.className =
            "whitelist-item__content";


        const name =
            document.createElement("div");

        name.className =
            "whitelist-item__name";

        name.textContent =
            user.name;


        const meta =
            document.createElement("div");

        meta.className =
            "whitelist-item__meta";

        meta.textContent =
            `UID ${user.mid}`;


        content.appendChild(
            name
        );

        content.appendChild(
            meta
        );


        /* ==========================
           状态
           ========================== */

        const status =
            document.createElement("span");

        status.className =
            "whitelist-status";


        if (
            user.status
            === USER_STATUS.ACTIVE
        ) {

            status.classList.add(
                "whitelist-status--active"
            );

            status.textContent =
                "可观看";

        } else {

            status.classList.add(
                "whitelist-status--pending"
            );

            status.textContent =
                "冷静期";

            if (user.effectiveAt) {

                status.title =
                    `预计 ${formatDateTime(user.effectiveAt)} 生效`;
            }
        }


        /* ==========================
           删除按钮
           ========================== */

        const removeButton =
            document.createElement("button");

        removeButton.type =
            "button";

        removeButton.className =
            "whitelist-remove";

        removeButton.textContent =
            "删除";

        removeButton.disabled =
            !canModify;


        if (!canModify) {

            removeButton.title =
                "白名单目前处于修改锁定期";

        } else {

            removeButton.addEventListener(
                "click",
                () => {

                    if (typeof onRemove === "function") {

                        onRemove(
                            user
                        );
                    }
                }
            );
        }


        /* ==========================
           组合
           ========================== */

        item.appendChild(
            content
        );

        item.appendChild(
            status
        );

        item.appendChild(
            removeButton
        );


        container.appendChild(
            item
        );
    }
}