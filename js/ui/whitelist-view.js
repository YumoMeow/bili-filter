/**
 * 白名单 UI
 *
 * Phase 0：
 *     只负责显示数据。
 *
 * Phase 1：
 *     再加入：
 *     - 添加
 *     - 删除
 *     - pending
 *     - 修改状态
 */


/**
 * 渲染白名单列表。
 *
 * @param {HTMLElement} container
 * @param {Array} users
 */
export function renderWhitelist(
    container,
    users
) {

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(users) || users.length === 0) {

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


        const name =
            document.createElement("span");

        name.className =
            "whitelist-item__name";

        name.textContent =
            user.name;


        const mid =
            document.createElement("span");

        mid.className =
            "whitelist-item__mid";

        mid.textContent =
            `UID ${user.mid}`;


        const content =
            document.createElement("div");

        content.className =
            "whitelist-item__content";


        content.appendChild(
            name
        );

        content.appendChild(
            mid
        );


        item.appendChild(
            content
        );


        container.appendChild(
            item
        );
    }
}