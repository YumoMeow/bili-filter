let hideTimer = null;


/**
 * 显示一个简单的 Toast。
 *
 * @param {string} message
 * @param {number} duration
 */
export function showToast(
    message,
    duration = 2200
) {

    const toast =
        document.getElementById("toast");


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "toast--visible"
    );


    if (hideTimer !== null) {
        clearTimeout(hideTimer);
    }


    hideTimer = setTimeout(() => {

        toast.classList.remove(
            "toast--visible"
        );

        hideTimer = null;

    }, duration);
}