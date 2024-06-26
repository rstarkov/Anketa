import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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
    await page.getByLabel("Ank Drop-down Req *").click();
    await page.getByRole("option", { name: "Two" }).click();
    await checkAnkDropdown(page, "ank-drop-req", "two", "string: two", undefined);

    await page.getByTestId("clear").click();
    await page.getByLabel("Ank Drop-down Req *").press("ArrowDown");
    await page.getByRole("option", { name: "One" }).press("ArrowDown");
    await page.getByRole("option", { name: "Two" }).press("ArrowDown");
    await page.getByRole("option", { name: "Three" }).press("Enter");
    await checkAnkDropdown(page, "ank-drop-req", "three", "string: three", undefined);
});

test("AnkTextField noErrorText", async ({ page }) => {
    async function verify1(testid: string, red: boolean, hintText: string | undefined) {
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
    async function verify(testid: string, red: boolean, hintText: string | undefined) {
        await verify1(`text-${testid}`, red, hintText);
        await verify1(`date-${testid}`, red, hintText);
    }
    await page.goto("/test/basic");

    // check initial empty state on form load
    await verify("yeserrortext", false, undefined);
    await verify("noerrortext", false, undefined);
    await verify("yeserrortext-hint", false, "some help");
    await verify("noerrortext-hint", false, "more help");

    // check state when the field has an invalid value
    await page.getByTestId("text-noerrortext").getByRole("textbox").fill("foo");
    await page.getByTestId("text-noerrortext").getByRole("textbox").blur();
    await verify("yeserrortext", true, "Enter a valid date.");
    await verify("noerrortext", true, undefined); // there's no hint shown even though there's an error and the box is red
    await verify("yeserrortext-hint", true, "Enter a valid date.");
    await verify("noerrortext-hint", true, "more help"); // the hint must remain visible even though there's an error and the box is red

    // invalid value, but the error is forced to "": red error highlight is off
    await page.getByTestId("set-yesnoerror-empty").click();
    await verify("yeserrortext", false, undefined);
    await verify("noerrortext", false, undefined);
    await verify("yeserrortext-hint", false, undefined); // box supplies a hint, but the "" error overrides it to not show
    await verify("noerrortext-hint", false, "more help"); // box supplies a hint, but the "" error is ignored because of noErrorText and hint shows

    // check the state when the field has a valid value
    await page.getByTestId("text-noerrortext").getByRole("textbox").fill("31/12/2023");
    await page.getByTestId("text-noerrortext").getByRole("textbox").blur();
    await verify("yeserrortext", false, undefined);
    await verify("noerrortext", false, undefined);
    await verify("yeserrortext-hint", false, "some help");
    await verify("noerrortext-hint", false, "more help");

    // valid value, but the error is forced to "Foo Bar": red error highlight is on
    await page.getByTestId("set-yesnoerror-foobar").click();
    await verify("yeserrortext", true, "Foo Bar");
    await verify("noerrortext", true, undefined);
    await verify("yeserrortext-hint", true, "Foo Bar");
    await verify("noerrortext-hint", true, "more help"); // error message set explicitly but the box has noErrorText so we see the hint instead
});

async function expectRed(inp: Locator, red: boolean) {
    if (red) {
        await expect(inp.locator("label.MuiInputLabel-root")).toHaveClass(/\bMui-error\b/);
        await expect(inp.locator("p.MuiFormHelperText-root")).toBeVisible();
    } else {
        await expect(inp.locator("label.MuiInputLabel-root")).not.toHaveClass("Mui-error");
        await expect(inp.locator("p.MuiFormHelperText-root")).toHaveCount(0);
    }
}

test("DateTextField key down behaviours", async ({ page }) => {
    await page.goto("/test/basic");
    const inp = page.getByTestId("date1");

    // enter something invalid: don't expect red right away (might change later with live validation)
    await inp.getByRole("textbox").focus();
    await page.keyboard.press("z");
    await expectRed(inp, false);
    // Enter on invalid: turns it red
    await page.keyboard.press("Enter");
    await expectRed(inp, true);
    // typing after: turns off red (or live-validates if we do that later)
    await page.keyboard.press("z");
    await expectRed(inp, false);
});

test("DateTextField tab out error state", async ({ page }) => {
    await page.goto("/test/basic");
    const inp = page.getByTestId("date1");
    await inp.getByRole("textbox").fill("31/12/2023");
    await inp.getByRole("textbox").blur();
    await expectRed(inp, false);
    await inp.getByRole("textbox").fill("31/12/2023z");
    await inp.getByRole("textbox").blur();
    await expectRed(inp, true);
    await inp.getByRole("textbox").focus();
    await expectRed(inp, false); // this behaviour might change in the future, in particular if we implement live validation
    await page.keyboard.press("Tab");
    await expectRed(inp, true); // this behaviour might also change in the future; the input is not focused but the date button still is, so one could say the date still has focus
    await page.keyboard.press("Tab");
    await expectRed(inp, true); // now we're definitely out and it must be red
});
