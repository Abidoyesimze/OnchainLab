declare module "papaparse" {
  export interface ParseConfig {
    complete?: (results: ParseResult<any>) => void;
    error?: (error: Error) => void;
    header?: boolean;
    dynamicTyping?: boolean;
    skipEmptyLines?: boolean;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: any[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
      fields?: string[];
    };
  }

  export function parse<T>(input: string, config?: ParseConfig): ParseResult<T>;

  // Add other PapaParse functions and types as needed
}
