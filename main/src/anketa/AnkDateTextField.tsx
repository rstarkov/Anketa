import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Button, ClickAwayListener, Fade, IconButton, InputAdornment, Popper, TextField, styled, useTheme } from "@mui/material";
import type { DateCalendarProps, PickersCalendarHeaderProps, PickersDayProps } from "@mui/x-date-pickers";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { GlobalEscHandler, isKey, unreachable } from "./shared";
import type { AnkValueBase } from "./value";

// We don't use the MUI-X DatePicker as-is because:
// - it messes with focus / selection, especially with copy & pasting a date from one into another
// - it accepts either a short year or a long year, but not both
// - bugs in Firefox
// We also provide a custom header/footer for the DateCalendar because:
// - it has a rather unfortunate UI for picking a month/year

// TODO: use MUI @mui/x-date-pickers date adapters instead of hard-coding luxon

type DatePreset = "month-start" | "month-end" | "prev-month-start" | "prev-month-end" | "year-start" | "year-end" | "prev-year-start" | "prev-year-end" | DateTime;

interface AnkDateTextFieldProps extends React.ComponentProps<typeof TextField> {
    ank: AnkValueBase<DateTime, string>;
    /** Set to true to automatically show an empty value when the control is disabled, without clearing the actual underlying value. */
    blankDisabled?: boolean;
    /** Invoked on every raw value change. */
    onRawChange?: (raw: string) => void;
    /** If set, a button is added in the calendar picker footer for this date. If two presets are specified the "yesterday" preset is omitted. */
    preset1?: DatePreset;
    /** If set, a button is added in the calendar picker footer for this date. If two presets are specified the "yesterday" preset is omitted. */
    preset2?: DatePreset;
    /** The z-index for the calendar picker. Defaults to 1300 (the default MUI dialog zIndex). */
    zIndex?: number;
}

export function AnkDateTextField({ ank, blankDisabled, onRawChange, preset1, preset2, zIndex, ...rest }: AnkDateTextFieldProps): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [activelyEditing, setActivelyEditing] = useState(false); // TODO: we suppress error on focus because ank.error doesn't update as we edit - but we can still call ank.format.parse (+"required" logic)
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ank.raw !== raw)
            setRaw(ank.raw);
    }, [ank.raw]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRaw(e.target.value);
        if (onRawChange)
            onRawChange(e.target.value);
    }
    function handleFocus() {
        setActivelyEditing(true);
    }
    function handleBlur() {
        setActivelyEditing(false);
        commit();
    }
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isKey(e, "Enter")) {
            setActivelyEditing(false);
            commit();
        } else {
            setActivelyEditing(true);
        }
    }
    function commit() {
        const newraw = ank.commitRaw(raw);
        if (newraw !== undefined)
            setRaw(newraw); // this ensures that the raw value gets re-formatted per the format even if the parsed value didn't change
    }
    function datePicked(d: DateTime | undefined) {
        const newraw = d === undefined ? "" : ank.format.serialise(d).raw;
        setRaw(newraw);
        ank.commitRaw(newraw);
        setOpen(false);
    }

    return <>
        <TextField {...rest} value={blankDisabled && rest.disabled ? "" : raw} onChange={handleChange}
            onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
            error={rest.error === undefined ? (!activelyEditing && !!ank.error) : rest.error} helperText={(!activelyEditing && ank.error !== undefined) ? ank.error : rest.helperText}
            ref={anchorRef}
            focused={open ? true : undefined}
            required={ank.required}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end" sx={{ ml: 0 }}>
                        <IconButton edge="end" onClick={() => setOpen(o => !o)} ><CalendarMonthIcon /></IconButton>
                    </InputAdornment >
                ),
            }} />
        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" transition style={{ zIndex: zIndex ?? 1300 }}>
            {({ TransitionProps }) => (
                <Fade {...TransitionProps}>
                    <div>
                        <GlobalEscHandler onEsc={() => setOpen(false)} />
                        <ClickAwayListener onClickAway={() => setOpen(false)}>
                            <div>{/* div is required for clickaway listener to work correctly */}
                                <CustomDateCalendar value={ank.value ?? null} onChange={d => datePicked(d ?? undefined)} preset1={preset1} preset2={preset2} minDate={ank.format._min} maxDate={ank.format._max} />
                            </div>
                        </ClickAwayListener>
                    </div>
                </Fade>
            )}
        </Popper>
    </>;
    // The MUI popper implements a focus trap with a complex blur handler (with refs and timeouts)
    // See https://github.com/mui/material-ui-pickers/blob/next/lib/src/_shared/PickersPopper.tsx
    // A more recent implementation appears even more complex at https://github.com/mui/mui-x/blob/723ed37f522d0413726bed0ae1cb994de2c5306d/packages/x-date-pickers/src/internals/components/PickersPopper.tsx
    // The above complex examples also handle setting focus to the current date, which we don't.
    // We'll just stick with a basic click away listener because getting the Focus Trap to work correctly with click away seems rather involved.
}

