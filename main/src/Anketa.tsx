import { TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

interface ParseSerialise<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue | undefined;
    error?: string;
    isEmpty: boolean;
    // could have fixup enable toggle here
}

type TransformerFunc<TValue, TRaw> = (state: ParseSerialise<TValue, TRaw>) => void;

abstract class AnkFormat<TValue, TRaw, TRequired extends boolean> {
    #transformer: TransformerFunc<TValue, TRaw>;
    #isRequired: TRequired;
    public readonly empty: TRaw;

    constructor(isRequired: TRequired, empty: TRaw) {
        this.#transformer = s => { };
        this.#isRequired = isRequired;
        this.empty = empty;
    }

    public get isRequired(): TRequired { return this.#isRequired; }
    protected set isRequired(value: TRequired) { this.#isRequired = value; }

    protected extendWith(transformer: TransformerFunc<TValue, TRaw>): this {
        const extended = new (this.constructor as any)(this.#isRequired) as this; // eslint-disable-line @typescript-eslint/no-unsafe-call
        for (const key in this)
            if (Object.hasOwn(this, key))
                extended[key] = this[key];
        const oldTransformers = this.#transformer;
        extended.#transformer = (s: ParseSerialise<TValue, TRaw>) => {
            oldTransformers(s);
            transformer(s);
        };
        return extended;
    }

    //abstract serialise(val: TValue): TRaw;

    required(message?: string): AnkFormat<TValue, TRaw, true> {
        const fmt = this.extendWith(s => {
            // if (s.error !== undefined)
            //     return;
            // if (s.isEmpty)
            //     s.error = message ?? "Required.";
        }) as AnkFormat<TValue, TRaw, true>;
        fmt.isRequired = true;
        // TODO: STORE ERROR MESSAGE IN FMT
        return fmt;
    }

    parse(raw: TRaw): ParseSerialise<TValue, TRaw> {
        const state: ParseSerialise<TValue, TRaw> = {
            raw,
            parsed: undefined,
            isEmpty: true,
        };
        this.#transformer(state);
        return state;
    }

    abstract serialise(val: TValue): ParseSerialise<TValue, TRaw>;
}

export class ank {
    static parseString(): StringAnkFormat<boolean> {
        return new StringAnkFormat(false)._parse();
    }

    static parseNumber(message?: string): NumberAnkFormat<boolean> {
        return new NumberAnkFormat(false)._parse(message);
    }
}

class StringAnkFormat<TRequired extends boolean> extends AnkFormat<string, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    // serialise(val: string): string {
    //     return val;
    // }

    _parse(): this {
        return this.extendWith(s => {
            s.parsed = s.raw;
            s.isEmpty = s.parsed === "";
        });
    }

    serialise(val: string): ParseSerialise<string, string> {
        return this.parse(val);
    }

    trim(): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined)
                return;
            s.parsed = s.parsed.trim();
            s.isEmpty = s.parsed === "";
            s.raw = s.parsed; // no way to disable fixup
        });
    }
}

class NumberAnkFormat<TRequired extends boolean> extends AnkFormat<number, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    // serialise(val: number): string {
    //     if (this.decimals === undefined)
    //         return val.toString();
    //     let str = val.toFixed(this.decimals);
    //     if (Number(str) == val)
    //         return str;
    //     else
    //         return val.toString();
    // }

    _parse(message?: string): this {
        return this.extendWith(s => {
            s.raw = s.raw.trim();
            s.isEmpty = s.raw === "";
            if (s.isEmpty) {
                s.parsed = undefined;
                return;
            }
            if (!/^-?[0-9]*\.?[0-9]*$/.test(s.raw)) {
                s.error = message ?? "Enter a valid number.";
                return;
            }
            const num = Number(s.raw);
            if (isNaN(num)) {
                s.error = message ?? "Enter a valid number.";
                return;
            }
            s.parsed = num;
        });
    }

    serialise(val: number): ParseSerialise<number, string> {
        return this.parse(val.toString());
    }

    positive(message?: string): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed <= 0)
                s.error = message ?? "Enter a positive value.";
        });
    }

    max(max: number, message?: string): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed > max)
                s.error = message ?? `Enter a value less than or equal to ${this.serialise(max).raw}.`;
        });
    }

    decimals2(message?: string): this {
        return this.extendWith(s => {
            if (s.parsed !== undefined) {
                const str = s.parsed.toFixed(2);
                if (Number(str) == s.parsed)
                    s.raw = str;
                else
                    s.raw = s.parsed.toString();
            }
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (Math.abs(s.parsed * 100 - Math.round(s.parsed * 100)) > 0.000001)
                s.error = message ?? "No more than 2 digits for pence.";
        });
    }
}

/* from yup - this seems to force TS to show the full type instead of all the wrapped generics. See also https://github.com/microsoft/vscode/issues/94679 and https://stackoverflow.com/a/57683652/2010616 */
// type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T; // currently unused; lint complains about {}; try Record<string,never> instead?

export type AnkErrorMode = "initial" | "dirty" | "submit"; // initial: suppress all errors; dirty: show errors except "required"; submit: show all errors

