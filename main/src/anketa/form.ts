import { useEffect, useRef, useState } from "react";
import type { AnkValueBase } from "./value";
import type { _ } from "./shared";

export type AnkFormValues = {
    [key: string]: AnkValueBase<any, any, boolean>;
}

export type AnkFormOf<T> = _<{
    [K in keyof T]:
    T[K] extends AnkValueBase<infer TValue, any, true> ? TValue :
    T[K] extends AnkValueBase<infer TValue, any, boolean> ? TValue | undefined : never;
}>;
// Same but with optional properties - causes trouble for keyof
// export type AnkFormOf<T> = _<{
//     [K in keyof T as T[K] extends AnkValue<any, any, true> ? K : never]: T[K] extends AnkValue<infer TValue, any, any> ? TValue : never;
// } & {
//         [K in keyof T as T[K] extends AnkValue<any, any, true> ? never : K]?: T[K] extends AnkValue<infer TValue, any, any> ? TValue : never;
//     }>;

export function ankFormValues<T extends AnkFormValues>(form: T): AnkFormOf<T> | undefined {
    const result: Partial<AnkFormOf<T>> = {};
    for (const key in form) {
        if (Object.hasOwn(form, key)) {
            const ankValue = form[key];
            result[key] = ankValue.value; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        }
    }
    return result as AnkFormOf<T>;
}

export interface AnkForm<TValues> {
    values: TValues;
    submit: (e: React.FormEvent<HTMLElement>) => void;
    clear: () => void;
    reset: (values: Partial<AnkFormOf<TValues>>) => void;
}

export function useAnkForm<T extends AnkFormValues>(values: T, onSubmit: (values: AnkFormOf<T>, form: AnkForm<T>) => void, onError?: () => void): AnkForm<T> {
    const [dummy, setDummy] = useState(0);
    const submitting = useRef(false);

    function submit(e: React.FormEvent<HTMLElement>) {
        e.preventDefault();
        // The worst corner case for this is if the user clicks "submit" with the last edited control still focused. The blur
        // event will call commitRaw, which will call some setStates. Then the click event will execute, and the submit
        // function must be able to see the state as updated by commitRaw. In theory not even the ordering of
        // blur/click events is guaranteed, let alone that there will be a react render in between. We're unable to
        // synchronously ask AnkValue to parse/validate because, by design, AnkValue doesn't know the raw value
        // until the control commits it (which is critical for performance, keeping re-renders contained to the control until commit).
        //
        // In practice, even a fully synchronous submit handler actually sees the parsed value following a blur, meaning
        // that in practice the order is: blur -> commitRaw -> setStates -> render -> click -> submit. But relying on this
        // seems fragile. Since a setTimeout doesn't provide full guarantees on blur/click ordering anyway, the middle
        // ground chosen here is to set a dummy state + effect. So long as blur/click get ordered correctly this
        // guarantees the rest: commitRaw setStates will have rendered, and as a bonus so does our setErrorMode,
        // allowing us to use the error value directly (as opposed to some helper "validate()" method on AnkValue).

        for (const key in values)
            if (Object.hasOwn(values, key))
                values[key].setErrorMode("submit");
        submitting.current = true;
        setDummy(d => d + 1);
    }

    const form = {
        values,
        submit,
        clear,
        reset,
    };

    useEffect(() => {
        if (!submitting.current) // dummy == 0 isn't good enough due to HMR during dev
            return;
        submitting.current = false;
        const result: Partial<AnkFormOf<T>> = {};
        for (const key in values) {
            if (Object.hasOwn(values, key)) {
                const ankValue = values[key];
                if (ankValue.error !== undefined) {
                    if (onError !== undefined)
                        onError();
                    return;
                }
                result[key] = ankValue.value; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
            }
        }
        // looks good, invoke callback
        onSubmit(result as AnkFormOf<T>, form);
    }, [dummy]);

    function clear() {
        for (const key in values)
            if (Object.hasOwn(values, key))
                values[key].clear();
    }

    function reset(newValues: Partial<AnkFormOf<T>>) {
        for (const key in values)
            if (Object.hasOwn(values, key)) {
                const val = newValues[key];
                if (val === undefined || val === null)
                    values[key].clear();
                else
                    values[key].setValue(val);
                values[key].setErrorMode("initial");
            }
    }

    return form;
}
