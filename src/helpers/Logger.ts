
export class LogTrail {

  constructor(private name?: string) {
    this.name = name;
  }

  private prefix = ' =>'
  log(...message: any) {
    console.log(new Date(), this.prefix, `[${this.name || 'INFO'}]`, ...message);
  }
  error(...message: any[]) {
    console.error(new Date(), this.prefix, `${this.name || ''}`, '[ERROR]', ...message);
  }
}

export const logger = new LogTrail();