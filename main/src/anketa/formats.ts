import { DateTime } from "luxon";
import { smartDateParse } from "./AnkDateTextField";

export class ank {
    static parseString(emptyUndefined?: boolean): StringAnkFormat<boolean> {
        return new StringAnkFormat(false)._parse(emptyUndefined ?? false);
    }

    static parseNumber(message?: string): NumberAnkFormat<boolean> {
        return new NumberAnkFormat(false)._parse(message);
    }

    static parseDate(message?: string, startend?: "start" | "end", locale?: string): DateAnkFormat<boolean> {
        return new DateAnkFormat(false)._parse(message, startend, locale);
    }

    static native<TValue>(): NativeAnkFormat<TValue, boolean> {
        return new NativeAnkFormat<TValue, boolean>(false)._parse();
    }
}

export abstract class AnkFormat<TValue, TRaw, TRequired extends boolean> {
    #transformer: TransformerFunc<TValue, TRaw, unknown>;
    #isRequired: TRequired;
    public readonly empty: TRaw;

    _requiredError: string | undefined;
    _min: (() => TValue) | undefined;
    _max: (() => TValue) | undefined;

    constructor(isRequired: TRequired, empty: TRaw) {
        this.#transformer = s => { };
        this.#isRequired = isRequired;
        this.empty = empty;
    }

    public get isRequired(): TRequired { return this.#isRequired; }
    protected set isRequired(value: TRequired) { this.#isRequired = value; }

    extendWith(transformer: TransformerFunc<TValue, TRaw, this>): this {
        const extended = new (this.constructor as any)(this.#isRequired) as this; // eslint-disable-line @typescript-eslint/no-unsafe-call
        for (const key in this)
            if (Object.hasOwn(this, key))
                extended[key] = this[key];
        const oldTransformers = this.#transformer;
        extended.#transformer = (s: ParseSerialise<TValue, TRaw>, fmt: unknown) => {
            oldTransformers(s, fmt);
            transformer(s, fmt as this);
        };
        return extended;
    }

    required(message?: string): AnkFormat<TValue, TRaw, true> {
        const fmt = this.extendWith(s => {
        }) as AnkFormat<TValue, TRaw, true>;
        fmt.isRequired = true;
        fmt._requiredError = message;
        return fmt;
    }

    parse(raw: TRaw): ParseSerialise<TValue, TRaw> {
        const state: ParseSerialise<TValue, TRaw> = {
            raw,
            parsed: undefined,
            isEmpty: true,
        };
        this.#transformer(state, this);
        return state;
    }

    abstract serialise(val: TValue): ParseSerialise<TValue, TRaw>;
}

interface StringLikeFormat {
    _minLen: number | undefined;
    _maxLen: number | undefined;
}

export function isStringLikeFormat<T, U, V extends boolean>(format: AnkFormat<T, U, V>): format is AnkFormat<T, U, V> & StringLikeFormat {
    return "_minLen" in format && "_maxLen" in format;
}

export class StringAnkFormat<TRequired extends boolean> extends AnkFormat<string, string, TRequired> implements StringLikeFormat {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    _minLen: number | undefined;
    _maxLen: number | undefined;

    _parse(emptyUndefined: boolean): this {
        return this.extendWith(s => {
            if (emptyUndefined)
                s.parsed = s.raw === "" ? undefined : s.raw;
            else
                s.parsed = s.raw;
            s.isEmpty = s.raw === "";
        });
    }

    serialise(val: string): ParseSerialise<string, string> {
        return this.parse(val);
    }

    required(message?: string): StringAnkFormat<true> {
        // the only reason we have to duplicate the base method is to define the return type as StringAnkFormat, as it's not possible for the base class to say something like `this<TReq=true>`
        return super.required(message) as StringAnkFormat<true>;
    }

    trim(): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined)
                return;
            s.parsed = s.parsed.trim();
            s.isEmpty = s.parsed === "";
            s.raw = s.parsed; // no way to disable fixup
        });
    }

    minLen(min: number, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.length > min)
                s.error = message ?? `Minimum ${min} characters.`;
        });
        clone._minLen = min;
        return clone;
    }

    maxLen(max: number, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.length > max)
                s.error = message ?? `Maximum ${max} characters.`;
        });
        clone._maxLen = max;
        return clone;
    }

    email(message?: string): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (!/^[^@]+@[^@]+\.[^@]+$/.test(s.parsed))
                s.error = message ?? "Valid email address required.";
        });
    }

    oneOf<TStr extends string>(values: TStr[], message?: string): AnkFormat<TStr, string, TRequired> {
        // It should really return a StringAnkFormat<TValue=TStr> but we're not quite there yet
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (!(values as string[]).includes(s.parsed))
                s.error = message ?? "Invalid value.";
        }) as unknown as AnkFormat<TStr, string, TRequired>; // ts(2352) is probably spurious; add "as unknown" to suppress
    }
}

