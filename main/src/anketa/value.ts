import { useState } from "react";
import type { AnkFormat, ParseSerialise } from "./formats";

export type AnkErrorMode = "initial" | "dirty" | "submit"; // initial: suppress all errors; dirty: show errors except "required"; submit: show all errors

// split into AnkValueBase+AnkValue because setFormat requires "reverse" assignment of TReq. So AnkValueBase<true> is assignable to AnkValueBase<bool>, but this can't work for AnkValue<>.
export interface AnkValueBase<TValue, TRaw, TReq extends boolean = boolean> {
    format: AnkFormat<TValue, TRaw, TReq>;
    raw: TRaw;
    value: TValue | undefined;
    error: string | undefined;
    errorMode: AnkErrorMode;
    required: TReq;
    /** Sets the control to a specific parsed value. The error is updated per validation rules. "null" sets an empty value - same as "clear" but with a different default errorMode.
     * @param errorMode Defaults to "dirty". */
    setValue: (val: TValue | null, errorMode?: AnkErrorMode) => void;
    /** Resets the control to an empty value. The effect is the same as setValue(null) but with a different default errorMode.
     * @param errorMode Defaults to "initial". */
    clear: (errorMode?: AnkErrorMode) => void;
    commitRaw: (raw: TRaw) => TRaw | undefined;
    /** Sets the error display mode. */
    setErrorMode: (mode: AnkErrorMode) => void;
    /** Sets the error text ONCE. This error text gets cleared on the next value update, and is only useful to call directly in form submit handler, esp for async validations. */
    setError: (error: string) => void;
}

export interface AnkValue<TValue, TRaw, TReq extends boolean = boolean> extends AnkValueBase<TValue, TRaw, TReq> {
    setFormat: (fmt: AnkFormat<TValue, TRaw, TReq>) => void;
}

export interface AnkValueOptions {
    /** If the parse results in an error, the default behaviour is to set value to undefined. This option instead leaves the value unchanged. An empty parse (even required) still sets the value to undefined. */
    preserveValueOnError?: boolean;
}

/**
 * @param defaultValue Initial value for the control. "null" is handled specially to specify that the control should start empty.
 * @param initialFormat Initial format for the control. Can be changed later via setFormat. DO NOT construct the format inline on every render! Store it in a const or memo.
 */
export function useAnkValue<TValue, TRaw, TReq extends boolean>(defaultValue: TValue | null, initialFormat: AnkFormat<TValue, TRaw, TReq>, opts?: AnkValueOptions): AnkValue<TValue, TRaw, TReq> {
    const [result, internalSetResult] = useState(() => defaultValue === null ? initialFormat.parse(initialFormat.empty) : initialFormat.serialise(defaultValue));
    const [errorMode, internalSetErrorMode] = useState<AnkErrorMode>("initial"); // later: config to use "dirty" optionally
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
    function setValue(val: TValue | null, errorMode: AnkErrorMode = "dirty") {
        if (val === null)
            _setState(format.parse(format.empty), errorMode);
        else
            _setState(format.serialise(val), errorMode);
    }
    function commitRaw(newraw: TRaw): TRaw | undefined {
        const p = format.parse(newraw);
        if (p.error !== undefined) {
            // we have some kind of an error - leave raw as the format returned it
            if (!opts?.preserveValueOnError)
                _setState(p, undefined);
            else
                _setState({ ...p, parsed: result.parsed }, undefined);
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
    function clear(errorMode: AnkErrorMode = "initial") {
        _setState(format.parse(format.empty), errorMode);
    }
    function setErrorMode(mode: AnkErrorMode) {
        internalSetErrorMode(mode);
    }
    function setError(error: string) {
        internalSetResult({ ...result, error });
    }

    let error = errorMode === "initial" ? undefined : result.error;
    if (errorMode === "submit" && error === undefined && format.isRequired && result.isEmpty)
        error = format._requiredError ?? "Required.";

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
        setError,
    };
}
