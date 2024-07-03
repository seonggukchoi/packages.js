import { SOUTH_KOREA_STATE_DIRECTION, SOUTH_KOREA_STATE_CLASSIFIER, SouthKoreaStateName, SouthKoreaStateLevel } from '../constants';

export interface SouthKoreaStatePatternBuilderOptions {
  state: SouthKoreaStateName;
  suffix: SouthKoreaStateLevel;
  isAbbreviatible?: boolean;

  hasDirection?: boolean;

  isSpecial?: boolean;
  isAutonomy?: boolean;
  isMetropolitan?: boolean;
}

export class SouthKoreaStatePatternBuilder {
  readonly #state: SouthKoreaStateName;
  readonly #suffix: SouthKoreaStateLevel;
  readonly #isAbbreviatible?: boolean;

  readonly #hasDirection?: boolean;

  readonly #isSpecial?: boolean;
  readonly #isAutonomy?: boolean;
  readonly #isMetropolitan?: boolean;

  #patternComponents: string[] = [];

  readonly #classifierOptions = Object.freeze([this.#isSpecial, this.#isAutonomy, this.#isMetropolitan]);

  constructor({
    state,
    suffix,
    isAbbreviatible,
    hasDirection,
    isSpecial,
    isAutonomy,
    isMetropolitan,
  }: SouthKoreaStatePatternBuilderOptions) {
    this.#state = state;
    this.#suffix = suffix;
    this.#isAbbreviatible = isAbbreviatible;

    this.#hasDirection = hasDirection;

    this.#isSpecial = isSpecial;
    this.#isAutonomy = isAutonomy;
    this.#isMetropolitan = isMetropolitan;

    this.appendState().appendDirection().appendClassifier().appendSuffix();
  }

  public build(): RegExp {
    return new RegExp(this.#patternComponents.join('\\s*'));
  }

  private appendState(): this {
    const stateComponents = [`${this.#state}`, ...(this.#isAbbreviatible ? [`${this.#state.at(0)}`] : [])];

    this.#patternComponents.push(`(${stateComponents.join('|')})`);

    return this;
  }

  private appendDirection(): this {
    if (this.#isAbbreviatible || this.#hasDirection) {
      this.#patternComponents.push(`(${Object.values(SOUTH_KOREA_STATE_DIRECTION).join('|')})`);
    }

    return this;
  }

  private appendClassifier(): this {
    const isEnabledMultipleClassifiers = this.#classifierOptions.filter(Boolean).length > 1;

    const classifierComponents = [
      ...(isEnabledMultipleClassifiers ? ['('] : []),
      ...(this.#isSpecial ? [`(${SOUTH_KOREA_STATE_CLASSIFIER.SPECIAL})?`] : []),
      ...(this.#isAutonomy ? [`(${SOUTH_KOREA_STATE_CLASSIFIER.AUTONOMY})?`] : []),
      ...(this.#isMetropolitan ? [`(${SOUTH_KOREA_STATE_CLASSIFIER.METROPOLITAN})?`] : []),
      ...(isEnabledMultipleClassifiers ? [')?'] : []),
    ];

    this.#patternComponents.push(...classifierComponents);

    return this;
  }

  private appendSuffix(): this {
    this.#patternComponents.push(`(${this.#suffix})?`);

    return this;
  }
}
