import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { isStringLikeFormat } from ".";
import { isKey, useDebounce } from "./shared";
import type { AnkValueBase } from "./value";

export interface AnkTextFieldProps<TValue> extends React.ComponentProps<typeof TextField> {
    ank: AnkValueBase<TValue, string>;
    /** Set to true to automatically show an empty value when the control is disabled, without clearing the actual underlying value. */
    blankDisabled?: boolean;
    /** Invoked on every raw value change. */
    onRawChange?: (raw: string) => void;
    /** If true the error text is hidden at all times. */
    noErrorText?: boolean;
}

/**
 * @param inputProps.maxLength may be set to "null" to disable the automatically applied limit that's based on the current format rules.
 */
export function AnkTextField<TValue>({ ank, blankDisabled, onRawChange, noErrorText, inputProps, onFocus, onBlur, ...rest }: AnkTextFieldProps<TValue>): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [activelyEditing, setActivelyEditing] = useState(false);
    // TODO: we suppress error on focus because ank.error doesn't update as we edit - but we can still call ank.format.parse (+"required" logic)

    // update the local raw when the parent is updated, except if we're actively editing (in particular, the delayed auto-commit must not cause a raw value change)
    useEffect(() => {
        if (ank.raw !== raw && !activelyEditing)
            setRaw(ank.raw);
    }, [ank.raw]);

    // commit after a timeout if the user has stopped typing
    useDebounce(() => {
        if (ank.raw !== raw)
            commit(raw, true); // it's the "raw" from some time ago, but it hasn't changed as it's in the debounce dependency list
    }, 500, [raw]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRaw(e.target.value);
        if (rest.select)
            commit(e.target.value); // select controls commit the value on select, without waiting for a focus change
        if (onRawChange)
            onRawChange(e.target.value);
    }
    function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setActivelyEditing(true);
        if (onFocus)
            onFocus(e);
    }
    function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setActivelyEditing(false);
        commit(raw);
        if (onBlur)
            onBlur(e);
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
    function commit(actualRaw: string, preserveRaw?: boolean) {
        const newraw = ank.commitRaw(actualRaw);
        if (newraw !== undefined && !preserveRaw)
            setRaw(newraw); // this ensures that the raw value gets re-formatted per the format even if the parsed value didn't change
    }

    inputProps = inputProps ?? {};
    if (inputProps.maxLength === null)
        inputProps.maxLength = undefined;
    else if (isStringLikeFormat(ank.format))
        inputProps.maxLength = ank.format._maxLen;

    return <TextField {...rest} value={blankDisabled && rest.disabled ? "" : raw} onChange={handleChange}
        onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        error={rest.error === undefined ? (!activelyEditing && !!ank.error) : rest.error}
        helperText={(!activelyEditing && ank.error !== undefined && !noErrorText) ? ank.error : rest.helperText}
        required={ank.required}
        inputProps={inputProps}
    />;
}