export type AnkValue<TValue, TRaw, TReq extends boolean = boolean> = {
    format: AnkFormat<TValue, TRaw, TReq>;
    raw: TRaw;
    value: TValue | undefined;
    error: string | undefined;
    errorMode: AnkErrorMode;
    required: TReq;
    setFormat: (fmt: AnkFormat<TValue, TRaw, TReq>) => void;
    /** Sets the control to a specific parsed value. The error is updated per validation rules. */
    setValue: (val: TValue) => void;
    /** Resets the control to an empty value and clears the error, if any. */
    clear: () => void;
    commitRaw: (raw: TRaw) => TRaw | undefined;
    /** Sets the error display mode. */
    setErrorMode: (mode: AnkErrorMode) => void;
};

type AnkFormValues = {
    [key: string]: AnkValue<any, any, boolean>;
}

export type AnkFormOf<T> = {
    [K in keyof T]:
    T[K] extends AnkValue<infer TValue, any, true> ? TValue :
    T[K] extends AnkValue<infer TValue, any, boolean> ? TValue | undefined : never;
};
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

export function useAnkValue<TValue, TRaw, TReq extends boolean>(defaultValue: TValue | null, initialFormat: AnkFormat<TValue, TRaw, TReq>): AnkValue<TValue, TRaw, TReq> {
    const [result, internalSetResult] = useState(() => defaultValue === null ? initialFormat.parse(initialFormat.empty) : initialFormat.serialise(defaultValue));
    const [errorMode, internalSetErrorMode] = useState<AnkErrorMode>("dirty"); // later: config to use "initial" instead
    const [format, _setFormat] = useState(initialFormat);

    function _setState(ps: ParseSerialise<TValue, TRaw>, em: AnkErrorMode | undefined) {
        if (em !== undefined)
            internalSetErrorMode(em);
        else if (ps.raw !== result.raw && errorMode !== "submit")
            internalSetErrorMode("dirty");
        internalSetResult(ps);
    }

    function setFormat(fmt: AnkFormat<TValue, TRaw, TReq>) {
        _setFormat(fmt);
        _setState(fmt.parse(result.raw), errorMode); // preserve current error mode // TODO: accept error mode parameter
    }
    function setValue(val: TValue) {
        _setState(format.serialise(val), "dirty"); // TODO: accept error mode parameter
    }
    function commitRaw(newraw: TRaw): TRaw | undefined {
        const p = format.parse(newraw);
        if (p.error !== undefined) {
            // we have some kind of an error - leave raw as the format returned it
            _setState(p, undefined);
        } else if (p.parsed !== undefined) {
            // parsed to a non-empty value - re-serialise to fix up the raw value per the format
            const ps = format.serialise(p.parsed);
            _setState(ps, undefined);
            return ps.raw;
        } else {
            // error and value are both undefined - this is an empty value but not exactly the same as "clear" due to error mode
            _setState(format.parse(format.empty), undefined);
        }
    }
    function clear() {
        _setState(format.parse(format.empty), "dirty"); // TODO: config prop to use "initial" instead
    }
    function setErrorMode(mode: AnkErrorMode) {
        internalSetErrorMode(mode);
    }

    let error = errorMode === "initial" ? undefined : result.error;
    if (errorMode === "submit" && error === undefined && format.isRequired && result.isEmpty)
        error = "Required."; // TODO: customizable message

    return {
        required: format.isRequired,
        format,
        raw: result.raw,
        value: result.parsed,
        error,
        errorMode,
        setFormat,
        setValue,
        commitRaw,
        clear,
        setErrorMode,
    };
}

export interface AnkTextFieldProps<TValue, TReq extends boolean> extends React.ComponentProps<typeof TextField> {
    ank: AnkValue<TValue, string, TReq>;
}

export function AnkTextField<TValue, TReq extends boolean>({ ank, ...rest }: AnkTextFieldProps<TValue, TReq>): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [suppressError, setSuppressError] = useState(false);
    // TODO: we suppress error on focus because ank.error doesn't update as we edit - but we can still call ank.format.parse (+"required" logic)

    useEffect(() => {
        if (ank.raw !== raw)
            setRaw(ank.raw);
    }, [ank.raw]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRaw(e.target.value);
    }
    function handleFocus() {
        setSuppressError(true);
    }
    function handleBlur() {
        setSuppressError(false);
        commit();
    }
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isKey(e, "Enter")) {
            setSuppressError(false);
            commit();
        } else {
            setSuppressError(true);
        }
    }
    function commit() {
        const newraw = ank.commitRaw(raw);
        if (newraw !== undefined)
            setRaw(newraw); // this ensures that the raw value gets re-formatted per the format even if the parsed value didn't change
    }

    return <TextField {...rest} value={raw} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        required={ank.format.isRequired} error={!suppressError && !!ank.error} helperText={!suppressError && ank.error} />
}

export function isKey(e: KeyboardEvent | React.KeyboardEvent, key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): boolean {
    return e.key === key && e.ctrlKey === (ctrl ?? false) && e.altKey === (alt ?? false) && e.shiftKey === (shift ?? false);
}
