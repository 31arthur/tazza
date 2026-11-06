export interface Asset {
  readonly id: string;
  readonly mimeType: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly byteSize: number;
}
