import { DateTime } from "luxon";
import { expect, test } from "vitest";
import { smartDateParse } from "~/anketa";

function datestr(d: DateTime | undefined): string | undefined {
    if (d === undefined) return undefined;
    expect(d.startOf("day").toMillis() == d.toMillis()).toBe(true);
    return d.toFormat("yyyy-MM-dd");
}

test("smartDateParse tests", () => {
    let now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("", now))).toBe(undefined);
    expect(datestr(smartDateParse("asdf", now))).toBe(undefined);
    expect(datestr(smartDateParse("0", now))).toBe(undefined);

    // full date input 1
    expect(datestr(smartDateParse("26/04/2024", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("26/4/2024", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("26/04/24", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("26/4/24", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("260424", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("26424", now))).toBe(undefined);
    // full date input 2 - no such day in month
    expect(datestr(smartDateParse("31/04/2024", now))).toBe(undefined);
    expect(datestr(smartDateParse("31/04/24", now))).toBe(undefined);
    expect(datestr(smartDateParse("310424", now))).toBe(undefined);
    // full date input 3 - more zeroes
    expect(datestr(smartDateParse("03/06/2024", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("03/6/2024", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("3/06/2024", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("3/6/2024", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("03/06/24", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("03/6/24", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("3/06/24", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("3/6/24", now))).toBe("2024-06-03");
    expect(datestr(smartDateParse("030624", now))).toBe("2024-06-03");

    // day input; guess down from 2024-04-26
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("32", now))).toBe(undefined);
    expect(datestr(smartDateParse("31", now))).toBe("2024-03-31");
    expect(datestr(smartDateParse("30", now))).toBe("2024-03-30");
    expect(datestr(smartDateParse("28", now))).toBe("2024-03-28");
    expect(datestr(smartDateParse("27", now))).toBe("2024-03-27");
    expect(datestr(smartDateParse("26", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("25", now))).toBe("2024-04-25");
    expect(datestr(smartDateParse("2", now))).toBe("2024-04-02");
    expect(datestr(smartDateParse("1", now))).toBe("2024-04-01");
    expect(datestr(smartDateParse("01", now))).toBe("2024-04-01");
    // day input; guess down from 2024-03-01
    now = DateTime.fromISO("2024-03-01T03:21:58.391Z");
    expect(datestr(smartDateParse("32", now))).toBe(undefined);
    expect(datestr(smartDateParse("31", now))).toBe(undefined);
    expect(datestr(smartDateParse("30", now))).toBe(undefined);
    expect(datestr(smartDateParse("29", now))).toBe("2024-02-29"); // leap year
    expect(datestr(smartDateParse("28", now))).toBe("2024-02-28");
    expect(datestr(smartDateParse("2", now))).toBe("2024-02-02");
    expect(datestr(smartDateParse("1", now))).toBe("2024-03-01");
    expect(datestr(smartDateParse("01", now))).toBe("2024-03-01");
    // day input; guess down from 2023-02-28
    now = DateTime.fromISO("2023-02-28T23:21:58.391Z");
    expect(datestr(smartDateParse("32", now))).toBe(undefined);
    expect(datestr(smartDateParse("31", now))).toBe("2023-01-31");
    expect(datestr(smartDateParse("29", now))).toBe("2023-01-29");
    expect(datestr(smartDateParse("28", now))).toBe("2023-02-28");
    expect(datestr(smartDateParse("2", now))).toBe("2023-02-02");
    expect(datestr(smartDateParse("1", now))).toBe("2023-02-01");

    // day input; guess up from 2024-04-26
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    let min = now.startOf("day").minus({ days: 1 });
    expect(datestr(smartDateParse("32", now, min))).toBe(undefined);
    expect(datestr(smartDateParse("31", now, min))).toBe(undefined); // even though 2024-05-31 is valid
    expect(datestr(smartDateParse("30", now, min))).toBe("2024-04-30");
    expect(datestr(smartDateParse("29", now, min))).toBe("2024-04-29");
    expect(datestr(smartDateParse("28", now, min))).toBe("2024-04-28");
    expect(datestr(smartDateParse("27", now, min))).toBe("2024-04-27");
    expect(datestr(smartDateParse("26", now, min))).toBe("2024-04-26");
    expect(datestr(smartDateParse("25", now, min))).toBe("2024-05-25");
    expect(datestr(smartDateParse("2", now, min))).toBe("2024-05-02");
    expect(datestr(smartDateParse("1", now, min))).toBe("2024-05-01");

    // day+month input; guess down from 2024-04-26
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("31/04", now))).toBe(undefined);
    expect(datestr(smartDateParse("30/04", now))).toBe("2023-04-30");
    expect(datestr(smartDateParse("27/04", now))).toBe("2023-04-27");
    expect(datestr(smartDateParse("26/04", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("25/04", now))).toBe("2024-04-25");
    expect(datestr(smartDateParse("30/02", now))).toBe(undefined);
    expect(datestr(smartDateParse("29/02", now))).toBe("2024-02-29");
    expect(datestr(smartDateParse("28/02", now))).toBe("2024-02-28");
    expect(datestr(smartDateParse("01/02", now))).toBe("2024-02-01");
    // alternate formats
    expect(datestr(smartDateParse("01/2", now))).toBe("2024-02-01");
    expect(datestr(smartDateParse("1/02", now))).toBe("2024-02-01");
    expect(datestr(smartDateParse("1/2", now))).toBe("2024-02-01");
    expect(datestr(smartDateParse("0102", now))).toBe("2024-02-01");
    // invalid alternatives
    expect(datestr(smartDateParse("012", now))).toBe(undefined);
    expect(datestr(smartDateParse("102", now))).toBe(undefined);
    expect(datestr(smartDateParse("10/15", now))).toBe(undefined);
    expect(datestr(smartDateParse("1015", now))).toBe(undefined);
    // day+month input; guess down from 2023-04-26
    now = DateTime.fromISO("2023-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("31/04", now))).toBe(undefined);
    expect(datestr(smartDateParse("30/04", now))).toBe("2022-04-30");
    expect(datestr(smartDateParse("27/04", now))).toBe("2022-04-27");
    expect(datestr(smartDateParse("26/04", now))).toBe("2023-04-26");
    expect(datestr(smartDateParse("25/04", now))).toBe("2023-04-25");
    expect(datestr(smartDateParse("30/02", now))).toBe(undefined);
    expect(datestr(smartDateParse("29/02", now))).toBe(undefined);
    expect(datestr(smartDateParse("28/02", now))).toBe("2023-02-28");
    expect(datestr(smartDateParse("01/02", now))).toBe("2023-02-01");
    expect(datestr(smartDateParse("15/10", now))).toBe("2022-10-15");

    // day+month input; guess up from 2024-04-26
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    min = now.startOf("day").minus({ days: 1 });
    expect(datestr(smartDateParse("31/04", now, min))).toBe(undefined);
    expect(datestr(smartDateParse("30/04", now, min))).toBe("2024-04-30");
    expect(datestr(smartDateParse("27/04", now, min))).toBe("2024-04-27");
    expect(datestr(smartDateParse("26/04", now, min))).toBe("2024-04-26");
    expect(datestr(smartDateParse("25/04", now, min))).toBe("2025-04-25");
    expect(datestr(smartDateParse("30/02", now, min))).toBe(undefined);
    expect(datestr(smartDateParse("29/02", now, min))).toBe(undefined);
    expect(datestr(smartDateParse("28/02", now, min))).toBe("2025-02-28");
    expect(datestr(smartDateParse("01/02", now, min))).toBe("2025-02-01");
    expect(datestr(smartDateParse("15/10", now, min))).toBe("2024-10-15");

    // potential JS parsing too eagerly
    expect(datestr(smartDateParse("7a7", now))).toBe(undefined);
    expect(datestr(smartDateParse("+7", now))).toBe(undefined);

    // today, yesterday
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("t", now))).toBe("2024-04-26");
    expect(datestr(smartDateParse("y", now))).toBe("2024-04-25");
    now = DateTime.fromISO("2024-04-01T19:21:58.391Z");
    expect(datestr(smartDateParse("t", now))).toBe("2024-04-01");
    expect(datestr(smartDateParse("y", now))).toBe("2024-03-31");

    // ISO-ish full date
    now = DateTime.fromISO("2024-04-26T19:21:58.391Z");
    expect(datestr(smartDateParse("2024-04-09", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("2024-4-09", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("2024-04-9", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("2024-4-9", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("24-04-09", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("24-4-09", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("24-04-9", now))).toBe("2024-04-09");
    expect(datestr(smartDateParse("24-4-9", now))).toBe("2024-04-09");

    // ISO-ish start date
    expect(datestr(smartDateParse("2023-", now, undefined, "start"))).toBe("2023-01-01");
    expect(datestr(smartDateParse("23-", now, undefined, "start"))).toBe("2023-01-01");
    expect(datestr(smartDateParse("2023-02", now, undefined, "start"))).toBe("2023-02-01");
    expect(datestr(smartDateParse("23-02", now, undefined, "start"))).toBe("2023-02-01");
    expect(datestr(smartDateParse("2023-2", now, undefined, "start"))).toBe("2023-02-01");
    expect(datestr(smartDateParse("23-2", now, undefined, "start"))).toBe("2023-02-01");
    // ISO-ish end date
    expect(datestr(smartDateParse("2023-", now, undefined, "end"))).toBe("2023-12-31");
    expect(datestr(smartDateParse("23-", now, undefined, "end"))).toBe("2023-12-31");
    expect(datestr(smartDateParse("2023-02", now, undefined, "end"))).toBe("2023-02-28");
    expect(datestr(smartDateParse("23-02", now, undefined, "end"))).toBe("2023-02-28");
    expect(datestr(smartDateParse("2023-2", now, undefined, "end"))).toBe("2023-02-28");
    expect(datestr(smartDateParse("23-2", now, undefined, "end"))).toBe("2023-02-28");
    // corner cases
    expect(datestr(smartDateParse("223-", now, undefined, "end"))).toBe(undefined);
});
