/**
 * 白名单设置页面
 *
 * 负责：
 * - 读取 UI
 * - 调用 WhitelistService
 * - 调用 BilibiliService
 * - 管理编辑状态
 * - 管理 draft_whitelist
 * - 更新页面
 *
 * 不负责：
 * - 白名单数据结构
 * - 7 天修改规则
 * - 24 小时冷静期规则
 * - 正式数据存储
 *
 * 这些由 Service 负责。
 */


/* ==================================================
   Imports
   ================================================== */

import {
    whitelistService
} from "./services/whitelist-service.js";


import {
    bilibiliService
} from "./services/bilibili-service.js";


import {
    renderWhitelist,
    formatFans
} from "./ui/whitelist-view.js";


import {
    showToast
} from "./ui/toast.js";


import {
    videoService
} from "./services/video-service.js";


/* ==================================================
   DOM
   ================================================== */

const listElement =
    document.getElementById(
        "whitelist-list"
    );


const countElement =
    document.getElementById(
        "whitelist-count"
    );


const editButton =
    document.getElementById(
        "edit-whitelist-button"
    );


const draftActions =
    document.getElementById(
        "draft-actions"
    );


const addButton =
    document.getElementById(
        "add-whitelist-button"
    );


const cancelEditButton =
    document.getElementById(
        "cancel-edit-button"
    );


const saveEditButton =
    document.getElementById(
        "save-edit-button"
    );


const modificationCard =
    document.getElementById(
        "modification-card"
    );


const modificationTitle =
    document.getElementById(
        "modification-title"
    );


const modificationDescription =
    document.getElementById(
        "modification-description"
    );


const modificationTime =
    document.getElementById(
        "modification-time"
    );


const modal =
    document.getElementById(
        "add-modal"
    );


const modalClose =
    document.getElementById(
        "modal-close"
    );


const modalCancel =
    document.getElementById(
        "modal-cancel"
    );


const addForm =
    document.getElementById(
        "add-form"
    );


/*
 * 注意：
 *
 * settings.html 中的 ID 是：
 *
 * whitelist-mid
 *
 * 不是 user-mid。
 */
const midInput =
    document.getElementById(
        "whitelist-mid"
    );


const userPreview =
    document.getElementById(
        "user-preview"
    );


const resetDefaultButton =
    document.getElementById(
        "reset-default-button"
    );


/* ==================================================
   State
   ================================================== */


/*
 * 是否正在编辑。
 */
let isEditing = false;


/*
 * 当前编辑中的草稿。
 *
 * 正式数据不会因为这里的修改而改变。
 */
let draftWhitelist = null;


/*
 * 防止多个 refresh() 同时运行。
 */
let isRefreshing = false;


/*
 * UID 输入预览的防抖计时器。
 */
let previewTimer = null;


/* ==================================================
   DOM 检查
   ================================================== */


/**
 * 检查页面需要的 DOM 是否存在。
 *
 * 如果 HTML 和 JS 的 ID 不一致，
 * 这里会直接在 Console 中指出问题。
 */
function validateDOM() {

    const requiredElements = {

        listElement,

        countElement,

        editButton,

        draftActions,

        addButton,

        cancelEditButton,

        saveEditButton,

        modificationCard,

        modificationTitle,

        modificationDescription,

        modificationTime,

        modal,

        modalClose,

        modalCancel,

        addForm,

        midInput,

        userPreview,

        resetDefaultButton
    };


    const missing = [];


    for (
        const [name, element]
        of Object.entries(
            requiredElements
        )
    ) {

        if (!element) {

            missing.push(
                name
            );
        }
    }


    if (missing.length > 0) {

        console.error(
            "settings.js: 缺少 DOM 元素：",
            missing
        );

        return false;
    }


    return true;
}


/* ==================================================
   Utility
   ================================================== */


/**
 * 格式化时间。
 *
 * @param {string|null} iso
 * @returns {string}
 */
function formatDateTime(iso) {

    if (!iso) {
        return "";
    }


    const date =
        new Date(iso);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }


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
 * 格式化剩余时间。
 *
 * @param {number} milliseconds
 * @returns {string}
 */
