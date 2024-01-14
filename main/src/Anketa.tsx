import { TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { isKey } from "~/util/misc";

interface ParseSerialise<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue;
    error?: string;
    isEmpty: boolean;
    // isEmpty should probably know how to look at raw and decide if it's empty
    // could have fixup enable toggle here
}

type TransformerFunc<TValue, TRaw> = (state: ParseSerialise<TValue, TRaw>) => void;

abstract class AnkFormat<TValue, TRaw, TRequired extends boolean> {
    private transformer: TransformerFunc<TValue, TRaw>;
    public readonly isRequired: TRequired;
    public readonly empty: TRaw;

    constructor(isRequired: TRequired, empty: TRaw) {
        this.transformer = s => { };
        this.isRequired = isRequired;
        this.empty = empty;
    }

    protected extendWith(transformer: TransformerFunc<TValue, TRaw>): this {
        const extended = new (this.constructor as any)(this.required) as this;
        for (const key in this)
            if (this.hasOwnProperty(key))
                extended[key] = this[key];
        const oldTransformers = this.transformer;
        this.transformer = (s: ParseSerialise<TValue, TRaw>) => {
            oldTransformers(s);
            transformer(s);
        };
        return extended;
    }

    //abstract serialise(val: TValue): TRaw;

    required(message?: string): this & AnkFormat<TValue, TRaw, true> {
        return this.extendWith(s => {
            if (s.error !== undefined)
                return;
            if (s.isEmpty)
                s.error = message ?? "Required.";
        }) as this & AnkFormat<TValue, TRaw, true>;
    }

    parse(raw: TRaw): ParseSerialise<TValue, TRaw> {
        const state: ParseSerialise<TValue, TRaw> = {
            raw,
            parsed: raw as any,
            isEmpty: true,
        };
        this.transformer(state);
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
        });
    }

    serialise(val: string): ParseSerialise<string, string> {
        return this.parse(val);
    }

    trim(): this {
        return this.extendWith(s => {
            if (s.error !== undefined)
                return;
            s.parsed = s.parsed.trim();
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
            if (s.isEmpty) {
                s.parsed = 0;
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
            if (s.error !== undefined || s.isEmpty)
                return;
            if (s.parsed <= 0)
                s.error = message ?? "Enter a positive value.";
        });
    }

    decimals2(message?: string): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.isEmpty)
                return;
            if (Math.abs(s.parsed * 100 - Math.round(s.parsed * 100)) > 0.000001)
                s.error = message ?? "No more than 2 digits for pence.";
            let str = s.parsed.toFixed(2);
            if (Number(str) == s.parsed)
                s.raw = str;
            else
                s.raw = s.parsed.toString();
        });
    }
}

/* from yup - this seems to force TS to show the full type instead of all the wrapped generics. See also https://github.com/microsoft/vscode/issues/94679 and https://stackoverflow.com/a/57683652/2010616 */
type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T;

export type AnkValue<TValue, TRaw, TReq extends boolean = boolean> = {
    format: AnkFormat<TValue, TRaw, TReq>;
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
    const [raw, internalSetRaw] = useState<TRaw>(initialFormat.empty);
    const [value, internalSetValue] = useState<TValue | undefined>(initial.parsed);
    const [error, internalSetError] = useState<string | undefined>(initial.error);

    function setFormat(fmt: AnkFormat<TValue, TRaw, TReq>) {
        internalSetFormat(fmt);
        const ps = format.parse(raw);
        internalSetError(ps.error);
        internalSetValue(ps.parsed);
    }
    function setValue(val: TValue) {
        const ps = format.serialise(val);
        internalSetError(ps.error);
        internalSetValue(ps.parsed);
    }
    function commitRaw(raw: TRaw): TRaw | undefined {
        var p = format.parse(raw);
        if (p.error !== undefined)
            internalSetError(p.error);
        else if (p.parsed !== undefined) {
            const ps = format.serialise(p.parsed);
            internalSetError(ps.error);
            internalSetValue(ps.parsed);
            return ps.raw;
        } else // both undefined, ie {}
            clear();
    }
    function clear() {
        internalSetValue(format.parse(format.empty).parsed);
        internalSetError(undefined);
    }
    return {
        required: format.isRequired,
        format,
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
    const [raw, setRaw] = useState(ank.value === undefined ? "" : ank.format.serialise(ank.value).raw);
    const [suppressError, setSuppressError] = useState(false);

    useEffect(() => {
        if (ank.value === undefined && ank.error !== undefined)
            return; // this looks like a format parse error, so don't update the value (we could only set it to empty anyhow)
        setRaw(ank.value === undefined ? "" : ank.format.serialise(ank.value).raw);
    }, [ank.value, ank.error]);

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
            setRaw(newraw);
    }

    return <TextField {...rest} value={raw} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={!suppressError && !!ank.error} helperText={!suppressError && ank.error} />
}

// let x: AnkValue<string, string, true> = useAnkValue(null, ank.parseString().required());
// let y: AnkValue<string, string, infer T> = x;
// y = x; // should be possible!
// let xx = x.setFormat;
// let yy = y.setFormat;
// yy = xx; // should be possible!
