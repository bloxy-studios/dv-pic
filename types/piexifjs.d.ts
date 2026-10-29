declare module "piexifjs" {
  type ExifValue = string | number | number[] | [number, number] | Array<[number, number]>;
  type Ifd = Record<number, ExifValue>;
  const piexif: {
    load(jpeg: string): { "0th": Ifd; Exif: Ifd; GPS: Ifd; "1st": Ifd; thumbnail: string | null };
    dump(exif: { "0th": Ifd; Exif: Ifd; GPS: Ifd; "1st": Ifd; thumbnail: null }): string;
    insert(exif: string, jpeg: string): string;
    GPSIFD: Record<string, number>;
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
  };
  export default piexif;
}
