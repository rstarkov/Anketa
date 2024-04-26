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

    // TODO? blur+focus+blur must never change any of the values because the values should already all be up-to-date
}

async function checkAnkDropdown(page: Page, testid: string, raw: string, trueval: string, error: string | undefined) {
    await expect(page.getByTestId(`${testid}-trueval`)).toHaveText(trueval);
    await expect(page.getByTestId(`${testid}-trueerr`)).toHaveText(error === undefined ? "<undefined>" : `string: ${error.replaceAll(" ", "_")}`);
    await expect(page.getByTestId(`${testid}-inp`).locator("input")).toHaveValue(raw);
    if (error === undefined) {
        await expect(page.getByTestId(`${testid}-inp`).locator("label.MuiInputLabel-root")).not.toHaveClass("Mui-error");
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toHaveCount(0);
    } else {
        await expect(page.getByTestId(`${testid}-inp`).locator("label.MuiInputLabel-root")).toHaveClass(/\bMui-error\b/);
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toBeVisible();
        await expect(page.getByTestId(`${testid}-inp`).locator("p.MuiFormHelperText-root")).toHaveText(error);
    }
}

test("AnkTextField initial values", async ({ page }) => {
    await page.goto("/test/basic");

    // Initial values as passed into useAnk
    await checkAnkTextbox(page, "ank-initial-amount-1", "23.70", "number: 23.7", undefined);
    await checkAnkTextbox(page, "ank-initial-amount-2", "23.701", "number: 23.701", undefined); // even though it's errored, it hasn't been touched yet so no error
    await checkAnkTextbox(page, "ank-initial-text-1", "", "string: ", undefined);
    await checkAnkTextbox(page, "ank-initial-text-2", "foo", "string: foo", undefined);
});

test("AnkTextField basic user editing", async ({ page }) => {
    await page.goto("/test/basic");
    const tbAmountReq = page.getByTestId("ank-amount-req-inp").getByRole("textbox");
    const tbTextReq = page.getByTestId("ank-text-req-inp").getByRole("textbox");

    // Reset, check empty
    await page.getByTestId("clear").click();
    await checkAnkTextbox(page, "ank-amount-req", "", "<undefined>", undefined);
    await checkAnkTextbox(page, "ank-text-req", "", "string: ", undefined); // empty value expected instead of <undefined> to maintain the invariant of focus+blur = no change
    // Check valid number and format fixup
    await tbAmountReq.focus();
    await tbAmountReq.fill("123.4");
    await checkAnkTextbox(page, "ank-amount-req", "123.4", "<undefined>", undefined);
    await tbAmountReq.blur();
    await checkAnkTextbox(page, "ank-amount-req", "123.40", "number: 123.4", undefined);
    // Check valid text and format fixup (trimming)
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
});

test("AnkTextField programmatic editing", async ({ page }) => {
    await page.goto("/test/basic");
    const tbAmountReq = page.getByTestId("ank-amount-req-inp").getByRole("textbox");
    const tbTextReq = page.getByTestId("ank-text-req-inp").getByRole("textbox");

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
});

test("AnkTextField drop-down behaviours", async ({ page }) => {
    await page.goto("/test/basic");
    await checkAnkDropdown(page, "ank-drop-req", "", "<undefined>", undefined);
    await page.getByLabel('Ank Drop-down Req *').click();
    await page.getByRole('option', { name: 'Two' }).click();
    await checkAnkDropdown(page, "ank-drop-req", "two", "string: two", undefined);

    await page.getByTestId('clear').click();
    await page.getByLabel('Ank Drop-down Req *').press('ArrowDown');
    await page.getByRole('option', { name: 'One' }).press('ArrowDown');
    await page.getByRole('option', { name: 'Two' }).press('ArrowDown');
    await page.getByRole('option', { name: 'Three' }).press('Enter');
    await checkAnkDropdown(page, "ank-drop-req", "three", "string: three", undefined);
});

test("AnkTextField noErrorText", async ({ page }) => {
    async function checkTextbox(testid: string, red: boolean, hintText: string | undefined) {
        const boxdiv = page.getByTestId(testid);
        const hint = boxdiv.locator(".MuiFormHelperText-root");
        if (hintText !== undefined)
            await expect(hint).toBeVisible();
        else
            await expect(hint).toBeHidden();
        if (hintText !== undefined)
            await expect(hint).toHaveText(hintText);
        if (red)
            await expect(boxdiv.locator(".MuiInputBase-root")).toHaveClass(/\bMui-error\b/);
        else
            await expect(boxdiv.locator(".MuiInputBase-root")).not.toHaveClass(/\bMui-error\b/);
    }
    await page.goto("/test/basic");

    // check initial empty state on form load
    await checkTextbox("ank-yeserrortext", false, undefined);
    await checkTextbox("ank-noerrortext", false, undefined);
    await checkTextbox("ank-yeserrortext-hint", false, "some help");
    await checkTextbox("ank-noerrortext-hint", false, "more help");

    // check state when the field has an invalid value
    await page.getByTestId("ank-noerrortext").getByRole("textbox").fill("foo");
    await page.getByTestId("ank-noerrortext").getByRole("textbox").blur();
    await checkTextbox("ank-yeserrortext", true, "Enter a valid number.");
    await checkTextbox("ank-noerrortext", true, undefined); // there's no hint shown even though there's an error and the box is red
    await checkTextbox("ank-yeserrortext-hint", true, "Enter a valid number.");
    await checkTextbox("ank-noerrortext-hint", true, "more help"); // the hint must remain visible even though there's an error and the box is red

    // invalid value, but the error is forced to "": red error highlight is off
    await page.getByTestId("set-yesnoerror-empty").click();
    await checkTextbox("ank-yeserrortext", false, undefined);
    await checkTextbox("ank-noerrortext", false, undefined);
    await checkTextbox("ank-yeserrortext-hint", false, undefined); // box supplies a hint, but the "" error overrides it to not show
    await checkTextbox("ank-noerrortext-hint", false, "more help"); // box supplies a hint, but the "" error is ignored because of noErrorText and hint shows

    // check the state when the field has a valid value
    await page.getByTestId("ank-noerrortext").getByRole("textbox").fill("123");
    await page.getByTestId("ank-noerrortext").getByRole("textbox").blur();
    await checkTextbox("ank-yeserrortext", false, undefined);
    await checkTextbox("ank-noerrortext", false, undefined);
    await checkTextbox("ank-yeserrortext-hint", false, "some help");
    await checkTextbox("ank-noerrortext-hint", false, "more help");

    // valid value, but the error is forced to "Foo Bar": red error highlight is on
    await page.getByTestId("set-yesnoerror-foobar").click();
    await checkTextbox("ank-yeserrortext", true, "Foo Bar");
    await checkTextbox("ank-noerrortext", true, undefined);
    await checkTextbox("ank-yeserrortext-hint", true, "Foo Bar");
    await checkTextbox("ank-noerrortext-hint", true, "more help"); // error message set explicitly but the box has noErrorText so we see the hint instead
});

// test suppress error
// test submit invalid with suppressed errors

//await page.screenshot({ path: "foo1.png" });

// test("AnkValue submit", async ({ page }) => {
//     await page.goto("/test/basic");
//     const tbAmountReq = page.getByTestId("ank-amount-req-inp").getByRole("textbox");
//     const tbTextReq = page.getByTestId("ank-text-req-inp").getByRole("textbox");
//     await checkAnkTextbox(page, "ank-amount-req", "", "<undefined>", undefined);
//     await checkAnkTextbox(page, "ank-text-req", "", "string: ", undefined);
//     await page.getByTestId("submit").click();
// });
