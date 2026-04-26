import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(6, "Password minimal 6 karakter"),
});

export const cameraSchema = z.object({
  device_id: z
    .string()
    .min(1, "Device ID wajib diisi")
    .max(100, "Device ID terlalu panjang")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "Device ID hanya boleh huruf & angka (tanpa spasi/simbol)"
    ),
  label: z
    .string()
    .min(1, "Label wajib diisi")
    .max(100, "Label terlalu panjang"),
  is_active: z.boolean().optional().default(true),
});

export const parentSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  full_name: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama terlalu panjang"),
  phone: z
    .string()
    .max(20, "Nomor HP terlalu panjang")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const accessAssignmentSchema = z.object({
  parent_id: z.string().uuid("Parent ID tidak valid"),
  camera_ids: z.array(z.string().uuid("Camera ID tidak valid")),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CameraFormData = z.infer<typeof cameraSchema>;
export type ParentFormData = z.infer<typeof parentSchema>;
export type AccessAssignmentData = z.infer<typeof accessAssignmentSchema>;