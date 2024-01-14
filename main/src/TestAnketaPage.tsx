import { Button, Unstable_Grid2 as Grid2 } from "@mui/material";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { AnkTextField, ank, useAnkValue } from "~/ui/Anketa";
//import { AnkFormOf, AnkFormat, AnkTextField, ankFormValues, ankFormatAmount, ankFormatText, ankFormatTextRequired, useAnkValue } from "~/ui/Anketa";
import { Header2, HeaderPage, PageContainer, PageWidth } from "~/ui/standard";
import { unreachable } from "~/util/misc";

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

export function TestAnketaPage(): JSX.Element {
    const form = {
        TextOpt: useAnkValue(null, fmtText),
        TextReq: useAnkValue(null, fmtTextReq),
        NumOpt: useAnkValue(null, fmtAmount),
        NumReq: useAnkValue(null, fmtAmountReq),
        TextVariable: useAnkValue(null, fmtText),
        NumVariable: useAnkValue(null, fmtAmount),
    };

    const textReq = useAnkValue(null, fmtTextReq);
    const amountReq = useAnkValue(null, fmtAmountReq);

    const initialAmount1 = useAnkValue(23.7, fmtAmountReq);
    const initialAmount2 = useAnkValue(23.701, fmtAmountReq);
    const initialText1 = useAnkValue(null, fmtTextReq);
    const initialText2 = useAnkValue("  foo ", fmtTextReq);

    useFormEffect(() => {
        if (form.NumOpt.isValid() && !form.NumOpt.isEmpty())
            form.NumVariable.setFormat(fmtAmount.max(form.NumReq.value, `Must be less than ${form.NumReq.value} (num req)`));
        else
            form.NumVariable.setFormat(fmtAmount);

        if (form.NumReq.isValid() && form.NumReq.value > 10)
            form.TextVariable.setFormat(fmtTextReq);
        else
            form.TextVariable.setFormat(fmtText);
    }, form);

    function clickSubmit() {
        let val = ankFormValues(form);
        if (val === undefined)
            return;
        alert("accept");
    }
    function clickSet1() {
        textReq.setValue(" req  txt  ");
        amountReq.setValue(47.2);
    }
    function clickSet2() {
        textReq.setValue("");
        amountReq.setValue(-25);
    }
    function clickClear() {
        textReq.clear();
        amountReq.clear();
    }

    return <PageContainer><PageWidth>
        <HeaderPage>Test Anketa</HeaderPage>

        <Header2>Full form</Header2>
        <Grid2 container spacing="1rem" alignItems="center">
            <Grid2 ph={3} data-testid="form-text-opt-inp"><AnkTextField ank={form.TextOpt} label="Form Text Opt" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-text-opt-trueval">{strTestVal(form.TextOpt.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-opt-trueerr">{strTestVal(form.TextOpt.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-opt-submit"></Grid2>

            <Grid2 ph={3} data-testid="form-text-req-inp"><AnkTextField ank={form.TextReq} label="Form Text Req" required={true} size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-text-req-trueval">{strTestVal(form.TextReq.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-req-trueerr">{strTestVal(form.TextReq.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-req-submit"></Grid2>

            <Grid2 ph={3} data-testid="form-num-opt-inp"><AnkTextField ank={form.NumOpt} label="Form Num Opt" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-num-opt-trueval">{strTestVal(form.NumOpt.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-opt-trueerr">{strTestVal(form.NumOpt.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-opt-submit"></Grid2>

            <Grid2 ph={3} data-testid="form-num-req-inp"><AnkTextField ank={form.NumReq} label="Form Num Req" required={true} size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-num-req-trueval">{strTestVal(form.NumReq.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-req-trueerr">{strTestVal(form.NumReq.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-req-submit"></Grid2>

            <Grid2 ph={3} data-testid="form-text-variable-inp"><AnkTextField ank={form.TextVariable} label="Form Text Variable" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-text-variable-trueval">{strTestVal(form.TextVariable.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-variable-trueerr">{strTestVal(form.TextVariable.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-text-variable-submit"></Grid2>

            <Grid2 ph={3} data-testid="form-num-variable-inp"><AnkTextField ank={form.NumVariable} label="Form Num Variable" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="form-num-variable-trueval">{strTestVal(form.NumVariable.value)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-variable-trueerr">{strTestVal(form.NumVariable.error)}</Grid2>
            <Grid2 ph={3} data-testid="form-num-variable-submit"></Grid2>

            <Grid2 ph={3}><Button onClick={clickSubmit} data-testid="submit" variant="contained" fullWidth>Submit</Button></Grid2>
        </Grid2>

        <Header2>Edit behaviours</Header2>
        <Grid2 container spacing="1rem" alignItems="center">
            <Grid2 ph={3} data-testid="ank-amount-req-inp"><AnkTextField ank={amountReq} label="Ank Amount Req" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-amount-req-trueval">{strTestVal(amountReq.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-amount-req-trueerr">{strTestVal(amountReq.error)}</Grid2>

            <Grid2 ph={3} data-testid="ank-text-req-inp"><AnkTextField ank={textReq} label="Ank Text Req" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-text-req-trueval">{strTestVal(textReq.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-text-req-trueerr">{strTestVal(textReq.error)}</Grid2>

            <Grid2 ph={3}><Button onClick={clickSet1} data-testid="set1" variant="contained" fullWidth>Set 1</Button></Grid2>
            <Grid2 ph={3}><Button onClick={clickSet2} data-testid="set2" variant="contained" fullWidth>Set 2</Button></Grid2>
            <Grid2 ph={3}><Button onClick={clickClear} data-testid="clear" variant="contained" fullWidth>Clear</Button></Grid2>
        </Grid2>

        <Header2>Initial values</Header2>
        <Grid2 container spacing="1rem" alignItems="center">
            <Grid2 ph={3} data-testid="ank-initial-amount-1-inp"><AnkTextField ank={initialAmount1} label="Initial Amount 1" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-initial-amount-1-trueval">{strTestVal(initialAmount1.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-initial-amount-1-trueerr">{strTestVal(initialAmount1.error)}</Grid2>

            <Grid2 ph={3} data-testid="ank-initial-amount-2-inp"><AnkTextField ank={initialAmount2} label="Initial Amount 2" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-initial-amount-2-trueval">{strTestVal(initialAmount2.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-initial-amount-2-trueerr">{strTestVal(initialAmount2.error)}</Grid2>

            <Grid2 ph={3} data-testid="ank-initial-text-1-inp"><AnkTextField ank={initialText1} label="Initial Text 1" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-initial-text-1-trueval">{strTestVal(initialText1.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-initial-text-1-trueerr">{strTestVal(initialText1.error)}</Grid2>

            <Grid2 ph={3} data-testid="ank-initial-text-2-inp"><AnkTextField ank={initialText2} label="Initial Text 2" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-initial-text-2-trueval">{strTestVal(initialText2.value)}</Grid2>
            <Grid2 ph={6} data-testid="ank-initial-text-2-trueerr">{strTestVal(initialText2.error)}</Grid2>
        </Grid2>

        <div style={{ height: "20rem" }}></div>

    </PageWidth></PageContainer>;
}
