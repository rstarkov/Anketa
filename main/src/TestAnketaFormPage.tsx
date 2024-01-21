import { Button, Unstable_Grid2 as Grid2 } from "@mui/material";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { AnkTextField, ank, useAnkValue } from "./Anketa";
import { unreachable } from "./util";

function strTestVal(v: undefined | null | number | string | boolean | DateTime): string {
    if (v === undefined) return "<undefined>";
    if (v === null) return "<null>";
    if (typeof v === "number") return `number: ${v}`;
    if (typeof v === "string") return `string: ${v.replaceAll(" ", "_")}`;
    if (typeof v === "boolean") return `bool: ${v}`;
    if (v instanceof DateTime) return `date: ${v.toFormat("dd/MM/yyyy")}`;
    return unreachable(v);
}

const fmtText = ank.parseString().trim();
const fmtTextReq = fmtText.required();
const fmtAmount = ank.parseNumber("Enter a valid number.").positive("Enter a value greater than 0.").decimals2("No more than 2 digits for pence.");
const fmtAmountReq = fmtAmount.required();

export function TestAnketaFormPage(): JSX.Element {
    const form = {
        TextOpt: useAnkValue(null, fmtText),
        TextReq: useAnkValue(null, fmtTextReq),
        NumOpt: useAnkValue(null, fmtAmount),
        NumReq: useAnkValue(null, fmtAmountReq),
        TextVariable: useAnkValue(null, fmtText),
        NumVariable: useAnkValue(null, fmtAmount),
    };

    // When NumOpt is empty, NumVariable is required. When NumOpt is populated, NumVariable must be less than that, but becomes optional.
    useEffect(() => {
        if (form.NumOpt.value !== undefined)
            form.NumVariable.setFormat(fmtAmount.max(form.NumOpt.value, `Must be less than ${form.NumVariable.format.serialise(form.NumOpt.value).raw} (num opt)`));
        else
            form.NumVariable.setFormat(fmtAmountReq);
    }, [form.NumOpt.value]);

    // TextVariable is required if NumReq is greater than 10, otherwise optional
    useEffect(() => {
        if (form.NumReq.value !== undefined && form.NumReq.value > 10)
            form.TextVariable.setFormat(fmtTextReq);
        else
            form.TextVariable.setFormat(fmtText);
    }, [form.NumReq.value]);

    function clickSubmit() {
        form.TextOpt.setErrorMode("submit");
        form.TextReq.setErrorMode("submit");
        form.NumOpt.setErrorMode("submit");
        form.NumReq.setErrorMode("submit");
        form.TextVariable.setErrorMode("submit");
        form.NumVariable.setErrorMode("submit");
        // let val = ankFormValues(form);
        // if (val === undefined)
        //     return;
        // alert("accept");
    }
    function clickClear() {
        form.TextOpt.clear();
        form.TextReq.clear();
        form.NumOpt.clear();
        form.NumReq.clear();
        form.TextVariable.clear();
        form.NumVariable.clear();
    }

    return <div>
        <h1>Test Anketa</h1>

        <h2>Full form</h2>
        <Grid2 container spacing="1rem" alignItems="center">
            <Grid2 sm={3} data-testid="form-text-opt-inp"><AnkTextField ank={form.TextOpt} label="Form Text Opt" size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-text-opt-trueval">{strTestVal(form.TextOpt.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-opt-trueerr">{strTestVal(form.TextOpt.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-opt-submit"></Grid2>

            <Grid2 sm={3} data-testid="form-text-req-inp"><AnkTextField ank={form.TextReq} label="Form Text Req" required={true} size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-text-req-trueval">{strTestVal(form.TextReq.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-req-trueerr">{strTestVal(form.TextReq.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-req-submit"></Grid2>

            <Grid2 sm={3} data-testid="form-num-opt-inp"><AnkTextField ank={form.NumOpt} label="Form Num Opt" size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-num-opt-trueval">{strTestVal(form.NumOpt.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-opt-trueerr">{strTestVal(form.NumOpt.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-opt-submit"></Grid2>

            <Grid2 sm={3} data-testid="form-num-req-inp"><AnkTextField ank={form.NumReq} label="Form Num Req" required={true} size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-num-req-trueval">{strTestVal(form.NumReq.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-req-trueerr">{strTestVal(form.NumReq.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-req-submit"></Grid2>

            <Grid2 sm={3} data-testid="form-text-variable-inp"><AnkTextField ank={form.TextVariable} label="Form Text Variable" size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-text-variable-trueval">{strTestVal(form.TextVariable.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-variable-trueerr">{strTestVal(form.TextVariable.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-text-variable-submit"></Grid2>

            <Grid2 sm={3} data-testid="form-num-variable-inp"><AnkTextField ank={form.NumVariable} label="Form Num Variable" size="small" fullWidth /></Grid2>
            <Grid2 sm={3} data-testid="form-num-variable-trueval">{strTestVal(form.NumVariable.value)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-variable-trueerr">{strTestVal(form.NumVariable.error)}</Grid2>
            <Grid2 sm={3} data-testid="form-num-variable-submit"></Grid2>

            <Grid2 sm={3}><Button onClick={clickSubmit} data-testid="submit" variant="contained" fullWidth>Submit</Button></Grid2>
            <Grid2 sm={3}><Button onClick={clickClear} data-testid="clear" variant="contained" fullWidth>Clear</Button></Grid2>
        </Grid2>

        <div style={{ height: "20rem" }}></div>

    </div>;
}
