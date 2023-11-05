import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { isKey } from "~/util/misc";

// PRINCIPLES:
// - the control handles entirely the parsing of string inputs into a typed value
// - the control shows these parse errors all by itself, and sets the value to "undefined" if it's unparseable
// - we don't support determining if the control is empty, at least not in general
// - where the settings allow, the control sets the value to "null" if the control is "empty". If empty isn't allowed then it's set to "undefined" and treated as a parse error
// - how to empty: set value to undefined (is formatter-dependent - some might choose to always keep a 0 for example)
// QUESTIONS:
// - dirty and live-revalidation after failed submit
// WISHLIST:
// - ability to disable format fixup entirely - this would need some magic in the useEffect inside Ank Control
// - nice API for constructing formats on the fly
// - form helper that checks all values in one go (via array?)
// - tidy up arch/design in this regard: setValue(PARSED) assumes that it would only be given a value that came out of .parse, so it eg won't re-trim it.

export type AnkValue<TValue, TRaw, TRequired extends boolean> = {
    format: AnkFormat<TValue, TRaw, boolean>;
    value: TValue | undefined;
    error: string | undefined;
    required: TRequired;
    setFormat: (fmt: AnkFormat<TValue, TRaw, boolean>) => void;
    setValue: (val: TValue) => void;
    clear: () => void;
};

export function useAnkValue<TValue, TRaw, TReq extends boolean>(defaultValue: TValue | null, initialFormat: AnkFormat<TValue, TRaw, TReq>): AnkValue<TValue, TRaw, TReq> {
    const [format, internalSetFormat] = useState(initialFormat);
    const [value, internalSetValue] = useState<TValue | undefined>(() => defaultValue == null ? format.empty : roundtripped(defaultValue));
    const [error, internalSetError] = useState<string | undefined>(() => defaultValue == null ? undefined : format.validate(defaultValue));

    function roundtripped(val: TValue): TValue {
        const roundtripped = format.parse(format.serialise(val)); // this might clean up some values - think string trimming
        if (roundtripped.parsed !== undefined)
            return roundtripped.parsed; // a properly implemented format implementation won't error
        else
            return val; // but if it does we just use the non-roundtripped val
    }
    function setFormat(fmt: AnkFormat<TValue, TRaw, boolean>) {
        internalSetFormat(fmt);
        // TODO: REVALIDATE
    }
    function setValue(val: TValue) {
        val = roundtripped(val);
        const validated = format.validate(val);
        internalSetError(validated);
        internalSetValue(val);
    }
    function clear() {
        internalSetValue(format.empty);
        internalSetError(undefined);
    }
    return {
        format,
        value,
        error,
        setFormat,
        /** Sets the control to a specific parsed value. The error is updated per validation rules. */
        setValue,
        /** Resets the control to an empty value and clears the error, if any. */
        clear,
    };
}

export interface AnkFormat<TValue, TRaw, TRequired extends boolean> {
    /** Note to implementors: serialise MUST round-trip when parsed for all values that parse without error! */
    serialise: (val: TValue) => TRaw;
    /** Note to implementors: parse must know how the control represents the empty state, if any, and return {} for it. */
    parse: (raw: TRaw) => { parsed?: TValue, error?: string };
    /** Note to implementors: this must equal parse(<empty control>).parsed. If such a parse results in error then this must be `undefined`. */
    empty: TValue | undefined;
}

export interface AnkValidate<TValue> {
    validate: (val: TValue) => string | undefined;
    required: boolean;
}

type AnkFormValues = {
    [key: string]: AnkValue<any, any, boolean>;
}

/* from yup - this seems to force TS to show the full type instead of all the wrapped generics. See also https://github.com/microsoft/vscode/issues/94679 and https://stackoverflow.com/a/57683652/2010616 */
export type _<T> = T extends {} ? { [k in keyof T]: T[k] } : T;

export type AnkFormOf<T> = _<{
    [K in keyof T as T[K] extends AnkValue<any, any, true> ? K : never]: T[K] extends AnkValue<infer TValue, any, any> ? TValue : never;
} & {
        [K in keyof T as T[K] extends AnkValue<any, any, true> ? never : K]?: T[K] extends AnkValue<infer TValue, any, any> ? TValue : never;
    }>;
// Same but without optional properties
// export type AnkFormOf<T> = {
//     [K in keyof T]:
//     T[K] extends AnkValue<infer TValue, any, true> ? TValue :
//     T[K] extends AnkValue<infer TValue, any, boolean> ? TValue | undefined : never;
// };

export function ankFormValues<T extends AnkFormValues>(form: T): AnkFormOf<T> | undefined {
    let result: Partial<AnkFormOf<T>> = {};
    // TODO: POPULATE
    return result as AnkFormOf<T>;
}

export function ankFormatString(p: { trim?: boolean }): AnkFormat<string, string> {
    return {
        serialise: v => v,
        parse: (raw: string): { parsed?: string, error?: string } => ({ parsed: p.trim ? raw.trim() : raw }),
        empty: "",
    };
}

// todo: expand into minDecimals/maxDecimals with options for whether to fixup or error
export function ankFormatNumber(p: { decimals?: number }): AnkFormat<number, string> {
    return {
        serialise: v => {
            if (p.decimals === undefined)
                return v.toString();
            let str = v.toFixed(p.decimals);
            if (Number(str) == v)
                return str;
            else
                return v.toString();
        },
        parse: (raw: string): { parsed?: number, error?: string } => {
            raw = raw.trim();
            if (raw == "")
                return {};
            if (!/^-?[0-9]*\.?[0-9]*$/.test(raw))
                return { error: "Enter a valid number." };
            const num = Number(raw);
            if (isNaN(num))
                return { error: "Enter a valid number." };
            return { parsed: num };
        },
        empty: undefined,
    };
}

