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

interface AnkDateTextFieldProps extends React.ComponentProps<typeof TextField> {
    ank: AnkValueBase<DateTime, string>;
    /** If set, a button is added in the calendar picker footer for the start or end of the current month. */
    buttonMonth?: "start" | "end";
    /** The z-index for the calendar picker. Defaults to 1300 (the default MUI dialog zIndex). */
    zIndex?: number;
}

export function AnkDateTextField({ ank, buttonMonth, zIndex, ...rest }: AnkDateTextFieldProps): JSX.Element {
    const [raw, setRaw] = useState(ank.raw);
    const [suppressError, setSuppressError] = useState(false); // TODO: we suppress error on focus because ank.error doesn't update as we edit - but we can still call ank.format.parse (+"required" logic)
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ank.raw !== raw)
            setRaw(ank.raw);
    }, [ank.raw]);

    function handleFocus() {
        setSuppressError(true);
    }
    function handleBlur() {
        setSuppressError(false);
        commit();
    }
    function handleKeyDown(e: React.KeyboardEvent) {
        if (isKey(e, "Enter")) {
            setSuppressError(false);
            commit();
        } else {
            setSuppressError(true);
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
        <TextField {...rest} value={raw} onChange={e => setRaw(e.target.value)}
            onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
            error={!suppressError && !!ank.error} helperText={(!suppressError && ank.error) ?? rest.helperText}
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
                                <CustomDateCalendar value={ank.value ?? null} onChange={d => datePicked(d ?? undefined)} buttonMonth={buttonMonth} minDate={ank.format._min} maxDate={ank.format._max} />
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
    buttonMonth?: "start" | "end";
}

function CustomDateCalendar({ buttonMonth, ...rest }: CustomDateCalendarProps) {
    const monthDate = buttonMonth == undefined ? null
        : buttonMonth == "start" ? DateTime.now().startOf("month")
            : buttonMonth == "end" ? DateTime.now().startOf("month").plus({ months: 1 }).plus({ days: -1 })
                : unreachable(buttonMonth);
    return <CalendarContainerDiv>
        <DateCalendar {...rest} slots={{ day: CustomDay, calendarHeader: CustomHeader }} views={["day"]} dayOfWeekFormatter={(_, d) => d.toLocaleString({ weekday: "short" }).substring(0, 2)} />
        <CalendarFooterDiv>
            <Button size="small" onClick={() => rest.onChange!(DateTime.now().startOf("day"))}>today</Button>
            <Button size="small" onClick={() => rest.onChange!(DateTime.now().startOf("day").plus({ days: -1 }))}>yesterday</Button>
            {monthDate && <Button size="small" onClick={() => rest.onChange!(monthDate)}>{monthDate.toFormat("d MMM yyyy")}</Button>}
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
