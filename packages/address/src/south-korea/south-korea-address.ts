import { SOUTH_KOREA_STATE_REGEX } from './constants';

export class SouthKoreaAddress {
  #postalCodeRegexString = `(\\([0-9]{5,6}\\))?`;
  #stateRegexString = `(${Object.values(SOUTH_KOREA_STATE_REGEX)
    .map((regex) => regex.source.replace(/\(/g, '(?:'))
    .join('|')})?`;
  #regionRegexString = `([가-힣]+[시])?\\s*([가-힣]+[군구면])?`;
  #streetRegexString = `([가-힣0-9]+[로동읍리]?(\\s*[0-9-]?[길가])?)`;
  #buildingNumberRegexString = `([0-9-]+)`;
  #detailRegexString = `(.+)?`;
  #regexString = `^${[this.#postalCodeRegexString, this.#stateRegexString, this.#regionRegexString, this.#streetRegexString, this.#buildingNumberRegexString, this.#detailRegexString].join('\\s*')}$`;
  #regex = new RegExp(this.#regexString);

  #originalAddress: string;
  #parsedAddress: string;
  #postalCode: string | undefined;
  #state: string | undefined;
  #region: string | undefined;
  #city: string | undefined;
  #street: string | undefined;
  #buildingNumber: string | undefined;
  #detail: string | undefined;

  constructor(address: string) {
    this.#originalAddress = address;

    const match = address.match(this.#regex)?.map((match) => match?.trim());

    if (!match) {
      throw new Error('Invalid address.');
    }

    const [, postalCode, state, regionOrCity, city, street, , buildingNumber, detail] = match;
    const region = regionOrCity === city ? undefined : regionOrCity;

    this.#postalCode = postalCode;
    this.#state = state;
    this.#region = regionOrCity;
    this.#city = city;
    this.#street = street;
    this.#buildingNumber = buildingNumber;
    this.#detail = detail;

    this.#parsedAddress = [postalCode, state, region, city, street, buildingNumber, detail].filter(Boolean).join(' ');

    return this;
  }

  public get originalAddress(): string {
    return this.#originalAddress;
  }

  public get parsedAddress(): string {
    return this.#parsedAddress;
  }

  public get postalCode(): string | undefined {
    return this.#postalCode;
  }

  public get state(): string | undefined {
    return this.#state;
  }

  public get region(): string | undefined {
    return this.#region;
  }

  public get city(): string | undefined {
    return this.#city;
  }

  public get street(): string | undefined {
    return this.#street;
  }

  public get buildingNumber(): string | undefined {
    return this.#buildingNumber;
  }

  public get detail(): string | undefined {
    return this.#detail;
  }
}
