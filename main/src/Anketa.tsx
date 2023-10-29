import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { isKey } from "~/util/misc";

export function useAnkValue<TValue, TRaw>(defaultValue: TValue | null, format: AnkFormat<TValue, TRaw>) {
    const [value, internalSetValue] = useState<TValue | undefined>(() => defaultValue == null ? format.empty : roundtripped(defaultValue));
    const [error, internalSetError] = useState<string | undefined>(() => defaultValue == null ? undefined : format.validate(defaultValue));

    function roundtripped(val: TValue): TValue {
        const roundtripped = format.parse(format.serialise(val)); // this might clean up some values - think string trimming
        if (roundtripped.parsed !== undefined)
            return roundtripped.parsed; // a properly implemented format implementation won't error
        else
            return val; // but if it does we just use the non-roundtripped val
    }
    function setValue(val: TValue) {
        val = roundtripped(val);
        const validated = format.validate(val);
        internalSetError(validated);
        internalSetValue(val);
    }
    function setError(error: string) {
        internalSetError(error);
        internalSetValue(undefined);
    }
    function clear() {
        internalSetValue(format.empty);
        internalSetError(undefined);
    }
    return {
        format,
        value,
        error,
        /** Sets the control to a specific parsed value. The error is updated per validation rules. */
        setValue,
        /** Sets an error state with the specified message, and clears the value. This function cannot clear the error - use setValue or clear. */
        setError,
        /** Resets the control to an empty value and clears the error, if any. */
        clear,
    };
}

export type AnkValue<TValue, TRaw> = ReturnType<typeof useAnkValue<TValue, TRaw>>;

export interface AnkFormat<TValue, TRaw> {
    /** Note to implementors: serialise MUST round-trip when parsed for all values that parse without error! */
    serialise: (val: TValue) => TRaw;
    /** Note to implementors: parse must know how the control represents the empty state, if any, and return {} for it. */
    parse: (raw: TRaw) => { parsed?: TValue, error?: string };
    validate: (val: TValue) => string | undefined;
    /** Note to implementors: this must equal parse(<empty control>).parsed */
    empty: TValue | undefined;
}

export const ankFormatText: AnkFormat<string, string> = {
    serialise: v => v,
    parse: (raw: string): { parsed?: string, error?: string } => ({ parsed: raw.trim() }),
    validate: (val: string) => undefined,
    empty: "",
};

export const ankFormatAmount: AnkFormat<number, string> = {
    serialise: v => {
        let str = v.toFixed(2);
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
    validate: (val: number): string | undefined => {
        if (val <= 0)
            return "Enter a value greater than 0.";
        else if (Math.abs(val * 100 - Math.round(val * 100)) > 0.000001)
            return "No more than 2 digits for pence.";
    },
    empty: undefined,
};

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

    useEffect(() => {
        if (ank.value === undefined && ank.error !== undefined)
            return; // this looks like a format parse error, so don't update the value (we could only set it to empty anyhow)
        setRaw(ank.value === undefined ? "" : ank.format.serialise(ank.value));
    }, [ank.value, ank.error]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRaw(e.target.value);
    }
    function handleBlur() {
        commit();
    }
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isKey(e, "Enter"))
            commit();
    }
    function commit() {
        const newraw = ankCommit(raw, ank);
        if (newraw !== undefined)
            setRaw(newraw);
    }

    return <TextField {...rest} value={raw} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={!!ank.error} helperText={ank.error} />
}
