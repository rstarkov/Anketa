import { TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { isKey } from "~/util/misc";

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
        const extended = new (this.constructor as any)(this.#isRequired) as this;
        for (const key in this)
            if (this.hasOwnProperty(key))
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
        var fmt = this.extendWith(s => {
            if (s.error !== undefined)
                return;
            if (s.isEmpty)
                s.error = message ?? "Required.";
        }) as AnkFormat<TValue, TRaw, true>;
        fmt.isRequired = true;
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
    static parseString(): StringAnkFormat<false> {
        return new StringAnkFormat(false)._parse();
    }

    static parseNumber(message?: string): NumberAnkFormat<false> {
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

    decimals2(message?: string): this {
        return this.extendWith(s => {
            if (s.parsed !== undefined) {
                let str = s.parsed.toFixed(2);
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
type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T;

export type AnkValue<TValue, TRaw, TReq extends boolean = boolean> = {
    format: AnkFormat<TValue, TRaw, TReq>;
    raw: TRaw;
    value: TValue | undefined;
    error: string | undefined;
    required: TReq;
    setFormat: (fmt: AnkFormat<TValue, TRaw, TReq>) => void;
    setValue: (val: TValue) => void;
    clear: () => void;
    commitRaw: (raw: TRaw) => TRaw | undefined;
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
    let result: Partial<AnkFormOf<T>> = {};
    for (let key in form) {
        if (form.hasOwnProperty(key)) {
            const ankValue = form[key];
            result[key as keyof T] = ankValue.value;
        }
    }
    return result as AnkFormOf<T>;
}

export function useAnkValue<TValue, TRaw, TReq extends boolean>(defaultValue: TValue | null, initialFormat: AnkFormat<TValue, TRaw, TReq>): AnkValue<TValue, TRaw, TReq> {
    const initial = useMemo(() => defaultValue === null ? initialFormat.parse(initialFormat.empty) : initialFormat.serialise(defaultValue), []);
    const [format, internalSetFormat] = useState(initialFormat);
    const [raw, internalSetRaw] = useState<TRaw>(initial.raw);
    const [value, internalSetValue] = useState<TValue | undefined>(initial.parsed);
    const [error, internalSetError] = useState<string | undefined>(initial.error);

    function setFormat(fmt: AnkFormat<TValue, TRaw, TReq>) {
        internalSetFormat(fmt);
        const ps = fmt.parse(raw);
        internalSetError(ps.error);
        internalSetValue(ps.parsed);
        internalSetRaw(ps.raw);
    }
    function setValue(val: TValue) {
        const ps = format.serialise(val);
        internalSetError(ps.error);
        internalSetValue(ps.parsed);
        internalSetRaw(ps.raw);
    }
    function commitRaw(raw: TRaw): TRaw | undefined {
        var p = format.parse(raw);
        if (p.error !== undefined) {
            internalSetError(p.error);
            internalSetValue(p.parsed);
            internalSetRaw(p.raw);
        } else if (p.parsed !== undefined) {
            const ps = format.serialise(p.parsed);
            internalSetError(ps.error);
            internalSetValue(ps.parsed);
            internalSetRaw(ps.raw);
            return ps.raw; // TODO <<<<<<<<<<<<<< how is the return value used?
        } else // both undefined, ie {}
            clear();
    }
    function clear() {
        internalSetRaw(format.empty);
        internalSetValue(format.parse(format.empty).parsed);
        internalSetError(undefined);
    }
    return {
        required: format.isRequired,
        format,
        raw,
        value,
        error,
        setFormat,
        /** Sets the control to a specific parsed value. The error is updated per validation rules. */
        setValue,
        commitRaw,
        /** Resets the control to an empty value and clears the error, if any. */
        clear,
    };
}

export interface AnkTextFieldProps<TValue, TReq extends boolean> extends React.ComponentProps<typeof TextField> {
    ank: AnkValue<TValue, string, TReq>;
}

export function AnkTextField<TValue, TReq extends boolean>({ ank, ...rest }: AnkTextFieldProps<TValue, TReq>): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [suppressError, setSuppressError] = useState(false);

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
        if (newraw !== undefined) // TODO <<<<<<<<<<<<<< no longer necessary now that we respond to raw changes directly
            setRaw(newraw);
    }

    return <TextField {...rest} value={raw} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={!suppressError && !!ank.error} helperText={!suppressError && ank.error} />
}
