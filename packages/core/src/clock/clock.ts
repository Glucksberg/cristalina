export interface Clock {
  now(): Date;
  isoNow(): string;
  dateStr(): string;
  monthStr(): string;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  isoNow(): string {
    return this.now().toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  dateStr(): string {
    return this.isoNow().slice(0, 10);
  }
  monthStr(): string {
    return this.isoNow().slice(0, 7);
  }
}

export class FixedClock implements Clock {
  private readonly date: Date;

  constructor(iso: string = "2026-03-29T12:00:00Z") {
    this.date = new Date(iso);
  }
  now(): Date {
    return new Date(this.date.getTime());
  }
  isoNow(): string {
    return this.date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  dateStr(): string {
    return this.isoNow().slice(0, 10);
  }
  monthStr(): string {
    return this.isoNow().slice(0, 7);
  }
}
