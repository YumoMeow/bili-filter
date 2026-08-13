/**
 * 白名单设置页面
 *
 * 注意：
 *
 * 这里负责：
 *
 * - 读取 UI
 * - 调用 WhitelistService
 * - 更新 UI
 *
 * 不负责：
 *
 * - 7 天限制
 * - 24 小时限制
 * - 数据保存
 *
 * 这些全部由 WhitelistService 负责。
 */


import {
    whitelistService
} from "./services/whitelist-service.js";


import {
    renderWhitelist
} from "./ui/whitelist-view.js";


import {
    showToast
} from "./ui/toast.js";


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


const addButton =
    document.getElementById(
        "add-whitelist-button"
    );

const editButton =
    document.getElementById(
        "edit-whitelist-button"
    );


const draftActions =
    document.getElementById(
        "draft-actions"
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


const midInput =
    document.getElementById(
        "user-mid"
    );


const nameInput =
    document.getElementById(
        "user-name"
    );

let isEditing = false

let draftWhitelist = null
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


    return new Date(
        iso
    ).toLocaleString(
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


    return parts.join(" ");
}


/* ==================================================
   Modal
   ================================================== */


/**
 * 打开添加窗口。
 */
function openAddModal() {

    modal.classList.add(
        "modal-backdrop--visible"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    midInput.value = "";
    nameInput.value = "";


    setTimeout(() => {

        midInput.focus();

    }, 100);
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
   Modification UI
   ================================================== */


/**
 * 更新修改状态。
 */
async function updateModificationUI() {

    const status =
        await whitelistService
            .getModificationStatus();

    /*
     * 编辑过程中仍然允许修改 draft。
     *
     * 7 天限制只在最终保存时生效。
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
            "添加或删除 UP 主后，将进入 7 天修改锁定期。";


        modificationTime.textContent =
            "";


        addButton.disabled =
            false;


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


        modificationTime.textContent =
            `下一次可修改：${formatDateTime(
                status.nextModifyAt
            )}`;


        addButton.disabled =
            true;
    }
}


/* ==================================================
   Render
   ================================================== */


/**
 * 刷新整个页面。
 */
async function refresh() {

    try {

        const users =
            isEditing
                ? draftWhitelist.users
                : await whitelistService.getUsers();


        const status =
            await whitelistService
                .getModificationStatus();


        countElement.textContent =
            users.length;


        renderWhitelist(
            listElement,
            users,
            {
                /*
                 * 编辑状态下允许删除。
                 */
                canModify:
                    isEditing,

                onRemove:
                    handleRemove
            }
        );


        await updateModificationUI();


        /*
         * 编辑状态下不显示正式修改锁定按钮。
         */
        editButton.hidden =
            isEditing;


        draftActions.hidden =
            !isEditing;


        /*
         * 没有变化时不能保存。
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
            error
        );

        showToast(
            "读取白名单失败。"
        );
    }
}


/* ==================================================
   Add
   ================================================== */


/**
 * 处理添加。
 *
 * @param {SubmitEvent} event
 */
async function handleAdd(
    event
) {

    event.preventDefault();


    const mid =
        midInput.value.trim();


    const name =
        nameInput.value.trim();


    if (!mid || !name) {

        showToast(
            "请完整填写 UID 和 UP 主名称。"
        );

        return;
    }


    if (!isEditing || !draftWhitelist) {

        showToast(
            "当前不处于编辑状态。"
        );

        return;
    }


    try {

        whitelistService.addUserToDraft(
            draftWhitelist,
            mid,
            name
        );


        /*
         * 保存 draft。
         *
         * 这里只保存临时数据，
         * 不启动 7 天周期。
         */
        await whitelistService.saveDraft(
            draftWhitelist
        );


        closeAddModal();


        await refresh();


        showToast(
            `${name} 已加入本次修改。`
        );


    } catch (error) {

        console.error(
            error
        );


        showToast(
            error.message
            || "添加失败。"
        );
    }
}


/* ==================================================
   Remove
   ================================================== */


/**
 * 删除 UP 主。
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
            error
        );


        showToast(
            error.message
            || "删除失败。"
        );
    }
}

async function beginEditing() {

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


    draftWhitelist =
        await whitelistService
            .beginEdit();


    isEditing = true;


    await refresh();
}

async function cancelEditing() {

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


    await whitelistService.clearDraft();


    draftWhitelist = null;

    isEditing = false;


    await refresh();


    showToast(
        "已取消本次修改。"
    );
}

async function saveEditing() {

    if (
        !isEditing
        || !draftWhitelist
    ) {

        return;
    }


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


    const confirmed =
        window.confirm(
            "确定保存本次白名单修改吗？\n\n保存后 7 天内无法再次修改白名单。"
        );


    if (!confirmed) {
        return;
    }


    try {

        await whitelistService.commitDraft(
            draftWhitelist
        );


        draftWhitelist = null;

        isEditing = false;


        await refresh();


        showToast(
            "白名单修改已保存，7 天内不能再次修改。"
        );


    } catch (error) {

        console.error(
            error
        );


        showToast(
            error.message
            || "保存失败。"
        );
    }
}

/* ==================================================
   Events
   ================================================== */


editButton.addEventListener(
    "click",
    beginEditing
);


addButton.addEventListener(
    "click",
    openAddModal
);


cancelEditButton.addEventListener(
    "click",
    cancelEditing
);


saveEditButton.addEventListener(
    "click",
    saveEditing
);


modalClose.addEventListener(
    "click",
    closeAddModal
);


modalCancel.addEventListener(
    "click",
    closeAddModal
);


addForm.addEventListener(
    "submit",
    handleAdd
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
 * ESC 关闭。
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
 *
 * 这样如果用户一直开着页面，
 * 24 小时冷静期结束后，
 * UI 可以自动更新。
 */
setInterval(
    refresh,
    60 * 1000
);


/* ==================================================
   Init
   ================================================== */


refresh();