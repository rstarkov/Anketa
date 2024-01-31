import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import type { AnkValueBase } from "./value";
import { isKey } from "./shared";

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
        required={ank.required} error={!suppressError && !!ank.error} helperText={(!suppressError && ank.error) ?? rest.helperText} />;
}
