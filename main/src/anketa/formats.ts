export class ank {
    static parseString(): StringAnkFormat<boolean> {
        return new StringAnkFormat(false)._parse();
    }

    static parseNumber(message?: string): NumberAnkFormat<boolean> {
        return new NumberAnkFormat(false)._parse(message);
    }
}

export abstract class AnkFormat<TValue, TRaw, TRequired extends boolean> {
    #transformer: TransformerFunc<TValue, TRaw>;
    #isRequired: TRequired;
    public readonly empty: TRaw;

    constructor(isRequired: TRequired, empty: TRaw) {
        this.#transformer = s => { };
        this.#isRequired = isRequired;
        this.empty = empty;
    }

    public get isRequired(): TRequired { return this.#isRequired; }
    protected set isRequired(value: TRequired) { this.#isRequired = value; }

    protected extendWith(transformer: TransformerFunc<TValue, TRaw>): this {
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

    //abstract serialise(val: TValue): TRaw;

    required(message?: string): AnkFormat<TValue, TRaw, true> {
        const fmt = this.extendWith(s => {
            // if (s.error !== undefined)
            //     return;
            // if (s.isEmpty)
            //     s.error = message ?? "Required.";
        }) as AnkFormat<TValue, TRaw, true>;
        fmt.isRequired = true;
        // TODO: STORE ERROR MESSAGE IN FMT
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

class StringAnkFormat<TRequired extends boolean> extends AnkFormat<string, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    // serialise(val: string): string {
    //     return val;
    // }

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
}

class NumberAnkFormat<TRequired extends boolean> extends AnkFormat<number, string, TRequired> {
    constructor(isRequired: TRequired) {
        super(isRequired, "");
    }

    // serialise(val: number): string {
    //     if (this.decimals === undefined)
    //         return val.toString();
    //     let str = val.toFixed(this.decimals);
    //     if (Number(str) == val)
    //         return str;
    //     else
    //         return val.toString();
    // }

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

    max(max: number, message?: string): this {
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

type TransformerFunc<TValue, TRaw> = (state: ParseSerialise<TValue, TRaw>) => void;

export interface ParseSerialise<TValue, TRaw> {
    raw: TRaw;
    parsed: TValue | undefined;
    error?: string;
    isEmpty: boolean;
    // could have fixup enable toggle here
}