const CalendarContainerDiv = styled("div")`
    background: ${p => p.theme.palette.background.default};
    border-radius: 4px;
    box-shadow: 0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12);
`;

const CalendarFooterDiv = styled("div")`
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
    padding: 0 24px;
    padding-bottom: 12px;
    & > button {
        font-weight: normal;
        min-width: unset;
    }
`;

interface CustomDateCalendarProps extends DateCalendarProps<DateTime> {
    preset1?: DatePreset;
    preset2?: DatePreset;
}

function CustomDateCalendar({ preset1, preset2, ...rest }: CustomDateCalendarProps) {
    function presetDate(p: DatePreset | undefined): DateTime | undefined {
        if (typeof p !== "string") return p; // includes undefined
        if (p == "month-start") return DateTime.now().startOf("month");
        if (p == "month-end") return DateTime.now().startOf("month").plus({ months: 1 }).plus({ days: -1 });
        if (p == "prev-month-start") return DateTime.now().startOf("month").plus({ months: -1 });
        if (p == "prev-month-end") return DateTime.now().startOf("month").plus({ days: -1 });
        if (p == "year-start") return DateTime.now().startOf("year");
        if (p == "year-end") return DateTime.now().startOf("year").plus({ years: 1 }).plus({ days: -1 });
        if (p == "prev-year-start") return DateTime.now().startOf("year").plus({ years: -1 });
        if (p == "prev-year-end") return DateTime.now().startOf("year").plus({ days: -1 });
        return unreachable(p);
    }
    const date1 = presetDate(preset1);
    const d2 = presetDate(preset2);
    const date2 = date1 && d2 && date1.equals(d2) ? undefined : d2;
    const showYesterday = date1 == undefined || date2 == undefined;
    return <CalendarContainerDiv>
        <DateCalendar {...rest} slots={{ day: CustomDay, calendarHeader: CustomHeader }} views={["day"]} dayOfWeekFormatter={(_, d) => d.toLocaleString({ weekday: "short" }).substring(0, 2)} />
        <CalendarFooterDiv>
            <Button size="small" onClick={() => rest.onChange!(DateTime.now().startOf("day"))}>today</Button>
            {showYesterday && <Button size="small" onClick={() => rest.onChange!(DateTime.now().startOf("day").plus({ days: -1 }))}>yesterday</Button>}
            {date1 && <Button size="small" onClick={() => rest.onChange!(date1)}>{date1.toFormat("d MMM yyyy")}</Button>}
            {date2 && <Button size="small" onClick={() => rest.onChange!(date2)}>{date2.toFormat("d MMM yyyy")}</Button>}
        </CalendarFooterDiv>
    </CalendarContainerDiv>;
}

function CustomDay(p: PickersDayProps<DateTime>) {
    const t = useTheme();
    return <PickersDay style={{ color: p.selected ? "white" : p.day.weekday >= 6 ? t.palette.primary.main : "black", opacity: p.disabled ? 0.3 : 1 }} {...p} />;
}

const CalendarHeaderDiv = styled("div")`
    display: grid;
    grid-template-columns: max-content 2fr max-content max-content 1fr max-content;
    align-items: center;
    margin-top: 12px;
    margin-bottom: 8px;
    padding: 0 12px;
    min-height: 30px;
    max-height: 30px;
`;

const MonthYearDiv = styled("div")`
    color: ${p => p.theme.palette.primary.main};
    cursor: pointer;
    text-align: center;
`;

function CustomHeader(p: PickersCalendarHeaderProps<DateTime>) {
    return <CalendarHeaderDiv>
        <IconButton onClick={() => p.onMonthChange(p.currentMonth.plus({ months: -1 }), "left")}><ChevronLeftIcon /></IconButton>
        <MonthYearDiv>{p.currentMonth.monthLong}</MonthYearDiv>
        <IconButton onClick={() => p.onMonthChange(p.currentMonth.plus({ months: 1 }), "right")}><ChevronRightIcon /></IconButton>

        <IconButton onClick={() => p.onMonthChange(p.currentMonth.plus({ years: -1 }), "left")}><ChevronLeftIcon /></IconButton>
        <MonthYearDiv>{p.currentMonth.year}</MonthYearDiv>
        <IconButton onClick={() => p.onMonthChange(p.currentMonth.plus({ years: 1 }), "right")}><ChevronRightIcon /></IconButton>
    </CalendarHeaderDiv>;
}
