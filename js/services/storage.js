/**
 * Storage 抽象层
 *
 * 业务代码不应该直接调用 localStorage。
 *
 * Phase 0：
 *     LocalStorageAdapter
 *
 * 未来：
 *     ApiStorageAdapter
 *
 * 上层业务代码不需要知道底层是哪一种。
 */


/* ==============================
   Storage 接口
   ============================== */

export class StorageAdapter {

    async get(_key) {
        throw new Error(
            "StorageAdapter.get() 未实现"
        );
    }

    async set(_key, _value) {
        throw new Error(
            "StorageAdapter.set() 未实现"
        );
    }

    async remove(_key) {
        throw new Error(
            "StorageAdapter.remove() 未实现"
        );
    }

    async has(_key) {
        throw new Error(
            "StorageAdapter.has() 未实现"
        );
    }
}


/* ==============================
   LocalStorage 实现
   ============================== */

export class LocalStorageAdapter
    extends StorageAdapter {

    async get(key) {

        const raw =
            window.localStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        try {
            return JSON.parse(raw);

        } catch (error) {

            console.error(
                `无法解析 localStorage 数据：${key}`,
                error
            );

            return null;
        }
    }


    async set(key, value) {

        const raw =
            JSON.stringify(value);

        window.localStorage.setItem(
            key,
            raw
        );
    }


    async remove(key) {

        window.localStorage.removeItem(
            key
        );
    }


    async has(key) {

        return (
            window.localStorage.getItem(key)
            !== null
        );
    }
}


/* ==============================
   默认 Storage 实例
   ============================== */

export const storage =
    new LocalStorageAdapter();