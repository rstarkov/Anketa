import { TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

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
type _<T> = T extends object ? { [k in keyof T]: T[k] } : T;

export type AnkErrorMode = "initial" | "dirty" | "submit"; // initial: suppress all errors; dirty: show errors except "required"; submit: show all errors

// split into AnkValueBase+AnkValue because setFormat requires "reverse" assignment of TReq. So AnkValueBase<true> is assignable to AnkValueBase<bool>, but this can't work for AnkValue<>.
export interface AnkValueBase<TValue, TRaw, TReq extends boolean = boolean> {
    format: AnkFormat<TValue, TRaw, TReq>;
    raw: TRaw;
    value: TValue | undefined;
    error: string | undefined;
    errorMode: AnkErrorMode;
    required: TReq;
    /** Sets the control to a specific parsed value. The error is updated per validation rules. */
    setValue: (val: TValue) => void;
    /** Resets the control to an empty value and clears the error, if any. */
    clear: () => void;
    commitRaw: (raw: TRaw) => TRaw | undefined;
    /** Sets the error display mode. */
    setErrorMode: (mode: AnkErrorMode) => void;
}

export interface AnkValue<TValue, TRaw, TReq extends boolean = boolean> extends AnkValueBase<TValue, TRaw, TReq> {
    setFormat: (fmt: AnkFormat<TValue, TRaw, TReq>) => void;
}

type AnkFormValues = {
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

export function useAnkForm<T extends AnkFormValues>(values: T, onSubmit: (values: AnkFormOf<T>) => void, onError?: () => void) {
    const [dummy, setDummy] = useState(0);
    const submitting = useRef(false);

    function submit() {
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
        onSubmit(result as AnkFormOf<T>);
    }, [dummy]);

    return {
        values,
        submit,
    };
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

export interface AnkTextFieldProps<TValue> extends React.ComponentProps<typeof TextField> {
    ank: AnkValueBase<TValue, string>;
}

export function AnkTextField<TValue>({ ank, ...rest }: AnkTextFieldProps<TValue>): JSX.Element {
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
        required={ank.required} error={!suppressError && !!ank.error} helperText={!suppressError && ank.error} />;
}

export function isKey(e: KeyboardEvent | React.KeyboardEvent, key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): boolean {
    return e.key === key && e.ctrlKey === (ctrl ?? false) && e.altKey === (alt ?? false) && e.shiftKey === (shift ?? false);
}
