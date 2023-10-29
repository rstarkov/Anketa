import { Page, expect, test } from "@playwright/test";

async function checkAnkTextbox(page: Page, testid: string, raw: string, trueval: string, error: string | undefined) {
    await expect(page.getByTestId(`${testid}-trueval`)).toHaveText(trueval);
    await expect(page.getByTestId(`${testid}-trueerr`)).toHaveText(error === undefined ? "<undefined>" : `string: ${error.replaceAll(" ", "_")}`);
    await expect(page.getByTestId(`${testid}-inp`).getByRole("textbox")).toHaveValue(raw);
    if (error === undefined) {
        await expect(page.getByTestId(`${testid}-inp`).locator("label.MuiInputLabel-root")).not.toHaveClass("Mui-error");
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toHaveCount(0);
    } else {
        await expect(page.getByTestId(`${testid}-inp`).locator("label.MuiInputLabel-root")).toHaveClass(/\bMui-error\b/);
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toBeVisible();
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toHaveText(error);
    }
}

test("AnkNumberField @anketa", async ({ page }) => {
    await page.goto("/test/anketa");

    // Initial values as passed into useAnk
    await checkAnkTextbox(page, "ank-initial-amount-1", "23.70", "number: 23.7", undefined);
    await checkAnkTextbox(page, "ank-initial-amount-2", "23.701", "number: 23.701", "No more than 2 digits for pence.");
    await checkAnkTextbox(page, "ank-initial-text-1", "", "string: ", undefined);
    await checkAnkTextbox(page, "ank-initial-text-2", "foo", "string: foo", undefined);

    // Reset, check empty
    await page.getByTestId("clear").click();
    await checkAnkTextbox(page, "ank-amount-req", "", "<undefined>", undefined);
    await checkAnkTextbox(page, "ank-text-req", "", "string: ", undefined); // empty value expected instead of <undefined> to maintain the invariant of focus+blur = no change
    // Check valid number and format fixup
    const tbAmountReq = page.getByTestId("ank-amount-req-inp").getByRole("textbox");
    await tbAmountReq.focus();
    await tbAmountReq.fill("123.4");
    await checkAnkTextbox(page, "ank-amount-req", "123.4", "<undefined>", undefined);
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "123.40", "number: 123.4", undefined);
    // Check valid text and format fixup (trimming)
    const tbTextReq = page.getByTestId("ank-text-req-inp").getByRole("textbox");
    await tbTextReq.focus();
    await tbTextReq.fill(" foobar  ");
    await tbTextReq.blur();
    await checkAnkTextbox(page, "ank-text-req", "foobar", "string: foobar", undefined);
    // Check non-number
    await tbAmountReq.focus();
    await tbAmountReq.fill("123.4a");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "123.4a", "<undefined>", "Enter a valid number.");
    // Check out-of-range number
    await tbAmountReq.focus();
    await tbAmountReq.fill("-25");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "-25.00", "number: -25", "Enter a value greater than 0.");
    // Check invalid too many pence digits
    await tbAmountReq.focus();
    await tbAmountReq.fill("25.501");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "25.501", "number: 25.501", "No more than 2 digits for pence.");
    // Check valid too many pence digits
    await tbAmountReq.focus();
    await tbAmountReq.fill("25.5100");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "25.51", "number: 25.51", undefined);

    // Check Reset works
    await page.getByTestId("clear").click();
    await checkAnkTextbox(page, "ank-amount-req", "", "<undefined>", undefined);
    await checkAnkTextbox(page, "ank-text-req", "", "string: ", undefined); // empty value expected instead of <undefined> to maintain the invariant of focus+blur = no change
    // Check Set works
    await page.getByTestId("set1").click();
    await checkAnkTextbox(page, "ank-amount-req", "47.20", "number: 47.2", undefined);
    await checkAnkTextbox(page, "ank-text-req", "req  txt", "string: req__txt", undefined);
    // Programmatically setting an invalid value should show error
    await page.getByTestId("set2").click();
    await checkAnkTextbox(page, "ank-amount-req", "-25.00", "number: -25", "Enter a value greater than 0.");
    await checkAnkTextbox(page, "ank-text-req", "", "string: ", undefined); // this test setting a valid, empty value

    // Check raw value fixup when parsed doesn't change - numeric
    await page.getByTestId("clear").click();
    await tbAmountReq.focus();
    await tbAmountReq.fill("25.51");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "25.51", "number: 25.51", undefined);
    await tbAmountReq.focus();
    await tbAmountReq.fill("  25.51000 ");
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "25.51", "number: 25.51", undefined);
    // Check raw value fixup when parsed doesn't change - text
    await tbTextReq.focus();
    await tbTextReq.fill("foo ");
    await tbTextReq.blur();
    await checkAnkTextbox(page, "ank-text-req", "foo", "string: foo", undefined);
    await tbTextReq.focus();
    await tbTextReq.fill("  foo ");
    await tbTextReq.blur();
    await checkAnkTextbox(page, "ank-text-req", "foo", "string: foo", undefined);

    // test suppress error
    // test submit invalid with suppressed errors

    // maybe test? focus+blur must never change any of the values because the values should already all be up-to-date

    //await page.screenshot({ path: "foo1.png" });
});