function formatRemaining(
    milliseconds
) {

    if (
        !Number.isFinite(
            milliseconds
        )
        || milliseconds <= 0
    ) {

        return "即将解锁";
    }


    const totalMinutes =
        Math.ceil(
            milliseconds
            / 1000
            / 60
        );


    const days =
        Math.floor(
            totalMinutes
            / (24 * 60)
        );


    const hours =
        Math.floor(
            (
                totalMinutes
                % (24 * 60)
            )
            / 60
        );


    const minutes =
        totalMinutes
        % 60;


    const parts = [];


    if (days > 0) {

        parts.push(
            `${days} 天`
        );
    }


    if (hours > 0) {

        parts.push(
            `${hours} 小时`
        );
    }


    if (
        minutes > 0
        || parts.length === 0
    ) {

        parts.push(
            `${minutes} 分钟`
        );
    }


    return parts.join(
        " "
    );
}


/* ==================================================
   Modal
   ================================================== */


/**
 * 打开添加 UP 主窗口。
 */
function openAddModal() {

    if (!isEditing) {

        showToast(
            "请先进入编辑模式。"
        );

        return;
    }


    midInput.value = "";


    /*
     * Phase 2 已经不再手动填写名称。
     *
     * 因此不再出现：
     *
     * nameInput.value = "";
     */


    if (userPreview) {

        userPreview.innerHTML = "";

        userPreview.hidden = true;
    }


    modal.classList.add(
        "modal-backdrop--visible"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            midInput.focus();

        },
        100
    );
}


/**
 * 关闭添加窗口。
 */
