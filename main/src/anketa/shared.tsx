import { useEffect } from "react";

/* from yup - this seems to force TS to show the full type instead of all the wrapped generics. See also https://github.com/microsoft/vscode/issues/94679 and https://stackoverflow.com/a/57683652/2010616 */
export type _<T> = T extends object ? { [k in keyof T]: T[k] } : T;

export function isKey(e: KeyboardEvent | React.KeyboardEvent, key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): boolean {
    return e.key === key && e.ctrlKey === (ctrl ?? false) && e.altKey === (alt ?? false) && e.shiftKey === (shift ?? false);
}

export function unreachable(checkArg: never): never {
    throw new Error("reached never");
}

export function GlobalEscHandler(p: { onEsc: () => void }): JSX.Element {
    useEffect(() => {
        function handleKeyDown(nativeEvent: KeyboardEvent) {
            if (isKey(nativeEvent, "Escape"))
                p.onEsc();
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);
    return <></>;
}
