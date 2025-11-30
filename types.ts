export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface Prompts {
  character: string;
  outfit: string;
  background: string;
}