function closeAddModal() {

    modal.classList.remove(
        "modal-backdrop--visible"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* ==================================================
   User Preview
   ================================================== */


/**
 * 在添加弹窗中渲染 UP 主预览。
 *
 * @param {Object} user
 */
function renderUserPreview(user) {

    if (!userPreview) {
        return;
    }


    userPreview.innerHTML = "";

    userPreview.hidden = false;


    const avatar =
        document.createElement("img");

    avatar.className =
        "user-preview__avatar";

    avatar.src =
        user.avatar
        || "assets/default-avatar.svg";

    avatar.alt =
        `${user.name} 的头像`;
    
    avatar.referrerPolicy = 
        "no-referrer";


    const info =
        document.createElement("div");

    info.className =
        "user-preview__info";


    const name =
        document.createElement("div");

    name.className =
        "user-preview__name";

    name.textContent =
        user.name;


    const meta =
        document.createElement("div");

    meta.className =
        "user-preview__meta";

    meta.textContent =
        `UID ${user.mid} · ${formatFans(user.fans)} 粉丝`;


    info.appendChild(
        name
    );

    info.appendChild(
        meta
    );


    userPreview.appendChild(
        avatar
    );

    userPreview.appendChild(
        info
    );
}


/**
 * 清空并隐藏预览。
 */
function clearUserPreview() {

    if (!userPreview) {
        return;
    }


    userPreview.innerHTML = "";

    userPreview.hidden = true;
}


/* ==================================================
   Modification UI
   ================================================== */


/**
 * 更新白名单修改状态。
 */
async function updateModificationUI() {

    /*
     * 编辑状态：
     *
     * 7 天限制暂时不影响 draft。
     */
    if (isEditing) {

        modificationCard.classList.add(
            "modification-card--available"
        );


        modificationCard.classList.remove(
            "modification-card--locked"
        );


        modificationTitle.textContent =
            "正在编辑白名单";


        modificationDescription.textContent =
            "你可以自由添加或删除 UP 主，保存后才会进入 7 天锁定期。";


        modificationTime.textContent =
            "";


        return;
    }


    /*
     * 非编辑状态：
     *
     * 正常读取正式白名单的修改状态。
     */
    const status =
        await whitelistService
            .getModificationStatus();


    if (status.canModify) {

        modificationCard.classList.add(
            "modification-card--available"
        );


        modificationCard.classList.remove(
            "modification-card--locked"
        );


        modificationTitle.textContent =
            "现在可以修改白名单";


        modificationDescription.textContent =
            "点击“编辑白名单”后，可以添加或删除 UP 主。";


        modificationTime.textContent =
            "";

    } else {

        modificationCard.classList.remove(
            "modification-card--available"
        );


        modificationCard.classList.add(
            "modification-card--locked"
        );


        modificationTitle.textContent =
            "白名单已锁定";


        modificationDescription.textContent =
            "为了减少冲动修改，当前暂时不能调整白名单。";


        let timeText = "";


        if (
            status.nextModifyAt
        ) {

            const nextModify =
                new Date(
                    status.nextModifyAt
                );


            const remaining =
                nextModify.getTime()
                - Date.now();


            timeText =
                `下一次可修改：${formatDateTime(
                    status.nextModifyAt
                )}`;


            if (
                remaining > 0
            ) {

                timeText +=
                    `（还需 ${formatRemaining(
                        remaining
                    )}）`;
            }
        }


        modificationTime.textContent =
            timeText;
    }
}


/* ==================================================
   Render
   ================================================== */


/**
 * 刷新页面。
 */
async function refresh() {

    /*
     * 防止自动刷新和手动刷新同时执行。
     */
    if (isRefreshing) {
        return;
    }


    isRefreshing = true;


    try {

        let users;


        /*
         * 编辑状态：
         *
         * 显示 draft。
         */
        if (isEditing) {

            if (!draftWhitelist) {

                throw new Error(
                    "当前处于编辑状态，但 draft_whitelist 不存在。"
                );
            }


            users =
                Array.isArray(
                    draftWhitelist.users
                )
                    ? draftWhitelist.users
                    : [];


        } else {

            /*
             * 正常状态：
             *
             * 显示正式白名单。
             */
            users =
                await whitelistService
                    .getUsers();
        }


        /*
         * 更新数量。
         */
        countElement.textContent =
            String(
                users.length
            );


        /*
         * 渲染 UP 主卡片。
         */
        renderWhitelist(
            listElement,
            users,
            {
                canModify:
                    isEditing,

                onRemove:
                    handleRemove
            }
        );


        /*
         * 更新修改状态。
         */
        await updateModificationUI();


        /*
         * 编辑按钮：
         *
         * 编辑时隐藏。
         */
        editButton.hidden =
            isEditing;


        /*
         * 编辑操作按钮：
         *
         * 非编辑时隐藏。
         */
        draftActions.hidden =
            !isEditing;


        /*
         * 保存按钮。
         *
         * 只有真的发生修改时才能保存。
         */
        if (isEditing) {

            const changed =
                await whitelistService
                    .hasDraftChanges(
                        draftWhitelist
                    );


            saveEditButton.disabled =
                !changed;
        }


    } catch (error) {

        console.error(
            "刷新白名单页面失败：",
            error
        );


        /*
         * 不再默默卡在：
         *
         * “正在检查白名单状态……”
         *
         * 而是直接告诉用户出了什么问题。
         */
        modificationTitle.textContent =
            "白名单状态读取失败";


        modificationDescription.textContent =
            error.message
            || "读取白名单时发生未知错误。";


        modificationTime.textContent =
            "请打开浏览器控制台查看详细错误。";


        showToast(
            error.message
            || "读取白名单失败。"
        );


    } finally {

        isRefreshing = false;
    }
}


/* ==================================================
   Begin Editing
   ================================================== */


/**
 * 开始编辑白名单。
 */
async function beginEditing() {

    try {

        /*
         * 先检查 7 天锁定。
         */
        const canModify =
            await whitelistService
                .canModify();


        if (!canModify) {

            showToast(
                "当前还不能修改白名单。"
            );


            await refresh();

            return;
        }


        /*
         * 创建 draft_whitelist。
         */
        draftWhitelist =
            await whitelistService
                .beginEdit();


        if (
            !draftWhitelist
            || !Array.isArray(
                draftWhitelist.users
            )
        ) {

            throw new Error(
                "创建白名单草稿失败。"
            );
        }


        isEditing = true;


        await refresh();


    } catch (error) {

        console.error(
            "进入编辑模式失败：",
            error
        );


        showToast(
            error.message
            || "无法进入编辑模式。"
        );
    }
}


/* ==================================================
   Add
   ================================================== */


/**
 * 添加 UP 主。
 *
 * 流程：
 *
 * UID
 * ↓
 * BilibiliService
 * ↓
 * 获取昵称 / 头像 / 粉丝数
 * ↓
 * draft_whitelist
 */
async function handleAdd(
    event
) {

    event.preventDefault();


    const mid =
        midInput.value.trim();


    if (!mid) {

        showToast(
            "请输入 B 站 UID。"
        );

        return;
    }


    if (!/^\d+$/.test(mid)) {

        showToast(
            "UID 必须是纯数字。"
        );

        return;
    }


    if (
        !isEditing
        || !draftWhitelist
    ) {

        showToast(
            "当前不处于编辑状态。"
        );

        return;
    }


    /*
     * 禁止重复点击。
     */
    const submitButton =
        addForm.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "查询中……";
    }


    try {

        /*
         * ① 根据 UID 获取 B站用户信息。
         */
        const userInfo =
            await bilibiliService
                .getUserInfo(mid);


        /*
         * ② 把完整用户信息加入 draft。
         */
        whitelistService.addUserToDraft(
            draftWhitelist,
            userInfo
        );


        /*
         * ③ 保存 draft。
         *
         * 注意：
         *
         * 这里不会启动 7 天周期。
         */
        await whitelistService.saveDraft(
            draftWhitelist
        );


        /*
         * ④ 关闭 Modal。
         */
        closeAddModal();


        midInput.value =
            "";


        /*
         * ⑤ 刷新页面。
         */
        await refresh();


        showToast(
            `已添加「${userInfo.name}」，点击“保存修改”后正式提交。`
        );


    } catch (error) {

        console.error(
            "添加 UP 主失败：",
            error
        );


        showToast(
            error.message
            || "添加 UP 主失败。"
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "添加";
        }
    }
}


/* ==================================================
   Remove
   ================================================== */


/**
 * 从 draft 删除 UP 主。
 *
 * @param {Object} user
 */
async function handleRemove(
    user
) {

    if (
        !isEditing
        || !draftWhitelist
    ) {

        return;
    }


    const confirmed =
        window.confirm(
            `确定要从本次修改中删除「${user.name}」吗？`
        );


    if (!confirmed) {
        return;
    }


    try {

        whitelistService.removeUserFromDraft(
            draftWhitelist,
            user.mid
        );


        await whitelistService.saveDraft(
            draftWhitelist
        );


        await refresh();


        showToast(
            `${user.name} 已从本次修改中删除。`
        );


    } catch (error) {

        console.error(
            "删除 UP 主失败：",
            error
        );


        showToast(
            error.message
            || "删除失败。"
        );
    }
}


/* ==================================================
   Cancel Editing
   ================================================== */


/**
 * 取消编辑。
 */
async function cancelEditing() {

    if (!isEditing) {
        return;
    }


    try {

        const changed =
            draftWhitelist
                ? await whitelistService
                    .hasDraftChanges(
                        draftWhitelist
                    )
                : false;


        if (changed) {

            const confirmed =
                window.confirm(
                    "本次编辑尚未保存，确定要取消吗？"
                );


            if (!confirmed) {
                return;
            }
        }


        await whitelistService
            .clearDraft();


        draftWhitelist =
            null;


        isEditing =
            false;


        await refresh();


        showToast(
            "已取消本次修改。"
        );


    } catch (error) {

        console.error(
            "取消编辑失败：",
            error
        );


        showToast(
            error.message
            || "取消修改失败。"
        );
    }
}


/* ==================================================
   Save Editing
   ================================================== */


/**
 * 正式保存 draft。
 *
 * 只有这里才启动 7 天修改周期。
 */
async function saveEditing() {

    if (
        !isEditing
        || !draftWhitelist
    ) {

        return;
    }


    try {

        /*
         * 检查是否真的发生变化。
         */
        const changed =
            await whitelistService
                .hasDraftChanges(
                    draftWhitelist
                );


        if (!changed) {

            showToast(
                "白名单没有发生任何变化。"
            );

            return;
        }


        /*
         * 最终确认。
         */
        const confirmed =
            window.confirm(
                "确定保存本次白名单修改吗？\n\n保存后 7 天内无法再次修改白名单。"
            );


        if (!confirmed) {
            return;
        }


        saveEditButton.disabled =
            true;


        /*
         * 正式提交。
         *
         * 7 天周期在这里启动。
         */
        await whitelistService
            .commitDraft(
                draftWhitelist
            );


        /*
         * 清理编辑状态。
         */
        draftWhitelist =
            null;


        isEditing =
            false;


        await refresh();


        showToast(
            "白名单修改已保存，7 天内不能再次修改。"
        );


    } catch (error) {

        console.error(
            "保存白名单失败：",
            error
        );


        showToast(
            error.message
            || "保存白名单失败。"
        );


    } finally {

        saveEditButton.disabled =
            false;
    }
}


/* ==================================================
   Reset
   ================================================== */


/**
 * 重置为默认：
 * 恢复默认白名单，并重新获取 72 小时内的视频。
 */
async function handleResetDefault() {

    const confirmed =
        window.confirm(
            "确定要重置为默认吗？\n\n"
            + "将清空白名单、视频队列和抓取记录，"
            + "并恢复为默认白名单。"
        );


    if (!confirmed) {
        return;
    }


    try {

        await whitelistService
            .resetToDefault();


        await videoService
            .reset();


        draftWhitelist =
            null;


        isEditing =
            false;


        await refresh();


        showToast(
            "已重置为默认，并已获取最近 72 小时的视频。"
        );


    } catch (error) {

        console.error(
            "重置失败：",
            error
        );


        showToast(
            error.message
            || "重置失败。"
        );
    }
}


/* ==================================================
   Events
   ================================================== */


/*
 * 编辑白名单。
 */
editButton.addEventListener(
    "click",
    beginEditing
);


/*
 * 添加 UP 主。
 */
addButton.addEventListener(
    "click",
    openAddModal
);


/*
 * 取消编辑。
 */
cancelEditButton.addEventListener(
    "click",
    cancelEditing
);


/*
 * 保存修改。
 */
saveEditButton.addEventListener(
    "click",
    saveEditing
);


/*
 * 重置为默认。
 */
resetDefaultButton.addEventListener(
    "click",
    handleResetDefault
);


/*
 * 关闭 Modal。
 */
modalClose.addEventListener(
    "click",
    closeAddModal
);


modalCancel.addEventListener(
    "click",
    closeAddModal
);


/*
 * 提交添加表单。
 */
addForm.addEventListener(
    "submit",
    handleAdd
);


/*
 * 输入 UID 时，防抖查询并显示 UP 主预览。
 */
midInput.addEventListener(
    "input",
    () => {

        clearTimeout(
            previewTimer
        );


        const mid =
            midInput.value.trim();


        if (!/^\d+$/.test(mid)) {

            clearUserPreview();

            return;
        }


        previewTimer = setTimeout(
            async () => {

                try {

                    const userInfo =
                        await bilibiliService
                            .getUserInfo(mid);


                    renderUserPreview(
                        userInfo
                    );

                } catch (error) {

                    clearUserPreview();
                }
            },
            500
        );
    }
);


/*
 * 点击背景关闭 Modal。
 */
modal.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            closeAddModal();
        }
    }
);


/*
 * ESC 关闭 Modal。
 */
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeAddModal();
        }
    }
);


/* ==================================================
   自动刷新
   ================================================== */


/*
 * 每分钟刷新一次。
 */
setInterval(
    () => {

        refresh();

    },
    60 * 1000
);


/* ==================================================
   Init
   ================================================== */


async function init() {

    /*
     * 首先确认 HTML 与 JS 对得上。
     */
    if (!validateDOM()) {

        modificationTitle.textContent =
            "页面初始化失败";


        modificationDescription.textContent =
            "HTML 中缺少必要的页面元素，请打开控制台查看具体错误。";


        return;
    }


    /*
     * 正式开始读取白名单。
     */
    await refresh();
}


init();