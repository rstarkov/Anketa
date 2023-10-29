import { Button, Unstable_Grid2 as Grid2 } from "@mui/material";
import { DateTime } from "luxon";
import { useState } from "react";
import { AnkTextField, ankFormatAmount, ankFormatText, useAnkValue } from "~/ui/Anketa";
import { DateTextField } from "~/ui/DateTextField";
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

export function TestAnketaPage(): JSX.Element {
    const [dtfDate, dtfSetDate] = useState<DateTime>();

    const textReq = useAnkValue("", ankFormatText);
    const amountReq = useAnkValue(null, ankFormatAmount);

    const initialAmount1 = useAnkValue(23.7, ankFormatAmount);
    const initialAmount2 = useAnkValue(23.701, ankFormatAmount);
    const initialText1 = useAnkValue(null, ankFormatText);
    const initialText2 = useAnkValue("  foo ", ankFormatText);

    function clickSubmit() {
        //???
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
        <HeaderPage>Test Two</HeaderPage>

        <Header2>Anketa</Header2>
        <Grid2 container spacing="1rem" alignItems="center">
            <Grid2 ph={3} data-testid="ank-amount-req-inp"><AnkTextField ank={amountReq} label="Ank Amount Req" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-amount-req-trueval">{strTestVal(amountReq.value)}</Grid2>
            <Grid2 ph={3} data-testid="ank-amount-req-trueerr">{strTestVal(amountReq.error)}</Grid2>
            <Grid2 ph={3} data-testid="ank-amount-req-submval"></Grid2>

            <Grid2 ph={3} data-testid="ank-text-req-inp"><AnkTextField ank={textReq} label="Ank Text Req" size="small" fullWidth /></Grid2>
            <Grid2 ph={3} data-testid="ank-text-req-trueval">{strTestVal(textReq.value)}</Grid2>
            <Grid2 ph={3} data-testid="ank-text-req-trueerr">{strTestVal(textReq.error)}</Grid2>
            <Grid2 ph={3} data-testid="ank-text-req-submval"></Grid2>

            <Grid2 ph={3}><DateTextField date={dtfDate} setDate={dtfSetDate} label="Date Text Field" size="small" fullWidth /></Grid2>
            <Grid2 ph={3}>{strTestVal(dtfDate)}</Grid2>
            <Grid2 ph={6}></Grid2>

            <Grid2 ph={12} data-testid="submit-status">{undefined ? "Submit accepted" : "Not yet submitted"}</Grid2>

            <Grid2 ph={3}><Button onClick={clickSubmit} data-testid="submit" variant="contained" fullWidth>Submit</Button></Grid2>
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
