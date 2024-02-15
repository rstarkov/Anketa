import { DateTime } from "luxon";

export class ank {
    static parseString(): StringAnkFormat<boolean> {
        return new StringAnkFormat(false)._parse();
    }

    static parseNumber(message?: string): NumberAnkFormat<boolean> {
        return new NumberAnkFormat(false)._parse(message);
    }

    static parseDate(locale?: string, message?: string): DateAnkFormat<boolean> {
        return new DateAnkFormat(false)._parse(locale, message);
    }

    static native<TValue>(): NativeAnkFormat<TValue, boolean> {
        return new NativeAnkFormat<TValue, boolean>(false)._parse();
    }
}

export abstract class AnkFormat<TValue, TRaw, TRequired extends boolean> {
    #transformer: TransformerFunc<TValue, TRaw>;
    #isRequired: TRequired;
    public readonly empty: TRaw;

    _requiredError: string | undefined;
    _min: TValue | undefined;
    _max: TValue | undefined;

    constructor(isRequired: TRequired, empty: TRaw) {
        this.#transformer = s => { };
        this.#isRequired = isRequired;
        this.empty = empty;
    }

    public get isRequired(): TRequired { return this.#isRequired; }
    protected set isRequired(value: TRequired) { this.#isRequired = value; }

    extendWith(transformer: TransformerFunc<TValue, TRaw>): this {
        const extended = new (this.constructor as any)(this.#isRequired) as this; // eslint-disable-line @typescript-eslint/no-unsafe-call
        for (const key in this)
            if (Object.hasOwn(this, key))
                extended[key] = this[key];
        const oldTransformers = this.#transformer;
        extended.#transformer = (s: ParseSerialise<TValue, TRaw>) => {
            oldTransformers(s);
            transformer(s);
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
        this.#transformer(state);
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

    _parse(): this {
        return this.extendWith(s => {
            s.parsed = s.raw;
            s.isEmpty = s.parsed === "";
        });
    }

    serialise(val: string): ParseSerialise<string, string> {
        return this.parse(val);
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
        this._minLen = min;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.length > min)
                s.error = message ?? `Minimum ${min} characters.`;
        });
    }

    maxLen(max: number, message?: string): this {
        this._maxLen = max;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.length > max)
                s.error = message ?? `Maximum ${max} characters.`;
        });
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
        this._min = min;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed < min)
                s.error = message ?? `Enter a value greater than or equal to ${this.serialise(min).raw}.`;
        });
    }

    max(max: number, message?: string): this {
        this._max = max;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed > max)
                s.error = message ?? `Enter a value less than or equal to ${this.serialise(max).raw}.`;
        });
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

    _parse(locale?: string, message?: string): this {
        return this.extendWith(s => {
            s.parsed = undefined;
            s.raw = s.raw.trim();
            s.isEmpty = s.raw === "";
            if (s.isEmpty)
                return;
            const opts = { locale: locale ?? "en-GB" };
            let parsed = DateTime.fromFormat(s.raw, "d/M/yyyy", opts);
            if (!parsed.isValid)
                parsed = DateTime.fromFormat(s.raw, "d/M/yy", opts);
            if (!parsed.isValid) {
                s.error = message ?? "Enter a valid date.";
                return;
            }
            s.parsed = parsed;
        });
    }

    serialise(val: DateTime): ParseSerialise<DateTime, string> {
        return this.parse(val.toFormat("dd/MM/yyyy"));
    }

    min(min: DateTime, message?: string): this {
        this._min = min;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.startOf("day") < min.startOf("day"))
                s.error = message ?? `Must be no earlier than ${this.serialise(min).raw}.`;
        });
    }

    max(max: DateTime, message?: string): this {
        this._max = max;
        return this.extendWith(s => {
            if (s.error !== undefined || s.parsed === undefined || s.isEmpty)
                return;
            if (s.parsed.startOf("day") > max.startOf("day"))
                s.error = message ?? `Must be no later than ${this.serialise(max).raw}.`;
        });
    }

    minToday(message?: string): this {
        return this.max(DateTime.now().startOf("day"), message ?? "Must be no earlier than today.");
    }

    maxToday(message?: string): this {
        return this.max(DateTime.now().startOf("day"), message ?? "Must be no later than today.");
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

type TransformerFunc<TValue, TRaw> = (state: ParseSerialise<TValue, TRaw>) => void;

export interface ParseSerialise<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue | undefined;
    error?: string;
    isEmpty: boolean;
    // could have fixup enable toggle here
}
