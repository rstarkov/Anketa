import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import type { AnkValueBase } from "./value";
import { isKey } from "./shared";
import { isStringLikeFormat } from ".";

export interface AnkTextFieldProps<TValue> extends React.ComponentProps<typeof TextField> {
    ank: AnkValueBase<TValue, string>;
    /** Set to true to automatically show an empty value when the control is disabled, without clearing the actual underlying value. */
    blankDisabled?: boolean;
    /** Invoked on every raw value change. */
    onRawChange?: (raw: string) => void;
}

/**
 * @param inputProps.maxLength may be set to "null" to disable the automatically applied limit that's based on the current format rules.
 */
export function AnkTextField<TValue>({ ank, blankDisabled, onRawChange, inputProps, ...rest }: AnkTextFieldProps<TValue>): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [activelyEditing, setActivelyEditing] = useState(false);
    // TODO: we suppress error on focus because ank.error doesn't update as we edit - but we can still call ank.format.parse (+"required" logic)

    useEffect(() => {
        if (ank.raw !== raw)
            setRaw(ank.raw);
    }, [ank.raw]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRaw(e.target.value);
        if (rest.select)
            commit(e.target.value); // select controls commit the value on select, without waiting for a focus change
        if (onRawChange)
            onRawChange(e.target.value);
    }
    function handleFocus() {
        setActivelyEditing(true);
    }
    function handleBlur() {
        setActivelyEditing(false);
        commit(raw);
    }
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isKey(e, "Enter")) {
            setActivelyEditing(false);
            if (!rest.select)
                commit(raw); // it's committed in the change event anyway, and at this point here the "raw" hasn't been updated yet by the MUI control, breaking Enter
        } else {
            setActivelyEditing(true);
        }
    }
    function commit(actualRaw: string) {
        const newraw = ank.commitRaw(actualRaw);
        if (newraw !== undefined)
            setRaw(newraw); // this ensures that the raw value gets re-formatted per the format even if the parsed value didn't change
    }

    inputProps = inputProps ?? {};
    if (inputProps.maxLength === null)
        inputProps.maxLength = undefined;
    else if (isStringLikeFormat(ank.format))
        inputProps.maxLength = ank.format._maxLen;

    return <TextField {...rest} value={blankDisabled && rest.disabled ? "" : raw} onChange={handleChange}
        onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={rest.error === undefined ? (!activelyEditing && !!ank.error) : rest.error} helperText={(!activelyEditing && ank.error) ?? rest.helperText}
        required={ank.required}
        inputProps={inputProps}
    />;
}
