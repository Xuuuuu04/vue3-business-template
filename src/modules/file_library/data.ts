import { z } from "@/shared/public";
export const FileView = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  content_type: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
export type FileView = z.infer<typeof FileView>;
export const FilePage = z.object({
  items: z.array(FileView),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
export type FilePage = z.infer<typeof FilePage>;
export const ListInput = z
  .object({
    org: z.string().min(1),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(100),
  })
  .strict();
export const ItemInput = z
  .object({ org: z.string().min(1), id: z.string().min(1) })
  .strict();
export const UploadInput = z
  .object({ org: z.string().min(1), file: z.instanceof(File) })
  .strict();
export type ListWork = z.infer<typeof ListInput> & {
  page: FilePage;
  result: FilePage;
};
export type ItemWork = z.infer<typeof ItemInput> & {
  file: FileView;
  result: FileView;
};
export type UploadWork = z.infer<typeof UploadInput> & {
  body: FormData;
  result: FileView;
};
export type DeleteWork = z.infer<typeof ItemInput> & { result: null };
export type DownloadWork = z.infer<typeof ItemInput> & { result: Blob };