export class NumberAnkFormat<TRequired extends boolean> extends AnkFormat<number, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    _parse(message?: string): this {
        return this.extendWith(s => {
            s.raw = s.raw.trim();
            s.isEmpty = s.raw === "";
            if (s.isEmpty) {
                s.parsed = undefined;
                return;
            }
            if (!/^-?[0-9]*\.?[0-9]*$/.test(s.raw)) {
                s.error = message ?? "Enter a valid number.";
                return;
            }
            const num = Number(s.raw);
            if (isNaN(num)) {
                s.error = message ?? "Enter a valid number.";
                return;
            }
            s.parsed = num;
        });
    }

    serialise(val: number): ParseSerialise<number, string> {
        return this.parse(val.toString());
    }

    positive(message?: string): this {
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed <= 0)
                s.error = message ?? "Enter a positive value.";
        });
    }

    min(min: number, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed < min)
                s.error = message ?? `Enter a value greater than or equal to ${this.serialise(min).raw}.`;
        });
        clone._min = () => min;
        return clone;
    }

    max(max: number, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed > max)
                s.error = message ?? `Enter a value less than or equal to ${this.serialise(max).raw}.`;
        });
        clone._max = () => max;
        return clone;
    }

    decimals2(message?: string): this {
        return this.extendWith(s => {
            if (s.parsed !== undefined) {
                const str = s.parsed.toFixed(2);
                if (Number(str) == s.parsed)
                    s.raw = str;
                else
                    s.raw = s.parsed.toString();
            }
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (Math.abs(s.parsed * 100 - Math.round(s.parsed * 100)) > 0.000001)
                s.error = message ?? "No more than 2 digits for pence.";
        });
    }
}

export class DateAnkFormat<TRequired extends boolean> extends AnkFormat<DateTime, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    _parse(message?: string, startend?: "start" | "end", locale?: string): this {
        return this.extendWith((s, fmt) => {
            s.parsed = undefined;
            s.raw = s.raw.trim();
            s.isEmpty = s.raw === "";
            if (s.isEmpty)
                return;
            const parsed = smartDateParse(s.raw, DateTime.now(), fmt._min?.(), startend, locale);
            if (parsed === undefined) {
                s.error = message ?? "Enter a valid date.";
                return;
            }
            s.parsed = parsed;
        });
    }

    serialise(val: DateTime): ParseSerialise<DateTime, string> {
        return this.parse(val.toFormat("dd/MM/yyyy"));
    }

    min(min: () => DateTime, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.startOf("day") < min().startOf("day"))
                s.error = message ?? `Must be no earlier than ${this.serialise(min()).raw}.`;
        });
        clone._min = min;
        return clone;
    }

    max(max: () => DateTime, message?: string): this {
        const clone = this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.startOf("day") > max().startOf("day"))
                s.error = message ?? `Must be no later than ${this.serialise(max()).raw}.`;
        });
        clone._max = max;
        return clone;
    }

    minToday(message?: string): this {
        return this.min(() => DateTime.now().startOf("day"), message ?? "Must be no earlier than today.");
    }

    maxToday(message?: string): this {
        return this.max(() => DateTime.now().startOf("day"), message ?? "Must be no later than today.");
    }
}

export class NativeAnkFormat<TValue, TRequired extends boolean> extends AnkFormat<TValue, TValue | undefined, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, undefined);
    }

    _parse(): this {
        return this.extendWith(s => {
            s.parsed = s.raw;
            s.isEmpty = s.raw === undefined;
        });
    }

    serialise(val: TValue): ParseSerialise<TValue, TValue | undefined> {
        return this.parse(val);
    }
}

type TransformerFunc<TValue, TRaw, TThis> = (state: ParseSerialise<TValue, TRaw>, fmt: TThis) => void;

export interface ParseSerialise<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue | undefined;
    error?: string;
    isEmpty: boolean;
    // could have fixup enable toggle here
}
