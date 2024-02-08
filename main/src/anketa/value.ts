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
    };
}