//validate: (val: string) => undefined,

// validate: (val: number): string | undefined => {
//     if (val <= 0)
//         return "Enter a value greater than 0.";
//     else if (Math.abs(val * 100 - Math.round(val * 100)) > 0.000001)
//         return "No more than 2 digits for pence.";
// },

interface ParseState<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue;
    error?: string;
    isEmpty: boolean;
    // isEmpty should probably know how to look at raw and decide if it's empty
    // could have fixup enable toggle here
}

function positive<TRaw>(s: ParseState<number, TRaw>, message?: string) {
    if (s.error !== undefined || s.isEmpty)
        return;
    if (s.parsed <= 0)
        s.error = message ?? "Enter a positive value.";
}

function required<TValue, TRaw>(s: ParseState<TValue, TRaw>, message?: string) {
    if (s.error !== undefined)
        return;
    if (s.isEmpty)
        s.error = message ?? "Required.";
}

function trim(s: ParseState<string, string>) {
    if (s.error !== undefined)
        return;
    s.parsed = s.parsed.trim();
    s.raw = s.parsed; // no way to disable fixup
}

function decimals2(s: ParseState<number, string>, message?: string) {
    if (s.error !== undefined || s.isEmpty)
        return;
    if (Math.abs(s.parsed * 100 - Math.round(s.parsed * 100)) > 0.000001)
        s.error = "No more than 2 digits for pence.";
    let str = s.parsed.toFixed(2);
    if (Number(str) == s.parsed)
        s.raw = str;
    else
        s.raw = s.parsed.toString();
}

function parseNumber(s: ParseState<number, string>, message?: string) {
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
}

// class ank<TValue, TRaw, TReq extends boolean> {
//     isRequired: TReq;
//     required(message?: string): ank<TValue, TRaw, true> {
//     }
// }

class ankTextFormat<TReq extends boolean> extends ank<string, string, TReq> {
}

/*
type SelectProps = {
    tag: 'SelectProps'
}
type RadioGroupProps = {
    tag: 'RadioGroupProps'
}
type CheckboxGroupProps = {
    tag: 'CheckboxGroupProps '
}
type SelectTypeExtend<T> =
    T extends { expand: false } ? SelectProps :
    T extends { expand: true; multiple: false } ? RadioGroupProps :
    T extends { expand: true; multiple: true; } ? CheckboxGroupProps :
    never;
type SelectTypeProps<T> = { // <------ type instead of interface
    multiple?: boolean;
    expand?: boolean;
} & SelectTypeExtend<T>;
let foo = { tag: "SelectProps", expand: false };
let xx: SelectTypeProps<typeof foo>;
function asdf(props: SelectionWidgetProps) {
}
*/
type Foob<TA extends boolean, TB> = TA extends true ? TB : TB | undefined;
type Result1 = Foob<true, string>;
type Result2 = Foob<false, number>;

type AnkFormSpec<TValue> = { [key: string]: AnkValue<TValue, any> };


// interface TypeFoo<T> {
//     val: T;
//     required: boolean;
// }

interface TypeFoo<T, R extends boolean> {
    val: T;
    required: R;
}

interface TypeBar {
    one: TypeFoo<string, true>;
    two: TypeFoo<number, false>;
    three: TypeFoo<number, boolean>;
}

type SpecialOf<T> = {
    [K in keyof T]:
    T[K] extends TypeFoo<infer U, true> ? U :
    T[K] extends TypeFoo<infer U, boolean> ? U | undefined : never;
};

type special = SpecialOf<TypeBar>;

type fooz = Partial<special>
type Special2<T> = {
    [K in keyof T]?: T[K] extends string ? T[K] : T[K];
};
type Special3<T> = {
    [K in keyof T]-?: T[K] extends string ? T[K] | undefined : T[K];
};
type foot = Special3<{ abc: string, def: number }>;


function ankCommit<TValue, TRaw>(raw: TRaw, ank: AnkValue<TValue, TRaw>): TRaw | undefined {
    var p = ank.format.parse(raw);
    if (p.error !== undefined)
        ank.setError(p.error);
    else if (p.parsed !== undefined) {
        ank.setValue(p.parsed);
        return ank.format.serialise(p.parsed);
    } else // both undefined, ie {}
        ank.clear();
}

export interface AnkTextFieldProps<TValue> extends React.ComponentProps<typeof TextField> {
    ank: AnkValue<TValue, string>;
}

export function AnkTextField<TValue>({ ank, ...rest }: AnkTextFieldProps<TValue>): JSX.Element {
    const [raw, setRaw] = useState(ank.value === undefined ? "" : ank.format.serialise(ank.value));
    const [suppressError, setSuppressError] = useState(false);

    useEffect(() => {
        if (ank.value === undefined && ank.error !== undefined)
            return; // this looks like a format parse error, so don't update the value (we could only set it to empty anyhow)
        setRaw(ank.value === undefined ? "" : ank.format.serialise(ank.value));
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
        const newraw = ankCommit(raw, ank);
        if (newraw !== undefined)
            setRaw(newraw);
    }

    return <TextField {...rest} value={raw} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={!suppressError && !!ank.error} helperText={!suppressError && ank.error} />
}
